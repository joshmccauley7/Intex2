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
        var password = config["AdminSeed:Password"] ?? "Admin1234!admin";

        var existing = await userManager.FindByNameAsync(username);
        if (existing == null)
        {
            var user = new ApplicationUser { UserName = username, Email = email };
            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, AdminRole);
        }
        else if (!await userManager.IsInRoleAsync(existing, AdminRole))
        {
            await userManager.AddToRoleAsync(existing, AdminRole);
        }
    }
}
