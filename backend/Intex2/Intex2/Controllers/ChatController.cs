using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Intex2.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ChatController> _logger;

    // Claude Haiku is fast and cheap — swap to claude-sonnet-4-6 for higher quality
    private const string ModelName = "claude-haiku-4-5-20251001";

    public ChatController(AppDbContext db, IHttpClientFactory httpClientFactory, ILogger<ChatController> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/chat/query
    /// Body: { "message": "...", "history": [{ "role": "user"|"assistant", "content": "..." }] }
    /// </summary>
    [HttpPost("query")]
    public async Task<IActionResult> Query([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "Message cannot be empty." });

        try
        {
            var key = request.PromptKey;

            // ── Tier 1: Instant DB response — zero API cost ───────────────────
            // Only for predetermined buttons where we know exactly what to show.
            if (key != null)
            {
                var instant = await TryInstantResponse(key);
                if (instant != null)
                    return Ok(new { response = instant });
            }

            // ── Tier 2: Pre-aggregated summary → tiny focused Claude call ─────
            // We build a minimal JSON summary ourselves; Claude just narrates it.
            if (key != null)
            {
                var tier2 = await TryTier2Response(key);
                if (tier2 != null)
                {
                    var t2response = await CallClaude(tier2.System, tier2.User, null);
                    return Ok(new { response = t2response });
                }
            }

            // ── Tier 4: Full AI ───────────────────────────────────────────────
            // For creative/draft prompts with a key OR all free-typed questions.
            // Still domain-scoped when key is known so we don't flood the prompt.
            var contextData = key != null
                ? await GatherDomainContext(key, request.Message)
                : await GatherContext(request.Message);

            // Pass date range hint to system prompt when the user asked about a specific period
            string? dateRangeNote = null;
            if (key == null)
            {
                var (drFrom, drTo) = ParseDateRange(request.Message);
                if (drFrom.HasValue)
                    dateRangeNote = $"{drFrom:MMMM d, yyyy} – {(drTo ?? DateOnly.FromDateTime(DateTime.UtcNow)):MMMM d, yyyy}";
            }

            var systemPrompt = BuildSystemPrompt(contextData, dateRangeNote);
            var response = await CallClaude(systemPrompt, request.Message, request.History);
            return Ok(new { response });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Could not reach Anthropic API");
            return StatusCode(503, new
            {
                error = "The AI service is currently unavailable. Please check your API key and try again."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat query");
            return StatusCode(500, new { error = "Failed to process your query. Please try again." });
        }
    }

    // ─── Tier 1: Instant responses (zero API calls) ───────────────────────────
    // Returns a formatted string ready to display, or null if not a Tier 1 key.

    private async Task<string?> TryInstantResponse(string key) => key switch
    {
        "resident.long_stay"       => await InstantLongStay(),
        "resident.safety_concerns" => await InstantSafetyConcerns(),
        "resident.pending_followups" => await InstantPendingFollowups(),
        "donor.churn_risk"         => await InstantChurnRisk(),
        "donor.lapsed"             => await InstantLapsedDonors(),
        "social.top_content"       => await InstantTopContent(),
        _ => null
    };

    private async Task<string> InstantLongStay()
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var residents = await _db.Residents
            .Where(r => r.DateOfAdmission != null && r.DateOfAdmission <= cutoff)
            .OrderBy(r => r.DateOfAdmission)
            .Select(r => new { r.CaseControlNo, r.InternalCode, r.ResidentId, r.DateOfAdmission, r.CaseStatus, r.ReintegrationStatus, r.AssignedSocialWorker })
            .ToListAsync();

        if (!residents.Any())
            return "✅ No residents have been in care for 30 or more days.";

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var sb = new StringBuilder();
        sb.AppendLine($"**{residents.Count} resident{(residents.Count == 1 ? "" : "s")} have been in care for 30+ days:**\n");
        foreach (var r in residents)
        {
            var label = r.CaseControlNo ?? r.InternalCode ?? $"Resident {r.ResidentId}";
            var days = r.DateOfAdmission.HasValue ? today.DayNumber - r.DateOfAdmission.Value.DayNumber : 0;
            sb.AppendLine($"• **{label}** — {days} days | Status: {r.CaseStatus ?? "N/A"} | Reintegration: {r.ReintegrationStatus ?? "N/A"} | Worker: {r.AssignedSocialWorker ?? "N/A"}");
        }
        sb.AppendLine("\nConsider reviewing each resident's transition or reintegration plan.");
        return sb.ToString();
    }

    private async Task<string> InstantSafetyConcerns()
    {
        var weekAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var concerns = await _db.HomeVisitations
            .Where(v => v.SafetyConcernsNoted == true && v.VisitDate >= weekAgo)
            .OrderByDescending(v => v.VisitDate)
            .Select(v => new { v.ResidentId, v.VisitDate, v.SocialWorker, v.FollowUpNeeded, v.FollowUpNotes, v.Observations })
            .ToListAsync();

        if (!concerns.Any())
            return "✅ No safety concerns have been flagged in home visitations this week.";

        var sb = new StringBuilder();
        sb.AppendLine($"⚠️ **{concerns.Count} visitation{(concerns.Count == 1 ? "" : "s")} with safety concerns flagged this week:**\n");
        foreach (var c in concerns)
        {
            sb.AppendLine($"• **Resident ID {c.ResidentId}** — {c.VisitDate} | Worker: {c.SocialWorker ?? "N/A"}");
            if (!string.IsNullOrWhiteSpace(c.Observations)) sb.AppendLine($"  Observations: {c.Observations}");
            sb.AppendLine($"  Follow-up needed: {(c.FollowUpNeeded == true ? "⚠️ Yes" : "No")}");
            if (!string.IsNullOrWhiteSpace(c.FollowUpNotes)) sb.AppendLine($"  Notes: {c.FollowUpNotes}");
        }
        return sb.ToString();
    }

    private async Task<string> InstantPendingFollowups()
    {
        var pending = await _db.HomeVisitations
            .Where(v => v.FollowUpNeeded == true)
            .OrderByDescending(v => v.VisitDate)
            .Select(v => new { v.ResidentId, v.VisitDate, v.SocialWorker, v.FollowUpNotes, v.VisitType })
            .ToListAsync();

        if (!pending.Any())
            return "✅ No pending follow-ups. All home visitation actions are resolved.";

        var sb = new StringBuilder();
        sb.AppendLine($"📋 **{pending.Count} pending follow-up{(pending.Count == 1 ? "" : "s")} across home visitations:**\n");
        foreach (var v in pending.Take(20))
        {
            sb.AppendLine($"• **Resident ID {v.ResidentId}** — Last visit: {v.VisitDate} ({v.VisitType ?? "N/A"}) | Worker: {v.SocialWorker ?? "N/A"}");
            if (!string.IsNullOrWhiteSpace(v.FollowUpNotes)) sb.AppendLine($"  Notes: {v.FollowUpNotes}");
        }
        if (pending.Count > 20) sb.AppendLine($"\n...and {pending.Count - 20} more.");
        return sb.ToString();
    }

    private async Task<string> InstantChurnRisk()
    {
        var highRisk = await _db.DonorChurnPredictions
            .Where(p => p.RiskLevel == "High" || p.ChurnProbability > 0.7m)
            .Join(_db.Supporters, p => p.SupporterId, s => s.SupporterId,
                (p, s) => new { s.DisplayName, s.SupporterType, s.Email, p.ChurnProbability, p.RiskLevel, p.ScoredAt })
            .OrderByDescending(p => p.ChurnProbability)
            .Take(20)
            .ToListAsync();

        if (!highRisk.Any())
            return "✅ No donors are currently flagged as high churn risk.";

        var sb = new StringBuilder();
        sb.AppendLine($"⚠️ **{highRisk.Count} donor{(highRisk.Count == 1 ? "" : "s")} at high churn risk:**\n");
        foreach (var d in highRisk)
            sb.AppendLine($"• **{d.DisplayName}** ({d.SupporterType}) — {d.ChurnProbability:P0} churn probability | Scored: {d.ScoredAt?.ToString("MMM d, yyyy") ?? "N/A"}");
        sb.AppendLine("\nConsider reaching out with a personalized re-engagement message.");
        return sb.ToString();
    }

    private async Task<string> InstantLapsedDonors()
    {
        var sixMonthsAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6));
        var activeIds = await _db.Donations
            .Where(d => d.DonationDate >= sixMonthsAgo)
            .Select(d => d.SupporterId).Distinct().ToListAsync();

        var lapsed = await _db.Supporters
            .Where(s => s.Status == "Active" && !activeIds.Contains(s.SupporterId))
            .OrderBy(s => s.FirstDonationDate)
            .Select(s => new { s.DisplayName, s.SupporterType, s.FirstDonationDate, s.AcquisitionChannel })
            .Take(20).ToListAsync();

        var totalLapsed = await _db.Supporters
            .CountAsync(s => s.Status == "Active" && !activeIds.Contains(s.SupporterId));

        if (!lapsed.Any())
            return "✅ No active donors have lapsed in the last 6 months.";

        var sb = new StringBuilder();
        sb.AppendLine($"📉 **{totalLapsed} donor{(totalLapsed == 1 ? "" : "s")} haven't given in 6+ months:**\n");
        foreach (var d in lapsed)
            sb.AppendLine($"• **{d.DisplayName}** ({d.SupporterType}) — First donated: {d.FirstDonationDate?.ToString() ?? "N/A"} | Channel: {d.AcquisitionChannel ?? "N/A"}");
        if (totalLapsed > 20) sb.AppendLine($"\n...and {totalLapsed - 20} more.");
        sb.AppendLine("\nA personal re-engagement email to these donors may help bring them back.");
        return sb.ToString();
    }

    private async Task<string> InstantTopContent()
    {
        var top = await _db.SocialMediaPosts
            .OrderByDescending(p => p.EngagementRate)
            .Take(5)
            .Select(p => new { p.Platform, p.PostType, p.ContentTopic, p.EngagementRate, p.Reach, p.Likes, p.CreatedAt, p.Caption })
            .ToListAsync();

        var lastPost = await _db.SocialMediaPosts
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new { p.CreatedAt, p.Platform })
            .FirstOrDefaultAsync();

        if (!top.Any())
            return "No social media posts found on record yet.";

        var daysSince = lastPost != null ? (int)(DateTime.UtcNow - lastPost.CreatedAt).TotalDays : -1;
        var sb = new StringBuilder();
        if (daysSince >= 0)
            sb.AppendLine($"📅 Last post: **{daysSince} day{(daysSince == 1 ? "" : "s")} ago** on {lastPost!.Platform}\n");

        sb.AppendLine("🏆 **Top 5 posts by engagement rate:**\n");
        foreach (var p in top)
        {
            sb.AppendLine($"• **{p.CreatedAt:MMM d, yyyy}** | {p.Platform} — {p.PostType} | Topic: {p.ContentTopic ?? "N/A"}");
            sb.AppendLine($"  Engagement: {p.EngagementRate:P1} | Reach: {p.Reach:N0} | Likes: {p.Likes}");
            if (!string.IsNullOrWhiteSpace(p.Caption))
                sb.AppendLine($"  \"{p.Caption[..Math.Min(100, p.Caption.Length)]}…\"");
        }
        return sb.ToString();
    }

    // ─── Tier 2: Pre-aggregated → focused Claude narration ────────────────────
    // Returns (systemPrompt, userMessage) or null if not a Tier 2 key.

    private record Tier2Prompt(string System, string User);

    private async Task<Tier2Prompt?> TryTier2Response(string key) => key switch
    {
        "resident.status_overview" => await BuildResidentStatusOverviewPrompt(),
        "resident.needs_attention"  => await BuildNeedsAttentionPrompt(),
        "donor.giving_summary"      => await BuildGivingSummaryPrompt(),
        _ => null
    };

    private async Task<Tier2Prompt> BuildResidentStatusOverviewPrompt()
    {
        var total   = await _db.Residents.CountAsync();
        var byStatus = await _db.Residents
            .Where(r => r.CaseStatus != null)
            .GroupBy(r => r.CaseStatus!)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Status, g => g.Count);

        var byReintegration = await _db.Residents
            .Where(r => r.ReintegrationStatus != null)
            .GroupBy(r => r.ReintegrationStatus!)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Status, g => g.Count);

        var bySafehouse = await _db.Residents
            .Where(r => r.SafehouseId != null)
            .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => s.Name)
            .GroupBy(n => n)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Name, g => g.Count);

        var cutoff30 = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var recentAdmissions = await _db.Residents.CountAsync(r => r.DateOfAdmission >= cutoff30);

        var summary = new { total, byStatus, byReintegration, bySafehouse, recentAdmissions };
        var system = "You are a concise case management assistant for a nonprofit. Write a 3-4 sentence admin briefing from the data below. Be warm but factual. Highlight anything that needs attention.";
        var user   = $"Resident status data: {JsonSerializer.Serialize(summary)}";
        return new Tier2Prompt(system, user);
    }

    private async Task<Tier2Prompt> BuildNeedsAttentionPrompt()
    {
        var cutoff30 = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var recentlyVisitedIds = await _db.HomeVisitations
            .Where(v => v.VisitDate >= cutoff30).Select(v => v.ResidentId).Distinct().ToListAsync();

        var noRecentVisit = await _db.Residents
            .Where(r => !recentlyVisitedIds.Contains(r.ResidentId))
            .Select(r => new { r.CaseControlNo, r.InternalCode, r.ResidentId, r.CaseStatus })
            .ToListAsync();

        var pendingFollowups = await _db.HomeVisitations.CountAsync(v => v.FollowUpNeeded == true);
        var safetyConcernsThisWeek = await _db.HomeVisitations
            .CountAsync(v => v.SafetyConcernsNoted == true && v.VisitDate >= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7)));
        var overdueInterventions = await _db.InterventionPlans
            .CountAsync(p => p.TargetDate < DateOnly.FromDateTime(DateTime.UtcNow) && p.Status != "Completed");
        var sessionConcerns = await _db.ProcessRecordings.CountAsync(p => p.ConcernsFlagged == true);

        var summary = new
        {
            residentsWithNoVisitIn30Days = noRecentVisit.Select(r => r.CaseControlNo ?? r.InternalCode ?? $"ID {r.ResidentId}"),
            pendingFollowups,
            safetyConcernsThisWeek,
            overdueInterventions,
            sessionConcerns
        };
        var system = "You are a compassionate case management assistant. Based on this data, write a 4-5 sentence briefing highlighting which residents may need urgent attention and why. Be specific. Suggest concrete next steps.";
        var user   = $"Attention flags: {JsonSerializer.Serialize(summary)}";
        return new Tier2Prompt(system, user);
    }

    private async Task<Tier2Prompt> BuildGivingSummaryPrompt()
    {
        var now       = DateTime.UtcNow;
        var yearStart = new DateOnly(now.Year, 1, 1);
        var monStart  = new DateOnly(now.Year, now.Month, 1);

        var totalThisYear  = await _db.Donations.Where(d => d.DonationDate >= yearStart).CountAsync();
        var amountThisYear = await _db.Donations.Where(d => d.DonationDate >= yearStart && d.Amount != null).SumAsync(d => (decimal?)d.Amount) ?? 0;
        var totalThisMonth = await _db.Donations.Where(d => d.DonationDate >= monStart).CountAsync();
        var amountThisMonth= await _db.Donations.Where(d => d.DonationDate >= monStart && d.Amount != null).SumAsync(d => (decimal?)d.Amount) ?? 0;
        var recurring      = await _db.Donations.Where(d => d.IsRecurring).Select(d => d.SupporterId).Distinct().CountAsync();
        var atRisk         = await _db.DonorChurnPredictions.CountAsync(p => p.ChurnProbability > 0.7m);
        var sixMonthsAgo   = DateOnly.FromDateTime(now.AddMonths(-6));
        var activeIds      = await _db.Donations.Where(d => d.DonationDate >= sixMonthsAgo).Select(d => d.SupporterId).Distinct().ToListAsync();
        var lapsed         = await _db.Supporters.CountAsync(s => s.Status == "Active" && !activeIds.Contains(s.SupporterId));

        var byType = await _db.Donations
            .Where(d => d.DonationDate >= yearStart)
            .GroupBy(d => d.DonationType)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Type, g => g.Count);

        var summary = new { totalDonationsThisYear = totalThisYear, amountThisYear, totalDonationsThisMonth = totalThisMonth, amountThisMonth, recurringDonors = recurring, donorsAtChurnRisk = atRisk, lapsedDonors = lapsed, byType };
        var system  = "You are a nonprofit development assistant. Write a 3-5 sentence giving summary for an admin. Mention highlights, compare month vs year, flag churn risk and lapsed donors as action items.";
        var user    = $"Giving data: {JsonSerializer.Serialize(summary)}";
        return new Tier2Prompt(system, user);
    }

    // ─── Tier 4 domain-scoped context (for creative/draft prompted buttons) ───
    // Like full GatherContext but only pulls the relevant domain's data.

    private async Task<string> GatherDomainContext(string key, string message)
    {
        // Resident creative prompts — only load resident + related data
        if (key.StartsWith("resident."))
            return await GetResidentSummary() + "\n\n" + await GetGeneralOverview();

        // Donor creative prompts (thank-you, re-engagement drafts)
        if (key.StartsWith("donor."))
            return await GetDonationSummary() + "\n\n" + await GetLapsedDonors() + "\n\n" + await GetDetailedChurnData();

        // Social creative prompts (post drafts, content calendar, tone check)
        if (key.StartsWith("social."))
            return await GetSocialMediaContext();

        // Fallback to full context for unrecognised keys
        return await GatherContext(message);
    }

    // ─── Context gathering (Tier 4 free-typed) ───────────────────────────────

    private async Task<string> GatherContext(string message)
    {
        var lower = message.ToLowerInvariant();
        var parts = new List<string>();

        // ── Extract date range from the user's question ───────────────────────
        // Handles: "last September 2025", "this month", "Q3 2025", "last year", etc.
        var (dateFrom, dateTo) = ParseDateRange(message);
        var hasDateFilter      = dateFrom.HasValue || dateTo.HasValue;
        var effectiveTo        = dateTo ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // ── Specific resident lookup (e.g. "LS-0002", "resident #5", "ID 12") ──
        // Check for a case control number pattern like LS-0002 or SH-0010
        var caseCodeMatch = Regex.Match(message, @"\b([A-Z]{2,4}-\d{3,6})\b", RegexOptions.IgnoreCase);
        if (caseCodeMatch.Success)
        {
            var code = caseCodeMatch.Groups[1].Value.ToUpper();
            parts.Add(await GetSpecificResidentByCode(code));
        }

        // Check for a numeric resident ID (e.g. "resident 5", "resident ID 12", "#42")
        var idMatch = Regex.Match(lower, @"(?:resident\s*(?:id|#|no\.?)?\s*|#)(\d+)\b");
        if (idMatch.Success && int.TryParse(idMatch.Groups[1].Value, out var residentId))
        {
            parts.Add(await GetSpecificResidentById(residentId));
        }

        // ── Aggregate / category queries ──────────────────────────────────────

        // Long-stay / transition planning residents (30+ days)
        if (lower.Contains("30") || lower.Contains("transition plan") ||
            lower.Contains("long stay") || lower.Contains("been here") ||
            lower.Contains("length of stay"))
        {
            parts.Add(await GetLongStayResidents());
        }

        // Safety concerns flagged recently
        if ((lower.Contains("safety") || lower.Contains("flagged") || lower.Contains("concern")) &&
            !caseCodeMatch.Success && !idMatch.Success)
        {
            parts.Add(await GetRecentSafetyConcerns());
        }

        // Residents potentially falling through the cracks
        if (lower.Contains("falling through") || lower.Contains("attention") ||
            lower.Contains("at risk") || lower.Contains("overlooked") ||
            lower.Contains("no recent visit"))
        {
            parts.Add(await GetResidentsFallingThroughCracks());
        }

        // Resident / participant aggregate queries
        if (lower.Contains("resident") || lower.Contains("participant") ||
            lower.Contains("case status") || lower.Contains("client") ||
            lower.Contains("survivor") || lower.Contains("admission") ||
            lower.Contains("reintegration") || lower.Contains("safehouse occupancy"))
        {
            if (!caseCodeMatch.Success && !idMatch.Success &&
                !lower.Contains("30") && !lower.Contains("transition") &&
                !lower.Contains("falling through") && !lower.Contains("attention"))
            {
                if (hasDateFilter)
                    parts.Add(await GetResidentsByDateRange(dateFrom!.Value, effectiveTo));
                else
                    parts.Add(await GetResidentSummary());
            }
        }

        // Lapsed donor queries
        if (lower.Contains("lapsed") || lower.Contains("haven't given") ||
            lower.Contains("6 month") || lower.Contains("six month") ||
            lower.Contains("re-engage") || lower.Contains("reengage") ||
            lower.Contains("inactive donor"))
        {
            parts.Add(await GetLapsedDonors());
        }

        // Thank-you / re-engagement drafts — pass to AI with recent donor context
        if (lower.Contains("thank") || lower.Contains("re-engagement") ||
            lower.Contains("follow-up email") || lower.Contains("draft"))
        {
            parts.Add(await GetDonationSummary());
        }

        // Health & wellbeing queries
        if (lower.Contains("health") || lower.Contains("medical") ||
            lower.Contains("checkup") || lower.Contains("nutrition") ||
            lower.Contains("sleep") || lower.Contains("psychological") ||
            lower.Contains("dental") || lower.Contains("wellbeing") ||
            lower.Contains("well-being") || lower.Contains("energy"))
        {
            parts.Add(await GetHealthSummary());
        }

        // Education queries
        if (lower.Contains("education") || lower.Contains("school") ||
            lower.Contains("attendance") || lower.Contains("enrollment") ||
            lower.Contains("enrolled") || lower.Contains("progress") ||
            lower.Contains("completion") || lower.Contains("learning"))
        {
            parts.Add(await GetEducationSummary());
        }

        // Case conference queries
        if (lower.Contains("conference") || lower.Contains("case conference") ||
            lower.Contains("upcoming") || lower.Contains("scheduled"))
        {
            parts.Add(await GetCaseConferenceSummary());
        }

        // Process / counselling session queries
        if (lower.Contains("session") || lower.Contains("counsell") ||
            lower.Contains("therapy") || lower.Contains("emotional") ||
            lower.Contains("process recording") || lower.Contains("intervention applied") ||
            lower.Contains("narrative"))
        {
            parts.Add(await GetProcessRecordingSummary());
        }

        // Intervention plan queries
        if (lower.Contains("intervention") || lower.Contains("plan") ||
            lower.Contains("services provided") || lower.Contains("overdue") ||
            lower.Contains("target date"))
        {
            parts.Add(await GetInterventionPlanSummary());
        }

        // In-kind donation queries
        if (lower.Contains("in-kind") || lower.Contains("in kind") ||
            lower.Contains("item") || lower.Contains("goods") ||
            lower.Contains("supply") || lower.Contains("supplies") ||
            lower.Contains("donated item"))
        {
            parts.Add(await GetInKindDonationSummary());
        }

        // Donation allocation queries
        if (lower.Contains("allocation") || lower.Contains("allocated") ||
            lower.Contains("program area") || lower.Contains("where") &&
            (lower.Contains("money") || lower.Contains("fund")))
        {
            parts.Add(await GetDonationAllocationSummary());
        }

        // Detailed churn prediction queries
        if (lower.Contains("churn") || lower.Contains("risk level") ||
            lower.Contains("churn probability") || lower.Contains("prediction"))
        {
            parts.Add(await GetDetailedChurnData());
        }

        // General donor / donation queries
        if (lower.Contains("donor") || lower.Contains("donation") ||
            lower.Contains("supporter") || lower.Contains("contribut") ||
            lower.Contains("fund") || lower.Contains("giving") ||
            lower.Contains("amount") || lower.Contains("recurring") ||
            lower.Contains("campaign"))
        {
            if (hasDateFilter)
                parts.Add(await GetDonationsByDateRange(dateFrom!.Value, effectiveTo));
            else
                parts.Add(await GetDonationSummary());
        }

        // Safehouse / facility queries
        if (lower.Contains("safehouse") || lower.Contains("capacity") ||
            lower.Contains("facility") || lower.Contains("location") ||
            lower.Contains("region") || lower.Contains("occupancy"))
        {
            parts.Add(await GetSafehouseSummary());
        }

        // Social media queries
        if (lower.Contains("social media") || lower.Contains("post") ||
            lower.Contains("content") || lower.Contains("engagement") ||
            lower.Contains("awareness") || lower.Contains("draft") ||
            lower.Contains("caption") || lower.Contains("calendar") ||
            lower.Contains("tone") || lower.Contains("trauma-informed"))
        {
            if (hasDateFilter)
                parts.Add(await GetSocialMediaByDateRange(dateFrom!.Value, effectiveTo));
            else
                parts.Add(await GetSocialMediaContext());
        }

        // Home visitation queries
        if (lower.Contains("visit") || lower.Contains("visitation") ||
            lower.Contains("home visit") || lower.Contains("social worker") ||
            lower.Contains("follow up") || lower.Contains("pending"))
        {
            if (caseCodeMatch.Success || idMatch.Success)
            {
                Resident? specificResident = null;
                if (caseCodeMatch.Success)
                    specificResident = await _db.Residents.FirstOrDefaultAsync(r => r.CaseControlNo == caseCodeMatch.Groups[1].Value.ToUpper());
                else if (idMatch.Success && int.TryParse(idMatch.Groups[1].Value, out var rid))
                    specificResident = await _db.Residents.FirstOrDefaultAsync(r => r.ResidentId == rid);

                if (specificResident != null)
                    parts.Add(await GetResidentVisitations(specificResident.ResidentId));
                else if (hasDateFilter)
                    parts.Add(await GetVisitationsByDateRange(dateFrom!.Value, effectiveTo));
                else
                    parts.Add(await GetVisitationSummary());
            }
            else
            {
                if (hasDateFilter)
                    parts.Add(await GetVisitationsByDateRange(dateFrom!.Value, effectiveTo));
                else
                    parts.Add(await GetVisitationSummary());
            }
        }

        // Daily briefing / cross-category overview
        if (parts.Count == 0 ||
            lower.Contains("briefing") || lower.Contains("overview") ||
            lower.Contains("how many") || lower.Contains("total") ||
            lower.Contains("summary") || lower.Contains("report") ||
            lower.Contains("update") || lower.Contains("today") ||
            lower.Contains("board") || lower.Contains("quarter"))
        {
            if (hasDateFilter && parts.Count == 0)
            {
                // Date range given but no specific entity matched — pull a broad
                // date-filtered cross-table snapshot.
                parts.Add(await GetResidentsByDateRange(dateFrom!.Value, effectiveTo));
                parts.Add(await GetDonationsByDateRange(dateFrom!.Value, effectiveTo));
                parts.Add(await GetVisitationsByDateRange(dateFrom!.Value, effectiveTo));
            }
            else if (!hasDateFilter)
            {
                // No date filter — use the standard general overview
                parts.Add(await GetGeneralOverview());
            }
            // If hasDateFilter && parts.Count > 0, the relevant date-filtered data
            // was already added above — don't mix in the non-filtered overview.
        }

        return string.Join("\n\n", parts);
    }

    // ── Residents here 30+ days who may need transition planning ─────────────
    private async Task<string> GetLongStayResidents()
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var longStay = await _db.Residents
            .Where(r => r.DateOfAdmission != null && r.DateOfAdmission <= cutoff)
            .OrderBy(r => r.DateOfAdmission)
            .Select(r => new
            {
                r.CaseControlNo,
                r.InternalCode,
                r.DateOfAdmission,
                r.CaseStatus,
                r.ReintegrationStatus,
                r.AssignedSocialWorker,
                r.SafehouseId
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== RESIDENTS HERE 30+ DAYS ===");
        sb.AppendLine($"Total: {longStay.Count} residents admitted 30 or more days ago");

        foreach (var r in longStay)
        {
            var days = r.DateOfAdmission.HasValue
                ? (DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - r.DateOfAdmission.Value.DayNumber)
                : 0;
            sb.AppendLine($"  - {r.CaseControlNo ?? r.InternalCode ?? $"ID {r.SafehouseId}"} | {days} days | Status: {r.CaseStatus ?? "N/A"} | Reintegration: {r.ReintegrationStatus ?? "N/A"} | Worker: {r.AssignedSocialWorker ?? "N/A"}");
        }

        return sb.ToString();
    }

    // ── Safety concerns flagged in the last 7 days ────────────────────────────
    private async Task<string> GetRecentSafetyConcerns()
    {
        var weekAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));

        var concerns = await _db.HomeVisitations
            .Where(v => v.SafetyConcernsNoted == true && v.VisitDate >= weekAgo)
            .OrderByDescending(v => v.VisitDate)
            .Select(v => new
            {
                v.ResidentId,
                v.VisitDate,
                v.SocialWorker,
                v.Observations,
                v.FollowUpNeeded,
                v.FollowUpNotes
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== SAFETY CONCERNS FLAGGED THIS WEEK ===");
        sb.AppendLine($"Total flagged visitations in the last 7 days: {concerns.Count}");

        foreach (var c in concerns)
        {
            sb.AppendLine($"  - Resident ID {c.ResidentId} | {c.VisitDate} | Worker: {c.SocialWorker}");
            if (!string.IsNullOrWhiteSpace(c.Observations))
                sb.AppendLine($"    Observations: {c.Observations}");
            sb.AppendLine($"    Follow-up needed: {(c.FollowUpNeeded == true ? "Yes" : "No")}");
            if (!string.IsNullOrWhiteSpace(c.FollowUpNotes))
                sb.AppendLine($"    Notes: {c.FollowUpNotes}");
        }

        return sb.ToString();
    }

    // ── Residents who may be falling through the cracks ──────────────────────
    // Criteria: long stay OR no visitation in 30+ days OR pending follow-up
    private async Task<string> GetResidentsFallingThroughCracks()
    {
        var cutoff30 = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        // Residents with no visitation in 30+ days
        var recentlyVisitedIds = await _db.HomeVisitations
            .Where(v => v.VisitDate >= cutoff30)
            .Select(v => v.ResidentId)
            .Distinct()
            .ToListAsync();

        var noRecentVisit = await _db.Residents
            .Where(r => !recentlyVisitedIds.Contains(r.ResidentId))
            .Select(r => new { r.CaseControlNo, r.InternalCode, r.ResidentId, r.CaseStatus, r.DateOfAdmission, r.AssignedSocialWorker })
            .ToListAsync();

        // Residents with pending follow-ups
        var pendingFollowUpIds = await _db.HomeVisitations
            .Where(v => v.FollowUpNeeded == true)
            .Select(v => v.ResidentId)
            .Distinct()
            .ToListAsync();

        // Long-stay residents (30+ days)
        var longStayCount = await _db.Residents
            .CountAsync(r => r.DateOfAdmission != null && r.DateOfAdmission <= cutoff30);

        var sb = new StringBuilder();
        sb.AppendLine("=== RESIDENTS WHO MAY NEED ATTENTION ===");
        sb.AppendLine($"Residents with no home visit in the last 30 days: {noRecentVisit.Count}");

        foreach (var r in noRecentVisit.Take(10))
        {
            var label = r.CaseControlNo ?? r.InternalCode ?? $"Resident {r.ResidentId}";
            var admitDays = r.DateOfAdmission.HasValue
                ? (DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - r.DateOfAdmission.Value.DayNumber)
                : 0;
            sb.AppendLine($"  - {label} | {admitDays} days in care | Status: {r.CaseStatus ?? "N/A"} | Worker: {r.AssignedSocialWorker ?? "N/A"}");
        }

        if (noRecentVisit.Count > 10)
            sb.AppendLine($"  ... and {noRecentVisit.Count - 10} more.");

        sb.AppendLine($"Residents with unresolved follow-up actions: {pendingFollowUpIds.Count}");
        sb.AppendLine($"Residents admitted 30+ days ago: {longStayCount}");

        return sb.ToString();
    }

    // ── Lapsed donors (no donation in 6+ months) ──────────────────────────────
    private async Task<string> GetLapsedDonors()
    {
        var sixMonthsAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6));

        // Find supporter IDs with a donation in the last 6 months
        var activeIds = await _db.Donations
            .Where(d => d.DonationDate >= sixMonthsAgo)
            .Select(d => d.SupporterId)
            .Distinct()
            .ToListAsync();

        var lapsed = await _db.Supporters
            .Where(s => s.Status == "Active" && !activeIds.Contains(s.SupporterId))
            .OrderBy(s => s.FirstDonationDate)
            .Select(s => new
            {
                s.DisplayName,
                s.Email,
                s.SupporterType,
                s.FirstDonationDate,
                s.AcquisitionChannel
            })
            .Take(20)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== LAPSED DONORS (NO DONATION IN 6+ MONTHS) ===");
        sb.AppendLine($"Total lapsed active supporters: {lapsed.Count}{(lapsed.Count == 20 ? "+" : "")}");

        foreach (var s in lapsed)
        {
            sb.AppendLine($"  - {s.DisplayName} ({s.SupporterType}) | First donated: {s.FirstDonationDate?.ToString() ?? "N/A"} | Channel: {s.AcquisitionChannel ?? "N/A"}");
        }

        return sb.ToString();
    }

    // ── Social media context ──────────────────────────────────────────────────
    private async Task<string> GetSocialMediaContext()
    {
        var totalPosts = await _db.SocialMediaPosts.CountAsync();
        var lastPost = await _db.SocialMediaPosts
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        var daysSinceLastPost = lastPost != null
            ? (int)(DateTime.UtcNow - lastPost.CreatedAt).TotalDays
            : -1;

        // Top performing posts by engagement rate
        var topPosts = await _db.SocialMediaPosts
            .OrderByDescending(p => p.EngagementRate)
            .Take(5)
            .Select(p => new
            {
                p.Platform,
                p.PostType,
                p.ContentTopic,
                p.EngagementRate,
                p.Likes,
                p.Shares,
                p.Reach,
                p.SentimentTone,
                p.CreatedAt,
                p.Caption
            })
            .ToListAsync();

        // Platform breakdown
        var byPlatform = await _db.SocialMediaPosts
            .GroupBy(p => p.Platform)
            .Select(g => new { Platform = g.Key, Count = g.Count(), AvgEngagement = g.Average(p => p.EngagementRate) })
            .ToListAsync();

        // Content topic breakdown
        var byTopic = await _db.SocialMediaPosts
            .Where(p => p.ContentTopic != null)
            .GroupBy(p => p.ContentTopic!)
            .Select(g => new { Topic = g.Key, Count = g.Count(), AvgEngagement = g.Average(p => p.EngagementRate) })
            .OrderByDescending(g => g.AvgEngagement)
            .Take(5)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== SOCIAL MEDIA DATA ===");
        sb.AppendLine($"Total posts on record: {totalPosts}");
        sb.AppendLine($"Days since last post: {(daysSinceLastPost >= 0 ? daysSinceLastPost.ToString() : "No posts on record")}");

        if (lastPost != null)
            sb.AppendLine($"Last post: {lastPost.CreatedAt:MMMM d, yyyy} on {lastPost.Platform} ({lastPost.PostType})");

        if (byPlatform.Any())
        {
            sb.AppendLine("Platform breakdown:");
            foreach (var p in byPlatform)
                sb.AppendLine($"  - {p.Platform}: {p.Count} posts, avg engagement {p.AvgEngagement:P1}");
        }

        if (byTopic.Any())
        {
            sb.AppendLine("Top content topics by engagement:");
            foreach (var t in byTopic)
                sb.AppendLine($"  - {t.Topic}: {t.Count} posts, avg engagement {t.AvgEngagement:P1}");
        }

        if (topPosts.Any())
        {
            sb.AppendLine("Top 5 posts by engagement rate:");
            foreach (var p in topPosts)
            {
                sb.AppendLine($"  - {p.CreatedAt:MMM d, yyyy} | {p.Platform} | {p.PostType} | Topic: {p.ContentTopic ?? "N/A"} | Engagement: {p.EngagementRate:P1} | Reach: {p.Reach:N0} | Likes: {p.Likes}");
                if (!string.IsNullOrWhiteSpace(p.Caption))
                    sb.AppendLine($"    Caption preview: {p.Caption[..Math.Min(120, p.Caption.Length)]}…");
            }
        }

        return sb.ToString();
    }

    // ── Look up a specific resident by case control number (e.g. "LS-0002") ────
    private async Task<string> GetSpecificResidentByCode(string caseControlNo)
    {
        var resident = await _db.Residents.FirstOrDefaultAsync(r => r.CaseControlNo == caseControlNo);
        if (resident == null)
            return $"=== SPECIFIC RESIDENT LOOKUP ===\nNo resident found with case control number '{caseControlNo}'.";
        return await FormatFullResidentRecord(resident);
    }

    private async Task<string> GetSpecificResidentById(int residentId)
    {
        var resident = await _db.Residents.FirstOrDefaultAsync(r => r.ResidentId == residentId);
        if (resident == null)
            return $"=== SPECIFIC RESIDENT LOOKUP ===\nNo resident found with ID {residentId}.";
        return await FormatFullResidentRecord(resident);
    }

    // ── Full resident record — core fields + all related tables ──────────────
    private async Task<string> FormatFullResidentRecord(Resident r)
    {
        var sb = new StringBuilder();

        // ── Core demographics & case info ─────────────────────────────────────
        sb.AppendLine("=== RESIDENT RECORD ===");
        sb.AppendLine($"Case Control No: {r.CaseControlNo ?? "N/A"}");
        sb.AppendLine($"Internal Code: {r.InternalCode ?? "N/A"}");
        sb.AppendLine($"Resident ID: {r.ResidentId}");
        sb.AppendLine($"Case Status: {r.CaseStatus ?? "N/A"}");
        sb.AppendLine($"Case Category: {r.CaseCategory ?? "N/A"}");
        sb.AppendLine($"Sex: {r.Sex ?? "N/A"}");
        sb.AppendLine($"Date of Birth: {r.DateOfBirth?.ToString() ?? "N/A"}");
        sb.AppendLine($"Present Age: {r.PresentAge ?? "N/A"}");
        sb.AppendLine($"Place of Birth: {r.PlaceOfBirth ?? "N/A"}");
        sb.AppendLine($"Religion: {r.Religion ?? "N/A"}");
        sb.AppendLine($"Birth Status: {r.BirthStatus ?? "N/A"}");

        // Safehouse
        if (r.SafehouseId.HasValue)
        {
            var sh = await _db.Safehouses.FirstOrDefaultAsync(s => s.SafehouseId == r.SafehouseId);
            sb.AppendLine($"Safehouse: {sh?.Name ?? $"ID {r.SafehouseId}"} ({sh?.City}, {sh?.Region})");
        }

        // Admission
        sb.AppendLine($"Date of Admission: {r.DateOfAdmission?.ToString() ?? "N/A"}");
        sb.AppendLine($"Age Upon Admission: {r.AgeUponAdmission ?? "N/A"}");
        sb.AppendLine($"Length of Stay: {r.LengthOfStay ?? "N/A"}");
        sb.AppendLine($"Date Enrolled: {r.DateEnrolled?.ToString() ?? "N/A"}");
        sb.AppendLine($"Date Closed: {r.DateClosed?.ToString() ?? "N/A"}");
        sb.AppendLine($"Referral Source: {r.ReferralSource ?? "N/A"}");
        sb.AppendLine($"Referring Agency/Person: {r.ReferringAgencyPerson ?? "N/A"}");
        sb.AppendLine($"Assigned Social Worker: {r.AssignedSocialWorker ?? "N/A"}");

        // Risk & assessment
        sb.AppendLine($"Initial Risk Level: {r.InitialRiskLevel ?? "N/A"}");
        sb.AppendLine($"Current Risk Level: {r.CurrentRiskLevel ?? "N/A"}");
        sb.AppendLine($"Initial Case Assessment: {r.InitialCaseAssessment ?? "N/A"}");
        sb.AppendLine($"Date Case Study Prepared: {r.DateCaseStudyPrepared?.ToString() ?? "N/A"}");

        // Reintegration
        sb.AppendLine($"Reintegration Type: {r.ReintegrationType ?? "N/A"}");
        sb.AppendLine($"Reintegration Status: {r.ReintegrationStatus ?? "N/A"}");

        // Disability & special needs
        sb.AppendLine($"Is PWD: {(r.IsPwd ? "Yes" : "No")}");
        if (r.IsPwd) sb.AppendLine($"PWD Type: {r.PwdType ?? "N/A"}");
        sb.AppendLine($"Has Special Needs: {(r.HasSpecialNeeds ? "Yes" : "No")}");
        if (r.HasSpecialNeeds) sb.AppendLine($"Special Needs Diagnosis: {r.SpecialNeedsDiagnosis ?? "N/A"}");

        // Vulnerability sub-categories
        var subCats = new List<string>();
        if (r.SubCatOrphaned) subCats.Add("Orphaned");
        if (r.SubCatTrafficked) subCats.Add("Trafficked");
        if (r.SubCatChildLabor) subCats.Add("Child Labor");
        if (r.SubCatPhysicalAbuse) subCats.Add("Physical Abuse");
        if (r.SubCatSexualAbuse) subCats.Add("Sexual Abuse");
        if (r.SubCatOsaec) subCats.Add("OSAEC");
        if (r.SubCatCicl) subCats.Add("CICL");
        if (r.SubCatAtRisk) subCats.Add("At Risk");
        if (r.SubCatStreetChild) subCats.Add("Street Child");
        if (r.SubCatChildWithHiv) subCats.Add("Child with HIV");
        sb.AppendLine($"Vulnerability Sub-categories: {(subCats.Any() ? string.Join(", ", subCats) : "None flagged")}");

        // Family background
        var familyFlags = new List<string>();
        if (r.FamilyIs4ps) familyFlags.Add("4Ps beneficiary");
        if (r.FamilySoloParent) familyFlags.Add("Solo parent");
        if (r.FamilyIndigenous) familyFlags.Add("Indigenous");
        if (r.FamilyParentPwd) familyFlags.Add("Parent with PWD");
        if (r.FamilyInformalSettler) familyFlags.Add("Informal settler");
        sb.AppendLine($"Family Background: {(familyFlags.Any() ? string.Join(", ", familyFlags) : "None flagged")}");

        if (!string.IsNullOrWhiteSpace(r.NotesRestricted))
            sb.AppendLine($"Restricted Notes: {r.NotesRestricted}");

        // ── Health & Wellbeing records ─────────────────────────────────────────
        var healthRecords = await _db.HealthWellbeingRecords
            .Where(h => h.ResidentId == r.ResidentId)
            .OrderByDescending(h => h.RecordDate)
            .Take(3)
            .ToListAsync();

        if (healthRecords.Any())
        {
            sb.AppendLine("\n--- Health & Wellbeing ---");
            foreach (var h in healthRecords)
            {
                sb.AppendLine($"  Date: {h.RecordDate}");
                sb.AppendLine($"    General health: {h.GeneralHealthScore}/10 | Nutrition: {h.NutritionScore}/10 | Sleep: {h.SleepQualityScore}/10 | Energy: {h.EnergyLevelScore}/10");
                sb.AppendLine($"    Medical checkup done: {(h.MedicalCheckupDone == true ? "Yes" : "No")} | Dental: {(h.DentalCheckupDone == true ? "Yes" : "No")} | Psychological: {(h.PsychologicalCheckupDone == true ? "Yes" : "No")}");
            }
        }

        // ── Education records ──────────────────────────────────────────────────
        var educationRecords = await _db.EducationRecords
            .Where(e => e.ResidentId == r.ResidentId)
            .OrderByDescending(e => e.RecordDate)
            .Take(3)
            .ToListAsync();

        if (educationRecords.Any())
        {
            sb.AppendLine("\n--- Education ---");
            foreach (var e in educationRecords)
            {
                sb.AppendLine($"  Date: {e.RecordDate} | Status: {e.EnrollmentStatus ?? "N/A"} | Attendance: {e.AttendanceRate?.ToString("P0") ?? "N/A"} | Progress: {e.ProgressPercent?.ToString("P0") ?? "N/A"} | Completion: {e.CompletionStatus ?? "N/A"}");
            }
        }

        // ── Case conferences ───────────────────────────────────────────────────
        var conferences = await _db.CaseConferences
            .Where(c => c.ResidentId == r.ResidentId)
            .OrderByDescending(c => c.ConferenceDate)
            .Take(5)
            .ToListAsync();

        if (conferences.Any())
        {
            sb.AppendLine("\n--- Case Conferences ---");
            foreach (var c in conferences)
            {
                sb.AppendLine($"  {c.ConferenceDate} | Type: {c.ConferenceType ?? "N/A"} | Worker: {c.SocialWorker ?? "N/A"}");
                if (!string.IsNullOrWhiteSpace(c.Summary)) sb.AppendLine($"    Summary: {c.Summary}");
                if (!string.IsNullOrWhiteSpace(c.DecisionsMade)) sb.AppendLine($"    Decisions: {c.DecisionsMade}");
                if (c.NextConferenceDate.HasValue) sb.AppendLine($"    Next conference: {c.NextConferenceDate}");
            }
        }

        // ── Process (therapy/counselling) sessions ─────────────────────────────
        var sessions = await _db.ProcessRecordings
            .Where(p => p.ResidentId == r.ResidentId)
            .OrderByDescending(p => p.SessionDate)
            .Take(5)
            .ToListAsync();

        if (sessions.Any())
        {
            sb.AppendLine("\n--- Counselling / Process Sessions ---");
            foreach (var s in sessions)
            {
                sb.AppendLine($"  {s.SessionDate} | Type: {s.SessionType ?? "N/A"} | Duration: {s.SessionDurationMinutes} min | Worker: {s.SocialWorker ?? "N/A"}");
                sb.AppendLine($"    Emotional state (start → end): {s.EmotionalStateObserved ?? "N/A"} → {s.EmotionalStateEnd ?? "N/A"}");
                if (!string.IsNullOrWhiteSpace(s.InterventionsApplied)) sb.AppendLine($"    Interventions: {s.InterventionsApplied}");
                if (!string.IsNullOrWhiteSpace(s.SessionNarrative)) sb.AppendLine($"    Narrative: {s.SessionNarrative}");
                if (!string.IsNullOrWhiteSpace(s.FollowUpActions)) sb.AppendLine($"    Follow-up actions: {s.FollowUpActions}");
                sb.AppendLine($"    Progress noted: {(s.ProgressNoted == true ? "Yes" : "No")} | Concerns flagged: {(s.ConcernsFlagged == true ? "Yes" : "No")} | Referral made: {(s.ReferralMade == true ? "Yes" : "No")}");
            }
        }

        // ── Intervention plans ─────────────────────────────────────────────────
        var plans = await _db.InterventionPlans
            .Where(p => p.ResidentId == r.ResidentId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        if (plans.Any())
        {
            sb.AppendLine("\n--- Intervention Plans ---");
            foreach (var p in plans)
            {
                sb.AppendLine($"  Category: {p.PlanCategory ?? "N/A"} | Status: {p.Status ?? "N/A"} | Target date: {p.TargetDate?.ToString() ?? "N/A"}");
                if (!string.IsNullOrWhiteSpace(p.PlanDescription)) sb.AppendLine($"    Description: {p.PlanDescription}");
                if (!string.IsNullOrWhiteSpace(p.ServicesProvided)) sb.AppendLine($"    Services: {p.ServicesProvided}");
            }
        }

        return sb.ToString();
    }

    private async Task<string> GetResidentSummary()
    {
        var totalResidents = await _db.Residents.CountAsync();

        var caseStatusGroups = await _db.Residents
            .Where(r => r.CaseStatus != null)
            .GroupBy(r => r.CaseStatus!)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var recentAdmissions = await _db.Residents
            .CountAsync(r => r.DateOfAdmission >= thirtyDaysAgo);

        var bySafehouse = await _db.Residents
            .Where(r => r.SafehouseId != null)
            .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => new { s.Name, s.SafehouseId })
            .GroupBy(x => x.Name)
            .Select(g => new { Safehouse = g.Key, Count = g.Count() })
            .ToListAsync();

        var caseCategoryGroups = await _db.Residents
            .Where(r => r.CaseCategory != null)
            .GroupBy(r => r.CaseCategory!)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .Take(5)
            .ToListAsync();

        var reintegrationGroups = await _db.Residents
            .Where(r => r.ReintegrationStatus != null)
            .GroupBy(r => r.ReintegrationStatus!)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var pwdCount = await _db.Residents.CountAsync(r => r.IsPwd);

        var sb = new StringBuilder();
        sb.AppendLine("=== RESIDENT / PARTICIPANT DATA ===");
        sb.AppendLine($"Total residents in database: {totalResidents}");
        sb.AppendLine($"New admissions in last 30 days: {recentAdmissions}");

        if (caseStatusGroups.Any())
        {
            sb.AppendLine("Case status breakdown:");
            foreach (var g in caseStatusGroups)
                sb.AppendLine($"  - {g.Status}: {g.Count}");
        }

        if (bySafehouse.Any())
        {
            sb.AppendLine("Residents by safehouse:");
            foreach (var s in bySafehouse)
                sb.AppendLine($"  - {s.Safehouse}: {s.Count}");
        }

        if (caseCategoryGroups.Any())
        {
            sb.AppendLine("Top case categories:");
            foreach (var c in caseCategoryGroups)
                sb.AppendLine($"  - {c.Category}: {c.Count}");
        }

        if (reintegrationGroups.Any())
        {
            sb.AppendLine("Reintegration status:");
            foreach (var r in reintegrationGroups)
                sb.AppendLine($"  - {r.Status}: {r.Count}");
        }

        sb.AppendLine($"Residents with disabilities (PWD): {pwdCount}");

        return sb.ToString();
    }

    private async Task<string> GetDonationSummary()
    {
        var totalSupporters = await _db.Supporters.CountAsync();
        var activeSupporters = await _db.Supporters.CountAsync(s => s.Status == "Active");

        var supporterTypeGroups = await _db.Supporters
            .GroupBy(s => s.SupporterType)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var currentYear = DateTime.UtcNow.Year;
        var yearStart = new DateOnly(currentYear, 1, 1);

        var donationsThisYear = await _db.Donations
            .Where(d => d.DonationDate >= yearStart)
            .CountAsync();

        var totalAmountThisYear = await _db.Donations
            .Where(d => d.DonationDate >= yearStart && d.Amount != null)
            .SumAsync(d => (decimal?)d.Amount ?? 0m);

        var recurringDonorCount = await _db.Donations
            .Where(d => d.IsRecurring)
            .Select(d => d.SupporterId)
            .Distinct()
            .CountAsync();

        var donationTypeGroups = await _db.Donations
            .GroupBy(d => d.DonationType)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var recentDonations = await _db.Donations
            .Include(d => d.Supporter)
            .OrderByDescending(d => d.DonationDate)
            .Take(5)
            .Select(d => new
            {
                d.Supporter.DisplayName,
                d.Amount,
                d.DonationDate,
                d.DonationType,
                d.IsRecurring
            })
            .ToListAsync();

        // Churn risk
        var atRiskCount = await _db.DonorChurnPredictions
            .CountAsync(p => p.ChurnProbability > 0.7m);

        var sb = new StringBuilder();
        sb.AppendLine("=== DONOR & DONATION DATA ===");
        sb.AppendLine($"Total supporters: {totalSupporters}");
        sb.AppendLine($"Active supporters: {activeSupporters}");
        sb.AppendLine($"Recurring donors: {recurringDonorCount}");
        sb.AppendLine($"Donors at churn risk (>70%): {atRiskCount}");

        if (supporterTypeGroups.Any())
        {
            sb.AppendLine("Supporter types:");
            foreach (var g in supporterTypeGroups)
                sb.AppendLine($"  - {g.Type}: {g.Count}");
        }

        sb.AppendLine($"Donations this year ({currentYear}): {donationsThisYear}");
        sb.AppendLine($"Total cash donated this year: ${totalAmountThisYear:N2}");

        if (donationTypeGroups.Any())
        {
            sb.AppendLine("Donation types:");
            foreach (var g in donationTypeGroups)
                sb.AppendLine($"  - {g.Type}: {g.Count}");
        }

        if (recentDonations.Any())
        {
            sb.AppendLine("5 most recent donations:");
            foreach (var d in recentDonations)
            {
                var amount = d.Amount.HasValue ? $"${d.Amount:N2}" : "In-kind";
                var recurring = d.IsRecurring ? " (recurring)" : "";
                sb.AppendLine($"  - {d.DisplayName}: {amount} — {d.DonationType}{recurring} on {d.DonationDate}");
            }
        }

        return sb.ToString();
    }

    private async Task<string> GetSafehouseSummary()
    {
        var safehouses = await _db.Safehouses.ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== SAFEHOUSE DATA ===");
        sb.AppendLine($"Total safehouses: {safehouses.Count}");

        foreach (var s in safehouses)
        {
            var residentCount = await _db.Residents.CountAsync(r => r.SafehouseId == s.SafehouseId);
            var occupancyPct = s.CapacityGirls > 0
                ? $"{(residentCount * 100.0 / s.CapacityGirls):N0}% capacity"
                : "capacity unknown";
            sb.AppendLine($"  - {s.Name} ({s.City}, {s.Region}) — {residentCount}/{s.CapacityGirls} residents [{occupancyPct}] — Status: {s.Status}");
        }

        return sb.ToString();
    }

    private async Task<string> GetVisitationSummary()
    {
        var totalVisitations = await _db.HomeVisitations.CountAsync();

        var thisMonthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var thisMonthCount = await _db.HomeVisitations
            .CountAsync(v => v.VisitDate >= thisMonthStart);

        var followUpNeeded = await _db.HomeVisitations
            .CountAsync(v => v.FollowUpNeeded == true);

        var safetyConcerns = await _db.HomeVisitations
            .CountAsync(v => v.SafetyConcernsNoted == true);

        var recentVisits = await _db.HomeVisitations
            .OrderByDescending(v => v.VisitDate)
            .Take(5)
            .Select(v => new { v.VisitDate, v.SocialWorker, v.VisitType, v.VisitOutcome, v.FollowUpNeeded })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== HOME VISITATION DATA ===");
        sb.AppendLine($"Total home visitations on record: {totalVisitations}");
        sb.AppendLine($"Visitations this month: {thisMonthCount}");
        sb.AppendLine($"Pending follow-ups: {followUpNeeded}");
        sb.AppendLine($"Visits with safety concerns noted: {safetyConcerns}");

        if (recentVisits.Any())
        {
            sb.AppendLine("5 most recent visitations:");
            foreach (var v in recentVisits)
            {
                var followUp = v.FollowUpNeeded == true ? " ⚠ Follow-up needed" : "";
                sb.AppendLine($"  - {v.VisitDate} | {v.SocialWorker} | {v.VisitType} | Outcome: {v.VisitOutcome}{followUp}");
            }
        }

        return sb.ToString();
    }

    private async Task<string> GetResidentVisitations(int residentId)
    {
        var visitations = await _db.HomeVisitations
            .Where(v => v.ResidentId == residentId)
            .OrderByDescending(v => v.VisitDate)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine($"=== VISITATION HISTORY FOR RESIDENT ID {residentId} ===");
        sb.AppendLine($"Total visitations: {visitations.Count}");

        foreach (var v in visitations)
        {
            sb.AppendLine($"  Date: {v.VisitDate} | Type: {v.VisitType} | Worker: {v.SocialWorker}");
            sb.AppendLine($"    Location: {v.LocationVisited ?? "N/A"}");
            sb.AppendLine($"    Purpose: {v.Purpose ?? "N/A"}");
            sb.AppendLine($"    Outcome: {v.VisitOutcome ?? "N/A"}");
            sb.AppendLine($"    Safety concerns: {(v.SafetyConcernsNoted == true ? "Yes" : "No")}");
            sb.AppendLine($"    Follow-up needed: {(v.FollowUpNeeded == true ? "Yes" : "No")}");
            if (!string.IsNullOrWhiteSpace(v.FollowUpNotes))
                sb.AppendLine($"    Follow-up notes: {v.FollowUpNotes}");
            if (!string.IsNullOrWhiteSpace(v.Observations))
                sb.AppendLine($"    Observations: {v.Observations}");
        }

        return sb.ToString();
    }

    // ── Health & Wellbeing aggregate ──────────────────────────────────────────
    private async Task<string> GetHealthSummary()
    {
        var totalRecords = await _db.HealthWellbeingRecords.CountAsync();
        var avgHealth    = await _db.HealthWellbeingRecords.Where(h => h.GeneralHealthScore != null).AverageAsync(h => (double?)h.GeneralHealthScore) ?? 0;
        var avgNutrition = await _db.HealthWellbeingRecords.Where(h => h.NutritionScore != null).AverageAsync(h => (double?)h.NutritionScore) ?? 0;
        var avgSleep     = await _db.HealthWellbeingRecords.Where(h => h.SleepQualityScore != null).AverageAsync(h => (double?)h.SleepQualityScore) ?? 0;
        var medicalDone  = await _db.HealthWellbeingRecords.CountAsync(h => h.MedicalCheckupDone == true);
        var dentalDone   = await _db.HealthWellbeingRecords.CountAsync(h => h.DentalCheckupDone == true);
        var psychDone    = await _db.HealthWellbeingRecords.CountAsync(h => h.PsychologicalCheckupDone == true);

        var sb = new StringBuilder();
        sb.AppendLine("=== HEALTH & WELLBEING SUMMARY ===");
        sb.AppendLine($"Total health records: {totalRecords}");
        sb.AppendLine($"Average general health score: {avgHealth:F1}/10");
        sb.AppendLine($"Average nutrition score: {avgNutrition:F1}/10");
        sb.AppendLine($"Average sleep quality score: {avgSleep:F1}/10");
        sb.AppendLine($"Residents with medical checkup completed: {medicalDone}");
        sb.AppendLine($"Residents with dental checkup completed: {dentalDone}");
        sb.AppendLine($"Residents with psychological checkup completed: {psychDone}");
        return sb.ToString();
    }

    // ── Education aggregate ───────────────────────────────────────────────────
    private async Task<string> GetEducationSummary()
    {
        var totalRecords = await _db.EducationRecords.CountAsync();
        var enrolled     = await _db.EducationRecords.CountAsync(e => e.EnrollmentStatus == "Enrolled");
        var avgAttendance = await _db.EducationRecords.Where(e => e.AttendanceRate != null).AverageAsync(e => (double?)e.AttendanceRate) ?? 0;
        var avgProgress  = await _db.EducationRecords.Where(e => e.ProgressPercent != null).AverageAsync(e => (double?)e.ProgressPercent) ?? 0;

        var byStatus = await _db.EducationRecords
            .Where(e => e.CompletionStatus != null)
            .GroupBy(e => e.CompletionStatus!)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== EDUCATION SUMMARY ===");
        sb.AppendLine($"Total education records: {totalRecords}");
        sb.AppendLine($"Currently enrolled: {enrolled}");
        sb.AppendLine($"Average attendance rate: {avgAttendance:P0}");
        sb.AppendLine($"Average progress: {avgProgress:P0}");
        if (byStatus.Any())
        {
            sb.AppendLine("Completion status breakdown:");
            foreach (var s in byStatus) sb.AppendLine($"  - {s.Status}: {s.Count}");
        }
        return sb.ToString();
    }

    // ── Case conference aggregate ─────────────────────────────────────────────
    private async Task<string> GetCaseConferenceSummary()
    {
        var total = await _db.CaseConferences.CountAsync();
        var upcoming = await _db.CaseConferences
            .Where(c => c.NextConferenceDate >= DateOnly.FromDateTime(DateTime.UtcNow))
            .OrderBy(c => c.NextConferenceDate)
            .Take(10)
            .Select(c => new { c.ResidentId, c.NextConferenceDate, c.ConferenceType, c.SocialWorker })
            .ToListAsync();

        var byType = await _db.CaseConferences
            .Where(c => c.ConferenceType != null)
            .GroupBy(c => c.ConferenceType!)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== CASE CONFERENCE SUMMARY ===");
        sb.AppendLine($"Total case conferences on record: {total}");
        if (byType.Any())
        {
            sb.AppendLine("By type:");
            foreach (var t in byType) sb.AppendLine($"  - {t.Type}: {t.Count}");
        }
        if (upcoming.Any())
        {
            sb.AppendLine("Upcoming conferences:");
            foreach (var u in upcoming)
                sb.AppendLine($"  - Resident ID {u.ResidentId} | {u.NextConferenceDate} | {u.ConferenceType ?? "N/A"} | Worker: {u.SocialWorker ?? "N/A"}");
        }
        else
        {
            sb.AppendLine("No upcoming conferences scheduled.");
        }
        return sb.ToString();
    }

    // ── Process (counselling) session aggregate ───────────────────────────────
    private async Task<string> GetProcessRecordingSummary()
    {
        var total         = await _db.ProcessRecordings.CountAsync();
        var concernsCount = await _db.ProcessRecordings.CountAsync(p => p.ConcernsFlagged == true);
        var referralCount = await _db.ProcessRecordings.CountAsync(p => p.ReferralMade == true);
        var progressCount = await _db.ProcessRecordings.CountAsync(p => p.ProgressNoted == true);

        var thisMonthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var thisMonth      = await _db.ProcessRecordings.CountAsync(p => p.SessionDate >= thisMonthStart);

        var byType = await _db.ProcessRecordings
            .Where(p => p.SessionType != null)
            .GroupBy(p => p.SessionType!)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var recentConcerns = await _db.ProcessRecordings
            .Where(p => p.ConcernsFlagged == true)
            .OrderByDescending(p => p.SessionDate)
            .Take(5)
            .Select(p => new { p.ResidentId, p.SessionDate, p.SessionType, p.FollowUpActions })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== PROCESS / COUNSELLING SESSION SUMMARY ===");
        sb.AppendLine($"Total sessions on record: {total}");
        sb.AppendLine($"Sessions this month: {thisMonth}");
        sb.AppendLine($"Sessions with progress noted: {progressCount}");
        sb.AppendLine($"Sessions with concerns flagged: {concernsCount}");
        sb.AppendLine($"Sessions resulting in a referral: {referralCount}");
        if (byType.Any())
        {
            sb.AppendLine("Session types:");
            foreach (var t in byType) sb.AppendLine($"  - {t.Type}: {t.Count}");
        }
        if (recentConcerns.Any())
        {
            sb.AppendLine("Most recent sessions with concerns flagged:");
            foreach (var c in recentConcerns)
                sb.AppendLine($"  - Resident ID {c.ResidentId} | {c.SessionDate} | {c.SessionType ?? "N/A"} | Follow-up: {c.FollowUpActions ?? "N/A"}");
        }
        return sb.ToString();
    }

    // ── Intervention plan aggregate ───────────────────────────────────────────
    private async Task<string> GetInterventionPlanSummary()
    {
        var total = await _db.InterventionPlans.CountAsync();
        var byStatus = await _db.InterventionPlans
            .Where(p => p.Status != null)
            .GroupBy(p => p.Status!)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var overdue = await _db.InterventionPlans
            .Where(p => p.TargetDate < DateOnly.FromDateTime(DateTime.UtcNow) && p.Status != "Completed")
            .CountAsync();

        var upcoming = await _db.InterventionPlans
            .Where(p => p.TargetDate >= DateOnly.FromDateTime(DateTime.UtcNow) &&
                        p.TargetDate <= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)) &&
                        p.Status != "Completed")
            .OrderBy(p => p.TargetDate)
            .Take(10)
            .Select(p => new { p.ResidentId, p.PlanCategory, p.TargetDate, p.Status })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== INTERVENTION PLAN SUMMARY ===");
        sb.AppendLine($"Total intervention plans: {total}");
        sb.AppendLine($"Overdue plans (past target date, not completed): {overdue}");
        if (byStatus.Any())
        {
            sb.AppendLine("Plans by status:");
            foreach (var s in byStatus) sb.AppendLine($"  - {s.Status}: {s.Count}");
        }
        if (upcoming.Any())
        {
            sb.AppendLine("Plans due in the next 30 days:");
            foreach (var u in upcoming)
                sb.AppendLine($"  - Resident ID {u.ResidentId} | {u.PlanCategory ?? "N/A"} | Due: {u.TargetDate} | Status: {u.Status ?? "N/A"}");
        }
        return sb.ToString();
    }

    // ── Donation allocations aggregate ────────────────────────────────────────
    private async Task<string> GetDonationAllocationSummary()
    {
        var byProgramArea = await _db.DonationAllocations
            .Where(a => a.ProgramArea != null)
            .GroupBy(a => a.ProgramArea!)
            .Select(g => new { Area = g.Key, Total = g.Sum(a => a.AmountAllocated ?? 0), Count = g.Count() })
            .OrderByDescending(g => g.Total)
            .ToListAsync();

        var bySafehouse = await _db.DonationAllocations
            .Where(a => a.SafehouseId != null)
            .Join(_db.Safehouses, a => a.SafehouseId, s => s.SafehouseId, (a, s) => new { s.Name, a.AmountAllocated })
            .GroupBy(x => x.Name)
            .Select(g => new { Safehouse = g.Key, Total = g.Sum(x => x.AmountAllocated ?? 0) })
            .OrderByDescending(g => g.Total)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== DONATION ALLOCATION SUMMARY ===");
        if (byProgramArea.Any())
        {
            sb.AppendLine("Allocations by program area:");
            foreach (var a in byProgramArea) sb.AppendLine($"  - {a.Area}: ${a.Total:N2} across {a.Count} donations");
        }
        if (bySafehouse.Any())
        {
            sb.AppendLine("Allocations by safehouse:");
            foreach (var s in bySafehouse) sb.AppendLine($"  - {s.Safehouse}: ${s.Total:N2}");
        }
        return sb.ToString();
    }

    // ── In-kind donations aggregate ───────────────────────────────────────────
    private async Task<string> GetInKindDonationSummary()
    {
        var total = await _db.InKindDonationItems.CountAsync();
        var byCategory = await _db.InKindDonationItems
            .Where(i => i.ItemCategory != null)
            .GroupBy(i => i.ItemCategory!)
            .Select(g => new { Category = g.Key, Count = g.Count(), TotalValue = g.Sum(i => (i.EstimatedUnitValue ?? 0) * (i.Quantity ?? 1)) })
            .OrderByDescending(g => g.TotalValue)
            .ToListAsync();

        var recentItems = await _db.InKindDonationItems
            .Include(i => i.Donation)
            .OrderByDescending(i => i.Donation.DonationDate)
            .Take(5)
            .Select(i => new { i.ItemName, i.ItemCategory, i.Quantity, i.UnitOfMeasure, i.IntendedUse, i.ReceivedCondition, i.Donation.DonationDate })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== IN-KIND DONATION SUMMARY ===");
        sb.AppendLine($"Total in-kind items on record: {total}");
        if (byCategory.Any())
        {
            sb.AppendLine("By category:");
            foreach (var c in byCategory)
                sb.AppendLine($"  - {c.Category}: {c.Count} items, estimated value ${c.TotalValue:N2}");
        }
        if (recentItems.Any())
        {
            sb.AppendLine("5 most recent in-kind items:");
            foreach (var i in recentItems)
                sb.AppendLine($"  - {i.DonationDate} | {i.ItemName} ({i.ItemCategory ?? "N/A"}) | Qty: {i.Quantity} {i.UnitOfMeasure} | Use: {i.IntendedUse ?? "N/A"} | Condition: {i.ReceivedCondition ?? "N/A"}");
        }
        return sb.ToString();
    }

    // ── Detailed churn predictions ────────────────────────────────────────────
    private async Task<string> GetDetailedChurnData()
    {
        var predictions = await _db.DonorChurnPredictions
            .Join(_db.Supporters, p => p.SupporterId, s => s.SupporterId,
                (p, s) => new { s.DisplayName, s.Email, s.SupporterType, p.ChurnProbability, p.RiskLevel, p.ScoredAt })
            .OrderByDescending(p => p.ChurnProbability)
            .Take(20)
            .ToListAsync();

        var byRisk = await _db.DonorChurnPredictions
            .GroupBy(p => p.RiskLevel)
            .Select(g => new { Level = g.Key, Count = g.Count() })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== DONOR CHURN PREDICTIONS ===");
        if (byRisk.Any())
        {
            sb.AppendLine("Donors by risk level:");
            foreach (var r in byRisk) sb.AppendLine($"  - {r.Level}: {r.Count}");
        }
        sb.AppendLine("Top 20 donors by churn probability:");
        foreach (var p in predictions)
            sb.AppendLine($"  - {p.DisplayName} ({p.SupporterType}) | Churn probability: {p.ChurnProbability:P0} | Risk: {p.RiskLevel} | Scored: {p.ScoredAt?.ToString("MMM d, yyyy") ?? "N/A"}");
        return sb.ToString();
    }

    private async Task<string> GetGeneralOverview()
    {
        var totalResidents    = await _db.Residents.CountAsync();
        var activeResidents   = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
        var totalSupporters   = await _db.Supporters.CountAsync();
        var totalDonations    = await _db.Donations.CountAsync();
        var totalSafehouses   = await _db.Safehouses.CountAsync();
        var pendingFollowUps  = await _db.HomeVisitations.CountAsync(v => v.FollowUpNeeded == true);
        var atRiskDonors      = await _db.DonorChurnPredictions.CountAsync(p => p.ChurnProbability > 0.7m);
        var sessionConcerns   = await _db.ProcessRecordings.CountAsync(p => p.ConcernsFlagged == true);
        var overdueInterventions = await _db.InterventionPlans
            .CountAsync(p => p.TargetDate < DateOnly.FromDateTime(DateTime.UtcNow) && p.Status != "Completed");
        var upcomingConferences = await _db.CaseConferences
            .CountAsync(c => c.NextConferenceDate >= DateOnly.FromDateTime(DateTime.UtcNow));
        var cutoff30 = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var recentlyVisitedIds = await _db.HomeVisitations
            .Where(v => v.VisitDate >= cutoff30)
            .Select(v => v.ResidentId)
            .Distinct()
            .ToListAsync();
        var noRecentVisit = await _db.Residents
            .CountAsync(r => !recentlyVisitedIds.Contains(r.ResidentId));

        var sb = new StringBuilder();
        sb.AppendLine("=== DAILY BRIEFING / GENERAL OVERVIEW ===");
        sb.AppendLine($"Date: {DateTime.UtcNow:MMMM d, yyyy}");
        sb.AppendLine();
        sb.AppendLine("── Residents ──");
        sb.AppendLine($"  Total residents: {totalResidents} ({activeResidents} active)");
        sb.AppendLine($"  Active safehouses: {totalSafehouses}");
        sb.AppendLine($"  Residents with no visit in 30+ days: {noRecentVisit}");
        sb.AppendLine($"  Home visitation follow-ups pending: {pendingFollowUps}");
        sb.AppendLine($"  Counselling sessions with concerns flagged: {sessionConcerns}");
        sb.AppendLine($"  Overdue intervention plans: {overdueInterventions}");
        sb.AppendLine($"  Upcoming case conferences: {upcomingConferences}");
        sb.AppendLine();
        sb.AppendLine("── Donors ──");
        sb.AppendLine($"  Total supporters: {totalSupporters}");
        sb.AppendLine($"  Total donations on record: {totalDonations}");
        sb.AppendLine($"  Donors at high churn risk (>70%): {atRiskDonors}");

        return sb.ToString();
    }

    // ─── Date range parsing ───────────────────────────────────────────────────
    // Extracts a DateOnly range from natural language: "last September",
    // "this month", "Q3 2025", "September 2025", "last year", etc.
    // Returns (null, null) when no date expression is found.

    private static (DateOnly? from, DateOnly? to) ParseDateRange(string message)
    {
        var lower = message.ToLowerInvariant();
        var now   = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        if (Regex.IsMatch(lower, @"\bthis month\b"))
            return (new DateOnly(today.Year, today.Month, 1), today);

        if (Regex.IsMatch(lower, @"\blast month\b"))
        {
            var lm = today.AddMonths(-1);
            return (new DateOnly(lm.Year, lm.Month, 1),
                    new DateOnly(lm.Year, lm.Month, DateTime.DaysInMonth(lm.Year, lm.Month)));
        }

        if (Regex.IsMatch(lower, @"\bthis year\b|\bcurrent year\b"))
            return (new DateOnly(today.Year, 1, 1), today);

        if (Regex.IsMatch(lower, @"\blast year\b"))
            return (new DateOnly(today.Year - 1, 1, 1), new DateOnly(today.Year - 1, 12, 31));

        if (Regex.IsMatch(lower, @"\blast week\b"))
        {
            var wStart = today.AddDays(-(int)now.DayOfWeek - 7);
            return (wStart, wStart.AddDays(6));
        }

        if (Regex.IsMatch(lower, @"\bthis week\b"))
            return (today.AddDays(-(int)now.DayOfWeek), today);

        // "Q3 2025" / "Q1 of 2024"
        var qMatch = Regex.Match(lower, @"\bq([1-4])\s*(?:of\s*|,?\s*)?(\d{4})?\b");
        if (qMatch.Success)
        {
            var q  = int.Parse(qMatch.Groups[1].Value);
            var yr = qMatch.Groups[2].Success ? int.Parse(qMatch.Groups[2].Value) : today.Year;
            var sm = (q - 1) * 3 + 1;
            var em = sm + 2;
            return (new DateOnly(yr, sm, 1), new DateOnly(yr, em, DateTime.DaysInMonth(yr, em)));
        }

        // Month name dictionary
        var monthMap = new Dictionary<string, int>
        {
            ["january"]=1,["february"]=2,["march"]=3,["april"]=4,["may"]=5,["june"]=6,
            ["july"]=7,["august"]=8,["september"]=9,["october"]=10,["november"]=11,["december"]=12,
            ["jan"]=1,["feb"]=2,["mar"]=3,["apr"]=4,["jun"]=6,["jul"]=7,["aug"]=8,
            ["sep"]=9,["sept"]=9,["oct"]=10,["nov"]=11,["dec"]=12
        };
        const string Mp = @"january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";

        // "September 2025" / "sep 2025"
        var myMatch = Regex.Match(lower, $@"\b({Mp})\s+(\d{{4}})\b");
        if (myMatch.Success && monthMap.TryGetValue(myMatch.Groups[1].Value, out var m1))
        {
            var yr = int.Parse(myMatch.Groups[2].Value);
            return (new DateOnly(yr, m1, 1), new DateOnly(yr, m1, DateTime.DaysInMonth(yr, m1)));
        }

        // "last September" (no year — pick most recent past occurrence)
        var lmMatch = Regex.Match(lower, $@"\blast\s+({Mp})\b");
        if (lmMatch.Success && monthMap.TryGetValue(lmMatch.Groups[1].Value, out var m2))
        {
            var yr = today.Month > m2 ? today.Year : today.Year - 1;
            return (new DateOnly(yr, m2, 1), new DateOnly(yr, m2, DateTime.DaysInMonth(yr, m2)));
        }

        // "in September" / "during September"
        var inMatch = Regex.Match(lower, $@"\b(?:in|during)\s+({Mp})\b");
        if (inMatch.Success && monthMap.TryGetValue(inMatch.Groups[1].Value, out var m3))
        {
            var yr = today.Month >= m3 ? today.Year : today.Year - 1;
            return (new DateOnly(yr, m3, 1), new DateOnly(yr, m3, DateTime.DaysInMonth(yr, m3)));
        }

        return (null, null);
    }

    // ── Residents who were present (active at the safehouse) during a date range ─
    // A resident was "present" in a period if:
    //   DateOfAdmission <= periodEnd  AND  (DateClosed >= periodStart OR DateClosed is null)
    // This correctly handles: residents admitted before the period who were still there,
    // residents admitted during the period, and residents who left during the period.
    private async Task<string> GetResidentsByDateRange(DateOnly from, DateOnly to)
    {
        // Pull residents present during the period
        var residents = await _db.Residents
            .Where(r =>
                r.DateOfAdmission != null &&
                r.DateOfAdmission <= to &&
                (r.DateClosed == null || r.DateClosed >= from))
            .OrderBy(r => r.DateOfAdmission)
            .Select(r => new
            {
                r.CaseControlNo, r.InternalCode, r.ResidentId,
                r.DateOfAdmission, r.DateClosed, r.CaseStatus,
                r.ReintegrationStatus, r.AssignedSocialWorker, r.CaseCategory
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine($"=== RESIDENTS PRESENT: {from:MMMM d, yyyy} – {to:MMMM d, yyyy} ===");
        sb.AppendLine($"Total residents present during this period: {residents.Count}");

        if (!residents.Any())
        {
            sb.AppendLine("No residents were on record during this period.");
            var total = await _db.Residents.CountAsync();
            sb.AppendLine($"(Total residents in the database across all time: {total})");
        }
        else
        {
            // Bucket residents: admitted during period vs already present
            var newAdmissions = residents.Where(r => r.DateOfAdmission >= from).ToList();
            var alreadyPresent = residents.Where(r => r.DateOfAdmission < from).ToList();
            var discharged = residents.Where(r => r.DateClosed.HasValue && r.DateClosed >= from && r.DateClosed <= to).ToList();

            if (newAdmissions.Any())
            {
                sb.AppendLine($"\nNew admissions during this period ({newAdmissions.Count}):");
                foreach (var r in newAdmissions)
                {
                    var label = r.CaseControlNo ?? r.InternalCode ?? $"Resident {r.ResidentId}";
                    sb.AppendLine($"  - {label} | Admitted: {r.DateOfAdmission} | Status: {r.CaseStatus ?? "N/A"} | Category: {r.CaseCategory ?? "N/A"} | Worker: {r.AssignedSocialWorker ?? "N/A"}");
                }
            }

            if (alreadyPresent.Any())
            {
                sb.AppendLine($"\nAlready in care at the start of this period ({alreadyPresent.Count}):");
                foreach (var r in alreadyPresent)
                {
                    var label = r.CaseControlNo ?? r.InternalCode ?? $"Resident {r.ResidentId}";
                    sb.AppendLine($"  - {label} | Admitted: {r.DateOfAdmission} | Status: {r.CaseStatus ?? "N/A"} | Reintegration: {r.ReintegrationStatus ?? "N/A"} | Worker: {r.AssignedSocialWorker ?? "N/A"}");
                }
            }

            if (discharged.Any())
            {
                sb.AppendLine($"\nDischarged/closed during this period ({discharged.Count}):");
                foreach (var r in discharged)
                {
                    var label = r.CaseControlNo ?? r.InternalCode ?? $"Resident {r.ResidentId}";
                    sb.AppendLine($"  - {label} | Closed: {r.DateClosed} | Status: {r.CaseStatus ?? "N/A"} | Reintegration: {r.ReintegrationStatus ?? "N/A"}");
                }
            }

            // Also pull activity records (visits, sessions, conferences) during this period
            var residentIds = residents.Select(r => r.ResidentId).ToList();
            var residentIdsNullable = residentIds.Select(id => (int?)id).ToList();

            var visits = await _db.HomeVisitations
                .Where(v => residentIdsNullable.Contains(v.ResidentId) && v.VisitDate >= from && v.VisitDate <= to)
                .CountAsync();
            var sessions = await _db.ProcessRecordings
                .Where(p => residentIds.Contains(p.ResidentId) && p.SessionDate >= from && p.SessionDate <= to)
                .CountAsync();
            var conferences = await _db.CaseConferences
                .Where(c => residentIds.Contains(c.ResidentId) && c.ConferenceDate >= from && c.ConferenceDate <= to)
                .CountAsync();
            var concerns = await _db.HomeVisitations
                .CountAsync(v => residentIdsNullable.Contains(v.ResidentId) && v.VisitDate >= from && v.VisitDate <= to && v.SafetyConcernsNoted == true);

            sb.AppendLine($"\nActivity during this period:");
            sb.AppendLine($"  Home visits: {visits}");
            sb.AppendLine($"  Counselling sessions: {sessions}");
            sb.AppendLine($"  Case conferences: {conferences}");
            sb.AppendLine($"  Safety concerns flagged: {concerns}");
        }
        return sb.ToString();
    }

    // ── Donations within a specific date range ────────────────────────────────
    private async Task<string> GetDonationsByDateRange(DateOnly from, DateOnly to)
    {
        var donations = await _db.Donations
            .Include(d => d.Supporter)
            .Where(d => d.DonationDate >= from && d.DonationDate <= to)
            .OrderBy(d => d.DonationDate)
            .Select(d => new
            {
                d.Supporter.DisplayName, d.Amount, d.DonationDate, d.DonationType, d.IsRecurring
            })
            .ToListAsync();

        var totalAmount = donations.Where(d => d.Amount.HasValue).Sum(d => d.Amount!.Value);
        var sb = new StringBuilder();
        sb.AppendLine($"=== DONATIONS: {from:MMMM d, yyyy} – {to:MMMM d, yyyy} ===");
        sb.AppendLine($"Total donations in this period: {donations.Count}");
        sb.AppendLine($"Total cash raised: ${totalAmount:N2}");

        if (!donations.Any())
        {
            sb.AppendLine("No donations were recorded during this period.");
        }
        else
        {
            var byType = donations.GroupBy(d => d.DonationType)
                                  .Select(g => $"{g.Key ?? "Unknown"}: {g.Count()}");
            sb.AppendLine($"By type: {string.Join(", ", byType)}");
            sb.AppendLine("Donations:");
            foreach (var d in donations.Take(30))
            {
                var amount    = d.Amount.HasValue ? $"${d.Amount:N2}" : "In-kind";
                var recurring = d.IsRecurring ? " (recurring)" : "";
                sb.AppendLine($"  - {d.DonationDate} | {d.DisplayName}: {amount} — {d.DonationType}{recurring}");
            }
            if (donations.Count > 30)
                sb.AppendLine($"  ...and {donations.Count - 30} more donations.");
        }
        return sb.ToString();
    }

    // ── Home visitations within a specific date range ─────────────────────────
    private async Task<string> GetVisitationsByDateRange(DateOnly from, DateOnly to)
    {
        var visits = await _db.HomeVisitations
            .Where(v => v.VisitDate >= from && v.VisitDate <= to)
            .OrderBy(v => v.VisitDate)
            .Select(v => new
            {
                v.ResidentId, v.VisitDate, v.SocialWorker, v.VisitType,
                v.VisitOutcome, v.SafetyConcernsNoted, v.FollowUpNeeded,
                v.FollowUpNotes, v.Observations
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine($"=== HOME VISITATIONS: {from:MMMM d, yyyy} – {to:MMMM d, yyyy} ===");
        sb.AppendLine($"Total visitations in this period: {visits.Count}");

        if (!visits.Any())
        {
            sb.AppendLine("No home visitations were recorded during this period.");
        }
        else
        {
            sb.AppendLine($"Safety concerns flagged: {visits.Count(v => v.SafetyConcernsNoted == true)}");
            sb.AppendLine($"Follow-ups required: {visits.Count(v => v.FollowUpNeeded == true)}");
            sb.AppendLine("Visits:");
            foreach (var v in visits.Take(20))
            {
                var flags = new List<string>();
                if (v.SafetyConcernsNoted == true) flags.Add("⚠ Safety concern");
                if (v.FollowUpNeeded == true) flags.Add("Follow-up needed");
                var flagStr = flags.Any() ? $" | {string.Join(", ", flags)}" : "";
                sb.AppendLine($"  - {v.VisitDate} | Resident ID {v.ResidentId} | {v.VisitType ?? "N/A"} | Worker: {v.SocialWorker ?? "N/A"} | Outcome: {v.VisitOutcome ?? "N/A"}{flagStr}");
                if (!string.IsNullOrWhiteSpace(v.Observations))
                    sb.AppendLine($"    Observations: {v.Observations}");
            }
            if (visits.Count > 20) sb.AppendLine($"  ...and {visits.Count - 20} more visits.");
        }
        return sb.ToString();
    }

    // ── Social media posts within a specific date range ───────────────────────
    private async Task<string> GetSocialMediaByDateRange(DateOnly from, DateOnly to)
    {
        var fromDt = from.ToDateTime(TimeOnly.MinValue);
        var toDt   = to.ToDateTime(TimeOnly.MaxValue);

        var posts = await _db.SocialMediaPosts
            .Where(p => p.CreatedAt >= fromDt && p.CreatedAt <= toDt)
            .OrderByDescending(p => p.EngagementRate)
            .Select(p => new
            {
                p.Platform, p.PostType, p.ContentTopic,
                p.EngagementRate, p.Likes, p.Shares, p.Reach,
                p.SentimentTone, p.CreatedAt, p.Caption
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine($"=== SOCIAL MEDIA POSTS: {from:MMMM d, yyyy} – {to:MMMM d, yyyy} ===");
        sb.AppendLine($"Total posts in this period: {posts.Count}");

        if (!posts.Any())
        {
            sb.AppendLine("No social media posts were recorded during this period.");
        }
        else
        {
            var avgEng = posts.Average(p => p.EngagementRate);
            var totalReach = posts.Sum(p => p.Reach);
            sb.AppendLine($"Average engagement rate: {avgEng:P1} | Total reach: {totalReach:N0}");
            var byPlatform = posts.GroupBy(p => p.Platform).Select(g => $"{g.Key}: {g.Count()}");
            sb.AppendLine($"By platform: {string.Join(", ", byPlatform)}");
            sb.AppendLine("Posts (sorted by engagement):");
            foreach (var p in posts.Take(10))
            {
                sb.AppendLine($"  - {p.CreatedAt:MMM d, yyyy} | {p.Platform} | {p.PostType} | Topic: {p.ContentTopic ?? "N/A"} | Engagement: {p.EngagementRate:P1} | Reach: {p.Reach:N0} | Tone: {p.SentimentTone ?? "N/A"}");
                if (!string.IsNullOrWhiteSpace(p.Caption))
                    sb.AppendLine($"    \"{p.Caption[..Math.Min(100, p.Caption.Length)]}\"");
            }
            if (posts.Count > 10) sb.AppendLine($"  ...and {posts.Count - 10} more posts.");
        }
        return sb.ToString();
    }

    // ─── Prompt construction ──────────────────────────────────────────────────

    private static string BuildSystemPrompt(string contextData, string? dateRangeNote = null)
    {
        var dateNote = dateRangeNote != null
            ? $"\n            NOTE: The admin asked about a specific time period ({dateRangeNote}). The data below is already filtered to that range."
            : string.Empty;

        return $"""
            You are a helpful, compassionate AI assistant for the administrators of a nonprofit
            organization that supports survivors of abuse and vulnerable children.
            Your role is to help admins understand their data and suggest useful next steps.

            IMPORTANT RULES:
            - You are READ-ONLY. You cannot make changes to any records.
            - Be concise, warm, and professional.
            - Do not speculate beyond the data you are given.
            - Protect participant privacy — never reconstruct or guess individuals' identities.
            - When relevant, suggest practical next steps the admin could take.
            - If the data doesn't answer the question, say so clearly.
            - When giving lists of people, SUMMARIZE rather than listing every individual when there are more than 5.
              Group by status, flag the highest priority cases, and offer totals rather than exhaustive lists.
            - Today's date: {DateTime.UtcNow:MMMM d, yyyy}{dateNote}

            LIVE DATABASE SNAPSHOT:
            {contextData}

            Answer the administrator's question based only on the data above.
            """;
    }

    // ─── Ollama call ──────────────────────────────────────────────────────────

    private async Task<string> CallClaude(string systemPrompt, string userMessage, List<ChatHistoryItem>? history)
    {
        var client = _httpClientFactory.CreateClient("anthropic");

        // Anthropic's API takes system prompt at the top level (not as a message role)
        // Messages must strictly alternate user / assistant
        var messages = new List<object>();

        if (history != null)
        {
            // Include up to last 10 turns so context doesn't grow unbounded
            foreach (var h in history.TakeLast(10))
                messages.Add(new { role = h.Role, content = h.Content });
        }

        messages.Add(new { role = "user", content = userMessage });

        var requestBody = new
        {
            model = ModelName,
            max_tokens = 4096,
            temperature = 0.4,
            system = systemPrompt,
            messages
        };

        var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
        var httpResponse = await client.PostAsync("/v1/messages", httpContent);
        httpResponse.EnsureSuccessStatusCode();

        var responseText = await httpResponse.Content.ReadAsStringAsync();
        var claudeResponse = JsonSerializer.Deserialize<ClaudeResponse>(responseText);

        return claudeResponse?.Content?.FirstOrDefault()?.Text?.Trim()
               ?? "I wasn't able to generate a response. Please try again.";
    }
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

// PromptKey identifies which predetermined button was clicked.
// null = free-typed → always goes to Tier 4 full AI.
public record ChatRequest(string Message, List<ChatHistoryItem>? History, string? PromptKey = null);
public record ChatHistoryItem(string Role, string Content);

internal class ClaudeResponse
{
    [JsonPropertyName("content")]
    public List<ClaudeContentBlock>? Content { get; set; }
}

internal class ClaudeContentBlock
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}
