using Microsoft.EntityFrameworkCore;
using Resend;

public class ImpactEmailService
{
    private readonly IResend _resend;
    private readonly AppDbContext _db;

    public ImpactEmailService(IResend resend, AppDbContext db)
    {
        _resend = resend;
        _db = db;
    }

    public async Task SendImpactRecapAsync(int supporterId)
    {
        var supporter = await _db.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SupporterId == supporterId)
            ?? throw new InvalidOperationException($"Supporter {supporterId} not found.");

        if (string.IsNullOrWhiteSpace(supporter.Email))
            throw new InvalidOperationException("Supporter has no email address.");

        var donations = await _db.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId == supporterId)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();

        if (donations.Count == 0)
            throw new InvalidOperationException("Supporter has no donations to recap.");

        var donationIds = donations.Select(d => d.DonationId).ToList();
        var allocations = await _db.DonationAllocations
            .AsNoTracking()
            .Where(a => donationIds.Contains(a.DonationId))
            .ToListAsync();

        var safehouseIds = allocations.Select(a => a.SafehouseId).Where(id => id != null).Distinct().ToList();
        var safehouses = await _db.Safehouses
            .AsNoTracking()
            .Where(s => safehouseIds.Contains(s.SafehouseId))
            .ToDictionaryAsync(s => s.SafehouseId);

        var frontendUrl = (Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5174").TrimEnd('/');
        var html = BuildHtml(supporter, donations, allocations, safehouses, frontendUrl);

        var fromAddress = Environment.GetEnvironmentVariable("EMAIL_FROM")
            ?? "Safira <onboarding@resend.dev>";

        // In test mode (no verified domain), Resend only allows sending to the
        // account owner's email. Override the To address with EMAIL_TEST_TO if set.
        var testTo = Environment.GetEnvironmentVariable("EMAIL_TEST_TO");
        var toAddress = !string.IsNullOrWhiteSpace(testTo) ? testTo : supporter.Email;

        var message = new EmailMessage
        {
            From = fromAddress,
            To = { toAddress },
            Subject = $"Your impact at Safira, {supporter.DisplayName?.Split(' ')[0] ?? "friend"}",
            HtmlBody = html,
        };

        var bcc = Environment.GetEnvironmentVariable("EMAIL_BCC");
        if (!string.IsNullOrWhiteSpace(bcc) && bcc != toAddress)
            message.Bcc.Add(bcc);

        await _resend.EmailSendAsync(message);
    }

    private static string BuildHtml(
        Supporter supporter,
        List<Donation> donations,
        List<DonationAllocation> allocations,
        Dictionary<int, Safehouse> safehouses,
        string frontendUrl)
    {
        var firstName = supporter.DisplayName?.Split(' ')[0] ?? "friend";

        var currency = donations.FirstOrDefault(d => d.CurrencyCode != null)?.CurrencyCode ?? "PHP";
        var symbol = currency == "PHP" ? "₱" : "$";

        // Build a lookup: donationId -> (safehouse city, program area)
        var donationAllocationInfo = allocations
            .GroupBy(a => a.DonationId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var city = g
                        .Where(a => a.SafehouseId != null && safehouses.ContainsKey(a.SafehouseId.Value))
                        .Select(a => safehouses[a.SafehouseId!.Value].City)
                        .Where(c => !string.IsNullOrEmpty(c))
                        .Distinct()
                        .FirstOrDefault() ?? "—";
                    var area = g
                        .Select(a => a.ProgramArea)
                        .Where(p => !string.IsNullOrEmpty(p))
                        .Distinct()
                        .FirstOrDefault() ?? "—";
                    return (city, area);
                });

        // Donations table rows
        var tableRows = new System.Text.StringBuilder();
        foreach (var d in donations)
        {
            var value = d.Amount ?? d.EstimatedValue;
            var valueStr = value.HasValue ? $"{symbol}{value.Value:N0}" : "—";

            var (sh, area) = donationAllocationInfo.TryGetValue(d.DonationId, out var info)
                ? info
                : ("—", "—");

            tableRows.Append($@"
            <tr>
              <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;white-space:nowrap;'>{d.DonationDate:MMM d, yyyy}</td>
              <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;text-align:right;white-space:nowrap;'>{valueStr}</td>
              <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;'>{sh}</td>
              <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;'>{area}</td>
            </tr>");
        }

        var heroImageUrl = $"{frontendUrl}/homepage/1.jpg";
        var sinceStr = supporter.FirstDonationDate.HasValue
            ? supporter.FirstDonationDate.Value.ToString("MMMM yyyy")
            : "you joined";

        return $@"<!DOCTYPE html>
<html lang='en'>
<head><meta charset='UTF-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/></head>
<body style='margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,""Segoe UI"",Roboto,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;padding:40px 16px;'>
    <tr><td align='center'>
      <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>

        <!-- Header -->
        <tr>
          <td style='background:#0ea5e9;border-radius:12px 12px 0 0;padding:24px 40px;text-align:center;'>
            <h1 style='margin:0;color:#fff;font-size:24px;font-weight:700;'>Your Impact at Safira</h1>
            <p style='margin:8px 0 0;color:#e0f2fe;font-size:14px;'>A personal recap for {firstName}</p>
          </td>
        </tr>

        <!-- Hero image -->
        <tr>
          <td style='line-height:0;'>
            <img src='{heroImageUrl}' alt='Safira'
                 width='600' style='display:block;width:100%;max-width:600px;height:220px;object-fit:cover;' />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style='background:#fff;padding:40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;'>

            <p style='margin:0 0 28px;color:#334155;font-size:15px;line-height:1.6;'>
              Hi {firstName},<br/><br/>
              We wanted to take a moment to say <strong>thank you</strong> — and to show you exactly
              what your generosity has made possible for the girls in our care.
              Below is a summary of your {donations.Count} gift{(donations.Count != 1 ? "s" : "")} since {sinceStr}.
            </p>

            <!-- Donations table -->
            <h2 style='font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px;'>Your donation history</h2>
            <table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;'>
              <thead>
                <tr style='background:#f8fafc;'>
                  <th style='padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0;'>Date</th>
                  <th style='padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0;'>Amount</th>
                  <th style='padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0;'>Safehouse</th>
                  <th style='padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0;'>Program Area</th>
                </tr>
              </thead>
              <tbody>
                {tableRows}
              </tbody>
            </table>

            <p style='margin:32px 0 0;color:#334155;font-size:15px;line-height:1.6;'>
              Every peso, every hour, every item you've given has gone directly to safe housing,
              trauma-informed care, and education for girls who need it most. You are part of their story.
            </p>

            <!-- CTA -->
            <div style='text-align:center;margin:36px 0 0;'>
              <a href='https://frontend-theta-orcin-86.vercel.app/donate'
                 style='display:inline-block;background:#0ea5e9;color:#fff;font-weight:700;font-size:15px;
                        padding:14px 32px;border-radius:8px;text-decoration:none;'>
                Give Again &rarr;
              </a>
            </div>

            <hr style='margin:36px 0;border:none;border-top:1px solid #f1f5f9;'/>
            <p style='margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;'>
              Safira Foundation &bull; Making safe spaces for girls in crisis<br/>
              You're receiving this because you're a registered donor.
            </p>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";
    }
}
