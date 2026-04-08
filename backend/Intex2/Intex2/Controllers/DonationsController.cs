using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;

[ApiController]
[Route("api/donations")]
[Authorize]
public class DonationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<DonationsController> _logger;

    public DonationsController(AppDbContext db, ILogger<DonationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet("my-profile")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userName = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(userName)) return Unauthorized();

        var supporter = await _db.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Email == userName);

        if (supporter == null)
            return Ok(new { displayName = (string?)null, phone = (string?)null });

        return Ok(new { displayName = supporter.DisplayName, phone = supporter.Phone });
    }

    [HttpPost("create-payment-intent")]
    public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentRequest req)
    {
        if (req.AmountUsd <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });

        var stripeSecret = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(stripeSecret))
            return StatusCode(500, new { message = "Stripe is not configured on the server." });

        StripeConfiguration.ApiKey = stripeSecret;

        var amountCents = (long)Math.Round(req.AmountUsd * 100, MidpointRounding.AwayFromZero);
        var service = new PaymentIntentService();
        var options = new PaymentIntentCreateOptions
        {
            Amount = amountCents,
            Currency = "php",
            AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
            {
                Enabled = true
            },
            ReceiptEmail = req.Email,
            Description = "Safira donation",
            Metadata = new Dictionary<string, string>
            {
                ["donor_name"] = req.FullName ?? "",
                ["donor_email"] = req.Email ?? "",
                ["donor_phone"] = req.Phone ?? "",
                ["message"] = req.Message ?? ""
            }
        };

        var intent = await service.CreateAsync(options);
        return Ok(new
        {
            clientSecret = intent.ClientSecret,
            paymentIntentId = intent.Id
        });
    }

    [HttpPost("create-recurring-session")]
    public async Task<IActionResult> CreateRecurringSession([FromBody] CreateRecurringSessionRequest req)
    {
        if (req.AmountUsd <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });
        if (string.IsNullOrWhiteSpace(req.SuccessUrl) || string.IsNullOrWhiteSpace(req.CancelUrl))
            return BadRequest(new { message = "Success and cancel URLs are required." });

        var stripeSecret = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(stripeSecret))
            return StatusCode(500, new { message = "Stripe is not configured on the server." });

        StripeConfiguration.ApiKey = stripeSecret;

        var amountCents = (long)Math.Round(req.AmountUsd * 100, MidpointRounding.AwayFromZero);
        var options = new SessionCreateOptions
        {
            Mode = "subscription",
            SuccessUrl = req.SuccessUrl,
            CancelUrl = req.CancelUrl,
            CustomerEmail = req.Email,
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "php",
                        UnitAmount = amountCents,
                        Recurring = new SessionLineItemPriceDataRecurringOptions
                        {
                            Interval = "month"
                        },
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = "Safira Monthly Donation"
                        }
                    }
                }
            },
            Metadata = new Dictionary<string, string>
            {
                ["donor_name"] = req.FullName ?? "",
                ["donor_email"] = req.Email ?? "",
                ["donor_phone"] = req.Phone ?? "",
                ["message"] = req.Message ?? "",
                ["amount_usd"] = req.AmountUsd.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["is_recurring"] = "true"
            }
        };

        var sessionService = new SessionService();
        var session = await sessionService.CreateAsync(options);
        return Ok(new { sessionId = session.Id, checkoutUrl = session.Url });
    }

    [HttpPost("record-success")]
    public async Task<IActionResult> RecordSuccessfulDonation([FromBody] RecordDonationRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.PaymentIntentId))
            return BadRequest(new { message = "Missing payment intent id." });

        var stripeSecret = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(stripeSecret))
            return StatusCode(500, new { message = "Stripe is not configured on the server." });

        StripeConfiguration.ApiKey = stripeSecret;
        var intentService = new PaymentIntentService();
        var intent = await intentService.GetAsync(req.PaymentIntentId);

        if (!string.Equals(intent.Status, "succeeded", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Payment has not completed successfully." });

        var expectedCents = (long)Math.Round(req.AmountUsd * 100, MidpointRounding.AwayFromZero);
        if (intent.AmountReceived < expectedCents)
            return BadRequest(new { message = "Payment amount mismatch." });

        var existing = await _db.Donations
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Notes != null && d.Notes.Contains(req.PaymentIntentId));
        if (existing != null)
            return Ok(new { message = "Donation already recorded.", donationId = existing.DonationId });

        var metaPhone = intent.Metadata != null && intent.Metadata.TryGetValue("donor_phone", out var phoneFromMeta)
            ? phoneFromMeta
            : null;
        var effectivePhone = !string.IsNullOrWhiteSpace(req.Phone) ? req.Phone : metaPhone;

        var supporter = await GetOrCreateSupporterAsync(req.FullName, req.Email, effectivePhone);
        var donation = await CreateDonationAsync(
            supporter.SupporterId,
            req.AmountUsd,
            req.IsRecurring,
            $"Stripe PI: {req.PaymentIntentId}. {req.Message ?? ""}".Trim()
        );

        _logger.LogInformation("Recorded Stripe donation {PaymentIntentId} as donation {DonationId}", req.PaymentIntentId, donation.DonationId);
        return Ok(new { message = "Donation recorded.", donationId = donation.DonationId });
    }

    [HttpPost("record-checkout-success")]
    public async Task<IActionResult> RecordCheckoutSuccess([FromBody] RecordCheckoutSuccessRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.SessionId))
            return BadRequest(new { message = "Missing checkout session id." });

        var stripeSecret = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(stripeSecret))
            return StatusCode(500, new { message = "Stripe is not configured on the server." });

        StripeConfiguration.ApiKey = stripeSecret;
        var sessionService = new SessionService();
        var session = await sessionService.GetAsync(req.SessionId);

        if (!string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Checkout session is not paid." });

        var existing = await _db.Donations
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Notes != null && d.Notes.Contains(req.SessionId));
        if (existing != null)
            return Ok(new { message = "Donation already recorded.", donationId = existing.DonationId });

        var metaAmount = session.Metadata != null && session.Metadata.TryGetValue("amount_usd", out var v) ? v : null;
        var amountUsd = decimal.TryParse(metaAmount, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : ((session.AmountTotal ?? 0) / 100m);
        var fullName = session.Metadata != null && session.Metadata.TryGetValue("donor_name", out var dn) ? dn : null;
        var email = session.CustomerDetails?.Email ?? (session.Metadata != null && session.Metadata.TryGetValue("donor_email", out var de) ? de : null);
        var phone = session.CustomerDetails?.Phone ?? (session.Metadata != null && session.Metadata.TryGetValue("donor_phone", out var dp) ? dp : null);
        var message = session.Metadata != null && session.Metadata.TryGetValue("message", out var dm) ? dm : null;

        var supporter = await GetOrCreateSupporterAsync(fullName, email, phone);
        var donation = await CreateDonationAsync(
            supporter.SupporterId,
            amountUsd,
            true,
            $"Stripe Checkout Session: {req.SessionId}. {message ?? ""}".Trim()
        );

        return Ok(new { message = "Recurring donation recorded.", donationId = donation.DonationId });
    }

    private async Task<Supporter> GetOrCreateSupporterAsync(string? fullNameRaw, string? emailRaw, string? phoneRaw)
    {
        var email = emailRaw?.Trim();
        var fullName = string.IsNullOrWhiteSpace(fullNameRaw) ? "Anonymous Donor" : fullNameRaw.Trim();
        var phone = phoneRaw?.Trim();

        var supporter = await _db.Supporters.FirstOrDefaultAsync(s => s.Email == email && s.Email != null);
        if (supporter != null)
        {
            if (!string.IsNullOrWhiteSpace(phone) && !string.Equals(supporter.Phone, phone, StringComparison.Ordinal))
            {
                supporter.Phone = phone;
                await _db.SaveChangesAsync();
            }
            return supporter;
        }

        var nameParts = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        supporter = new Supporter
        {
            SupporterType = "MonetaryDonor",
            DisplayName = fullName,
            FirstName = nameParts.Length > 0 ? nameParts[0] : "Anonymous",
            LastName = nameParts.Length > 1 ? nameParts[1] : "Donor",
            Email = email,
            Phone = phone,
            Status = "Active",
            Country = "USA",
            CreatedAt = DateTime.UtcNow,
            FirstDonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            AcquisitionChannel = "Stripe"
        };
        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync();
        return supporter;
    }

    private async Task<Donation> CreateDonationAsync(int supporterId, decimal amountUsd, bool isRecurring, string notes)
    {
        var donation = new Donation
        {
            SupporterId = supporterId,
            DonationType = "Monetary",
            DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            IsRecurring = isRecurring,
            ChannelSource = "Stripe",
            CurrencyCode = "PHP",
            Amount = amountUsd,
            Notes = notes
        };
        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return donation;
    }
}

public sealed class CreatePaymentIntentRequest
{
    public decimal AmountUsd { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Message { get; set; }
}

public sealed class RecordDonationRequest
{
    public string PaymentIntentId { get; set; } = "";
    public decimal AmountUsd { get; set; }
    public bool IsRecurring { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Message { get; set; }
}

public sealed class CreateRecurringSessionRequest
{
    public decimal AmountUsd { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Message { get; set; }
    public string SuccessUrl { get; set; } = "";
    public string CancelUrl { get; set; } = "";
}

public sealed class RecordCheckoutSuccessRequest
{
    public string SessionId { get; set; } = "";
}
