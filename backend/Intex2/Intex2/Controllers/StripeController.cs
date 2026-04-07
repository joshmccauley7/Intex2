using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/stripe")]
public class StripeController : ControllerBase
{
    [HttpGet("public-config")]
    public IActionResult GetPublicConfig()
    {
        var publishableKey = Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY");
        if (string.IsNullOrWhiteSpace(publishableKey))
            return NotFound(new { message = "Stripe publishable key is not configured." });

        return Ok(new { publishableKey });
    }

    [HttpGet("admin/status")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult GetAdminStatus()
    {
        var hasSecret = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY"));
        var hasPublishable = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY"));
        return Ok(new
        {
            hasSecretKey = hasSecret,
            hasPublishableKey = hasPublishable
        });
    }

    [HttpPost("admin/keys")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult SaveKeys([FromBody] SaveStripeKeysRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.SecretKey) || string.IsNullOrWhiteSpace(req.PublishableKey))
            return BadRequest(new { message = "Both Stripe secret and publishable keys are required." });

        try
        {
            StripeKeyStore.SetKeys(req.SecretKey.Trim(), req.PublishableKey.Trim());
            return Ok(new { message = "Stripe keys saved." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to save Stripe keys: {ex.Message}" });
        }
    }
}

public sealed class SaveStripeKeysRequest
{
    public string SecretKey { get; set; } = "";
    public string PublishableKey { get; set; } = "";
}

internal static class StripeKeyStore
{
    public static void SetKeys(string secretKey, string publishableKey)
    {
        Environment.SetEnvironmentVariable("STRIPE_SECRET_KEY", secretKey);
        Environment.SetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY", publishableKey);

        var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
        var lines = File.Exists(envPath)
            ? File.ReadAllLines(envPath).ToList()
            : new List<string>();

        Upsert(lines, "STRIPE_SECRET_KEY", secretKey);
        Upsert(lines, "STRIPE_PUBLISHABLE_KEY", publishableKey);
        File.WriteAllLines(envPath, lines);
    }

    private static void Upsert(List<string> lines, string key, string value)
    {
        var prefix = $"{key}=";
        var index = lines.FindIndex(l => l.TrimStart().StartsWith(prefix, StringComparison.Ordinal));
        var safeValue = value.Replace("\r", "").Replace("\n", "");
        if (index >= 0)
            lines[index] = $"{key}={safeValue}";
        else
            lines.Add($"{key}={safeValue}");
    }
}
