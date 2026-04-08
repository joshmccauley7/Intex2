using Microsoft.EntityFrameworkCore;

/// <summary>
/// Rule-based v1 indicators from lifecycle tables + <see cref="Resident.CurrentRiskLevel"/>.
/// Stale domains (no record within <see cref="StalenessDays"/>) → yellow (needs attention / data).
/// </summary>
public class ResidentStatusCalculator
{
    /// <summary>Days without a domain record before that domain is treated as stale (yellow).</summary>
    public const int StalenessDays = 90;

    private readonly AppDbContext _db;

    public ResidentStatusCalculator(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Dictionary<int, ResidentStatusIndicatorsDto>> ComputeBatchAsync(
        IReadOnlyCollection<int> residentIds,
        CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<int, ResidentStatusIndicatorsDto>();
        if (residentIds.Count == 0)
            return result;

        var idSet = residentIds.ToHashSet();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var riskLevels = await _db.Residents
            .AsNoTracking()
            .Where(r => idSet.Contains(r.ResidentId))
            .Select(r => new { r.ResidentId, r.CurrentRiskLevel })
            .ToDictionaryAsync(x => x.ResidentId, x => x.CurrentRiskLevel, cancellationToken);

        var healthByResident = await LatestPerResidentAsync(
            _db.HealthWellbeingRecords.AsNoTracking().Where(h => h.ResidentId != null && idSet.Contains(h.ResidentId.Value)),
            h => h.ResidentId!.Value,
            h => h.RecordDate,
            cancellationToken);

        var educationByResident = await LatestPerResidentAsync(
            _db.EducationRecords.AsNoTracking().Where(e => e.ResidentId != null && idSet.Contains(e.ResidentId.Value)),
            e => e.ResidentId!.Value,
            e => e.RecordDate,
            cancellationToken);

        var sessionByResident = await LatestPerResidentAsync(
            _db.ProcessRecordings.AsNoTracking().Where(p => idSet.Contains(p.ResidentId)),
            p => p.ResidentId,
            p => p.SessionDate,
            cancellationToken);

        var visitByResident = await LatestPerResidentAsync(
            _db.HomeVisitations.AsNoTracking().Where(v => v.ResidentId != null && idSet.Contains(v.ResidentId.Value)),
            v => v.ResidentId!.Value,
            v => v.VisitDate,
            cancellationToken);

        foreach (var id in residentIds)
        {
            riskLevels.TryGetValue(id, out var currentRisk);
            healthByResident.TryGetValue(id, out var health);
            educationByResident.TryGetValue(id, out var education);
            sessionByResident.TryGetValue(id, out var session);
            visitByResident.TryGetValue(id, out var visit);

            var healthLevel = ComputeHealth(health, today);
            var educationLevel = ComputeEducation(education, today);
            var counselingLevel = ComputeCounseling(session, today);
            var riskLevel = ComputeRisk(currentRisk, visit, today);

            result[id] = new ResidentStatusIndicatorsDto(healthLevel, educationLevel, counselingLevel, riskLevel);
        }

        return result;
    }

    /// <summary>
    /// Fetches rows for residents, orders by date desc, returns latest row per resident in memory.
    /// </summary>
    private static async Task<Dictionary<int, T>> LatestPerResidentAsync<T>(
        IQueryable<T> query,
        Func<T, int> residentIdSelector,
        Func<T, DateOnly?> dateSelector,
        CancellationToken cancellationToken)
        where T : class
    {
        var list = await query.ToListAsync(cancellationToken);
        var map = new Dictionary<int, T>();
        foreach (var row in list.OrderByDescending(r => dateSelector(r)?.DayNumber ?? int.MinValue))
        {
            var rid = residentIdSelector(row);
            if (!map.ContainsKey(rid))
                map[rid] = row;
        }
        return map;
    }

    private static bool IsStale(DateOnly? recordDate, DateOnly today)
    {
        if (recordDate == null) return true;
        return today.DayNumber - recordDate.Value.DayNumber > StalenessDays;
    }

    /// <summary>Scores in Lighthouse data are ~2.5–3.5 on a ~1–5 style scale.</summary>
    private static string ComputeHealth(HealthWellbeingRecord? latest, DateOnly today)
    {
        if (latest == null || IsStale(latest.RecordDate, today))
            return "yellow";

        var scores = new List<double>();
        if (latest.GeneralHealthScore.HasValue) scores.Add((double)latest.GeneralHealthScore.Value);
        if (latest.NutritionScore.HasValue) scores.Add((double)latest.NutritionScore.Value);
        if (latest.SleepQualityScore.HasValue) scores.Add((double)latest.SleepQualityScore.Value);
        if (latest.EnergyLevelScore.HasValue) scores.Add((double)latest.EnergyLevelScore.Value);

        if (scores.Count == 0)
            return "yellow";

        var avg = scores.Average();
        if (avg < 2.5)
            return "red";
        if (avg < 3.0)
            return "yellow";

        var anyCheckup = latest.MedicalCheckupDone == true
            || latest.DentalCheckupDone == true
            || latest.PsychologicalCheckupDone == true;
        if (!anyCheckup && avg < 3.2)
            return "yellow";

        return "green";
    }

    /// <summary>Attendance and progress are 0–1 fractions in seed data.</summary>
    private static string ComputeEducation(EducationRecord? latest, DateOnly today)
    {
        if (latest == null || IsStale(latest.RecordDate, today))
            return "yellow";

        var enroll = latest.EnrollmentStatus?.ToLowerInvariant() ?? "";
        if (enroll.Contains("drop") || enroll.Contains("withdraw"))
            return "red";

        var completion = latest.CompletionStatus?.ToLowerInvariant() ?? "";
        if (completion.Contains("fail") || completion.Contains("terminated"))
            return "red";

        if (!latest.AttendanceRate.HasValue)
            return "yellow";

        var att = (double)latest.AttendanceRate.Value;
        if (att < 0.5)
            return "red";
        if (att < 0.75)
            return "yellow";

        return "green";
    }

    private static string ComputeCounseling(ProcessRecording? latest, DateOnly today)
    {
        if (latest == null || IsStale(latest.SessionDate, today))
            return "yellow";

        if (latest.ConcernsFlagged == true)
        {
            if (latest.ProgressNoted == false)
                return "red";
            return "yellow";
        }

        var obs = latest.EmotionalStateObserved?.ToLowerInvariant() ?? "";
        if (obs.Contains("crisis") || obs.Contains("severe") || obs.Contains("acute"))
            return "yellow";

        return "green";
    }

    /// <summary>
    /// Inverted risk: Low → green, Medium → yellow, High/Critical → red.
    /// Worse wins: if latest home visit (non-stale) notes safety concerns, bump one tier toward red.
    /// </summary>
    private static string ComputeRisk(string? currentRiskLevel, HomeVisitation? latestVisit, DateOnly today)
    {
        var level = MapCaseRiskToIndicator(currentRiskLevel);

        if (latestVisit?.VisitDate != null && !IsStale(latestVisit.VisitDate, today)
            && latestVisit.SafetyConcernsNoted == true)
        {
            level = BumpRiskWorse(level);
        }

        return level;
    }

    /// <summary>Map DB case risk to inverted traffic-light string.</summary>
    private static string MapCaseRiskToIndicator(string? current)
    {
        if (string.IsNullOrWhiteSpace(current))
            return "yellow";

        return current.Trim().ToLowerInvariant() switch
        {
            "low" => "green",
            "medium" => "yellow",
            "high" or "critical" => "red",
            _ => "yellow",
        };
    }

    private static string BumpRiskWorse(string level) => level switch
    {
        "green" => "yellow",
        "yellow" => "red",
        _ => "red",
    };
}
