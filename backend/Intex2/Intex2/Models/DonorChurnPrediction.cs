using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("donor_churn_predictions")]
public class DonorChurnPrediction
{
    [Key]
    [Column("prediction_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int PredictionId { get; set; }

    [Column("supporter_id")]
    public int SupporterId { get; set; }

    [Column("churn_probability")]
    public decimal ChurnProbability { get; set; }

    [Column("risk_level")]
    public string RiskLevel { get; set; } = "";

    [Column("model_version")]
    public string? ModelVersion { get; set; }

    [Column("scored_at")]
    public DateTime? ScoredAt { get; set; }
}
