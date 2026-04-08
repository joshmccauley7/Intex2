using Microsoft.EntityFrameworkCore;

/// <summary>
/// Rule-based churn scoring for donors. Runs immediately after a donation is
/// recorded so every donor always has a prediction, even on their first gift.
///
/// Formula inputs (computed from the donor's full donation history):
///   - daysSinceLast  — days since most recent donation (0 = donated today)
///   - giftCount      — lifetime number of donations
///   - hasRecurring   — any donation is flagged as recurring
///
/// Base probability: 0.30 (30 %)
///   Recency:   donated today → −0.20 | ≤30 d → −0.15 | ≤90 d → −0.05
///              >365 d → +0.40 | >180 d → +0.20 | >90 d → +0.10
///   Frequency: 10+ gifts → −0.15 | 5–9 gifts → −0.08 | 1 gift → +0.10
///   Recurring: −0.15
///   Clamped to [0.05, 0.97]
///
/// Risk tiers:  High ≥ 0.65 | Medium ≥ 0.35 | Low &lt; 0.35
/// </summary>
public class ChurnScoringService
{
    private readonly AppDbContext _db;

    public ChurnScoringService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Compute a churn score for <paramref name="supporterId"/> from their
    /// current donation history and upsert the result into
    /// <c>donor_churn_predictions</c>.
    /// </summary>
    public async Task ScoreAndUpsertAsync(int supporterId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var donations = await _db.Donations
            .Where(d => d.SupporterId == supporterId)
            .Select(d => new { d.DonationDate, d.IsRecurring })
            .ToListAsync();

        if (donations.Count == 0)
            return; // nothing to score yet

        var lastDate      = donations.Max(d => d.DonationDate);
        int daysSinceLast = today.DayNumber - lastDate.DayNumber;
        int giftCount     = donations.Count;
        bool hasRecurring = donations.Any(d => d.IsRecurring);

        double score = 0.30;

        // Recency
        if      (daysSinceLast == 0)   score -= 0.20;
        else if (daysSinceLast <= 30)  score -= 0.15;
        else if (daysSinceLast <= 90)  score -= 0.05;
        else if (daysSinceLast <= 180) score += 0.10;
        else if (daysSinceLast <= 365) score += 0.20;
        else                           score += 0.40;

        // Frequency
        if      (giftCount >= 10) score -= 0.15;
        else if (giftCount >= 5)  score -= 0.08;
        else if (giftCount == 1)  score += 0.10;

        // Recurring bonus
        if (hasRecurring) score -= 0.15;

        score = Math.Clamp(score, 0.05, 0.97);

        var riskLevel = score >= 0.65 ? "High"
                      : score >= 0.35 ? "Medium"
                      :                 "Low";

        var existing = await _db.DonorChurnPredictions
            .FirstOrDefaultAsync(p => p.SupporterId == supporterId);

        if (existing is null)
        {
            _db.DonorChurnPredictions.Add(new DonorChurnPrediction
            {
                SupporterId      = supporterId,
                ChurnProbability = (decimal)score,
                RiskLevel        = riskLevel,
                ModelVersion     = "rule-v1",
                ScoredAt         = DateTime.UtcNow,
            });
        }
        else
        {
            existing.ChurnProbability = (decimal)score;
            existing.RiskLevel        = riskLevel;
            existing.ModelVersion     = "rule-v1";
            existing.ScoredAt         = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }
}
