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
    public async Task<IActionResult> GetDetail([FromQuery] string section)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var threeMonthsAgo = today.AddMonths(-3);

        switch (section)
        {
            case "residents":
            {
                var total = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
                var items = await _db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .OrderBy(r => r.InternalCode)
                    .Take(20)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                        (r, s) => new { r.InternalCode, Safehouse = s.Name, r.CurrentRiskLevel, r.CaseStatus, r.DateOfAdmission })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "safehouses":
            {
                var items = await _db.Safehouses
                    .Where(s => s.Status == "Active")
                    .OrderBy(s => s.Name)
                    .Select(s => new {
                        s.Name, s.City, s.Region, s.Status,
                        Residents = s.CurrentOccupancy, Capacity = s.CapacityGirls,
                        OccupancyPct = s.CapacityGirls > 0 ? Math.Round((double)s.CurrentOccupancy / s.CapacityGirls * 100, 1) : 0
                    })
                    .ToListAsync();
                return Ok(new { items, totalCount = items.Count });
            }
            case "donors":
            {
                var total = await _db.Supporters.CountAsync(s => s.Status == "Active");
                var items = await _db.Supporters
                    .Where(s => s.Status == "Active")
                    .OrderByDescending(s => s.Donations.Max(d => (DateOnly?)d.DonationDate))
                    .Take(20)
                    .Select(s => new {
                        s.DisplayName, s.Status, s.Country,
                        LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        TotalDonated = s.Donations.Where(d => d.Amount != null).Sum(d => (decimal?)d.Amount) ?? 0
                    })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "churn-high":
            case "churn-medium":
            case "churn-low":
            {
                var level = section == "churn-high" ? "High" : section == "churn-medium" ? "Medium" : "Low";
                var total = await _db.DonorChurnPredictions.CountAsync(p => p.RiskLevel == level);
                var items = await _db.DonorChurnPredictions
                    .Where(p => p.RiskLevel == level)
                    .OrderByDescending(p => p.ChurnProbability)
                    .Take(20)
                    .Join(_db.Supporters, p => p.SupporterId, s => s.SupporterId,
                        (p, s) => new {
                            s.DisplayName, p.RiskLevel,
                            ChurnProbability = Math.Round((double)p.ChurnProbability * 100, 1),
                            LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate)
                        })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "donations":
            {
                var total = await _db.Donations.CountAsync();
                var items = await _db.Donations
                    .Where(d => d.DonationDate != null)
                    .OrderByDescending(d => d.DonationDate)
                    .Take(20)
                    .Join(_db.Supporters, d => d.SupporterId, s => s.SupporterId,
                        (d, s) => new { s.DisplayName, d.DonationDate, d.Amount, d.DonationType, d.IsRecurring })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "conferences":
            {
                var total = await _db.CaseConferences.CountAsync(c => c.NextConferenceDate >= today);
                var items = await _db.CaseConferences
                    .Where(c => c.NextConferenceDate != null && c.NextConferenceDate >= today)
                    .OrderBy(c => c.NextConferenceDate)
                    .Take(20)
                    .Join(_db.Residents, c => c.ResidentId, r => r.ResidentId,
                        (c, r) => new { ResidentCode = r.InternalCode, c.ConferenceType, c.NextConferenceDate, c.SocialWorker })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "health":
            {
                var total = await _db.HealthWellbeingRecords.CountAsync();
                var items = await _db.HealthWellbeingRecords
                    .Where(h => h.RecordDate != null)
                    .OrderByDescending(h => h.RecordDate)
                    .Take(20)
                    .Join(_db.Residents, h => h.ResidentId, r => r.ResidentId,
                        (h, r) => new {
                            ResidentCode = r.InternalCode, h.RecordDate,
                            GeneralHealth = h.GeneralHealthScore,
                            Nutrition = h.NutritionScore,
                            Sleep = h.SleepQualityScore,
                            Energy = h.EnergyLevelScore
                        })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "education":
            {
                var total = await _db.EducationRecords.CountAsync();
                var items = await _db.EducationRecords
                    .Where(e => e.RecordDate != null)
                    .OrderByDescending(e => e.RecordDate)
                    .Take(20)
                    .Join(_db.Residents, e => e.ResidentId, r => r.ResidentId,
                        (e, r) => new {
                            ResidentCode = r.InternalCode, e.RecordDate, e.EnrollmentStatus,
                            AttendancePct = e.AttendanceRate != null ? Math.Round((double)e.AttendanceRate * 100, 1) : (double?)null,
                            Progress = e.ProgressPercent
                        })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "counseling":
            {
                var total = await _db.ProcessRecordings.CountAsync();
                var items = await _db.ProcessRecordings
                    .Where(p => p.SessionDate != null)
                    .OrderByDescending(p => p.SessionDate)
                    .Take(20)
                    .Join(_db.Residents, p => p.ResidentId, r => r.ResidentId,
                        (p, r) => new { ResidentCode = r.InternalCode, p.SessionType, p.SessionDate, p.SocialWorker, p.SessionDurationMinutes })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "risk-high":
            case "risk-medium":
            case "risk-low":
            {
                var level = section == "risk-high" ? "High" : section == "risk-medium" ? "Medium" : "Low";
                var total = await _db.Residents.CountAsync(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == level);
                var items = await _db.Residents
                    .Where(r => r.CaseStatus == "Active" && r.CurrentRiskLevel == level)
                    .OrderBy(r => r.InternalCode)
                    .Take(20)
                    .Join(_db.Safehouses, r => r.SafehouseId, s => s.SafehouseId,
                        (r, s) => new { r.InternalCode, Safehouse = s.Name, r.CurrentRiskLevel, r.CaseStatus })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "okr-recent":
            {
                var total = await _db.Supporters
                    .CountAsync(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= threeMonthsAgo));
                var items = await _db.Supporters
                    .Where(s => s.Status == "Active" && s.Donations.Any(d => d.DonationDate >= threeMonthsAgo))
                    .OrderByDescending(s => s.Donations.Max(d => (DateOnly?)d.DonationDate))
                    .Take(20)
                    .Select(s => new {
                        s.DisplayName, s.Status,
                        LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        DonationLabel = "Recent"
                    })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
            }
            case "okr-lapsed":
            {
                var total = await _db.Supporters
                    .CountAsync(s => s.Status == "Active" && !s.Donations.Any(d => d.DonationDate >= threeMonthsAgo));
                var items = await _db.Supporters
                    .Where(s => s.Status == "Active" && !s.Donations.Any(d => d.DonationDate >= threeMonthsAgo))
                    .OrderByDescending(s => s.Donations.Max(d => (DateOnly?)d.DonationDate))
                    .Take(20)
                    .Select(s => new {
                        s.DisplayName, s.Status,
                        LastDonation = s.Donations.Max(d => (DateOnly?)d.DonationDate),
                        DonationLabel = "Lapsed"
                    })
                    .ToListAsync();
                return Ok(new { items, totalCount = total });
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

        // OKR: % of active donors with at least one donation in the rolling last 3 months (same "active donor" pool as activeDonors).
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
