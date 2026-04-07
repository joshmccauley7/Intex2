using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using System.Globalization;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class ImpactController : ControllerBase
{
    private readonly AppDbContext _db;

    public ImpactController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var latest = await _db.PublicImpactSnapshots
            .Where(s => s.IsPublished && s.SnapshotDate <= DateOnly.FromDateTime(DateTime.Today))
            .OrderByDescending(s => s.SnapshotDate)
            .FirstOrDefaultAsync();

        var activeSafehouses = await _db.Safehouses
            .CountAsync(s => s.Status == "Active");

        var totalResidents = await _db.Safehouses
            .Where(s => s.Status == "Active")
            .SumAsync(s => s.CurrentOccupancy);

        return Ok(new
        {
            latestSnapshot = latest,
            activeSafehouses,
            totalResidents
        });
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var snapshots = await _db.PublicImpactSnapshots
            .Where(s => s.IsPublished && s.SnapshotDate <= today)
            .OrderByDescending(s => s.SnapshotDate)
            .Take(12)
            .ToListAsync();

        var latest = snapshots.FirstOrDefault();

        var activeSafehouses = await _db.Safehouses
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .ToListAsync();

        var totalResidents = activeSafehouses.Sum(s => s.CurrentOccupancy);
        var totalCapacity = activeSafehouses.Sum(s => s.CapacityGirls);

        var snapshotSeries = snapshots
            .OrderBy(s => s.SnapshotDate)
            .Select(s => new
            {
                snapshotId = s.SnapshotId,
                snapshotDate = s.SnapshotDate,
                headline = s.Headline,
                summaryText = s.SummaryText,
                metrics = ParseMetricPayload(s.MetricPayloadJson)
            });

        var safehouseRows = activeSafehouses.Select(s => new
        {
            safehouseId = s.SafehouseId,
            safehouseCode = s.SafehouseCode,
            name = s.Name,
            city = s.City,
            region = s.Region,
            capacity = s.CapacityGirls,
            residents = s.CurrentOccupancy,
            occupancyPct = s.CapacityGirls > 0
                ? Math.Round((double)s.CurrentOccupancy / s.CapacityGirls * 100, 1)
                : 0
        });

        var monthlyWellbeing = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(month_start, 'YYYY-MM') AS month,
                    ROUND(AVG(avg_education_progress)::numeric, 2) AS avg_education_progress,
                    ROUND(AVG(avg_health_score)::numeric, 2) AS avg_health_score,
                    SUM(active_residents) AS active_residents
                FROM safehouse_monthly_metrics
                GROUP BY to_char(month_start, 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new
                {
                    month = ReadNullableString(r, "month"),
                    avgEducationProgress = ReadNullableDecimal(r, "avg_education_progress"),
                    avgHealthScore = ReadNullableDecimal(r, "avg_health_score"),
                    activeResidents = ReadNullableInt(r, "active_residents")
                }));

        var monthlyCareOps = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(month_start, 'YYYY-MM') AS month,
                    SUM(process_recording_count) AS counseling_sessions,
                    SUM(home_visitation_count) AS home_visitations,
                    SUM(incident_count) AS incident_reports
                FROM safehouse_monthly_metrics
                GROUP BY to_char(month_start, 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new
                {
                    month = ReadNullableString(r, "month"),
                    counselingSessions = ReadNullableInt(r, "counseling_sessions"),
                    homeVisitations = ReadNullableInt(r, "home_visitations"),
                    incidentReports = ReadNullableInt(r, "incident_reports")
                }));

        var donationsByMonth = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', donation_date), 'YYYY-MM') AS month,
                    SUM(COALESCE(amount, 0)) AS total_amount_php,
                    COUNT(*) AS donation_count
                FROM donations
                WHERE donation_type = 'Monetary'
                GROUP BY to_char(date_trunc('month', donation_date), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new
                {
                    month = ReadNullableString(r, "month"),
                    totalAmountPhp = ReadNullableDecimal(r, "total_amount_php"),
                    donationCount = ReadNullableInt(r, "donation_count")
                }));

        var donationTypeBreakdown = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    donation_type,
                    SUM(COALESCE(amount, estimated_value, 0)) AS total_value,
                    COUNT(*) AS event_count
                FROM donations
                GROUP BY donation_type
                ORDER BY total_value DESC
                """,
                r => new
                {
                    donationType = ReadNullableString(r, "donation_type"),
                    totalValue = ReadNullableDecimal(r, "total_value"),
                    eventCount = ReadNullableInt(r, "event_count")
                }));

        var socialMediaByMonth = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                    SUM(COALESCE(reach, 0)) AS reach,
                    SUM(COALESCE(likes, 0) + COALESCE(comments, 0) + COALESCE(shares, 0) + COALESCE(saves, 0)) AS engagement_total,
                    SUM(COALESCE(donation_referrals, 0)) AS donation_referrals,
                    SUM(COALESCE(estimated_donation_value_php, 0)) AS estimated_donation_value_php
                FROM social_media_posts
                GROUP BY to_char(date_trunc('month', created_at), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new
                {
                    month = ReadNullableString(r, "month"),
                    reach = ReadNullableInt(r, "reach"),
                    engagementTotal = ReadNullableInt(r, "engagement_total"),
                    donationReferrals = ReadNullableInt(r, "donation_referrals"),
                    estimatedDonationValuePhp = ReadNullableDecimal(r, "estimated_donation_value_php")
                }));

        var reintegrationByMonth = await GetReintegrationByMonthAsync();

        var interventionPlanByMonth = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', COALESCE(updated_at, created_at)), 'YYYY-MM') AS month,
                    SUM(CASE WHEN status = 'Achieved' THEN 1 ELSE 0 END) AS achieved_count,
                    COUNT(*) AS total_plans
                FROM intervention_plans
                GROUP BY to_char(date_trunc('month', COALESCE(updated_at, created_at)), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new
                {
                    month = ReadNullableString(r, "month"),
                    achievedCount = ReadNullableInt(r, "achieved_count"),
                    totalPlans = ReadNullableInt(r, "total_plans")
                }));

        var educationAttendanceByMonth = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', record_date), 'YYYY-MM') AS month,
                    ROUND(AVG(attendance_rate * 100)::numeric, 2) AS avg_attendance_pct,
                    SUM(CASE WHEN completion_status = 'Completed' THEN 1 ELSE 0 END) AS completed_records
                FROM education_records
                GROUP BY to_char(date_trunc('month', record_date), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new
                {
                    month = ReadNullableString(r, "month"),
                    avgAttendancePct = ReadNullableDecimal(r, "avg_attendance_pct"),
                    completedRecords = ReadNullableInt(r, "completed_records")
                }));

        var incidentResolutionByMonth = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', incident_date), 'YYYY-MM') AS month,
                    COUNT(*) AS incident_count,
                    SUM(CASE WHEN resolved THEN 1 ELSE 0 END) AS resolved_count
                FROM incident_reports
                GROUP BY to_char(date_trunc('month', incident_date), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new
                {
                    month = ReadNullableString(r, "month"),
                    incidentCount = ReadNullableInt(r, "incident_count"),
                    resolvedCount = ReadNullableInt(r, "resolved_count")
                }));

        return Ok(new
        {
            latestSnapshot = latest == null ? null : new
            {
                latest.SnapshotId,
                latest.SnapshotDate,
                latest.Headline,
                latest.SummaryText,
                latest.IsPublished,
                latest.PublishedAt,
                metrics = ParseMetricPayload(latest.MetricPayloadJson)
            },
            activeSafehouses = activeSafehouses.Count,
            totalResidents,
            totalCapacity,
            snapshotSeries,
            safehouses = safehouseRows,
            monthlyWellbeing,
            monthlyCareOps,
            donationsByMonth,
            donationTypeBreakdown,
            socialMediaByMonth,
            reintegrationByMonth,
            interventionPlanByMonth,
            educationAttendanceByMonth,
            incidentResolutionByMonth
        });
    }

    private async Task<List<T>> QueryListAsync<T>(string sql, Func<DbDataReader, T> map)
    {
        var conn = _db.Database.GetDbConnection();
        var closeAfter = conn.State != System.Data.ConnectionState.Open;
        if (closeAfter)
            await conn.OpenAsync();

        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            cmd.CommandType = System.Data.CommandType.Text;

            var results = new List<T>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(map(reader));

            return results;
        }
        finally
        {
            if (closeAfter)
                await conn.CloseAsync();
        }
    }

    private static async Task<List<T>> SafeQueryAsync<T>(Func<Task<List<T>>> query)
    {
        try
        {
            return await query();
        }
        catch
        {
            return new List<T>();
        }
    }

    private async Task<List<ReintegrationMetric>> GetReintegrationByMonthAsync()
    {
        var fromResidents = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', date_of_admission), 'YYYY-MM') AS month,
                    COUNT(*) AS admitted_cases,
                    SUM(CASE WHEN reintegration_status = 'Completed' THEN 1 ELSE 0 END) AS completed_cases
                FROM residents
                WHERE date_of_admission IS NOT NULL
                GROUP BY to_char(date_trunc('month', date_of_admission), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new ReintegrationMetric
                {
                    Month = ReadNullableString(r, "month"),
                    AdmittedCases = ReadNullableInt(r, "admitted_cases"),
                    CompletedCases = ReadNullableInt(r, "completed_cases")
                }));
        if (fromResidents.Count > 0) return fromResidents;

        var fromCaseStatus = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                    COUNT(*) AS admitted_cases,
                    SUM(CASE WHEN case_status = 'Closed' THEN 1 ELSE 0 END) AS completed_cases
                FROM residents
                WHERE created_at IS NOT NULL
                GROUP BY to_char(date_trunc('month', created_at), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new ReintegrationMetric
                {
                    Month = ReadNullableString(r, "month"),
                    AdmittedCases = ReadNullableInt(r, "admitted_cases"),
                    CompletedCases = ReadNullableInt(r, "completed_cases")
                }));
        if (fromCaseStatus.Count > 0) return fromCaseStatus;

        var fromPlans = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    to_char(date_trunc('month', COALESCE(updated_at, created_at)), 'YYYY-MM') AS month,
                    COUNT(*) AS admitted_cases,
                    SUM(CASE WHEN status = 'Achieved' THEN 1 ELSE 0 END) AS completed_cases
                FROM intervention_plans
                GROUP BY to_char(date_trunc('month', COALESCE(updated_at, created_at)), 'YYYY-MM')
                ORDER BY month
                LIMIT 24
                """,
                r => new ReintegrationMetric
                {
                    Month = ReadNullableString(r, "month"),
                    AdmittedCases = ReadNullableInt(r, "admitted_cases"),
                    CompletedCases = ReadNullableInt(r, "completed_cases")
                }));

        return fromPlans;
    }

    private static string? ReadNullableString(DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? null : value.ToString();
    }

    private static int? ReadNullableInt(DbDataReader reader, string column)
    {
        var value = reader[column];
        if (value == DBNull.Value)
            return null;

        if (value is int i)
            return i;
        if (value is long l)
            return (int)l;
        if (int.TryParse(value.ToString(), out var parsed))
            return parsed;

        return null;
    }

    private static decimal? ReadNullableDecimal(DbDataReader reader, string column)
    {
        var value = reader[column];
        if (value == DBNull.Value)
            return null;

        if (value is decimal d)
            return d;
        if (value is double db)
            return (decimal)db;
        if (decimal.TryParse(value.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
            return parsed;

        return null;
    }

    private static MetricPayload ParseMetricPayload(string payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
            return new MetricPayload();

        // Some rows are stored with single quotes. Normalize so JSON parsing succeeds.
        var normalized = payload.Replace('\'', '"');

        try
        {
            using var doc = JsonDocument.Parse(normalized);
            var root = doc.RootElement;

            return new MetricPayload
            {
                Month = ReadString(root, "month"),
                AvgHealthScore = ReadDecimal(root, "avg_health_score"),
                AvgEducationProgress = ReadDecimal(root, "avg_education_progress"),
                TotalResidents = ReadInt(root, "total_residents"),
                DonationsTotalForMonth = ReadDecimal(root, "donations_total_for_month")
            };
        }
        catch
        {
            return new MetricPayload();
        }
    }

    private static string? ReadString(JsonElement root, string name)
        => root.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String
            ? p.GetString()
            : null;

    private static int? ReadInt(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var p))
            return null;

        if (p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var i))
            return i;

        if (p.ValueKind == JsonValueKind.String && int.TryParse(p.GetString(), out var fromText))
            return fromText;

        return null;
    }

    private static decimal? ReadDecimal(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var p))
            return null;

        if (p.ValueKind == JsonValueKind.Number && p.TryGetDecimal(out var d))
            return d;

        if (p.ValueKind == JsonValueKind.String && decimal.TryParse(p.GetString(), out var fromText))
            return fromText;

        return null;
    }

    private sealed class MetricPayload
    {
        public string? Month { get; set; }
        public decimal? AvgHealthScore { get; set; }
        public decimal? AvgEducationProgress { get; set; }
        public int? TotalResidents { get; set; }
        public decimal? DonationsTotalForMonth { get; set; }
    }

    private sealed class ReintegrationMetric
    {
        public string? Month { get; set; }
        public int? AdmittedCases { get; set; }
        public int? CompletedCases { get; set; }
    }
}
