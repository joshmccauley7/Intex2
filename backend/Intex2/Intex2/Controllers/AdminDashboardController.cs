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
            activeRiskCounts
        });
    }
}
