using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();
    public DbSet<DonorChurnPrediction> DonorChurnPredictions => Set<DonorChurnPrediction>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
}
