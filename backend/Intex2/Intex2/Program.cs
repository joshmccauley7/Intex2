using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ─── Load .env in development ───────────────────────────────────────────────
if (builder.Environment.IsDevelopment())
{
    var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
    if (File.Exists(envPath))
    {
        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#')) continue;
            var parts = trimmed.Split('=', 2);
            if (parts.Length == 2)
                Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
        }
    }
}

// ─── Main app database (PostgreSQL) ─────────────────────────────────────────
var rawUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DATABASE_URL environment variable is not set.");

string connectionString;
if (rawUrl.StartsWith("postgresql://") || rawUrl.StartsWith("postgres://"))
{
    var uri = new Uri(rawUrl);
    var userInfo = uri.UserInfo;
    var colon = userInfo.IndexOf(':');
    var username = colon >= 0 ? userInfo[..colon] : userInfo;
    var password = colon >= 0 ? userInfo[(colon + 1)..] : "";
    var port = uri.Port > 0 ? uri.Port : 5432;
    var database = uri.AbsolutePath.TrimStart('/');
    connectionString = $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password}";

    var local = uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || uri.Host.Equals("127.0.0.1");
    if (!local)
        connectionString += ";SSL Mode=Require;Trust Server Certificate=true";
}
else
{
    connectionString = rawUrl;
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ─── Identity database (PostgreSQL — same server as app DB) ──────────────────
builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
    options.UseNpgsql(connectionString));

// ─── ASP.NET Core Identity ───────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    // Passphrase policy per IS 414 Video 7 — length only, no complexity rules
    options.Password.RequiredLength = 14;
    options.Password.RequireUppercase = false;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
})
.AddEntityFrameworkStores<AuthIdentityDbContext>()
.AddDefaultTokenProviders();

// ─── Auth cookie settings ────────────────────────────────────────────────────
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    // SameSite=None is required for cross-domain fetch (Vercel frontend → Railway backend).
    // None only works with Secure=true, which is already enforced in production below.
    options.Cookie.SameSite = builder.Environment.IsDevelopment()
        ? SameSiteMode.Lax
        : SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.LoginPath = "/login";
    // Return 401 for API calls instead of redirecting
    options.Events.OnRedirectToLogin = ctx =>
    {
        if (ctx.Request.Path.StartsWithSegments("/api"))
        {
            ctx.Response.StatusCode = 401;
            return Task.CompletedTask;
        }
        ctx.Response.Redirect(ctx.RedirectUri);
        return Task.CompletedTask;
    };
});

// ─── Authorization policies ──────────────────────────────────────────────────
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(AdminSeeder.AdminRole));
});

// ─── HttpClient (for proxying to Python prediction API) ──────────────────────
builder.Services.AddHttpClient();

// ─── Controllers ─────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddOpenApi();

// ─── CORS (must allow credentials for cookie auth) ───────────────────────────
// In production, set the ALLOWED_ORIGINS environment variable in Railway to a
// comma-separated list of allowed origins, e.g.:
//   https://your-app.vercel.app,https://your-custom-domain.com
var allowedOrigins =
    (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") is { Length: > 0 } envOrigins
        ? envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        : null)
    ?? builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://localhost:5174" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ─── Build ────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── Seed admin user ──────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var identityCtx = scope.ServiceProvider.GetRequiredService<AuthIdentityDbContext>();
    identityCtx.Database.Migrate();
    await AdminSeeder.SeedAsync(scope.ServiceProvider, builder.Configuration);
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

// ─── HSTS (production only) ───────────────────────────────────────────────────
if (!app.Environment.IsDevelopment())
    app.UseHsts();

app.UseCors();
app.UseHttpsRedirection();

// ─── Security headers ─────────────────────────────────────────────────────────
app.Use(async (ctx, next) =>
{
    // Content-Security-Policy — skip in dev so Vite HMR and Swagger still work
    if (!app.Environment.IsDevelopment())
    {
        ctx.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none';";
    }

    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    await next();
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
