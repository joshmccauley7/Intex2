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

        // Aggregate monetary total
        var monetary = donations
            .Where(d => d.DonationType?.ToLower() is "monetary" or "cash" or "financial")
            .Sum(d => d.Amount ?? 0);

        // Time/skills hours
        var hours = donations
            .Where(d => d.DonationType?.ToLower() is "time" or "skills")
            .Sum(d => d.EstimatedValue ?? d.Amount ?? 0);

        // In-kind items
        var items = donations
            .Where(d => d.DonationType?.ToLower() is "inkind" or "in-kind" or "in kind")
            .Sum(d => d.EstimatedValue ?? 0);

        // Per-safehouse breakdown
        var safehouseGroups = allocations
            .Where(a => a.SafehouseId != null && safehouses.ContainsKey(a.SafehouseId.Value))
            .GroupBy(a => a.SafehouseId!.Value)
            .Select(g =>
            {
                var sh = safehouses[g.Key];
                var areas = g.Select(a => a.ProgramArea ?? "General").Distinct().ToList();
                var allocated = g.Sum(a => a.AmountAllocated ?? 0);
                var imgUrl = $"{frontendUrl}/safehouses/Phil_lighthouse_{sh.SafehouseId}.jpg";
                return new { sh.City, sh.Name, sh.SafehouseId, Areas = areas, Allocated = allocated, ImgUrl = imgUrl };
            })
            .OrderByDescending(x => x.Allocated)
            .ToList();

        var currency = donations.FirstOrDefault(d => d.CurrencyCode != null)?.CurrencyCode ?? "PHP";
        var symbol = currency == "PHP" ? "₱" : "$";

        var safehouseCards = string.Join("", safehouseGroups.Select(s =>
        {
            var areaList = string.Join(" &bull; ", s.Areas);
            var amtStr = s.Allocated > 0 ? $"<p style='margin:6px 0 0;color:#0ea5e9;font-weight:700;font-size:14px;'>{symbol}{s.Allocated:N0} allocated</p>" : "";
            return $@"
              <td style='width:50%;padding:6px;vertical-align:top;'>
                <div style='border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;'>
                  <img src='{s.ImgUrl}' alt='{s.City} safehouse'
                       width='100%' style='display:block;width:100%;height:140px;object-fit:cover;' />
                  <div style='padding:12px;'>
                    <p style='margin:0;font-weight:700;color:#0f172a;font-size:14px;'>{s.City} Safehouse</p>
                    <p style='margin:4px 0 0;color:#64748b;font-size:12px;'>{areaList}</p>
                    {amtStr}
                  </div>
                </div>
              </td>";
        }));

        var summaryItems = new System.Text.StringBuilder();
        if (monetary > 0)
            summaryItems.Append($"<li style='margin-bottom:6px;'><strong style='color:#0f172a;'>{symbol}{monetary:N0}</strong> in direct financial support</li>");
        if (hours > 0)
            summaryItems.Append($"<li style='margin-bottom:6px;'><strong style='color:#0f172a;'>{(int)Math.Ceiling(hours)}</strong> hours of skilled time donated</li>");
        if (items > 0)
            summaryItems.Append($"<li style='margin-bottom:6px;'><strong style='color:#0f172a;'>{(int)Math.Ceiling(items)}</strong> in-kind items provided</li>");

        var safehouseSection = safehouseCards.Length > 0 ? $@"
          <h2 style='font-size:16px;font-weight:700;color:#0f172a;margin:32px 0 12px;'>Where your giving went</h2>
          <table width='100%' cellpadding='0' cellspacing='0'>
            <tr>{safehouseCards}</tr>
          </table>" : "";

        return $@"<!DOCTYPE html>
<html lang='en'>
<head><meta charset='UTF-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/></head>
<body style='margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,""Segoe UI"",Roboto,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;padding:40px 16px;'>
    <tr><td align='center'>
      <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>

        <!-- Header -->
        <tr>
          <td style='background:#0ea5e9;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;'>
            <h1 style='margin:0;color:#fff;font-size:24px;font-weight:700;'>Your Impact at Safira</h1>
            <p style='margin:8px 0 0;color:#e0f2fe;font-size:14px;'>A personal recap for {firstName}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style='background:#fff;padding:40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;'>

            <p style='margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;'>
              Hi {firstName},<br/><br/>
              We wanted to take a moment to say <strong>thank you</strong> — and to show you exactly
              what your generosity has made possible for the girls in our care.
            </p>

            <h2 style='font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px;'>Your giving at a glance</h2>
            <ul style='margin:0 0 24px;padding-left:20px;color:#334155;font-size:15px;line-height:1.8;'>
              {summaryItems}
              <li style='margin-bottom:6px;'><strong style='color:#0f172a;'>{donations.Count}</strong> total gift{(donations.Count != 1 ? "s" : "")} since {(supporter.FirstDonationDate.HasValue ? supporter.FirstDonationDate.Value.ToString("MMMM yyyy") : "you joined")}</li>
            </ul>

            {safehouseSection}

            <p style='margin:32px 0 0;color:#334155;font-size:15px;line-height:1.6;'>
              Every peso, every hour, every item you've given has gone directly to safe housing,
              trauma-informed care, and education for girls who need it most. You are part of their story.
            </p>

            <!-- CTA -->
            <div style='text-align:center;margin:36px 0 0;'>
              <a href='https://safira.org/donate'
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
