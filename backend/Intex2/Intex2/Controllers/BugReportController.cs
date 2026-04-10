using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/bug-reports")]
public class BugReportController : ControllerBase
{
    private readonly AppDbContext _db;

    public BugReportController(AppDbContext db)
    {
        _db = db;
    }

    // POST /api/bug-reports
    // Any authenticated user can submit a bug report.
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Submit([FromBody] BugReportRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Description))
            return BadRequest(new { error = "Description is required." });

        var userName = User.FindFirstValue(ClaimTypes.Name)
                    ?? User.FindFirstValue(ClaimTypes.Email)
                    ?? "Unknown";

        var report = new BugReport
        {
            SubmittedAt  = DateTime.UtcNow,
            SubmittedBy  = userName,
            PageContext  = req.PageContext?.Trim(),
            Description  = req.Description.Trim(),
            Status       = "Open",
        };

        _db.BugReports.Add(report);
        await _db.SaveChangesAsync();

        return Ok(new { bugReportId = report.BugReportId, message = "Bug report saved. Thank you!" });
    }

    // GET /api/bug-reports
    // Admin-only: list all reports, newest first.
    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> List(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.BugReports.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var total = await query.CountAsync();

        var reports = await query
            .OrderByDescending(r => r.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, reports });
    }

    // PATCH /api/bug-reports/{id}/status
    // Admin-only: update status (Open → Reviewed → Resolved).
    [HttpPatch("{id}/status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdateRequest req)
    {
        var allowed = new[] { "Open", "Reviewed", "Resolved" };
        if (!allowed.Contains(req.Status))
            return BadRequest(new { error = "Status must be Open, Reviewed, or Resolved." });

        var report = await _db.BugReports.FindAsync(id);
        if (report == null) return NotFound();

        report.Status = req.Status;
        await _db.SaveChangesAsync();
        return Ok(report);
    }
}

public record BugReportRequest(string Description, string? PageContext);
public record StatusUpdateRequest(string Status);
