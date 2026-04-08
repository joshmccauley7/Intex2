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

    [HttpGet("detail")]
    public async Task<IActionResult> GetDetail(
        [FromQuery] string section,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 500) pageSize = 500;
        if (page < 1) page = 1;
        int skip = (page - 1) * pageSize;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var threeMonthsAgo = today.AddMonths(-3);
        var ninetyDaysAgo = today.AddDays(-90);

        switch (section)
        {
            case "residents":
            {
                var total = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
                var highRisk = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == "High");
                var medRisk = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == "Medium");
                var items = await _db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .OrderBy(r => r.InternalCode)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                        (r, s) => new { r.InternalCode, Safehouse = s.Name, r.CurrentRiskLevel, r.CaseStatus, r.DateOfAdmission })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Total Active", value = total.ToString("N0") },
                    new { label = "High Risk", value = highRisk.ToString("N0") },
                    new { label = "Medium Risk", value = medRisk.ToString("N0") },
                    new { label = "Low Risk", value = (total - highRisk - medRisk).ToString("N0") },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "safehouses":
            {
                var total = await _db.Safehouses.CountAsync(s => s.Status == "Active");
                var totalCapacity = await _db.Safehouses
                    .Where(s => s.Status == "Active")
                    .SumAsync(s => (int?)s.CapacityGirls) ?? 0;
                var totalResidents = await _db.Safehouses
                    .Where(s => s.Status == "Active")
                    .SumAsync(s => (int?)s.CurrentOccupancy) ?? 0;
                var items = await _db.Safehouses
                    .Where(s => s.Status == "Active")
                    .OrderBy(s => s.Name)
                    .Skip(skip).Take(pageSize)
                    .Select(s => new {
                        s.Name, s.City, s.Region, s.Status,
                        Residents = s.CurrentOccupancy, Capacity = s.CapacityGirls,
                        OccupancyPct = s.CapacityGirls > 0 ? Math.Round((double)s.CurrentOccupancy / s.CapacityGirls * 100, 1) : 0
                    })
                    .ToListAsync();
                var occupancyPct = totalCapacity > 0
                    ? Math.Round((double)totalResidents / totalCapacity * 100, 1)
                    : 0;
                var summary = new object[]
                {
                    new { label = "Active Houses", value = total.ToString("N0") },
                    new { label = "Total Capacity", value = totalCapacity.ToString("N0") },
                    new { label = "Total Residents", value = totalResidents.ToString("N0") },
                    new { label = "Occupancy Rate", value = $"{occupancyPct}%" },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "donors":
            {
                var total = await _db.Supporters.CountAsync(s => s.Status == "Active");
                var gave90d = await _db.Supporters
                    .CountAsync(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= ninetyDaysAgo));
                var items = await _db.Supporters
                    .Where(s => s.Status == "Active")
                    .OrderByDescending(s => s.Donations.Max(d => (DateOnly?)d.DonationDate))
                    .Skip(skip).Take(pageSize)
                    .Select(s => new {
                        s.DisplayName, s.Status, s.Country,
                        LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        TotalDonated = s.Donations.Where(d => d.Amount != null).Sum(d => (decimal?)d.Amount) ?? 0
                    })
                    .ToListAsync();
                var retentionPct = total > 0 ? Math.Round(100.0 * gave90d / total, 1) : 0;
                var summary = new object[]
                {
                    new { label = "Active Donors", value = total.ToString("N0") },
                    new { label = "Gave in 90d", value = gave90d.ToString("N0") },
                    new { label = "90-day Retention", value = $"{retentionPct}%" },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "churn-high":
            case "churn-medium":
            case "churn-low":
            {
                var level = section == "churn-high" ? "High" : section == "churn-medium" ? "Medium" : "Low";
                var total = await _db.DonorChurnPredictions.CountAsync(p => p.RiskLevel == level);
                var avgChurnRaw = await _db.DonorChurnPredictions
                    .Where(p => p.RiskLevel == level)
                    .AverageAsync(p => (double?)p.ChurnProbability);
                var avgChurnPct = avgChurnRaw.HasValue ? Math.Round(avgChurnRaw.Value * 100, 1) : 0;
                var items = await _db.DonorChurnPredictions
                    .Where(p => p.RiskLevel == level)
                    .OrderByDescending(p => p.ChurnProbability)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Supporters, p => p.SupporterId, s => s.SupporterId,
                        (p, s) => new {
                            s.DisplayName, p.RiskLevel,
                            ChurnProbability = Math.Round((double)p.ChurnProbability * 100, 1),
                            LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate)
                        })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = $"{level} Risk Count", value = total.ToString("N0") },
                    new { label = "Avg Churn Probability", value = $"{avgChurnPct}%" },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "donations":
            {
                var total = await _db.Donations.CountAsync();
                var totalAmount = await _db.Donations
                    .Where(d => d.Amount != null)
                    .SumAsync(d => (decimal?)d.Amount);
                var items = await _db.Donations
                    .Where(d => d.DonationDate != null)
                    .OrderByDescending(d => d.DonationDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Supporters, d => d.SupporterId, s => s.SupporterId,
                        (d, s) => new { s.DisplayName, d.DonationDate, d.Amount, d.DonationType, d.IsRecurring })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Total Donations", value = total.ToString("N0") },
                    new { label = "Total Amount", value = totalAmount.HasValue ? $"${totalAmount.Value:N2}" : "—" },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "conferences":
            {
                var total = await _db.CaseConferences.CountAsync(c => c.NextConferenceDate >= today);
                var items = await _db.CaseConferences
                    .Where(c => c.NextConferenceDate != null && c.NextConferenceDate >= today)
                    .OrderBy(c => c.NextConferenceDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, c => c.ResidentId, r => r.ResidentId,
                        (c, r) => new { ResidentCode = r.InternalCode, c.ConferenceType, c.NextConferenceDate, c.SocialWorker })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Upcoming Conferences", value = total.ToString("N0") },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "health":
            {
                var total = await _db.HealthWellbeingRecords.CountAsync();
                var avgHealth = await _db.HealthWellbeingRecords
                    .Where(h => h.GeneralHealthScore != null)
                    .AverageAsync(h => (double)h.GeneralHealthScore!.Value);
                var avgNutrition = await _db.HealthWellbeingRecords
                    .Where(h => h.NutritionScore != null)
                    .AverageAsync(h => (double)h.NutritionScore!.Value);
                var avgSleep = await _db.HealthWellbeingRecords
                    .Where(h => h.SleepQualityScore != null)
                    .AverageAsync(h => (double)h.SleepQualityScore!.Value);
                var avgEnergy = await _db.HealthWellbeingRecords
                    .Where(h => h.EnergyLevelScore != null)
                    .AverageAsync(h => (double)h.EnergyLevelScore!.Value);
                var items = await _db.HealthWellbeingRecords
                    .Where(h => h.RecordDate != null)
                    .OrderByDescending(h => h.RecordDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, h => h.ResidentId, r => r.ResidentId,
                        (h, r) => new {
                            ResidentCode = r.InternalCode, h.RecordDate,
                            GeneralHealth = h.GeneralHealthScore,
                            Nutrition = h.NutritionScore,
                            Sleep = h.SleepQualityScore,
                            Energy = h.EnergyLevelScore
                        })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Total Records", value = total.ToString("N0") },
                    new { label = "Avg Health", value = $"{Math.Round(avgHealth, 1)}/5" },
                    new { label = "Avg Nutrition", value = $"{Math.Round(avgNutrition, 1)}/5" },
                    new { label = "Avg Sleep", value = $"{Math.Round(avgSleep, 1)}/5" },
                    new { label = "Avg Energy", value = $"{Math.Round(avgEnergy, 1)}/5" },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "education":
            {
                var total = await _db.EducationRecords.CountAsync();
                var avgAttendance = await _db.EducationRecords
                    .Where(e => e.AttendanceRate != null)
                    .AverageAsync(e => (double)e.AttendanceRate!.Value);
                var avgProgress = await _db.EducationRecords
                    .Where(e => e.ProgressPercent != null)
                    .AverageAsync(e => (double)e.ProgressPercent!.Value);
                var enrolled = await _db.EducationRecords.CountAsync(e => e.EnrollmentStatus == "Enrolled");
                var items = await _db.EducationRecords
                    .Where(e => e.RecordDate != null)
                    .OrderByDescending(e => e.RecordDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, e => e.ResidentId, r => r.ResidentId,
                        (e, r) => new {
                            ResidentCode = r.InternalCode, e.RecordDate, e.EnrollmentStatus,
                            AttendancePct = e.AttendanceRate != null ? Math.Round((double)e.AttendanceRate * 100, 1) : (double?)null,
                            Progress = e.ProgressPercent
                        })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Total Records", value = total.ToString("N0") },
                    new { label = "Avg Attendance", value = $"{Math.Round(avgAttendance * 100, 1)}%" },
                    new { label = "Avg Progress", value = $"{Math.Round(avgProgress, 1)}%" },
                    new { label = "Enrolled", value = enrolled.ToString("N0") },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "counseling":
            {
                var total = await _db.ProcessRecordings.CountAsync();
                var uniqueResidents = await _db.ProcessRecordings
                    .Select(p => p.ResidentId)
                    .Distinct()
                    .CountAsync();
                var items = await _db.ProcessRecordings
                    .Where(p => p.SessionDate != null)
                    .OrderByDescending(p => p.SessionDate)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Residents, p => p.ResidentId, r => r.ResidentId,
                        (p, r) => new { ResidentCode = r.InternalCode, p.SessionType, p.SessionDate, p.SocialWorker, p.SessionDurationMinutes })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Total Sessions", value = total.ToString("N0") },
                    new { label = "Unique Residents", value = uniqueResidents.ToString("N0") },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "risk-high":
            case "risk-medium":
            case "risk-low":
            {
                var level = section == "risk-high" ? "High" : section == "risk-medium" ? "Medium" : "Low";
                var total = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == level);
                var allActive = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
                var items = await _db.Residents
                    .Where(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == level)
                    .OrderBy(r => r.InternalCode)
                    .Skip(skip).Take(pageSize)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                        (r, s) => new { r.InternalCode, Safehouse = s.Name, r.CurrentRiskLevel, r.CaseStatus })
                    .ToListAsync();
                var sharePct = allActive > 0 ? Math.Round(100.0 * total / allActive, 1) : 0;
                var summary = new object[]
                {
                    new { label = $"{level} Risk Residents", value = total.ToString("N0") },
                    new { label = "Share of Active", value = $"{sharePct}%" },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "okr-recent":
            {
                var total = await _db.Supporters
                    .CountAsync(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= threeMonthsAgo));
                var items = await _db.Supporters
                    .Where(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= threeMonthsAgo))
                    .OrderByDescending(s => s.Donations.Max(d => (DateOnly?)d.DonationDate))
                    .Skip(skip).Take(pageSize)
                    .Select(s => new {
                        s.DisplayName, s.Status,
                        LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        DonationLabel = "Recent"
                    })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Active in 3 Months", value = total.ToString("N0") },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            case "okr-lapsed":
            {
                var total = await _db.Supporters
                    .CountAsync(s => s.Status == "Active" && !s.Donations.Any(d => d.DonationDate >= threeMonthsAgo));
                var items = await _db.Supporters
                    .Where(s => s.Status == "Active" && !s.Donations.Any(d => d.DonationDate >= threeMonthsAgo))
                    .OrderByDescending(s => s.Donations.Max(d => (DateOnly?)d.DonationDate))
                    .Skip(skip).Take(pageSize)
                    .Select(s => new {
                        s.DisplayName, s.Status,
                        LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        DonationLabel = "Lapsed"
                    })
                    .ToListAsync();
                var summary = new object[]
                {
                    new { label = "Lapsed Donors", value = total.ToString("N0") },
                };
                return Ok(new { items, totalCount = total, summary });
            }

            default:
                return BadRequest(new { message = $"Unknown section: {section}" });
        }
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Resident counts
        var residentStatusCounts = await _db.Residents
            .GroupBy(r => r.CaseStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var activeResidents = residentStatusCounts
            .FirstOrDefault(x => x.Status == "Active")?.Count ?? 0;

        // Safehouse count
        var activeSafehouses = await _db.Safehouses
            .CountAsync(s => s.Status == "Active");

        // Donor counts
        var activeDonors = await _db.Supporters
            .CountAsync(s => s.Status == "Active");

        // Churn risk breakdown
        var churnCounts = await _db.DonorChurnPredictions
            .GroupBy(p => p.RiskLevel)
            .Select(g => new { RiskLevel = g.Key, Count = g.Count() })
            .ToListAsync();

        var highChurnCount = churnCounts.FirstOrDefault(x => x.RiskLevel == "High")?.Count ?? 0;

        // Recent donations (last 10)
        var recentDonations = await _db.Donations
            .Where(d => d.DonationDate != null)
            .OrderByDescending(d => d.DonationDate)
            .Take(10)
            .Join(_db.Supporters,
                d => d.SupporterId,
                s => s.SupporterId,
                (d, s) => new
                {
                    d.DonationId,
                    DonorName = s.DisplayName,
                    d.DonationDate,
                    d.Amount,
                    d.DonationType,
                    d.CampaignName,
                    d.IsRecurring
                })
            .ToListAsync();

        // Upcoming case conferences
        var upcomingConferences = await _db.CaseConferences
            .Where(c => c.NextConferenceDate != null && c.NextConferenceDate >= today)
            .OrderBy(c => c.NextConferenceDate)
            .Take(5)
            .Join(_db.Residents,
                c => c.ResidentId,
                r => r.ResidentId,
                (c, r) => new
                {
                    c.ConferenceId,
                    ResidentCode = r.InternalCode,
                    c.ConferenceType,
                    c.NextConferenceDate,
                    c.SocialWorker
                })
            .ToListAsync();

        // Health averages
        var healthAvg = await _db.HealthWellbeingRecords
            .Where(h => h.GeneralHealthScore != null)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                AvgGeneralHealth = Math.Round((double)g.Average(h => h.GeneralHealthScore!.Value), 2),
                AvgNutrition = Math.Round((double)g.Average(h => h.NutritionScore ?? 0), 2),
                AvgSleepQuality = Math.Round((double)g.Average(h => h.SleepQualityScore ?? 0), 2),
                AvgEnergyLevel = Math.Round((double)g.Average(h => h.EnergyLevelScore ?? 0), 2),
            })
            .FirstOrDefaultAsync();

        // Education aggregates
        var educationAvg = await _db.EducationRecords
            .Where(e => e.AttendanceRate != null)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                AvgAttendanceRate = Math.Round((double)g.Average(e => e.AttendanceRate!.Value) * 100, 1),
                AvgProgressPercent = Math.Round((double)g.Average(e => e.ProgressPercent ?? 0), 1),
            })
            .FirstOrDefaultAsync();

        var enrollmentCounts = await _db.EducationRecords
            .GroupBy(e => e.EnrollmentStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        // Counseling session counts
        var counselingCounts = await _db.ProcessRecordings
            .GroupBy(p => p.SessionType)
            .Select(g => new { SessionType = g.Key, Count = g.Count() })
            .ToListAsync();

        // Active resident risk levels
        var activeRiskCounts = await _db.Residents
            .Where(r => r.CaseStatus == "Active")
            .GroupBy(r => r.CurrentRiskLevel)
            .Select(g => new { RiskLevel = g.Key, Count = g.Count() })
            .ToListAsync();

        // OKR: % of active donors with at least one donation in the rolling last 3 months
        var threeMonthsAgo = today.AddMonths(-3);
        var donorOkrRecentCount = await _db.Supporters
            .Where(s => s.Status == "Active")
            .Where(s => s.Donations.Any(d => d.DonationDate >= threeMonthsAgo))
            .CountAsync();

        double? donorOkrPercent = activeDonors == 0
            ? null
            : Math.Round(100.0 * donorOkrRecentCount / activeDonors, 1);

        return Ok(new
        {
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
            donorOkrRecentCount
        });
    }
}
