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

    // Point this at your local Ollama instance
    private const string OllamaBaseUrl = "http://localhost:11434";
    private const string ModelName = "gemma4:e2b";

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
            // 1. Run predefined queries based on the message intent
            var contextData = await GatherContext(request.Message);

            // 2. Build the system prompt with gathered data
            var systemPrompt = BuildSystemPrompt(contextData);

            // 3. Call Ollama and get a response
            var response = await CallOllama(systemPrompt, request.Message, request.History);

            return Ok(new { response });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Could not reach Ollama at {Url}", OllamaBaseUrl);
            return StatusCode(503, new
            {
                error = "The AI model is currently unavailable. Make sure Ollama is running locally (ollama serve)."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat query");
            return StatusCode(500, new { error = "Failed to process your query. Please try again." });
        }
    }

    // ─── Context gathering ────────────────────────────────────────────────────

    private async Task<string> GatherContext(string message)
    {
        var lower = message.ToLowerInvariant();
        var parts = new List<string>();

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

        // Resident / participant queries
        if (lower.Contains("resident") || lower.Contains("participant") ||
            lower.Contains("case") || lower.Contains("client") ||
            lower.Contains("survivor") || lower.Contains("child") ||
            lower.Contains("admission") || lower.Contains("safehouse occupancy"))
        {
            // Only pull the summary if we're not already looking at a specific record,
            // or if the question is clearly about aggregate stats
            if (!caseCodeMatch.Success && !idMatch.Success)
                parts.Add(await GetResidentSummary());
        }

        // Donor / donation / funding queries
        if (lower.Contains("donor") || lower.Contains("donation") ||
            lower.Contains("supporter") || lower.Contains("contribut") ||
            lower.Contains("fund") || lower.Contains("money") ||
            lower.Contains("amount") || lower.Contains("recurring") ||
            lower.Contains("campaign") || lower.Contains("churn"))
        {
            parts.Add(await GetDonationSummary());
        }

        // Safehouse / facility queries
        if (lower.Contains("safehouse") || lower.Contains("house") ||
            lower.Contains("location") || lower.Contains("facility") ||
            lower.Contains("capacity") || lower.Contains("region"))
        {
            parts.Add(await GetSafehouseSummary());
        }

        // Home visitation queries
        if (lower.Contains("visit") || lower.Contains("visitation") ||
            lower.Contains("home visit") || lower.Contains("social worker") ||
            lower.Contains("follow up") || lower.Contains("safety concern"))
        {
            // If we already found a specific resident, pull their visitation history too
            if (caseCodeMatch.Success || idMatch.Success)
            {
                Resident? specificResident = null;
                if (caseCodeMatch.Success)
                    specificResident = await _db.Residents.FirstOrDefaultAsync(r => r.CaseControlNo == caseCodeMatch.Groups[1].Value.ToUpper());
                else if (idMatch.Success && int.TryParse(idMatch.Groups[1].Value, out var rid))
                    specificResident = await _db.Residents.FirstOrDefaultAsync(r => r.ResidentId == rid);

                if (specificResident != null)
                    parts.Add(await GetResidentVisitations(specificResident.ResidentId));
                else
                    parts.Add(await GetVisitationSummary());
            }
            else
            {
                parts.Add(await GetVisitationSummary());
            }
        }

        // Fall back to a general overview if nothing matched
        if (parts.Count == 0 ||
            lower.Contains("how many") || lower.Contains("total") ||
            lower.Contains("overview") || lower.Contains("summary") ||
            lower.Contains("stats") || lower.Contains("report") ||
            lower.Contains("update"))
        {
            parts.Add(await GetGeneralOverview());
        }

        return string.Join("\n\n", parts);
    }

    // ── Look up a specific resident by case control number (e.g. "LS-0002") ────
    private async Task<string> GetSpecificResidentByCode(string caseControlNo)
    {
        var resident = await _db.Residents
            .FirstOrDefaultAsync(r => r.CaseControlNo == caseControlNo);

        if (resident == null)
            return $"=== SPECIFIC RESIDENT LOOKUP ===\nNo resident found with case control number '{caseControlNo}'.";

        return FormatResidentRecord(resident);
    }

    // ── Look up a specific resident by numeric ID ─────────────────────────────
    private async Task<string> GetSpecificResidentById(int residentId)
    {
        var resident = await _db.Residents
            .FirstOrDefaultAsync(r => r.ResidentId == residentId);

        if (resident == null)
            return $"=== SPECIFIC RESIDENT LOOKUP ===\nNo resident found with ID {residentId}.";

        return FormatResidentRecord(resident);
    }

    // ── Format a single resident record for the AI prompt ─────────────────────
    private static string FormatResidentRecord(Resident r)
    {
        var sb = new StringBuilder();
        sb.AppendLine("=== SPECIFIC RESIDENT RECORD ===");
        sb.AppendLine($"Case Control No: {r.CaseControlNo ?? "N/A"}");
        sb.AppendLine($"Internal Code: {r.InternalCode ?? "N/A"}");
        sb.AppendLine($"Resident ID: {r.ResidentId}");
        sb.AppendLine($"Safehouse ID: {r.SafehouseId?.ToString() ?? "N/A"}");
        sb.AppendLine($"Case Status: {r.CaseStatus ?? "N/A"}");
        sb.AppendLine($"Case Category: {r.CaseCategory ?? "N/A"}");
        sb.AppendLine($"Sex: {r.Sex ?? "N/A"}");
        sb.AppendLine($"Date of Birth: {r.DateOfBirth?.ToString() ?? "N/A"}");
        sb.AppendLine($"Present Age: {r.PresentAge ?? "N/A"}");
        sb.AppendLine($"Date of Admission: {r.DateOfAdmission?.ToString() ?? "N/A"}");
        sb.AppendLine($"Age Upon Admission: {r.AgeUponAdmission ?? "N/A"}");
        sb.AppendLine($"Length of Stay: {r.LengthOfStay ?? "N/A"}");
        sb.AppendLine($"Referral Source: {r.ReferralSource ?? "N/A"}");
        sb.AppendLine($"Assigned Social Worker: {r.AssignedSocialWorker ?? "N/A"}");
        sb.AppendLine($"Initial Risk Level: {r.InitialRiskLevel ?? "N/A"}");
        sb.AppendLine($"Initial Case Assessment: {r.InitialCaseAssessment ?? "N/A"}");
        sb.AppendLine($"Reintegration Type: {r.ReintegrationType ?? "N/A"}");
        sb.AppendLine($"Reintegration Status: {r.ReintegrationStatus ?? "N/A"}");
        sb.AppendLine($"Is PWD: {(r.IsPwd ? "Yes" : "No")}");
        if (r.IsPwd) sb.AppendLine($"PWD Type: {r.PwdType ?? "N/A"}");
        sb.AppendLine($"Has Special Needs: {(r.HasSpecialNeeds ? "Yes" : "No")}");
        if (r.HasSpecialNeeds) sb.AppendLine($"Special Needs Diagnosis: {r.SpecialNeedsDiagnosis ?? "N/A"}");

        // Sub-categories of abuse / vulnerability
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

        // Family background flags
        var familyFlags = new List<string>();
        if (r.FamilyIs4ps) familyFlags.Add("4Ps beneficiary");
        if (r.FamilySoloParent) familyFlags.Add("Solo parent");
        if (r.FamilyIndigenous) familyFlags.Add("Indigenous");
        if (r.FamilyParentPwd) familyFlags.Add("Parent with PWD");
        if (r.FamilyInformalSettler) familyFlags.Add("Informal settler");
        sb.AppendLine($"Family Background: {(familyFlags.Any() ? string.Join(", ", familyFlags) : "None flagged")}");

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

    private async Task<string> GetGeneralOverview()
    {
        var totalResidents = await _db.Residents.CountAsync();
        var activeResidents = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
        var totalSupporters = await _db.Supporters.CountAsync();
        var totalDonations = await _db.Donations.CountAsync();
        var totalSafehouses = await _db.Safehouses.CountAsync();
        var pendingFollowUps = await _db.HomeVisitations.CountAsync(v => v.FollowUpNeeded == true);
        var atRiskDonors = await _db.DonorChurnPredictions.CountAsync(p => p.ChurnProbability > 0.7m);

        var sb = new StringBuilder();
        sb.AppendLine("=== GENERAL OVERVIEW ===");
        sb.AppendLine($"Total residents/participants: {totalResidents} ({activeResidents} active)");
        sb.AppendLine($"Active safehouses: {totalSafehouses}");
        sb.AppendLine($"Total supporters/donors: {totalSupporters}");
        sb.AppendLine($"Total donations on record: {totalDonations}");
        sb.AppendLine($"Home visitation follow-ups pending: {pendingFollowUps}");
        sb.AppendLine($"Donors at churn risk: {atRiskDonors}");

        return sb.ToString();
    }

    // ─── Prompt construction ──────────────────────────────────────────────────

    private static string BuildSystemPrompt(string contextData)
    {
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
            - Today's date: {DateTime.UtcNow:MMMM d, yyyy}

            LIVE DATABASE SNAPSHOT:
            {contextData}

            Answer the administrator's question based only on the data above.
            """;
    }

    // ─── Ollama call ──────────────────────────────────────────────────────────

    private async Task<string> CallOllama(string systemPrompt, string userMessage, List<ChatHistoryItem>? history)
    {
        var client = _httpClientFactory.CreateClient("ollama");

        // Build the message list
        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

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
            messages,
            stream = false,
            options = new
            {
                temperature = 0.4,   // Keep responses factual / less creative
                num_predict = 512    // Cap token length for snappy responses
            }
        };

        var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var httpResponse = await client.PostAsync("/api/chat", content);
        httpResponse.EnsureSuccessStatusCode();

        var responseText = await httpResponse.Content.ReadAsStringAsync();
        var ollamaResponse = JsonSerializer.Deserialize<OllamaResponse>(responseText);

        return ollamaResponse?.Message?.Content?.Trim()
               ?? "I wasn't able to generate a response. Please try again.";
    }
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

public record ChatRequest(string Message, List<ChatHistoryItem>? History);
public record ChatHistoryItem(string Role, string Content);

internal class OllamaResponse
{
    [JsonPropertyName("message")]
    public OllamaMessage? Message { get; set; }
}

internal class OllamaMessage
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
