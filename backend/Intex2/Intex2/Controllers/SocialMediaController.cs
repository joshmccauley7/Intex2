using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using System.Globalization;
using System.Text.Json.Serialization;

[ApiController]
[Route("api/social-media")]
[Authorize(Policy = "AdminOnly")]
public class SocialMediaController : ControllerBase
{
    private readonly AppDbContext _db;

    public SocialMediaController(AppDbContext db) => _db = db;

    // Input model for the predict endpoint — JSON keys match the frontend's snake_case form state
    public record PredictRequest(
        [property: JsonPropertyName("platform")]                string Platform,
        [property: JsonPropertyName("post_type")]               string PostType,
        [property: JsonPropertyName("media_type")]              string MediaType,
        [property: JsonPropertyName("content_topic")]           string ContentTopic,
        [property: JsonPropertyName("sentiment_tone")]          string SentimentTone,
        [property: JsonPropertyName("day_of_week")]             string DayOfWeek,
        [property: JsonPropertyName("call_to_action_type")]     string CallToActionType,
        [property: JsonPropertyName("has_call_to_action")]      bool   HasCallToAction,
        [property: JsonPropertyName("features_resident_story")] bool   FeaturesResidentStory,
        [property: JsonPropertyName("is_boosted")]              bool   IsBoosted,
        [property: JsonPropertyName("post_hour")]               int    PostHour,
        [property: JsonPropertyName("num_hashtags")]            int    NumHashtags,
        [property: JsonPropertyName("caption_length")]          int    CaptionLength
    );

    // GET /api/social-media/history?platform=&page=1&pageSize=20
    // Uses raw SQL (like ImpactController) to avoid EF Core type-mapping issues
    // with columns that may be stored as FLOAT8 vs NUMERIC in PostgreSQL.
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] string? platform = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var offset = (page - 1) * pageSize;

        var platformFilter = string.IsNullOrWhiteSpace(platform)
            ? ""
            : $"WHERE platform = '{platform.Replace("'", "''")}'";

        var countSql = $"SELECT COUNT(*) FROM social_media_posts {platformFilter}";
        var dataSql  = $"""
            SELECT
                post_id, platform, post_type, media_type, content_topic, sentiment_tone,
                created_at, day_of_week, post_hour,
                has_call_to_action, call_to_action_type,
                features_resident_story, is_boosted, campaign_name,
                num_hashtags, caption_length,
                reach, likes, comments, shares,
                COALESCE(engagement_rate, 0)             AS engagement_rate,
                donation_referrals,
                COALESCE(estimated_donation_value_php, 0) AS estimated_donation_value_php
            FROM social_media_posts
            {platformFilter}
            ORDER BY created_at DESC
            LIMIT {pageSize} OFFSET {offset}
            """;

        var conn = _db.Database.GetDbConnection();
        var closeAfter = conn.State != System.Data.ConnectionState.Open;
        if (closeAfter) await conn.OpenAsync();

        try
        {
            long total = 0;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = countSql;
                var result = await cmd.ExecuteScalarAsync();
                total = result is long l ? l : Convert.ToInt64(result);
            }

            var posts = await QueryListAsync(dataSql, r => new
            {
                postId                    = ReadInt(r, "post_id"),
                platform                  = ReadString(r, "platform"),
                postType                  = ReadString(r, "post_type"),
                mediaType                 = ReadString(r, "media_type"),
                contentTopic              = ReadString(r, "content_topic"),
                sentimentTone             = ReadString(r, "sentiment_tone"),
                createdAt                 = r["created_at"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["created_at"]),
                dayOfWeek                 = ReadString(r, "day_of_week"),
                postHour                  = ReadInt(r, "post_hour"),
                hasCallToAction           = r["has_call_to_action"] != DBNull.Value && Convert.ToBoolean(r["has_call_to_action"]),
                callToActionType          = ReadString(r, "call_to_action_type"),
                featuresResidentStory     = r["features_resident_story"] != DBNull.Value && Convert.ToBoolean(r["features_resident_story"]),
                isBoosted                 = r["is_boosted"] != DBNull.Value && Convert.ToBoolean(r["is_boosted"]),
                campaignName              = ReadString(r, "campaign_name"),
                numHashtags               = ReadInt(r, "num_hashtags"),
                captionLength             = ReadInt(r, "caption_length"),
                reach                     = ReadInt(r, "reach"),
                likes                     = ReadInt(r, "likes"),
                comments                  = ReadInt(r, "comments"),
                shares                    = ReadInt(r, "shares"),
                engagementRate            = ReadDecimal(r, "engagement_rate"),
                donationReferrals         = ReadInt(r, "donation_referrals"),
                estimatedDonationValuePhp = ReadDecimal(r, "estimated_donation_value_php"),
            });

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                posts
            });
        }
        finally
        {
            if (closeAfter) await conn.CloseAsync();
        }
    }

    // GET /api/social-media/insights
    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights()
    {
        var byPlatform = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    platform,
                    COUNT(*)                                          AS post_count,
                    ROUND(AVG(engagement_rate)::numeric, 4)          AS avg_engagement_rate,
                    SUM(donation_referrals)                          AS total_referrals,
                    ROUND(AVG(CASE WHEN donation_referrals > 0 THEN 1.0 ELSE 0.0 END)::numeric, 4) AS conversion_rate,
                    ROUND(AVG(estimated_donation_value_php)::numeric, 2) AS avg_donation_value
                FROM social_media_posts
                GROUP BY platform
                ORDER BY conversion_rate DESC
                """,
                r => new
                {
                    platform         = ReadString(r, "platform"),
                    postCount        = ReadInt(r, "post_count"),
                    avgEngagementRate = ReadDecimal(r, "avg_engagement_rate"),
                    totalReferrals   = ReadInt(r, "total_referrals"),
                    conversionRate   = ReadDecimal(r, "conversion_rate"),
                    avgDonationValue = ReadDecimal(r, "avg_donation_value"),
                }));

        var byPostType = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    post_type,
                    COUNT(*)                                          AS post_count,
                    ROUND(AVG(CASE WHEN donation_referrals > 0 THEN 1.0 ELSE 0.0 END)::numeric, 4) AS conversion_rate,
                    SUM(donation_referrals)                          AS total_referrals,
                    ROUND(AVG(estimated_donation_value_php)::numeric, 2) AS avg_donation_value
                FROM social_media_posts
                GROUP BY post_type
                ORDER BY conversion_rate DESC
                """,
                r => new
                {
                    postType         = ReadString(r, "post_type"),
                    postCount        = ReadInt(r, "post_count"),
                    conversionRate   = ReadDecimal(r, "conversion_rate"),
                    totalReferrals   = ReadInt(r, "total_referrals"),
                    avgDonationValue = ReadDecimal(r, "avg_donation_value"),
                }));

        var byMediaType = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    media_type,
                    COUNT(*)                                          AS post_count,
                    ROUND(AVG(CASE WHEN donation_referrals > 0 THEN 1.0 ELSE 0.0 END)::numeric, 4) AS conversion_rate,
                    SUM(donation_referrals)                          AS total_referrals
                FROM social_media_posts
                GROUP BY media_type
                ORDER BY conversion_rate DESC
                """,
                r => new
                {
                    mediaType      = ReadString(r, "media_type"),
                    postCount      = ReadInt(r, "post_count"),
                    conversionRate = ReadDecimal(r, "conversion_rate"),
                    totalReferrals = ReadInt(r, "total_referrals"),
                }));

        var byHour = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    post_hour,
                    COUNT(*)                                          AS post_count,
                    ROUND(AVG(CASE WHEN donation_referrals > 0 THEN 1.0 ELSE 0.0 END)::numeric, 4) AS conversion_rate
                FROM social_media_posts
                GROUP BY post_hour
                ORDER BY post_hour
                """,
                r => new
                {
                    postHour       = ReadInt(r, "post_hour"),
                    postCount      = ReadInt(r, "post_count"),
                    conversionRate = ReadDecimal(r, "conversion_rate"),
                }));

        var overallStats = await SafeQueryAsync(async () =>
            await QueryListAsync(
                """
                SELECT
                    COUNT(*)                                          AS total_posts,
                    SUM(donation_referrals)                          AS total_referrals,
                    ROUND(AVG(CASE WHEN donation_referrals > 0 THEN 1.0 ELSE 0.0 END)::numeric, 4) AS overall_conversion_rate,
                    ROUND(SUM(estimated_donation_value_php)::numeric, 2) AS total_donation_value
                FROM social_media_posts
                """,
                r => new
                {
                    totalPosts            = ReadInt(r, "total_posts"),
                    totalReferrals        = ReadInt(r, "total_referrals"),
                    overallConversionRate = ReadDecimal(r, "overall_conversion_rate"),
                    totalDonationValue    = ReadDecimal(r, "total_donation_value"),
                }));

        return Ok(new
        {
            overall      = overallStats.FirstOrDefault(),
            byPlatform,
            byPostType,
            byMediaType,
            byHour,
        });
    }

    // POST /api/social-media/predict
    // Scores a planned post directly from historical conversion rates in the DB.
    // No external Python service or pre-trained model required.
    [HttpPost("predict")]
    public async Task<IActionResult> Predict([FromBody] PredictRequest req)
    {
        try
        {
            var (featureRates, overallRate, avgValue) = await LoadFeatureRatesAsync();

            var input = BuildInputMap(req);
            double score = ComputeScore(featureRates, input, overallRate);
            var recs    = BuildRecommendations(featureRates, input, overallRate, score);

            return Ok(new
            {
                donation_probability  = Math.Round(score, 3),
                risk_label            = GetRiskLabel(score),
                predicted_referrals   = Math.Round(score * 2.5, 1),
                recommendations       = recs,
                model_version         = "v1.0-live",
                avg_conversion_rate   = Math.Round(overallRate, 3),
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Prediction failed: {ex.Message}" });
        }
    }

    // GET /api/social-media/feature-rates — returns historical conversion rates for every
    // feature value so the frontend can show live hints without hitting /predict.
    [HttpGet("feature-rates")]
    public async Task<IActionResult> GetFeatureRates()
    {
        var (featureRates, overallRate, _) = await LoadFeatureRatesAsync();
        var features = featureRates.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.ToDictionary(
                v => v.Key,
                v => new { rate = Math.Round(v.Value.Rate, 4), n = v.Value.N }
            )
        );
        return Ok(new { overall_rate = Math.Round(overallRate, 4), features });
    }

    // GET /api/social-media/platforms — distinct platform list for filters
    [HttpGet("platforms")]
    public async Task<IActionResult> GetPlatforms()
    {
        var platforms = await SafeQueryAsync(async () =>
            await QueryListAsync(
                "SELECT DISTINCT platform FROM social_media_posts WHERE platform IS NOT NULL ORDER BY platform",
                r => ReadString(r, "platform")));
        return Ok(platforms);
    }

    // ── Scoring infrastructure ────────────────────────────────────────────────

    // Loads conversion rates for every categorical/boolean/binned-numeric feature
    // value from the live database in a single query.
    private async Task<(Dictionary<string, Dictionary<string, (double Rate, int N)>> rates, double overallRate, double avgValue)>
        LoadFeatureRatesAsync()
    {
        const string sql = """
            SELECT feature_name, feature_value,
                   COUNT(*)::int AS n,
                   ROUND(AVG(CASE WHEN donation_referrals > 0 THEN 1.0 ELSE 0.0 END)::numeric, 6)::float AS conv_rate
            FROM (
                SELECT 'platform'         feat, platform                                                   val, donation_referrals dr FROM social_media_posts WHERE platform          IS NOT NULL
                UNION ALL
                SELECT 'post_type',             post_type,                                                     donation_referrals     FROM social_media_posts WHERE post_type         IS NOT NULL
                UNION ALL
                SELECT 'media_type',            media_type,                                                    donation_referrals     FROM social_media_posts WHERE media_type        IS NOT NULL
                UNION ALL
                SELECT 'content_topic',         content_topic,                                                 donation_referrals     FROM social_media_posts WHERE content_topic     IS NOT NULL
                UNION ALL
                SELECT 'sentiment_tone',        sentiment_tone,                                                donation_referrals     FROM social_media_posts WHERE sentiment_tone    IS NOT NULL
                UNION ALL
                SELECT 'day_of_week',           day_of_week,                                                   donation_referrals     FROM social_media_posts WHERE day_of_week       IS NOT NULL
                UNION ALL
                SELECT 'call_to_action_type',   COALESCE(call_to_action_type, 'None'),                         donation_referrals     FROM social_media_posts
                UNION ALL
                SELECT 'has_cta',               CASE WHEN has_call_to_action      THEN 'true' ELSE 'false' END, donation_referrals    FROM social_media_posts
                UNION ALL
                SELECT 'resident_story',        CASE WHEN features_resident_story THEN 'true' ELSE 'false' END, donation_referrals    FROM social_media_posts
                UNION ALL
                SELECT 'is_boosted',            CASE WHEN is_boosted              THEN 'true' ELSE 'false' END, donation_referrals    FROM social_media_posts
                UNION ALL
                SELECT 'hour_bin',
                       CASE WHEN post_hour BETWEEN 0  AND 5  THEN '00-05'
                            WHEN post_hour BETWEEN 6  AND 8  THEN '06-08'
                            WHEN post_hour BETWEEN 9  AND 11 THEN '09-11'
                            WHEN post_hour BETWEEN 12 AND 14 THEN '12-14'
                            WHEN post_hour BETWEEN 15 AND 17 THEN '15-17'
                            WHEN post_hour BETWEEN 18 AND 20 THEN '18-20'
                            ELSE '21-23' END,
                       donation_referrals
                FROM social_media_posts
                UNION ALL
                SELECT 'hashtag_bin',
                       CASE WHEN num_hashtags = 0        THEN '0'
                            WHEN num_hashtags BETWEEN 1 AND 3 THEN '1-3'
                            WHEN num_hashtags BETWEEN 4 AND 7 THEN '4-7'
                            ELSE '8+' END,
                       donation_referrals
                FROM social_media_posts
                UNION ALL
                SELECT 'caption_bin',
                       CASE WHEN caption_length < 150  THEN 'short (<150)'
                            WHEN caption_length < 400  THEN 'medium (150-400)'
                            WHEN caption_length < 800  THEN 'long (400-800)'
                            ELSE 'very long (800+)' END,
                       donation_referrals
                FROM social_media_posts
            ) t(feature_name, feature_value, donation_referrals)
            GROUP BY feature_name, feature_value
            """;

        const string overallSql = """
            SELECT AVG(CASE WHEN donation_referrals > 0 THEN 1.0 ELSE 0.0 END)::float AS overall_rate,
                   AVG(estimated_donation_value_php)::float                           AS avg_value
            FROM social_media_posts
            """;

        var rows = await QueryListAsync(sql, r => new
        {
            feature = (string)r["feature_name"],
            value   = (string)r["feature_value"],
            n       = Convert.ToInt32(r["n"]),
            rate    = Convert.ToDouble(r["conv_rate"]),
        });

        var rates = new Dictionary<string, Dictionary<string, (double Rate, int N)>>();
        foreach (var row in rows)
        {
            if (!rates.ContainsKey(row.feature))
                rates[row.feature] = new Dictionary<string, (double, int)>();
            rates[row.feature][row.value] = (row.rate, row.n);
        }

        double overallRate = 0.5, avgValue = 0;
        var overallRows = await QueryListAsync(overallSql, r => new
        {
            overall = r["overall_rate"] == DBNull.Value ? 0.5 : Convert.ToDouble(r["overall_rate"]),
            avg     = r["avg_value"]    == DBNull.Value ? 0.0 : Convert.ToDouble(r["avg_value"]),
        });
        if (overallRows.Count > 0) { overallRate = overallRows[0].overall; avgValue = overallRows[0].avg; }

        return (rates, overallRate, avgValue);
    }

    private static Dictionary<string, string> BuildInputMap(PredictRequest r) => new()
    {
        ["platform"]           = r.Platform,
        ["post_type"]          = r.PostType,
        ["media_type"]         = r.MediaType,
        ["content_topic"]      = r.ContentTopic,
        ["sentiment_tone"]     = r.SentimentTone,
        ["day_of_week"]        = r.DayOfWeek,
        ["call_to_action_type"] = r.HasCallToAction ? r.CallToActionType : "None",
        ["has_cta"]            = r.HasCallToAction     ? "true" : "false",
        ["resident_story"]     = r.FeaturesResidentStory ? "true" : "false",
        ["is_boosted"]         = r.IsBoosted           ? "true" : "false",
        ["hour_bin"]           = HourBin(r.PostHour),
        ["hashtag_bin"]        = HashtagBin(r.NumHashtags),
        ["caption_bin"]        = CaptionBin(r.CaptionLength),
    };

    // Additive log-odds model: each feature contributes a log-odds adjustment
    // relative to the overall base rate. Adjustments are shrunk for small samples.
    private static double ComputeScore(
        Dictionary<string, Dictionary<string, (double Rate, int N)>> featureRates,
        Dictionary<string, string> input,
        double overallRate)
    {
        var baseLogOdds = LogOdds(overallRate);
        var totalAdj    = 0.0;
        var counted     = 0;

        foreach (var (feat, val) in input)
        {
            if (!featureRates.TryGetValue(feat, out var vals)) continue;
            if (!vals.TryGetValue(val, out var stat)) continue;
            if (stat.N < 3) continue;

            // Shrink toward 0 for small samples (full weight at n=30+)
            var shrink = Math.Min(1.0, (stat.N - 2.0) / 28.0);
            totalAdj += (LogOdds(stat.Rate) - baseLogOdds) * shrink;
            counted++;
        }

        if (counted == 0) return overallRate;

        // Scale down total adjustment (sqrt keeps prediction in a reasonable range)
        var finalLogOdds = baseLogOdds + totalAdj / Math.Sqrt(counted);
        return Math.Clamp(Sigmoid(finalLogOdds), 0.01, 0.99);
    }

    private static List<object> BuildRecommendations(
        Dictionary<string, Dictionary<string, (double Rate, int N)>> featureRates,
        Dictionary<string, string> input,
        double overallRate,
        double currentScore)
    {
        if (currentScore >= 0.60) return new List<object>(); // Already high potential

        var candidates = new List<(double Improvement, object Rec)>();

        // Categorical + boolean feature labels and known values
        var featMeta = new Dictionary<string, (string Label, string[] KnownValues, string HumanKey)>
        {
            ["platform"]           = ("Platform",              new[] { "Facebook","Instagram","Twitter","TikTok","LinkedIn","YouTube","WhatsApp" }, "platform"),
            ["post_type"]          = ("Post Type",             new[] { "ImpactStory","Campaign","EventPromotion","ThankYou","EducationalContent","FundraisingAppeal" }, "post_type"),
            ["media_type"]         = ("Media Type",            new[] { "Photo","Video","Carousel","Text","Reel" }, "media_type"),
            ["content_topic"]      = ("Content Topic",         new[] { "Education","Health","Reintegration","DonorImpact","SafehouseLife","EventRecap","CampaignLaunch","Gratitude","AwarenessRaising" }, "content_topic"),
            ["sentiment_tone"]     = ("Sentiment / Tone",      new[] { "Hopeful","Urgent","Celebratory","Informative","Grateful","Emotional" }, "sentiment_tone"),
            ["day_of_week"]        = ("Day of Week",           new[] { "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday" }, "day_of_week"),
            ["call_to_action_type"] = ("CTA Type",             new[] { "DonateNow","LearnMore","ShareStory","SignUp","None" }, "call_to_action_type"),
            ["has_cta"]            = ("Has Call to Action",    new[] { "true","false" }, "has_call_to_action"),
            ["resident_story"]     = ("Features Resident Story", new[] { "true","false" }, "features_resident_story"),
            ["is_boosted"]         = ("Boosted Post",          new[] { "true","false" }, "is_boosted"),
            ["hour_bin"]           = ("Hour of Day",           new[] { "00-05","06-08","09-11","12-14","15-17","18-20","21-23" }, "post_hour"),
            ["hashtag_bin"]        = ("Number of Hashtags",    new[] { "0","1-3","4-7","8+" }, "num_hashtags"),
            ["caption_bin"]        = ("Caption Length",        new[] { "short (<150)","medium (150-400)","long (400-800)","very long (800+)" }, "caption_length"),
        };

        var seen = new HashSet<string>();

        foreach (var (feat, meta) in featMeta)
        {
            if (!input.TryGetValue(feat, out var current)) continue;
            if (!featureRates.ContainsKey(feat)) continue;

            foreach (var alt in meta.KnownValues)
            {
                if (alt == current) continue;
                var altInput = new Dictionary<string, string>(input) { [feat] = alt };
                var altScore = ComputeScore(featureRates, altInput, overallRate);
                var improvement = (altScore - currentScore) / Math.Max(currentScore, 0.01);
                if (improvement <= 0.02) continue;

                var humanCurrent  = HumanLabel(feat, current);
                var humanAlt      = HumanLabel(feat, alt);
                var recKey        = $"{feat}:{alt}";
                if (!seen.Add(recKey)) continue;

                var reason = BuildReason(meta.Label, humanCurrent, humanAlt, improvement);

                candidates.Add((improvement, new
                {
                    feature           = meta.HumanKey,
                    feature_label     = meta.Label,
                    current_value     = humanCurrent,
                    recommended_value = humanAlt,
                    improvement_pct   = Math.Round(improvement * 100, 1),
                    new_probability   = Math.Round(altScore, 3),
                    reason,
                }));
            }
        }

        return candidates
            .OrderByDescending(x => x.Improvement)
            // Return best suggestion per feature (avoid e.g. 3 platform suggestions)
            .GroupBy(x => ((dynamic)x.Rec).feature)
            .Select(g => g.First().Rec)
            .Take(5)
            .ToList<object>();
    }

    // ── Scoring helpers ────────────────────────────────────────────────────────

    private static string GetRiskLabel(double p) =>
        p >= 0.60 ? "High Potential" : p >= 0.30 ? "Medium Potential" : "Low Potential";

    private static double LogOdds(double p) =>
        Math.Log(Math.Max(p, 0.001) / Math.Max(1.0 - p, 0.001));

    private static double Sigmoid(double x) => 1.0 / (1.0 + Math.Exp(-x));

    private static string HourBin(int h) => h switch
    {
        <= 5  => "00-05", <= 8  => "06-08", <= 11 => "09-11",
        <= 14 => "12-14", <= 17 => "15-17", <= 20 => "18-20", _ => "21-23",
    };
    private static string HashtagBin(int n) => n switch { 0 => "0", <= 3 => "1-3", <= 7 => "4-7", _ => "8+" };
    private static string CaptionBin(int n) => n switch
    {
        < 150 => "short (<150)", < 400 => "medium (150-400)", < 800 => "long (400-800)", _ => "very long (800+)",
    };

    private static string HumanLabel(string feat, string val) =>
        feat is "has_cta" or "resident_story" or "is_boosted"
            ? (val == "true" ? "Yes" : "No")
            : feat is "hour_bin"
                ? val switch { "00-05" => "12am–6am", "06-08" => "6am–9am", "09-11" => "9am–12pm", "12-14" => "12pm–3pm", "15-17" => "3pm–6pm", "18-20" => "6pm–9pm", _ => "9pm–12am" }
                : val;

    private static string BuildReason(string label, string current, string alt, double improvement) =>
        $"Changing {label} from '{current}' to '{alt}' is predicted to improve donation conversion by {improvement * 100:F0}% based on historical post performance.";
    

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<List<T>> QueryListAsync<T>(string sql, Func<DbDataReader, T> map)
    {
        var conn = _db.Database.GetDbConnection();
        var closeAfter = conn.State != System.Data.ConnectionState.Open;
        if (closeAfter) await conn.OpenAsync();
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            cmd.CommandType = System.Data.CommandType.Text;
            var results = new List<T>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(map(reader));
            return results;
        }
        finally
        {
            if (closeAfter) await conn.CloseAsync();
        }
    }

    private static async Task<List<T>> SafeQueryAsync<T>(Func<Task<List<T>>> query)
    {
        try { return await query(); }
        catch { return new List<T>(); }
    }

    private static string? ReadString(DbDataReader r, string col)
    {
        var v = r[col];
        return v == DBNull.Value ? null : v.ToString();
    }

    private static int? ReadInt(DbDataReader r, string col)
    {
        var v = r[col];
        if (v == DBNull.Value) return null;
        if (v is int i) return i;
        if (v is long l) return (int)l;
        if (int.TryParse(v.ToString(), out var p)) return p;
        return null;
    }

    private static decimal? ReadDecimal(DbDataReader r, string col)
    {
        var v = r[col];
        if (v == DBNull.Value) return null;
        if (v is decimal d) return d;
        if (v is double db) return (decimal)db;
        if (decimal.TryParse(v.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var p)) return p;
        return null;
    }
}
