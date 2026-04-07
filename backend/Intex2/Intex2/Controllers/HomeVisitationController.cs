using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api")]
[Authorize(Policy = "AdminOnly")]
public class HomeVisitationController : ControllerBase
{
    private readonly AppDbContext _db;

    public HomeVisitationController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/residents/{residentId}/home-visitations
    [HttpGet("residents/{residentId}/home-visitations")]
    public async Task<IActionResult> GetVisitations(int residentId)
    {
        var visits = await _db.HomeVisitations
            .Where(v => v.ResidentId == residentId)
            .OrderByDescending(v => v.VisitDate)
            .ToListAsync();

        return Ok(visits);
    }

    // POST /api/residents/{residentId}/home-visitations
    [HttpPost("residents/{residentId}/home-visitations")]
    public async Task<IActionResult> CreateVisitation(int residentId, [FromBody] HomeVisitation visit)
    {
        visit.ResidentId = residentId;
        _db.HomeVisitations.Add(visit);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetVisitationById), new { id = visit.VisitationId }, visit);
    }

    // GET /api/home-visitations/{id}
    [HttpGet("home-visitations/{id}")]
    public async Task<IActionResult> GetVisitationById(int id)
    {
        var visit = await _db.HomeVisitations.FindAsync(id);
        if (visit == null) return NotFound();
        return Ok(visit);
    }

    // PUT /api/home-visitations/{id}
    [HttpPut("home-visitations/{id}")]
    public async Task<IActionResult> UpdateVisitation(int id, [FromBody] HomeVisitation updated)
    {
        var visit = await _db.HomeVisitations.FindAsync(id);
        if (visit == null) return NotFound();

        visit.VisitDate = updated.VisitDate;
        visit.SocialWorker = updated.SocialWorker;
        visit.VisitType = updated.VisitType;
        visit.LocationVisited = updated.LocationVisited;
        visit.FamilyMembersPresent = updated.FamilyMembersPresent;
        visit.Purpose = updated.Purpose;
        visit.Observations = updated.Observations;
        visit.FamilyCooperationLevel = updated.FamilyCooperationLevel;
        visit.SafetyConcernsNoted = updated.SafetyConcernsNoted;
        visit.FollowUpNeeded = updated.FollowUpNeeded;
        visit.FollowUpNotes = updated.FollowUpNotes;
        visit.VisitOutcome = updated.VisitOutcome;

        await _db.SaveChangesAsync();
        return Ok(visit);
    }

    // DELETE /api/home-visitations/{id}
    [HttpDelete("home-visitations/{id}")]
    public async Task<IActionResult> DeleteVisitation(int id)
    {
        var visit = await _db.HomeVisitations.FindAsync(id);
        if (visit == null) return NotFound();

        _db.HomeVisitations.Remove(visit);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/residents/{residentId}/case-conferences
    [HttpGet("residents/{residentId}/case-conferences")]
    public async Task<IActionResult> GetConferences(int residentId)
    {
        var conferences = await _db.CaseConferences
            .Where(c => c.ResidentId == residentId)
            .OrderByDescending(c => c.ConferenceDate)
            .ThenByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(conferences);
    }

    // POST /api/residents/{residentId}/case-conferences
    [HttpPost("residents/{residentId}/case-conferences")]
    public async Task<IActionResult> CreateConference(int residentId, [FromBody] CaseConference conference)
    {
        conference.ResidentId = residentId;
        conference.CreatedAt = DateTime.UtcNow;
        _db.CaseConferences.Add(conference);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetConferenceById), new { id = conference.ConferenceId }, conference);
    }

    // GET /api/case-conferences/{id}
    [HttpGet("case-conferences/{id}")]
    public async Task<IActionResult> GetConferenceById(int id)
    {
        var conference = await _db.CaseConferences.FindAsync(id);
        if (conference == null) return NotFound();
        return Ok(conference);
    }

    // PUT /api/case-conferences/{id}
    [HttpPut("case-conferences/{id}")]
    public async Task<IActionResult> UpdateConference(int id, [FromBody] CaseConference updated)
    {
        var conference = await _db.CaseConferences.FindAsync(id);
        if (conference == null) return NotFound();

        conference.ConferenceDate = updated.ConferenceDate;
        conference.ConferenceType = updated.ConferenceType;
        conference.Participants = updated.Participants;
        conference.Summary = updated.Summary;
        conference.DecisionsMade = updated.DecisionsMade;
        conference.NextConferenceDate = updated.NextConferenceDate;
        conference.SocialWorker = updated.SocialWorker;

        await _db.SaveChangesAsync();
        return Ok(conference);
    }

    // DELETE /api/case-conferences/{id}
    [HttpDelete("case-conferences/{id}")]
    public async Task<IActionResult> DeleteConference(int id)
    {
        var conference = await _db.CaseConferences.FindAsync(id);
        if (conference == null) return NotFound();

        _db.CaseConferences.Remove(conference);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
