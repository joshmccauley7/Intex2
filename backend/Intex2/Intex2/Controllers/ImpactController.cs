using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
}
