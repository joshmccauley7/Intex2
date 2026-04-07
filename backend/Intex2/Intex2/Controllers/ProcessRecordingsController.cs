using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api")]
[Authorize(Policy = "AdminOnly")]
public class ProcessRecordingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProcessRecordingsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/residents/{residentId}/process-recordings
    [HttpGet("residents/{residentId}/process-recordings")]
    public async Task<IActionResult> GetForResident(int residentId)
    {
        var records = await _db.ProcessRecordings
            .Where(p => p.ResidentId == residentId)
            .OrderByDescending(p => p.SessionDate)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(records);
    }

    // POST /api/residents/{residentId}/process-recordings
    [HttpPost("residents/{residentId}/process-recordings")]
    public async Task<IActionResult> Create(int residentId, [FromBody] ProcessRecording recording)
    {
        recording.ResidentId = residentId;
        recording.CreatedAt = DateTime.UtcNow;
        _db.ProcessRecordings.Add(recording);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = recording.RecordingId }, recording);
    }

    // GET /api/process-recordings/{id}
    [HttpGet("process-recordings/{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var record = await _db.ProcessRecordings.FindAsync(id);
        if (record == null) return NotFound();
        return Ok(record);
    }

    // PUT /api/process-recordings/{id}
    [HttpPut("process-recordings/{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecording updated)
    {
        var record = await _db.ProcessRecordings.FindAsync(id);
        if (record == null) return NotFound();

        record.SessionDate = updated.SessionDate;
        record.SocialWorker = updated.SocialWorker;
        record.SessionType = updated.SessionType;
        record.SessionDurationMinutes = updated.SessionDurationMinutes;
        record.EmotionalStateObserved = updated.EmotionalStateObserved;
        record.EmotionalStateEnd = updated.EmotionalStateEnd;
        record.SessionNarrative = updated.SessionNarrative;
        record.InterventionsApplied = updated.InterventionsApplied;
        record.FollowUpActions = updated.FollowUpActions;
        record.ProgressNoted = updated.ProgressNoted;
        record.ConcernsFlagged = updated.ConcernsFlagged;
        record.ReferralMade = updated.ReferralMade;
        record.NotesRestricted = updated.NotesRestricted;

        await _db.SaveChangesAsync();
        return Ok(record);
    }

    // DELETE /api/process-recordings/{id}
    [HttpDelete("process-recordings/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var record = await _db.ProcessRecordings.FindAsync(id);
        if (record == null) return NotFound();

        _db.ProcessRecordings.Remove(record);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
