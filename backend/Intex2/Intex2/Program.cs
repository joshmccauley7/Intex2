using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Load .env file in development
if (builder.Environment.IsDevelopment())
{
    var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
    if (File.Exists(envPath))
    {
        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#'))
                continue;
            var parts = trimmed.Split('=', 2);
            if (parts.Length == 2)
                Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
        }
    }
}

var rawUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DATABASE_URL environment variable is not set.");

// Convert postgresql:// URI to Npgsql key=value format
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

    // Railway and most hosted Postgres require TLS from local dev machines
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

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
