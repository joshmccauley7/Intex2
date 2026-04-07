using Microsoft.AspNetCore.Identity;

public static class AdminSeeder
{
    public const string AdminRole = "admin";
    public const string DonorRole = "donor";

    public static async Task SeedAsync(IServiceProvider services, IConfiguration config)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Ensure roles exist
        if (!await roleManager.RoleExistsAsync(AdminRole))
            await roleManager.CreateAsync(new IdentityRole(AdminRole));

        if (!await roleManager.RoleExistsAsync(DonorRole))
            await roleManager.CreateAsync(new IdentityRole(DonorRole));

        // Seed admin user from config (or defaults)
        var username = config["AdminSeed:UserName"] ?? "admin";
        var email    = config["AdminSeed:Email"]    ?? "admin@safira.org";
        var password = config["AdminSeed:Password"] ?? "adminadminadmin";

        var existing = await userManager.FindByNameAsync(username);
        if (existing == null)
        {
            var user = new ApplicationUser { UserName = username, Email = email };
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                throw new Exception($"AdminSeeder failed to create admin user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            await userManager.AddToRoleAsync(user, AdminRole);
        }
        else
        {
            // Always reset password on startup so config changes take effect
            var token = await userManager.GeneratePasswordResetTokenAsync(existing);
            var resetResult = await userManager.ResetPasswordAsync(existing, token, password);
            if (!resetResult.Succeeded)
                throw new Exception($"AdminSeeder failed to reset admin password: {string.Join(", ", resetResult.Errors.Select(e => e.Description))}");

            if (!await userManager.IsInRoleAsync(existing, AdminRole))
                await userManager.AddToRoleAsync(existing, AdminRole);
        }
    }
}
