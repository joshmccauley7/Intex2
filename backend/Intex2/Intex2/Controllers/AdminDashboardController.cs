using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Policy = "AdminOnly")]
public class AdminDashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminDashboardController(AppDbContext db)
    {
        _db = db;
    }

    // ── Detail endpoint ───────────────────────────────────────────────────────

    [HttpGet("detail")]
    public async Task<IActionResult> GetDetail(
        [FromQuery] string section,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        [FromQuery] string period = "3mo")
    {
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 500) pageSize = 500;
        if (page < 1) page = 1;
        int skip = (page - 1) * pageSize;

        // Resolve the period window (used by OKR sections; ignored by others)
        var periodDays = period switch {
            "3mo"  => 90,
            "6mo"  => 180,
            "12mo" => 365,
            _      => 0,    // "all" = no date filter
        };
        var periodLabel = period switch {
            "3mo"  => "3 Months",
            "6mo"  => "6 Months",
            "12mo" => "12 Months",
            _      => "All Time",
        };
        // periodStart: for "all" use a very old date so >= comparisons match everything
        var periodStartGlobal = periodDays > 0
            ? DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-periodDays)
            : new DateOnly(2000, 1, 1);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo  = today.AddDays(-30);
        var sixtyDaysAgo   = today.AddDays(-60);
        var ninetyDaysAgo  = today.AddDays(-90);
        var twelveMonthsAgo = today.AddMonths(-12);
        var threeMonthsAgo = today.AddMonths(-3);

        switch (section)
        {
            // ── Active Donors ─────────────────────────────────────────────────
            case "donors":
            {
                var periodStart      = periodStartGlobal;
                var threeMonthCutoff = today.AddMonths(-3);
                var total            = await _db.Supporters.CountAsync(s => s.Status == "Active");
                var activeIn3Mo      = await _db.Supporters.CountAsync(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= threeMonthCutoff));
                var gaveInPeriod     = period == "all" ? total
                    : await _db.Supporters.CountAsync(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= periodStart));
                var repeatDonors     = await _db.Supporters.CountAsync(s => s.Status == "Active" && s.Donations.Count(d => d.DonationDate >= periodStart) >= 2);
                var repeatRate       = gaveInPeriod > 0 ? Math.Round(100.0 * repeatDonors / gaveInPeriod, 1) : 0.0;

                // Concentration donut: top-5 donors by giving in period + "All Others"
                var top6 = await _db.Supporters
                    .Where(s => s.Status == "Active")
                    .Select(s => new {
                        Name  = s.DisplayName ?? "Unknown",
                        Total = s.Donations.Where(d => d.Amount != null && d.DonationDate >= periodStart).Sum(d => (decimal?)d.Amount) ?? 0m
                    })
                    .OrderByDescending(x => x.Total)
                    .Take(6)
                    .ToListAsync();

                var grandTotal = (double)(await _db.Donations
                    .Where(d => d.Amount != null && d.DonationDate >= periodStart)
                    .Join(_db.Supporters.Where(s => s.Status == "Active"),
                          d => d.SupporterId, s => s.SupporterId, (d, s) => d.Amount)
                    .Where(a => a != null)
                    .SumAsync(a => (decimal?)a) ?? 0m);

                var top5      = top6.Take(5).ToList();
                var top5Total = (double)top5.Sum(d => d.Total);

                var concentrationSeries = new List<object>(
                    top5.Select(d => (object)new { name = d.Name, value = (double)d.Total }));
                if (grandTotal > top5Total + 0.01)
                    concentrationSeries.Add(new { name = "All Others", value = grandTotal - top5Total });

                // Country bar: giving by country in period (top 8)
                var countrySeries = await _db.Donations
                    .Where(d => d.Amount != null && d.DonationDate >= periodStart)
                    .Join(_db.Supporters.Where(s => s.Status == "Active" && s.Country != null),
                          d => d.SupporterId, s => s.SupporterId,
                          (d, s) => new { s.Country, d.Amount })
                    .GroupBy(x => x.Country)
                    .Select(g => new {
                        name  = g.Key!,
                        value = (double)(g.Sum(x => (decimal?)x.Amount) ?? 0m)
                    })
                    .OrderByDescending(x => x.value)
                    .Take(8)
                    .ToListAsync();

                // Cadence histogram: gift count within period
                var giftCounts = await _db.Supporters
                    .Where(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= periodStart))
                    .Select(s => s.Donations.Count(d => d.DonationDate >= periodStart))
                    .ToListAsync();

                var cadenceSeries = new object[]
                {
                    new { name = "1 gift",    value = giftCounts.Count(c => c == 1) },
                    new { name = "2–4 gifts", value = giftCounts.Count(c => c >= 2 && c <= 4) },
                    new { name = "5–9 gifts", value = giftCounts.Count(c => c >= 5 && c <= 9) },
                    new { name = "10+ gifts", value = giftCounts.Count(c => c >= 10) },
                };

                // Paginated action list: sorted by last donation (most recent first)
                var rawDonorItems = await _db.Supporters
                    .Where(s => s.Status == "Active")
                    .OrderByDescending(s => s.Donations.Max(d => (DateOnly?)d.DonationDate))
                    .Skip(skip).Take(pageSize)
                    .Select(s => new {
                        SupporterId   = s.SupporterId,
                        s.DisplayName,
                        s.Status,
                        s.Country,
                        LastDonation  = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        TotalDonated  = s.Donations.Where(d => d.Amount != null && d.DonationDate >= periodStart).Sum(d => (decimal?)d.Amount) ?? 0m,
                        GiftCount     = s.Donations.Count(d => d.DonationDate >= periodStart),
                    })
                    .ToListAsync();

                var items = rawDonorItems.Select(s => new {
                    s.SupporterId, s.DisplayName, s.Status, s.Country,
                    s.LastDonation, s.TotalDonated, s.GiftCount,
                    GiftFrequencyBucket = s.GiftCount == 1 ? "1 gift"
                        : s.GiftCount is >= 2 and <= 4 ? "2–4 gifts"
                        : s.GiftCount is >= 5 and <= 9 ? "5–9 gifts"
                        : "10+ gifts",
                }).ToList<object>();

                var kpis = new object[]
                {
                    new { label = "Active Donors",              value = total.ToString("N0") },
                    new { label = "Active (Last 3 Months)",     value = activeIn3Mo.ToString("N0") },
                    new { label = $"Repeat Donors ({periodLabel})", value = repeatDonors.ToString("N0") },
                    new { label = "Repeat Rate",                value = $"{repeatRate}%" },
                };
                var charts = new object[]
                {
                    new { id = "country",       type = "bar",   title = $"Giving by Country ({periodLabel}, PHP)", series = countrySeries,       valuePrefix = "₱", primary = true, sort = "desc", filterKey = "country" },
                    new { id = "concentration", type = "donut", title = $"Donor Concentration ({periodLabel})",    series = concentrationSeries, compact = true, filterKey = "displayName" },
                    new { id = "cadence",       type = "bar",   title = $"Gift Frequency ({periodLabel})",          series = cadenceSeries,       compact = true, filterKey = "giftFrequencyBucket" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Churn all tiers combined ──────────────────────────────────────
            case "churn-all":
            {
                var total       = await _db.DonorChurnPredictions.CountAsync();
                var avgChurnRaw = await _db.DonorChurnPredictions
                    .AverageAsync(p => (double?)p.ChurnProbability);
                var avgChurnPct = avgChurnRaw.HasValue ? Math.Round(avgChurnRaw.Value * 100, 1) : 0.0;

                var highCount = await _db.DonorChurnPredictions.CountAsync(p => p.RiskLevel == "High");
                var medCount  = await _db.DonorChurnPredictions.CountAsync(p => p.RiskLevel == "Medium");
                var lowCount  = await _db.DonorChurnPredictions.CountAsync(p => p.RiskLevel == "Low");

                var riskDistribSeries = new[]
                {
                    new { name = "High",   value = highCount, color = "#dc2626" },
                    new { name = "Medium", value = medCount,  color = "#d97706" },
                    new { name = "Low",    value = lowCount,  color = "#16a34a" },
                };

                var probData = await _db.DonorChurnPredictions
                    .Select(p => (double)p.ChurnProbability * 100)
                    .ToListAsync();
                var probColors = new[] {
                    "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb",
                    "#1d4ed8", "#4338ca", "#6d28d9", "#7c3aed", "#5b21b6"
                };
                var probSeries = Enumerable.Range(0, 10)
                    .Select(i => new {
                        name  = $"{i * 10}–{i * 10 + 9}%",
                        value = probData.Count(p => p >= i * 10 && p < (i + 1) * 10),
                        color = probColors[i],
                    })
                    .Where(b => b.value > 0)
                    .ToArray();

                var rawItemsChurnAll = await _db.DonorChurnPredictions
                    .OrderBy(p => p.RiskLevel == "High" ? 0 : p.RiskLevel == "Medium" ? 1 : 2)
                    .ThenByDescending(p => p.ChurnProbability)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Supporters, p => p.SupporterId, s => s.SupporterId,
                        (p, s) => new {
                            SupporterId      = s.SupporterId,
                            s.DisplayName,
                            RiskLevel        = p.RiskLevel,
                            ChurnProbability = Math.Round((double)p.ChurnProbability * 100, 1),
                            LastDonation     = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                            ValueInPeriod    = s.Donations
                                .Where(d => d.Amount != null)
                                .Sum(d => (decimal?)d.Amount) ?? 0m,
                        })
                    .ToListAsync();

                var items = rawItemsChurnAll.Select(x => {
                    var bucketIdx   = x.ChurnProbability >= 100 ? 9 : (int)(x.ChurnProbability / 10);
                    var bucketStart = bucketIdx * 10;
                    return new {
                        x.SupporterId, x.DisplayName, x.RiskLevel, x.ChurnProbability,
                        x.LastDonation, x.ValueInPeriod,
                        ChurnBucket = $"{bucketStart}\u2013{bucketStart + 9}%",
                    };
                }).ToList<object>();

                var kpis = new object[]
                {
                    new { label = "High Risk Donors",      value = highCount.ToString("N0") },
                    new { label = "Medium Risk Donors",    value = medCount.ToString("N0")  },
                    new { label = "Low Risk Donors",       value = lowCount.ToString("N0")  },
                    new { label = "Avg Churn Probability", value = $"{avgChurnPct}%"        },
                };
                var charts = new object[]
                {
                    new { id = "prob-distrib", type = "verticalBar", title = "Churn Probability Distribution", series = probSeries,        valueSuffix = "", showValueLabels = true, filterKey = "churnBucket" },
                    new { id = "risk-distrib", type = "stackedBar",  title = "Risk Tier Breakdown",             series = riskDistribSeries, filterKey = "riskLevel" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Churn tiers ───────────────────────────────────────────────────
            case "churn-high":
            case "churn-medium":
            case "churn-low":
            {
                var level = section == "churn-high" ? "High" : section == "churn-medium" ? "Medium" : "Low";

                var total       = await _db.DonorChurnPredictions.CountAsync(p => p.RiskLevel == level);
                var avgChurnRaw = await _db.DonorChurnPredictions
                    .Where(p => p.RiskLevel == level)
                    .AverageAsync(p => (double?)p.ChurnProbability);
                var avgChurnPct = avgChurnRaw.HasValue ? Math.Round(avgChurnRaw.Value * 100, 1) : 0.0;

                // Supporter IDs at this risk level (for downstream counts)
                var riskIds = await _db.DonorChurnPredictions
                    .Where(p => p.RiskLevel == level)
                    .Select(p => p.SupporterId)
                    .ToListAsync();

                var periodStart    = periodStartGlobal;
                var inactiveInPeriod = riskIds.Count > 0
                    ? await _db.Supporters
                        .Where(s => riskIds.Contains(s.SupporterId))
                        .CountAsync(s => !s.Donations.Any(d => d.DonationDate >= periodStart))
                    : 0;
                var atRiskRevenue  = riskIds.Count > 0
                    ? await _db.Donations
                        .Where(d => riskIds.Contains(d.SupporterId) && d.DonationDate >= periodStart && d.Amount != null)
                        .SumAsync(d => (decimal?)d.Amount)
                    : (decimal?)0m;

                // Risk tier distribution for context bar
                var allChurnCounts = await _db.DonorChurnPredictions
                    .GroupBy(p => p.RiskLevel)
                    .Select(g => new { name = g.Key ?? "Unknown", value = g.Count() })
                    .ToListAsync();
                var riskDistribSeries = new[]
                {
                    new { name = "High",   value = allChurnCounts.FirstOrDefault(x => x.name == "High")?.value   ?? 0, color = "#dc2626" },
                    new { name = "Medium", value = allChurnCounts.FirstOrDefault(x => x.name == "Medium")?.value ?? 0, color = "#d97706" },
                    new { name = "Low",    value = allChurnCounts.FirstOrDefault(x => x.name == "Low")?.value    ?? 0, color = "#16a34a" },
                };

                // Probability distribution for this tier (10% buckets)
                var probData = await _db.DonorChurnPredictions
                    .Where(p => p.RiskLevel == level)
                    .Select(p => (double)p.ChurnProbability * 100)
                    .ToListAsync();

                // Blue→indigo gradient: clearly distinct from red/amber/green risk-tier colors
                var probColors = new[] {
                    "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb",
                    "#1d4ed8", "#4338ca", "#6d28d9", "#7c3aed", "#5b21b6"
                };
                var probSeries = Enumerable.Range(0, 10)
                    .Select(i => new {
                        name  = $"{i * 10}–{i * 10 + 9}%",
                        value = probData.Count(p => p >= i * 10 && p < (i + 1) * 10),
                        color = probColors[i],
                    })
                    .Where(b => b.value > 0)
                    .ToArray();

                // Action list: sorted by churn probability desc (priority outreach queue)
                var rawItemsChurn = await _db.DonorChurnPredictions
                    .Where(p => p.RiskLevel == level)
                    .OrderByDescending(p => p.ChurnProbability)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Supporters, p => p.SupporterId, s => s.SupporterId,
                        (p, s) => new {
                            SupporterId      = s.SupporterId,
                            s.DisplayName,
                            p.RiskLevel,
                            ChurnProbability = Math.Round((double)p.ChurnProbability * 100, 1),
                            LastDonation     = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                            ValueInPeriod    = s.Donations
                                .Where(d => d.DonationDate >= periodStart && d.Amount != null)
                                .Sum(d => (decimal?)d.Amount) ?? 0m,
                        })
                    .ToListAsync();

                var items = rawItemsChurn.Select(x => {
                    var bucketIdx   = x.ChurnProbability >= 100 ? 9 : (int)(x.ChurnProbability / 10);
                    var bucketStart = bucketIdx * 10;
                    return new {
                        x.SupporterId, x.DisplayName, x.RiskLevel, x.ChurnProbability,
                        x.LastDonation, x.ValueInPeriod,
                        ChurnBucket = $"{bucketStart}\u2013{bucketStart + 9}%",
                    };
                }).ToList<object>();

                var kpis = new object[]
                {
                    new { label = $"{level} Risk Donors",                     value = total.ToString("N0") },
                    new { label = "Avg Churn Probability",                     value = $"{avgChurnPct}%" },
                    new { label = $"Inactive ({periodLabel})",                 value = inactiveInPeriod.ToString("N0") },
                    new { label = $"Revenue at Risk ({periodLabel})",          value = atRiskRevenue.HasValue ? $"₱{atRiskRevenue.Value:N0}" : "—" },
                };
                // Neither marked primary → both render side-by-side in grid
                var charts = new object[]
                {
                    new { id = "prob-distrib", type = "verticalBar", title = "Churn Probability Distribution", series = probSeries,        valueSuffix = "", showValueLabels = true, filterKey = "churnBucket" },
                    new { id = "risk-distrib", type = "stackedBar",  title = "All Risk Tiers",                  series = riskDistribSeries, filterKey = "riskLevel" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Active Residents ──────────────────────────────────────────────
            case "residents":
            {
                var periodStart  = periodStartGlobal;
                var total        = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
                var highRisk     = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == "High");
                var medRisk      = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == "Medium");
                var newAdmInPeriod = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.DateOfAdmission >= periodStart);

                // By safe house bar chart
                var bySafehouse = await _db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => s.Name)
                    .GroupBy(name => name)
                    .Select(g => new { name = g.Key ?? "Unknown", value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                // Risk distribution pie
                var riskSeries = new[]
                {
                    new { name = "High",   value = highRisk,              color = "#dc2626" },
                    new { name = "Medium", value = medRisk,               color = "#d97706" },
                    new { name = "Low",    value = total - highRisk - medRisk, color = "#16a34a" },
                };

                var items = await _db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .OrderBy(r => r.CurrentRiskLevel == "High" ? 0 : r.CurrentRiskLevel == "Medium" ? 1 : 2)
                    .ThenBy(r => r.InternalCode)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                        (r, s) => new {
                            ResidentId   = r.ResidentId,
                            r.InternalCode,
                            Safehouse    = s.Name,
                            r.CurrentRiskLevel,
                            r.CaseStatus,
                            r.DateOfAdmission,
                        })
                    .ToListAsync();

                var kpis = new object[]
                {
                    new { label = "Active Residents",             value = total.ToString("N0") },
                    new { label = "High Risk",                    value = highRisk.ToString("N0") },
                    new { label = "Medium Risk",                  value = medRisk.ToString("N0") },
                    new { label = $"New Admissions ({periodLabel})", value = newAdmInPeriod.ToString("N0") },
                };
                var charts = new object[]
                {
                    new { id = "by-safehouse", type = "verticalBar", title = "Residents by Safe House", series = bySafehouse, primary = true, sort = "desc", showValueLabels = true, filterKey = "safehouse" },
                    new { id = "risk-distrib", type = "stackedBar",  title = "Risk Distribution",        series = riskSeries,  compact = true, filterKey = "currentRiskLevel" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Active Safe Houses ────────────────────────────────────────────
            case "safehouses":
            {
                var total          = await _db.Safehouses.CountAsync(s => s.Status == "Active");
                var totalCapacity  = await _db.Safehouses.Where(s => s.Status == "Active").SumAsync(s => (int?)s.CapacityGirls) ?? 0;
                var totalResidents = await _db.Safehouses.Where(s => s.Status == "Active").SumAsync(s => (int?)s.CurrentOccupancy) ?? 0;
                var overCapacity   = await _db.Safehouses.CountAsync(s => s.Status == "Active" && s.CurrentOccupancy > s.CapacityGirls);
                var occupancyPct   = totalCapacity > 0 ? Math.Round((double)totalResidents / totalCapacity * 100, 1) : 0.0;

                var allItems = await _db.Safehouses
                    .Where(s => s.Status == "Active")
                    .OrderByDescending(s => s.CapacityGirls > 0
                        ? (double)s.CurrentOccupancy / s.CapacityGirls
                        : 0)
                    .Select(s => new {
                        s.Name,
                        s.City,
                        s.Region,
                        Residents   = s.CurrentOccupancy,
                        Capacity    = s.CapacityGirls,
                        OccupancyPct = s.CapacityGirls > 0
                            ? Math.Round((double)s.CurrentOccupancy / s.CapacityGirls * 100, 1)
                            : 0.0,
                    })
                    .ToListAsync();

                // Normalize "Lighthouse" → "Safira" in displayed names
                static string NormalizeName(string? raw) =>
                    (raw ?? "Unknown").Replace("Lighthouse", "Safira", StringComparison.OrdinalIgnoreCase);

                // Available capacity list — sorted ascending (0 spots = most urgent first)
                var availabilitySeries = allItems
                    .Select(s => {
                        var empty = Math.Max(0, s.Capacity - s.Residents);
                        var color = empty == 0 ? "#dc2626" : empty <= 2 ? "#d97706" : "#16a34a";
                        return new { name = NormalizeName(s.Name), value = empty, color };
                    })
                    .OrderBy(x => x.value)
                    .ToArray();

                var items = allItems.Skip(skip).Take(pageSize)
                    .Select(s => new {
                        Name         = NormalizeName(s.Name),
                        City         = s.City,
                        Region       = s.Region,
                        Residents    = s.Residents,
                        Capacity     = s.Capacity,
                        OccupancyPct = s.OccupancyPct,
                    })
                    .ToList();

                var kpis = new object[]
                {
                    new { label = "Active Houses",   value = total.ToString("N0") },
                    new { label = "Total Capacity",  value = totalCapacity.ToString("N0") },
                    new { label = "Total Residents", value = totalResidents.ToString("N0") },
                    new { label = "Occupancy Rate",  value = $"{occupancyPct}%" },
                    new { label = "Over Capacity",   value = overCapacity.ToString("N0") },
                };
                var charts = new object[]
                {
                    new { id = "availability", type = "list", title = "Available Spots by Safe House", series = availabilitySeries, primary = true },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Donations ─────────────────────────────────────────────────────
            case "donations":
            {
                var periodStart  = periodStartGlobal;
                var total        = await _db.Donations.CountAsync(d => d.DonationDate >= periodStart);
                var totalAmount  = await _db.Donations.Where(d => d.Amount != null && d.DonationDate >= periodStart).SumAsync(d => (decimal?)d.Amount);
                var recurringCt  = await _db.Donations.CountAsync(d => d.DonationDate >= periodStart && d.IsRecurring == true);

                var byTypeSeries = await _db.Donations
                    .Where(d => d.DonationType != null && d.DonationDate >= periodStart)
                    .GroupBy(d => d.DonationType)
                    .Select(g => new { name = g.Key!, value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                var items = await _db.Donations
                    .Where(d => d.DonationDate != null && d.DonationDate >= periodStart)
                    .OrderByDescending(d => d.DonationDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Supporters, d => d.SupporterId, s => s.SupporterId,
                        (d, s) => new { SupporterId = s.SupporterId, s.DisplayName, d.DonationDate, d.Amount, d.DonationType, d.IsRecurring })
                    .ToListAsync();

                var kpis = new object[]
                {
                    new { label = $"Donations ({periodLabel})", value = total.ToString("N0") },
                    new { label = "Total Amount",               value = totalAmount.HasValue ? $"₱{totalAmount.Value:N0}" : "—" },
                    new { label = "Recurring",                  value = recurringCt.ToString("N0") },
                };
                var charts = new object[]
                {
                    new { id = "by-type", type = "bar", title = $"Donations by Type ({periodLabel})", series = byTypeSeries, primary = true, sort = "desc", filterKey = "donationType" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Conferences ───────────────────────────────────────────────────
            case "conferences":
            {
                // For "all time", show all upcoming conferences; otherwise look ahead by period window
                var periodEnd  = periodDays > 0 ? today.AddDays(periodDays) : new DateOnly(2099, 12, 31);
                var total      = await _db.CaseConferences.CountAsync(c => c.NextConferenceDate >= today && c.NextConferenceDate <= periodEnd);
                var next7d     = await _db.CaseConferences.CountAsync(c => c.NextConferenceDate >= today && c.NextConferenceDate <= today.AddDays(7));
                var byTypeSeries = await _db.CaseConferences
                    .Where(c => c.NextConferenceDate >= today && c.NextConferenceDate <= periodEnd && c.ConferenceType != null)
                    .GroupBy(c => c.ConferenceType)
                    .Select(g => new { name = g.Key!, value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                var items = await _db.CaseConferences
                    .Where(c => c.NextConferenceDate != null && c.NextConferenceDate >= today && c.NextConferenceDate <= periodEnd)
                    .OrderBy(c => c.NextConferenceDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, c => c.ResidentId, r => r.ResidentId,
                        (c, r) => new { ResidentId = r.ResidentId, ResidentCode = r.InternalCode, c.ConferenceType, c.NextConferenceDate, c.SocialWorker })
                    .ToListAsync();

                var kpis = new object[]
                {
                    new { label = $"Upcoming ({periodLabel})", value = total.ToString("N0") },
                    new { label = "Due in 7 Days",             value = next7d.ToString("N0") },
                };
                var charts = new object[]
                {
                    new { id = "by-type", type = "bar", title = $"Upcoming by Type (next {periodLabel})", series = byTypeSeries, primary = true, sort = "desc", filterKey = "conferenceType" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Health ────────────────────────────────────────────────────────
            case "health":
            {
                var periodStart    = periodStartGlobal;
                var total          = await _db.HealthWellbeingRecords.CountAsync(h => h.RecordDate >= periodStart);
                var belowThreshold = await _db.HealthWellbeingRecords.CountAsync(h => h.RecordDate >= periodStart && h.GeneralHealthScore != null && h.GeneralHealthScore < 3);
                var avgHealth      = await _db.HealthWellbeingRecords.Where(h => h.RecordDate >= periodStart && h.GeneralHealthScore != null).AverageAsync(h => (double)h.GeneralHealthScore!.Value);
                var avgNutrition   = await _db.HealthWellbeingRecords.Where(h => h.RecordDate >= periodStart && h.NutritionScore != null).AverageAsync(h => (double)h.NutritionScore!.Value);
                var avgSleep       = await _db.HealthWellbeingRecords.Where(h => h.RecordDate >= periodStart && h.SleepQualityScore != null).AverageAsync(h => (double)h.SleepQualityScore!.Value);
                var avgEnergy      = await _db.HealthWellbeingRecords.Where(h => h.RecordDate >= periodStart && h.EnergyLevelScore != null).AverageAsync(h => (double)h.EnergyLevelScore!.Value);

                var avgScoresSeries = new object[]
                {
                    new { name = "General Health", value = Math.Round(avgHealth, 2) },
                    new { name = "Nutrition",      value = Math.Round(avgNutrition, 2) },
                    new { name = "Sleep Quality",  value = Math.Round(avgSleep, 2) },
                    new { name = "Energy Level",   value = Math.Round(avgEnergy, 2) },
                };

                // Avg general health score by safe house in period (materialized to avoid SQL translation issues)
                var healthScoresByResident = await _db.HealthWellbeingRecords
                    .Where(h => h.RecordDate >= periodStart && h.GeneralHealthScore != null && h.ResidentId != null)
                    .Select(h => new { ResidentId = h.ResidentId!.Value, Score = (double)h.GeneralHealthScore!.Value })
                    .ToListAsync();

                var residentHouseMap = await _db.Residents
                    .Where(r => r.SafehouseId != null)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                          (r, s) => new { r.ResidentId, HouseName = s.Name ?? "Unknown" })
                    .ToListAsync();

                var healthBySafehouseRaw = healthScoresByResident
                    .Join(residentHouseMap, h => h.ResidentId, r => r.ResidentId,
                          (h, r) => new { r.HouseName, h.Score })
                    .GroupBy(x => x.HouseName)
                    .Select(g => new { name = g.Key, value = Math.Round(g.Average(x => x.Score), 2) })
                    .OrderBy(x => x.value)
                    .ToArray();

                // Color-code by health tier: <3.0=red, 3.0-3.9=amber, >=4.0=green
                var healthBySafehouse = healthBySafehouseRaw
                    .Select(x => new {
                        x.name,
                        x.value,
                        color = x.value >= 4.0 ? "#16a34a" : x.value >= 3.0 ? "#d97706" : "#dc2626"
                    })
                    .ToArray();

                // Action list: records in period, sorted by lowest general health first
                var rawHealthItems = await _db.HealthWellbeingRecords
                    .Where(h => h.RecordDate != null && h.RecordDate >= periodStart)
                    .OrderBy(h => h.GeneralHealthScore ?? 99)
                    .ThenByDescending(h => h.RecordDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, h => h.ResidentId, r => r.ResidentId,
                        (h, r) => new {
                            ResidentId    = r.ResidentId,
                            ResidentCode  = r.InternalCode,
                            SafehouseId   = r.SafehouseId,
                            h.RecordDate,
                            GeneralHealth = h.GeneralHealthScore,
                            Nutrition     = h.NutritionScore,
                            Sleep         = h.SleepQualityScore,
                            Energy        = h.EnergyLevelScore,
                        })
                    .ToListAsync();

                var shLookup = await _db.Safehouses
                    .ToDictionaryAsync(s => s.SafehouseId, s => s.Name ?? "Unknown");

                var items = rawHealthItems.Select(h => new {
                    h.ResidentId, h.ResidentCode, h.RecordDate,
                    h.GeneralHealth, h.Nutrition, h.Sleep, h.Energy,
                    Safehouse = h.SafehouseId != null && shLookup.TryGetValue(h.SafehouseId.Value, out var shN) ? shN : "Unknown",
                }).ToList<object>();

                var kpis = new object[]
                {
                    new { label = $"Records ({periodLabel})", value = total.ToString("N0") },
                    new { label = "Below Threshold",          value = belowThreshold.ToString("N0") },
                    new { label = "Avg Health",               value = $"{Math.Round(avgHealth, 1)}/5" },
                    new { label = "Avg Nutrition",            value = $"{Math.Round(avgNutrition, 1)}/5" },
                    new { label = "Avg Sleep",                value = $"{Math.Round(avgSleep, 1)}/5" },
                    new { label = "Avg Energy",               value = $"{Math.Round(avgEnergy, 1)}/5" },
                };
                var charts = new object[]
                {
                    // No primary=true → both render side-by-side
                    new { id = "avg-scores",   type = "statList",    title = "Avg Health Scores",       series = avgScoresSeries,   valueSuffix = "/5" },
                    new { id = "by-safehouse", type = "verticalBar", title = "Avg Health by Safe House", series = healthBySafehouse, valueSuffix = "/5", yDomain = new[] { 2, 5 }, threshold = 3.0, sort = "asc", filterKey = "safehouse" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Education ─────────────────────────────────────────────────────
            case "education":
            {
                var periodStart   = periodStartGlobal;
                var total         = await _db.EducationRecords.CountAsync(e => e.RecordDate >= periodStart);
                var enrolled      = await _db.EducationRecords.CountAsync(e => e.RecordDate >= periodStart && e.EnrollmentStatus == "Enrolled");
                var atRisk        = await _db.EducationRecords.CountAsync(e => e.RecordDate >= periodStart && e.AttendanceRate != null && e.AttendanceRate < 0.7m);
                var avgAttendance = await _db.EducationRecords.Where(e => e.RecordDate >= periodStart && e.AttendanceRate != null).AverageAsync(e => (double)e.AttendanceRate!.Value);
                var avgProgress   = await _db.EducationRecords.Where(e => e.RecordDate >= periodStart && e.ProgressPercent != null).AverageAsync(e => (double)e.ProgressPercent!.Value);

                // Enrollment status donut (within period)
                var enrollmentSeries = await _db.EducationRecords
                    .Where(e => e.RecordDate >= periodStart)
                    .GroupBy(e => e.EnrollmentStatus)
                    .Select(g => new { name = g.Key ?? "Unknown", value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                // At-risk proportion (attendance < 70%)
                var atRiskSeries = new object[]
                {
                    new { name = "At Risk (<70%)", value = atRisk,          color = "#dc2626" },
                    new { name = "On Track",        value = total - atRisk, color = "#16a34a" },
                };

                // At-risk by enrollment status (vertical bar)
                var atRiskByStatusRaw = await _db.EducationRecords
                    .Where(e => e.RecordDate >= periodStart && e.AttendanceRate != null && e.AttendanceRate < 0.7m && e.EnrollmentStatus != null)
                    .GroupBy(e => e.EnrollmentStatus)
                    .Select(g => new { name = g.Key!, value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                var atRiskRate = enrolled > 0 ? Math.Round(100.0 * atRisk / enrolled, 1) : 0.0;

                // Action list: sorted by lowest attendance first, within period
                var rawItemsEdu = await _db.EducationRecords
                    .Where(e => e.RecordDate != null && e.RecordDate >= periodStart)
                    .OrderBy(e => e.AttendanceRate ?? 1m)
                    .ThenByDescending(e => e.RecordDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, e => e.ResidentId, r => r.ResidentId,
                        (e, r) => new {
                            ResidentId      = r.ResidentId,
                            ResidentCode    = r.InternalCode,
                            e.RecordDate,
                            e.EnrollmentStatus,
                            AttendancePct   = e.AttendanceRate != null ? Math.Round((double)e.AttendanceRate * 100, 1) : (double?)null,
                            Progress        = e.ProgressPercent,
                        })
                    .ToListAsync();

                var items = rawItemsEdu.Select(e => new {
                    e.ResidentId, e.ResidentCode, e.RecordDate, e.EnrollmentStatus,
                    e.AttendancePct, e.Progress,
                    AttendanceBucket = e.AttendancePct != null && e.AttendancePct < 70.0 ? "At Risk (<70%)" : "On Track",
                }).ToList<object>();

                var kpis = new object[]
                {
                    new { label = $"Records ({periodLabel})", value = total.ToString("N0") },
                    new { label = "Enrolled",                  value = enrolled.ToString("N0") },
                    new { label = "At-Risk Learners",          value = atRisk.ToString("N0") },
                    new { label = "At-Risk Rate",              value = $"{atRiskRate}%" },
                    new { label = "Avg Attendance",            value = $"{Math.Round(avgAttendance * 100, 1)}%" },
                    new { label = "Avg Progress",              value = $"{Math.Round(avgProgress, 1)}%" },
                };
                var charts = new object[]
                {
                    new { id = "enrollment",   type = "donut",      title = "Enrollment Status Mix", series = enrollmentSeries, filterKey = "enrollmentStatus" },
                    new { id = "at-risk-prop", type = "stackedBar", title = "At-Risk vs On Track",   series = atRiskSeries,     filterKey = "attendanceBucket" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Counseling ────────────────────────────────────────────────────
            case "counseling":
            {
                var periodStart    = periodStartGlobal;
                var total          = await _db.ProcessRecordings.CountAsync(p => p.SessionDate >= periodStart);
                var uniqueResidents = await _db.ProcessRecordings.Where(p => p.SessionDate >= periodStart).Select(p => p.ResidentId).Distinct().CountAsync();
                var avgDuration    = await _db.ProcessRecordings.Where(p => p.SessionDate >= periodStart && p.SessionDurationMinutes != null).AverageAsync(p => (double?)p.SessionDurationMinutes);

                var byTypeSeries = await _db.ProcessRecordings
                    .Where(p => p.SessionDate >= periodStart)
                    .GroupBy(p => p.SessionType)
                    .Select(g => new { name = g.Key ?? "Unknown", value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                // Sessions by resident risk tier in period
                var sessionsByRiskRaw = await _db.ProcessRecordings
                    .Where(p => p.SessionDate >= periodStart)
                    .Join(_db.Residents, p => p.ResidentId, r => r.ResidentId, (p, r) => new { r.CurrentRiskLevel })
                    .GroupBy(x => x.CurrentRiskLevel)
                    .Select(g => new { name = g.Key ?? "Unknown", value = g.Count() })
                    .ToListAsync();

                var sessionsByRisk = new object[]
                {
                    new { name = "High",   value = sessionsByRiskRaw.FirstOrDefault(x => x.name == "High")?.value   ?? 0, color = "#dc2626" },
                    new { name = "Medium", value = sessionsByRiskRaw.FirstOrDefault(x => x.name == "Medium")?.value ?? 0, color = "#d97706" },
                    new { name = "Low",    value = sessionsByRiskRaw.FirstOrDefault(x => x.name == "Low")?.value    ?? 0, color = "#16a34a" },
                };

                var avgSessionsPerResident = uniqueResidents > 0 ? Math.Round((double)total / uniqueResidents, 1) : 0.0;

                // Action list: most recent sessions first, within period
                var items = await _db.ProcessRecordings
                    .Where(p => p.SessionDate != null && p.SessionDate >= periodStart)
                    .OrderByDescending(p => p.SessionDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, p => p.ResidentId, r => r.ResidentId,
                        (p, r) => new {
                            ResidentId             = r.ResidentId,
                            ResidentCode           = r.InternalCode,
                            p.SessionType,
                            p.SessionDate,
                            p.SocialWorker,
                            p.SessionDurationMinutes,
                            CurrentRiskLevel       = r.CurrentRiskLevel,
                        })
                    .ToListAsync();

                var kpis = new object[]
                {
                    new { label = $"Sessions ({periodLabel})", value = total.ToString("N0") },
                    new { label = "Unique Residents",          value = uniqueResidents.ToString("N0") },
                    new { label = "Avg Sessions / Resident",   value = avgSessionsPerResident.ToString("N1") },
                    new { label = "Avg Duration (min)",        value = avgDuration.HasValue ? Math.Round(avgDuration.Value, 0).ToString("N0") : "—" },
                };
                var charts = new object[]
                {
                    // No primary=true → side-by-side
                    new { id = "by-type", type = "statList",   title = "Sessions by Type",              series = byTypeSeries,  filterKey = "sessionType" },
                    new { id = "by-risk", type = "stackedBar", title = "Sessions by Resident Risk Tier", series = sessionsByRisk, filterKey = "currentRiskLevel" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Active Resident Risk all tiers combined ───────────────────────
            case "risk-all":
            {
                var total     = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
                var highCount = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == "High");
                var medCount  = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == "Medium");
                var lowCount  = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == "Low");

                var riskDistribSeries = new[]
                {
                    new { name = "High",   value = highCount, color = "#dc2626" },
                    new { name = "Medium", value = medCount,  color = "#d97706" },
                    new { name = "Low",    value = lowCount,  color = "#16a34a" },
                };

                var bySafehouse = await _db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => s.Name)
                    .GroupBy(name => name)
                    .Select(g => new { name = g.Key ?? "Unknown", value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                var items = await _db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .OrderBy(r => r.CurrentRiskLevel == "High" ? 0 : r.CurrentRiskLevel == "Medium" ? 1 : 2)
                    .ThenBy(r => r.InternalCode)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                        (r, s) => new { ResidentId = r.ResidentId, r.InternalCode, Safehouse = s.Name, RiskLevel = r.CurrentRiskLevel, r.CaseStatus })
                    .ToListAsync();

                var kpis = new object[]
                {
                    new { label = "Active Residents", value = total.ToString("N0")     },
                    new { label = "High Risk",        value = highCount.ToString("N0") },
                    new { label = "Medium Risk",      value = medCount.ToString("N0")  },
                    new { label = "Low Risk",         value = lowCount.ToString("N0")  },
                };
                var charts = new object[]
                {
                    new { id = "risk-distrib",  type = "stackedBar", title = "Risk Tier Breakdown",     series = riskDistribSeries, filterKey = "riskLevel"   },
                    new { id = "by-safehouse",  type = "statList",   title = "Residents by Safe House",  series = bySafehouse,       filterKey = "safehouse"   },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── Active Resident Risk tiers ─────────────────────────────────────
            case "risk-high":
            case "risk-medium":
            case "risk-low":
            {
                var periodStart   = periodStartGlobal;
                var level         = section == "risk-high" ? "High" : section == "risk-medium" ? "Medium" : "Low";
                var total         = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == level);
                var allActive     = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
                var newInRiskPeriod = await _db.Residents.CountAsync(r =>
                    r.CaseStatus == "Active" && r.CurrentRiskLevel == level && r.DateOfAdmission >= periodStart);

                // Full risk tier distribution for context
                var allRiskCounts = await _db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .GroupBy(r => r.CurrentRiskLevel)
                    .Select(g => new { name = g.Key ?? "Unknown", count = g.Count() })
                    .ToListAsync();

                var riskDistribSeries = new[]
                {
                    new { name = "High",   value = allRiskCounts.FirstOrDefault(x => x.name == "High")?.count   ?? 0, color = "#dc2626" },
                    new { name = "Medium", value = allRiskCounts.FirstOrDefault(x => x.name == "Medium")?.count ?? 0, color = "#d97706" },
                    new { name = "Low",    value = allRiskCounts.FirstOrDefault(x => x.name == "Low")?.count    ?? 0, color = "#16a34a" },
                };

                // By safe house distribution
                var bySafehouse = await _db.Residents
                    .Where(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == level)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => s.Name)
                    .GroupBy(name => name)
                    .Select(g => new { name = g.Key ?? "Unknown", value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                var sharePct = allActive > 0 ? Math.Round(100.0 * total / allActive, 1) : 0.0;

                var items = await _db.Residents
                    .Where(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == level)
                    .OrderBy(r => r.InternalCode)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                        (r, s) => new { ResidentId = r.ResidentId, r.InternalCode, Safehouse = s.Name, r.CurrentRiskLevel, r.CaseStatus })
                    .ToListAsync();

                var kpis = new object[]
                {
                    new { label = $"{level} Risk Residents",          value = total.ToString("N0") },
                    new { label = "Share of Active",                   value = $"{sharePct}%" },
                    new { label = $"New Admissions ({periodLabel})",   value = newInRiskPeriod.ToString("N0") },
                };
                var charts = new object[]
                {
                    // No primary → side-by-side grid
                    new { id = "by-safehouse", type = "statList",   title = $"{level} Risk by Safe House", series = bySafehouse,       filterKey = "safehouse" },
                    new { id = "risk-distrib", type = "stackedBar", title = "All Risk Levels",              series = riskDistribSeries },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            // ── OKR sections ──────────────────────────────────────────────────
            case "okr-recent":
            {
                var periodStart   = periodStartGlobal;
                var activeDonors  = await _db.Supporters.CountAsync(s => s.Status == "Active");
                var total         = await _db.Supporters.CountAsync(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= periodStart));
                var lapsed        = activeDonors - total;
                var pct           = activeDonors > 0 ? Math.Round(100.0 * total / activeDonors, 1) : 0.0;
                var repeatIn12mo  = await _db.Supporters
                    .CountAsync(s => s.Status == "Active" && s.Donations.Count(d => d.DonationDate >= twelveMonthsAgo) >= 2);
                var repeatRate    = activeDonors > 0 ? Math.Round(100.0 * repeatIn12mo / activeDonors, 1) : 0.0;

                // Retention split donut — series names must match items' statusLabel for click-to-filter
                var retentionSeries = new object[]
                {
                    new { name = "Retained", value = total,  color = "#16a34a" },
                    new { name = "Lapsed",   value = lapsed, color = "#dc2626" },
                };

                // Gift frequency within selected period for retained donors
                var giftCountsPeriod = await _db.Supporters
                    .Where(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= periodStart))
                    .Select(s => s.Donations.Count(d => d.DonationDate >= periodStart))
                    .ToListAsync();
                var frequencySeries = new object[]
                {
                    new { name = "1 gift",    value = giftCountsPeriod.Count(c => c == 1) },
                    new { name = "2–3 gifts", value = giftCountsPeriod.Count(c => c >= 2 && c <= 3) },
                    new { name = "4+ gifts",  value = giftCountsPeriod.Count(c => c >= 4) },
                };

                // Monthly donor activity trend — spans the selected period
                var trendMonths = period switch { "all" => 24, "6mo" => 6, "12mo" => 12, _ => 3 };
                var rawDonationsTrend = await _db.Donations
                    .Where(d => d.DonationDate >= periodStart)
                    .Select(d => new { d.SupporterId, d.DonationDate.Year, d.DonationDate.Month })
                    .ToListAsync();

                var trendSeries = Enumerable.Range(0, trendMonths).Select(i => {
                    var monthDate = today.AddMonths(i - (trendMonths - 1));
                    var count = rawDonationsTrend
                        .Where(d => d.Year == monthDate.Year && d.Month == monthDate.Month)
                        .Select(d => d.SupporterId).Distinct().Count();
                    return (object)new { name = new DateTime(monthDate.Year, monthDate.Month, 1).ToString("MMM ''yy"), value = count };
                }).ToArray();

                // Action list: retained within period, sorted by period value desc
                var rawOkrItems = await _db.Supporters
                    .Where(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= periodStart))
                    .OrderByDescending(s => s.Donations
                        .Where(d => d.DonationDate >= periodStart && d.Amount != null)
                        .Sum(d => (decimal?)d.Amount) ?? 0m)
                    .Skip(skip).Take(pageSize)
                    .Select(s => new {
                        SupporterId      = s.SupporterId,
                        DisplayName      = s.DisplayName,
                        Country          = s.Country,
                        LastDonation     = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        GiftCount12mo    = s.Donations.Count(d => d.DonationDate >= periodStart),
                        TotalDonated12mo = s.Donations
                            .Where(d => d.DonationDate >= periodStart && d.Amount != null)
                            .Sum(d => (decimal?)d.Amount) ?? 0m,
                        StatusLabel      = "Active",
                    })
                    .ToListAsync();

                var items = rawOkrItems.Select(s => new {
                    s.SupporterId, s.DisplayName, s.Country, s.LastDonation,
                    s.GiftCount12mo, s.TotalDonated12mo,
                    StatusLabel = "Retained",   // matches retentionSeries name for click-to-filter
                    GiftFrequencyBucket = s.GiftCount12mo == 1 ? "1 gift"
                        : s.GiftCount12mo is >= 2 and <= 3 ? "2–3 gifts"
                        : "4+ gifts",
                }).ToList<object>();

                var kpis = new object[]
                {
                    new { label = "Retained Donors",    value = total.ToString("N0") },
                    new { label = "Active Rate",         value = $"{pct}%" },
                    new { label = "Lapsed Donors",       value = lapsed.ToString("N0") },
                    new { label = "Repeat Rate (12mo)",  value = $"{repeatRate}%" },
                };
                var charts = new object[]
                {
                    new { id = "trend",     type = "line",  title = $"Active Donors per Month ({periodLabel})", series = trendSeries,     primary = true },
                    new { id = "retention", type = "donut", title = $"Retention Split ({periodLabel})", series = retentionSeries, compact = true, filterKey = "statusLabel" },
                    new { id = "frequency", type = "bar",   title = $"Gift Frequency ({periodLabel})", series = frequencySeries, compact = true, filterKey = "giftFrequencyBucket" },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            case "okr-lapsed":
            {
                var periodStart  = periodStartGlobal;
                var activeDonors = await _db.Supporters.CountAsync(s => s.Status == "Active");
                var total        = await _db.Supporters
                    .CountAsync(s => s.Status == "Active" && !s.Donations.Any(d => d.DonationDate >= periodStart));
                var pct          = activeDonors > 0 ? Math.Round(100.0 * total / activeDonors, 1) : 0.0;
                var retained     = activeDonors - total;

                // At-risk revenue: what lapsed donors gave in the selected period
                var lapsedIds = await _db.Supporters
                    .Where(s => s.Status == "Active" && !s.Donations.Any(d => d.DonationDate >= periodStart))
                    .Select(s => s.SupporterId)
                    .ToListAsync();
                var atRiskRevenue = lapsedIds.Count > 0
                    ? await _db.Donations
                        .Where(d => lapsedIds.Contains(d.SupporterId)
                                 && d.DonationDate >= twelveMonthsAgo && d.Amount != null)
                        .SumAsync(d => (decimal?)d.Amount)
                    : (decimal?)0m;

                // Active vs Lapsed donut
                var retentionSeries = new object[]
                {
                    new { name = $"Active ({periodLabel})", value = retained, color = "#16a34a" },
                    new { name = "Lapsed",                   value = total,    color = "#dc2626" },
                };

                // Lapsed donors by country
                var countrySeries = await _db.Supporters
                    .Where(s => s.Status == "Active" && s.Country != null
                             && !s.Donations.Any(d => d.DonationDate >= periodStart))
                    .GroupBy(s => s.Country)
                    .Select(g => new { name = g.Key!, value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .Take(8)
                    .ToListAsync();

                // Action list: sorted by 12-mo value desc (highest revenue at risk first)
                var items = await _db.Supporters
                    .Where(s => s.Status == "Active" && !s.Donations.Any(d => d.DonationDate >= periodStart))
                    .OrderByDescending(s => s.Donations
                        .Where(d => d.DonationDate >= twelveMonthsAgo && d.Amount != null)
                        .Sum(d => (decimal?)d.Amount) ?? 0m)
                    .Skip(skip).Take(pageSize)
                    .Select(s => new {
                        SupporterId      = s.SupporterId,
                        DisplayName      = s.DisplayName,
                        Country          = s.Country,
                        LastDonation     = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        GiftCount12mo    = s.Donations.Count(d => d.DonationDate >= twelveMonthsAgo),
                        TotalDonated12mo = s.Donations
                            .Where(d => d.DonationDate >= twelveMonthsAgo && d.Amount != null)
                            .Sum(d => (decimal?)d.Amount) ?? 0m,
                        StatusLabel      = "Lapsed",
                    })
                    .ToListAsync();

                // Monthly lapsed donor count trend — spans the selected period
                var lapsedTrendMonths = period switch { "all" => 24, "6mo" => 6, "12mo" => 12, _ => 3 };
                var rawLapsedDonations = await _db.Donations
                    .Where(d => lapsedIds.Contains(d.SupporterId) && d.DonationDate >= periodStart)
                    .Select(d => new { d.SupporterId, d.DonationDate.Year, d.DonationDate.Month })
                    .ToListAsync();

                var lapsedTrendSeries = Enumerable.Range(0, lapsedTrendMonths).Select(i => {
                    var monthDate = today.AddMonths(i - (lapsedTrendMonths - 1));
                    var count = rawLapsedDonations
                        .Where(d => d.Year == monthDate.Year && d.Month == monthDate.Month)
                        .Select(d => d.SupporterId).Distinct().Count();
                    return (object)new { name = new DateTime(monthDate.Year, monthDate.Month, 1).ToString("MMM ''yy"), value = count };
                }).ToArray();

                var kpis = new object[]
                {
                    new { label = "Lapsed Donors",         value = total.ToString("N0") },
                    new { label = "Share of Active",        value = $"{pct}%" },
                    new { label = "12-Mo Revenue at Risk",  value = atRiskRevenue.HasValue ? $"₱{atRiskRevenue.Value:N0}" : "—" },
                };
                var charts = new object[]
                {
                    new { id = "trend",      type = "line",  title = $"Lapsed Donor Activity ({periodLabel})",     series = lapsedTrendSeries, primary = true },
                    new { id = "retention",  type = "donut", title = $"Active vs Lapsed ({periodLabel})", series = retentionSeries,   compact = true },
                    new { id = "by-country", type = "bar",   title = "Lapsed Donors by Country",          series = countrySeries,     compact = true },
                };
                return Ok(new { kpis, charts, items, totalCount = total });
            }

            default:
                return BadRequest(new { message = $"Unknown section: {section}" });
        }
    }

    // ── Summary dashboard ─────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var residentStatusCounts = await _db.Residents
            .GroupBy(r => r.CaseStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var activeResidents = residentStatusCounts.FirstOrDefault(x => x.Status == "Active")?.Count ?? 0;
        var activeSafehouses = await _db.Safehouses.CountAsync(s => s.Status == "Active");
        var activeDonors = await _db.Supporters.CountAsync(s => s.Status == "Active");

        var churnCounts = await _db.DonorChurnPredictions
            .GroupBy(p => p.RiskLevel)
            .Select(g => new { RiskLevel = g.Key, Count = g.Count() })
            .ToListAsync();

        var highChurnCount = churnCounts.FirstOrDefault(x => x.RiskLevel == "High")?.Count ?? 0;

        var recentDonations = await _db.Donations
            .Where(d => d.DonationDate != null)
            .OrderByDescending(d => d.DonationDate)
            .Take(10)
            .Join(_db.Supporters, d => d.SupporterId, s => s.SupporterId,
                (d, s) => new {
                    d.DonationId,
                    DonorName = s.DisplayName,
                    d.DonationDate,
                    d.Amount,
                    d.DonationType,
                    d.CampaignName,
                    d.IsRecurring,
                })
            .ToListAsync();

        var upcomingConferences = await _db.CaseConferences
            .Where(c => c.NextConferenceDate != null && c.NextConferenceDate >= today)
            .OrderBy(c => c.NextConferenceDate)
            .Take(5)
            .Join(_db.Residents, c => c.ResidentId, r => r.ResidentId,
                (c, r) => new {
                    c.ConferenceId,
                    ResidentCode = r.InternalCode,
                    c.ConferenceType,
                    c.NextConferenceDate,
                    c.SocialWorker,
                })
            .ToListAsync();

        var healthAvg = await _db.HealthWellbeingRecords
            .Where(h => h.GeneralHealthScore != null)
            .GroupBy(_ => 1)
            .Select(g => new {
                AvgGeneralHealth = Math.Round((double)g.Average(h => h.GeneralHealthScore!.Value), 2),
                AvgNutrition     = Math.Round((double)g.Average(h => h.NutritionScore     ?? 0), 2),
                AvgSleepQuality  = Math.Round((double)g.Average(h => h.SleepQualityScore  ?? 0), 2),
                AvgEnergyLevel   = Math.Round((double)g.Average(h => h.EnergyLevelScore   ?? 0), 2),
            })
            .FirstOrDefaultAsync();

        var educationAvg = await _db.EducationRecords
            .Where(e => e.AttendanceRate != null)
            .GroupBy(_ => 1)
            .Select(g => new {
                AvgAttendanceRate  = Math.Round((double)g.Average(e => e.AttendanceRate!.Value) * 100, 1),
                AvgProgressPercent = Math.Round((double)g.Average(e => e.ProgressPercent ?? 0), 1),
            })
            .FirstOrDefaultAsync();

        var enrollmentCounts = await _db.EducationRecords
            .GroupBy(e => e.EnrollmentStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var counselingCounts = await _db.ProcessRecordings
            .GroupBy(p => p.SessionType)
            .Select(g => new { SessionType = g.Key, Count = g.Count() })
            .ToListAsync();

        var activeRiskCounts = await _db.Residents
            .Where(r => r.CaseStatus == "Active")
            .GroupBy(r => r.CurrentRiskLevel)
            .Select(g => new { RiskLevel = g.Key, Count = g.Count() })
            .ToListAsync();

        var threeMonthsAgo = today.AddMonths(-3);
        var donorOkrRecentCount = await _db.Supporters
            .Where(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= threeMonthsAgo))
            .CountAsync();

        double? donorOkrPercent = activeDonors == 0
            ? null
            : Math.Round(100.0 * donorOkrRecentCount / activeDonors, 1);

        return Ok(new {
            activeResidents,
            activeSafehouses,
            activeDonors,
            highChurnCount,
            residentStatusCounts,
            churnCounts,
            recentDonations,
            upcomingConferences,
            healthAvg,
            educationAvg,
            enrollmentCounts,
            counselingCounts,
            activeRiskCounts,
            donorOkrPercent,
            donorOkrRecentCount,
        });
    }
}
