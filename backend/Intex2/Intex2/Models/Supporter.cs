using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("supporters")]
public class Supporter
{
    [Key]
    [Column("supporter_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SupporterId { get; set; }

    [Column("supporter_type")]
    [Required]
    [StringLength(50)]
    public string SupporterType { get; set; } = "";

    [Column("display_name")]
    [Required]
    [StringLength(200)]
    public string DisplayName { get; set; } = "";

    [Column("organization_name")]
    [StringLength(200)]
    public string? OrganizationName { get; set; }

    [Column("first_name")]
    [StringLength(100)]
    public string? FirstName { get; set; }

    [Column("last_name")]
    [StringLength(100)]
    public string? LastName { get; set; }

    [Column("relationship_type")]
    [StringLength(50)]
    public string? RelationshipType { get; set; }

    [Column("region")]
    [StringLength(100)]
    public string? Region { get; set; }

    [Column("country")]
    [StringLength(100)]
    public string? Country { get; set; }

    [Column("email")]
    [EmailAddress]
    [StringLength(200)]
    public string? Email { get; set; }

    [Column("phone")]
    [StringLength(30)]
    public string? Phone { get; set; }

    [Column("status")]
    [Required]
    [StringLength(50)]
    public string Status { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("first_donation_date")]
    public DateOnly? FirstDonationDate { get; set; }

    [Column("acquisition_channel")]
    public string? AcquisitionChannel { get; set; }

    [Column("last_contacted_at")]
    public DateTime? LastContactedAt { get; set; }

    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
