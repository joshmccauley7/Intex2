using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly AppDbContext _db;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        AppDbContext db)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _db = db;
    }

    // GET /api/auth/me
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
            return Ok(new { isAuthenticated = false, userName = (string?)null, roles = Array.Empty<string>() });

        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Ok(new { isAuthenticated = false, userName = (string?)null, roles = Array.Empty<string>() });

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            isAuthenticated = true,
            userName = user.UserName,
            roles = roles.OrderBy(r => r).Distinct().ToArray()
        });
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _signInManager.PasswordSignInAsync(
            request.UserName, request.Password,
            isPersistent: request.RememberMe,
            lockoutOnFailure: false);

        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid username or password." });

        var user = await _userManager.FindByNameAsync(request.UserName);
        var roles = user != null ? await _userManager.GetRolesAsync(user) : Array.Empty<string>();

        return Ok(new
        {
            isAuthenticated = true,
            userName = user?.UserName,
            roles = roles.OrderBy(r => r).Distinct().ToArray()
        });
    }

    // POST /api/auth/logout
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok(new { message = "Logged out." });
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        if (request.Password != request.ConfirmPassword)
            return BadRequest(new { message = "Passwords do not match." });

        var user = new ApplicationUser
        {
            UserName = request.Email.Trim().ToLowerInvariant(),
            Email = request.Email.Trim().ToLowerInvariant()
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToArray();
            return BadRequest(new { message = string.Join(" ", errors), errors });
        }

        await _userManager.AddToRoleAsync(user, AdminSeeder.DonorRole);

        // Auto sign-in after registration
        await _signInManager.SignInAsync(user, isPersistent: false);

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            isAuthenticated = true,
            userName = user.UserName,
            roles = roles.OrderBy(r => r).Distinct().ToArray()
        });
    }

    // GET /api/auth/my-donations
    [HttpGet("my-donations")]
    [Authorize]
    public async Task<IActionResult> MyDonations()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var email = user.Email;
        if (string.IsNullOrWhiteSpace(email))
            return Ok(new { supporter = (object?)null, donations = Array.Empty<object>() });

        var supporter = await _db.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Email == email);

        if (supporter == null)
            return Ok(new { supporter = (object?)null, donations = Array.Empty<object>() });

        var donations = await _db.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId == supporter.SupporterId)
            .OrderByDescending(d => d.DonationDate)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.DonationType,
                d.Amount,
                d.CurrencyCode,
                d.IsRecurring,
                d.CampaignName,
                d.ChannelSource,
                d.Notes
            })
            .ToListAsync();

        return Ok(new
        {
            supporter = new
            {
                supporter.SupporterId,
                supporter.DisplayName,
                supporter.Email,
                supporter.FirstDonationDate,
                supporter.Status
            },
            donations
        });
    }
}

public record LoginRequest(string UserName, string Password, bool RememberMe = false);

public sealed class RegisterRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string ConfirmPassword { get; set; } = "";
    public string? FullName { get; set; }
}
