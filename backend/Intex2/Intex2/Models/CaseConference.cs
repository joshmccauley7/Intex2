using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("case_conferences")]
public class CaseConference
{
    [Key]
    [Column("conference_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ConferenceId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("conference_date")]
    public DateOnly? ConferenceDate { get; set; }

    [Column("conference_type")]
    public string? ConferenceType { get; set; }

    [Column("participants")]
    public string? Participants { get; set; }

    [Column("summary")]
    public string? Summary { get; set; }

    [Column("decisions_made")]
    public string? DecisionsMade { get; set; }

    [Column("next_conference_date")]
    public DateOnly? NextConferenceDate { get; set; }

    [Column("social_worker")]
    public string? SocialWorker { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
