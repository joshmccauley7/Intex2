using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("education_records")]
public class EducationRecord
{
    [Key]
    [Column("education_record_id")]
    public int EducationRecordId { get; set; }

    [Column("resident_id")]
    public int? ResidentId { get; set; }

    [Column("record_date")]
    public DateOnly? RecordDate { get; set; }

    [Column("enrollment_status")]
    public string? EnrollmentStatus { get; set; }

    [Column("attendance_rate")]
    public decimal? AttendanceRate { get; set; }

    [Column("progress_percent")]
    public decimal? ProgressPercent { get; set; }

    [Column("completion_status")]
    public string? CompletionStatus { get; set; }
}
