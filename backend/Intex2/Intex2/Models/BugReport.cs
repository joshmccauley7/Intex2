using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("bug_reports")]
public class BugReport
{
    [Key]
    [Column("bug_report_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int BugReportId { get; set; }

    [Column("submitted_at")]
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    [Column("submitted_by")]
    public string? SubmittedBy { get; set; }

    [Column("page_context")]
    public string? PageContext { get; set; }

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>Open | Reviewed | Resolved</summary>
    [Column("status")]
    public string Status { get; set; } = "Open";
}
