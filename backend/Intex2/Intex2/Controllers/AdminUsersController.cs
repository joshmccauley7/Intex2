using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "AdminOnly")]
public class AdminUsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminUsersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/admin/users
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var users = await _userManager.Users.OrderBy(u => u.UserName).ToListAsync();

        var result = new List<object>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var matchesSearch = string.IsNullOrWhiteSpace(search)
                || (user.UserName?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false)
                || (user.Email?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false);

            if (matchesSearch)
            {
                result.Add(new
                {
                    id = user.Id,
                    userName = user.UserName,
                    email = user.Email,
                    roles = roles.OrderBy(r => r).ToArray()
                });
            }
        }

        return Ok(result);
    }

    // GET /api/admin/users/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            id = user.Id,
            userName = user.UserName,
            email = user.Email,
            roles = roles.OrderBy(r => r).ToArray()
        });
    }

    // POST /api/admin/users
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdminCreateUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email and password are required." });

        if (req.Password != req.ConfirmPassword)
            return BadRequest(new { message = "Passwords do not match." });

        var allowedRoles = new[] { AdminSeeder.AdminRole, AdminSeeder.DonorRole };
        if (!allowedRoles.Contains(req.Role))
            return BadRequest(new { message = $"Role must be '{AdminSeeder.AdminRole}' or '{AdminSeeder.DonorRole}'." });

        var user = new ApplicationUser
        {
            UserName = req.Email.Trim().ToLowerInvariant(),
            Email = req.Email.Trim().ToLowerInvariant()
        };

        var result = await _userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToArray();
            return BadRequest(new { message = string.Join(" ", errors), errors });
        }

        await _userManager.AddToRoleAsync(user, req.Role);

        var roles = await _userManager.GetRolesAsync(user);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new
        {
            id = user.Id,
            userName = user.UserName,
            email = user.Email,
            roles = roles.OrderBy(r => r).ToArray()
        });
    }

    // PUT /api/admin/users/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] AdminUpdateUserRequest req)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        // Update email/username if changed
        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            var newEmail = req.Email.Trim().ToLowerInvariant();
            if (user.Email != newEmail)
            {
                user.Email = newEmail;
                user.UserName = newEmail;
                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    var errors = updateResult.Errors.Select(e => e.Description).ToArray();
                    return BadRequest(new { message = string.Join(" ", errors), errors });
                }
            }
        }

        // Update role if specified
        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            var allowedRoles = new[] { AdminSeeder.AdminRole, AdminSeeder.DonorRole };
            if (!allowedRoles.Contains(req.Role))
                return BadRequest(new { message = $"Role must be '{AdminSeeder.AdminRole}' or '{AdminSeeder.DonorRole}'." });

            var currentRoles = await _userManager.GetRolesAsync(user);
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
            await _userManager.AddToRoleAsync(user, req.Role);
        }

        // Update password if provided
        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            if (req.Password != req.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var pwResult = await _userManager.ResetPasswordAsync(user, token, req.Password);
            if (!pwResult.Succeeded)
            {
                var errors = pwResult.Errors.Select(e => e.Description).ToArray();
                return BadRequest(new { message = string.Join(" ", errors), errors });
            }
        }

        var finalRoles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            id = user.Id,
            userName = user.UserName,
            email = user.Email,
            roles = finalRoles.OrderBy(r => r).ToArray()
        });
    }

    // DELETE /api/admin/users/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var currentUser = await _userManager.GetUserAsync(User);
        if (currentUser?.Id == id)
            return BadRequest(new { message = "You cannot delete your own account." });

        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToArray();
            return BadRequest(new { message = string.Join(" ", errors), errors });
        }

        return NoContent();
    }
}

public sealed class AdminCreateUserRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string ConfirmPassword { get; set; } = "";
    public string Role { get; set; } = AdminSeeder.DonorRole;
}

public sealed class AdminUpdateUserRequest
{
    public string? Email { get; set; }
    public string? Role { get; set; }
    public string? Password { get; set; }
    public string? ConfirmPassword { get; set; }
}
