using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/residents")]
[Authorize(Policy = "AdminOnly")]
public class ResidentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ResidentStatusCalculator _statusCalculator;

    public ResidentsController(AppDbContext db, ResidentStatusCalculator statusCalculator)
    {
        _db = db;
        _statusCalculator = statusCalculator;
    }

    // GET /api/residents?status=Active&safehouseId=1&category=Neglected&socialWorker=Jane&riskLevel=High&search=code
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? safehouseId,
        [FromQuery] string? category,
        [FromQuery] string? socialWorker,
        [FromQuery] string? riskLevel,
        [FromQuery] string? search)
    {
        var query = _db.Residents.AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.CaseStatus == status);

        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(r => r.CaseCategory == category);

        if (!string.IsNullOrEmpty(socialWorker))
            query = query.Where(r => r.AssignedSocialWorker == socialWorker);

        if (!string.IsNullOrEmpty(riskLevel))
            query = query.Where(r => r.CurrentRiskLevel == riskLevel);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(r =>
                (r.InternalCode != null && r.InternalCode.Contains(search)) ||
                (r.CaseControlNo != null && r.CaseControlNo.Contains(search)));

        var residents = await query
            .OrderBy(r => r.InternalCode)
            .Select(r => new
            {
                r.ResidentId,
                r.InternalCode,
                r.CaseControlNo,
                r.CaseCategory,
                r.CaseStatus,
                r.SafehouseId,
                r.AssignedSocialWorker,
                r.PresentAge,
                r.ReintegrationStatus,
                r.DateOfAdmission
            })
            .ToListAsync();

        var ids = residents.Select(r => r.ResidentId).ToList();
        var statusMap = await _statusCalculator.ComputeBatchAsync(ids);

        return Ok(residents.Select(r =>
        {
            var si = statusMap.GetValueOrDefault(r.ResidentId)
                ?? new ResidentStatusIndicatorsDto("yellow", "yellow", "yellow", "yellow");
            return new
            {
                r.ResidentId,
                r.InternalCode,
                r.CaseControlNo,
                r.CaseCategory,
                r.CaseStatus,
                r.SafehouseId,
                r.AssignedSocialWorker,
                r.PresentAge,
                r.ReintegrationStatus,
                r.DateOfAdmission,
                statusIndicators = new { health = si.Health, education = si.Education, counseling = si.Counseling, risk = si.Risk },
            };
        }));
    }

    // GET /api/residents/:id
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var resident = await _db.Residents.FindAsync(id);
        if (resident == null) return NotFound();
        return Ok(resident);
    }

    // POST /api/residents
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Resident resident)
    {
        // Some environments use an imported residents table where resident_id is NOT NULL
        // but not configured as identity/serial. Ensure a value is always provided.
        if (resident.ResidentId <= 0)
        {
            var maxId = await _db.Residents.MaxAsync(r => (int?)r.ResidentId) ?? 0;
            resident.ResidentId = maxId + 1;
        }

        resident.CreatedAt = DateTime.UtcNow;
        _db.Residents.Add(resident);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, resident);
    }

    // PUT /api/residents/:id
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Resident updated)
    {
        var resident = await _db.Residents.FindAsync(id);
        if (resident == null) return NotFound();

        resident.CaseControlNo = updated.CaseControlNo;
        resident.InternalCode = updated.InternalCode;
        resident.SafehouseId = updated.SafehouseId;
        resident.CaseStatus = updated.CaseStatus;
        resident.Sex = updated.Sex;
        resident.DateOfBirth = updated.DateOfBirth;
        resident.BirthStatus = updated.BirthStatus;
        resident.PlaceOfBirth = updated.PlaceOfBirth;
        resident.Religion = updated.Religion;
        resident.CaseCategory = updated.CaseCategory;
        resident.SubCatOrphaned = updated.SubCatOrphaned;
        resident.SubCatTrafficked = updated.SubCatTrafficked;
        resident.SubCatChildLabor = updated.SubCatChildLabor;
        resident.SubCatPhysicalAbuse = updated.SubCatPhysicalAbuse;
        resident.SubCatSexualAbuse = updated.SubCatSexualAbuse;
        resident.SubCatOsaec = updated.SubCatOsaec;
        resident.SubCatCicl = updated.SubCatCicl;
        resident.SubCatAtRisk = updated.SubCatAtRisk;
        resident.SubCatStreetChild = updated.SubCatStreetChild;
        resident.SubCatChildWithHiv = updated.SubCatChildWithHiv;
        resident.IsPwd = updated.IsPwd;
        resident.PwdType = updated.PwdType;
        resident.HasSpecialNeeds = updated.HasSpecialNeeds;
        resident.SpecialNeedsDiagnosis = updated.SpecialNeedsDiagnosis;
        resident.FamilyIs4ps = updated.FamilyIs4ps;
        resident.FamilySoloParent = updated.FamilySoloParent;
        resident.FamilyIndigenous = updated.FamilyIndigenous;
        resident.FamilyParentPwd = updated.FamilyParentPwd;
        resident.FamilyInformalSettler = updated.FamilyInformalSettler;
        resident.DateOfAdmission = updated.DateOfAdmission;
        resident.AgeUponAdmission = updated.AgeUponAdmission;
        resident.PresentAge = updated.PresentAge;
        resident.LengthOfStay = updated.LengthOfStay;
        resident.ReferralSource = updated.ReferralSource;
        resident.ReferringAgencyPerson = updated.ReferringAgencyPerson;
        resident.DateColbRegistered = updated.DateColbRegistered;
        resident.DateColbObtained = updated.DateColbObtained;
        resident.AssignedSocialWorker = updated.AssignedSocialWorker;
        resident.InitialCaseAssessment = updated.InitialCaseAssessment;
        resident.DateCaseStudyPrepared = updated.DateCaseStudyPrepared;
        resident.ReintegrationType = updated.ReintegrationType;
        resident.ReintegrationStatus = updated.ReintegrationStatus;
        resident.InitialRiskLevel = updated.InitialRiskLevel;
        resident.CurrentRiskLevel = updated.CurrentRiskLevel;
        resident.DateEnrolled = updated.DateEnrolled;
        resident.DateClosed = updated.DateClosed;
        resident.NotesRestricted = updated.NotesRestricted;

        await _db.SaveChangesAsync();
        return Ok(resident);
    }

    // GET /api/residents/:id/lifecycle
    [HttpGet("{id}/lifecycle")]
    public async Task<IActionResult> GetLifecycle(int id)
    {
        var resident = await _db.Residents
            .AsNoTracking()
            .Where(r => r.ResidentId == id)
            .Select(r => new { r.InitialRiskLevel, r.CurrentRiskLevel })
            .FirstOrDefaultAsync();

        if (resident == null) return NotFound();

        var statusMap = await _statusCalculator.ComputeBatchAsync(new[] { id });
        var si = statusMap.GetValueOrDefault(id)
            ?? new ResidentStatusIndicatorsDto("yellow", "yellow", "yellow", "yellow");

        var health = await _db.HealthWellbeingRecords
            .AsNoTracking()
            .Where(r => r.ResidentId == id)
            .OrderBy(r => r.RecordDate)
            .Select(r => new {
                type = "health",
                date = r.RecordDate,
                r.GeneralHealthScore,
                r.NutritionScore,
                r.SleepQualityScore,
                r.EnergyLevelScore,
                r.MedicalCheckupDone,
                r.DentalCheckupDone,
                r.PsychologicalCheckupDone
            })
            .ToListAsync();

        var sessions = await _db.ProcessRecordings
            .AsNoTracking()
            .Where(r => r.ResidentId == id)
            .OrderBy(r => r.SessionDate)
            .Select(r => new {
                type = "session",
                date = r.SessionDate,
                r.SessionType,
                r.SocialWorker,
                r.SessionDurationMinutes,
                r.EmotionalStateObserved,
                r.EmotionalStateEnd,
                r.ProgressNoted,
                r.ConcernsFlagged,
                r.InterventionsApplied
            })
            .ToListAsync();

        var visitations = await _db.HomeVisitations
            .AsNoTracking()
            .Where(r => r.ResidentId == id)
            .OrderBy(r => r.VisitDate)
            .Select(r => new {
                type = "visitation",
                date = r.VisitDate,
                r.VisitType,
                r.LocationVisited,
                r.FamilyCooperationLevel,
                r.SafetyConcernsNoted,
                r.VisitOutcome
            })
            .ToListAsync();

        var education = await _db.EducationRecords
            .AsNoTracking()
            .Where(r => r.ResidentId == id)
            .OrderBy(r => r.RecordDate)
            .Select(r => new {
                type = "education",
                date = r.RecordDate,
                r.EnrollmentStatus,
                r.AttendanceRate,
                r.ProgressPercent,
                r.CompletionStatus
            })
            .ToListAsync();

        var interventionPlans = await _db.InterventionPlans
            .AsNoTracking()
            .Where(p => p.ResidentId == id)
            .OrderBy(p => p.PlanCategory)
            .Select(p => new {
                p.PlanCategory,
                p.PlanDescription,
                p.TargetValue,
                p.TargetDate,
                p.Status
            })
            .ToListAsync();

        return Ok(new {
            riskJourney = new { initial = resident.InitialRiskLevel, current = resident.CurrentRiskLevel },
            statusIndicators = new { health = si.Health, education = si.Education, counseling = si.Counseling, risk = si.Risk },
            health,
            sessions,
            visitations,
            education,
            interventionPlans
        });
    }

    // DELETE /api/residents/:id
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var resident = await _db.Residents.FindAsync(id);
        if (resident == null) return NotFound();

        _db.Residents.Remove(resident);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
