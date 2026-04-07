using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
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
}

public record LoginRequest(string UserName, string Password, bool RememberMe = false);
