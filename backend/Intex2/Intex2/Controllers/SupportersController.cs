using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/supporters")]
[Authorize(Policy = "AdminOnly")]
public class SupportersController : ControllerBase
{
    private readonly AppDbContext _db;

    public SupportersController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/supporters?type=MonetaryDonor&status=Active
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] string? status)
    {
        var query = _db.Supporters.AsQueryable();

        if (!string.IsNullOrEmpty(type))
            query = query.Where(s => s.SupporterType == type);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(s => s.Status == status);

        var supporters = await query
            .OrderBy(s => s.DisplayName)
            .GroupJoin(
                _db.DonorChurnPredictions,
                s => s.SupporterId,
                p => p.SupporterId,
                (s, preds) => new { s, preds })
            .SelectMany(
                x => x.preds.DefaultIfEmpty(),
                (x, p) => new
                {
                    x.s.SupporterId,
                    x.s.DisplayName,
                    x.s.SupporterType,
                    x.s.Status,
                    x.s.Region,
                    x.s.Email,
                    x.s.FirstDonationDate,
                    ChurnRiskLevel = p != null ? p.RiskLevel : null,
                    ChurnProbability = p != null ? (decimal?)p.ChurnProbability : null
                })
            .ToListAsync();

        return Ok(supporters);
    }

    // GET /api/supporters/:id
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var supporter = await _db.Supporters
            .Include(s => s.Donations)
                .ThenInclude(d => d.InKindItems)
            .FirstOrDefaultAsync(s => s.SupporterId == id);

        if (supporter == null) return NotFound();

        return Ok(supporter);
    }

    // POST /api/supporters
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Supporter supporter)
    {
        supporter.CreatedAt = DateTime.UtcNow;
        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = supporter.SupporterId }, supporter);
    }

    // PUT /api/supporters/:id
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Supporter updated)
    {
        var supporter = await _db.Supporters.FindAsync(id);
        if (supporter == null) return NotFound();

        supporter.SupporterType = updated.SupporterType;
        supporter.DisplayName = updated.DisplayName;
        supporter.OrganizationName = updated.OrganizationName;
        supporter.FirstName = updated.FirstName;
        supporter.LastName = updated.LastName;
        supporter.RelationshipType = updated.RelationshipType;
        supporter.Region = updated.Region;
        supporter.Country = updated.Country;
        supporter.Email = updated.Email;
        supporter.Phone = updated.Phone;
        supporter.Status = updated.Status;
        supporter.AcquisitionChannel = updated.AcquisitionChannel;

        await _db.SaveChangesAsync();
        return Ok(supporter);
    }

    // DELETE /api/supporters/:id
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var supporter = await _db.Supporters.FindAsync(id);
        if (supporter == null) return NotFound();

        _db.Supporters.Remove(supporter);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/supporters/:id/donations
    [HttpPost("{id}/donations")]
    public async Task<IActionResult> AddDonation(int id, [FromBody] Donation donation)
    {
        var supporter = await _db.Supporters.FindAsync(id);
        if (supporter == null) return NotFound();

        donation.SupporterId = id;
        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id }, donation);
    }
}
