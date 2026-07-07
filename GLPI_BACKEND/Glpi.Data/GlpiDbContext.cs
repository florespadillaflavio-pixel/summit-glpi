using Glpi.Entities.Entities;
using Glpi.Framework.Auth;
using Microsoft.EntityFrameworkCore;

namespace Glpi.Data;

public class GlpiDbContext : DbContext
{
    private readonly ITenantService _tenantService;

    public GlpiDbContext(DbContextOptions<GlpiDbContext> options, ITenantService tenantService)
        : base(options)
    {
        _tenantService = tenantService;
    }

    public DbSet<Company> Companies { get; set; }
    public DbSet<UserAccount> Users { get; set; }
    public DbSet<UserSession> UserSessions { get; set; }
    public DbSet<CatalogGroup> CatalogGroups { get; set; }
    public DbSet<CatalogItem> CatalogItems { get; set; }
    public DbSet<Ticket> Tickets { get; set; }
    public DbSet<TicketCategory> TicketCategories { get; set; }
    public DbSet<TicketComment> TicketComments { get; set; }
    public DbSet<TicketRelation> TicketRelations { get; set; }
    public DbSet<TicketSurvey> TicketSurveys { get; set; }
    public DbSet<TicketKbLink> TicketKbLinks { get; set; }
    public DbSet<TicketView> TicketViews { get; set; }
    public DbSet<SlaPolicy> SlaPolicies { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<AssetModel> AssetModels { get; set; }
    public DbSet<AssetAssignment> AssetAssignments { get; set; }
    public DbSet<AssetMaintenance> AssetMaintenances { get; set; }
    public DbSet<Location> Locations { get; set; }
    public DbSet<Manufacturer> Manufacturers { get; set; }
    public DbSet<KbCategory> KbCategories { get; set; }
    public DbSet<KbArticle> KbArticles { get; set; }
    public DbSet<Contract> Contracts { get; set; }
    public DbSet<ContractAsset> ContractAssets { get; set; }
    public DbSet<Module> Modules { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<ScheduledReport> ScheduledReports { get; set; }
    public DbSet<ScheduledReportLog> ScheduledReportLogs { get; set; }
    public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
    public DbSet<NotificationLog> NotificationLogs { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<ExceptionLog> ExceptionLogs { get; set; }
    public DbSet<TenantConfig> TenantConfigs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global Query Filters for Multitenancy
        modelBuilder.Entity<UserAccount>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<CatalogGroup>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<CatalogItem>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<Ticket>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<TicketCategory>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<TicketComment>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<TicketRelation>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<TicketSurvey>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<TicketKbLink>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<TicketView>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<SlaPolicy>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<Asset>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<AssetModel>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<AssetAssignment>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<AssetMaintenance>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<Location>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<Manufacturer>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<KbCategory>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<KbArticle>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<Contract>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<ContractAsset>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<Role>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<UserRole>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<RolePermission>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<ScheduledReport>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<NotificationTemplate>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);
        modelBuilder.Entity<TenantConfig>().HasQueryFilter(e => e.CompanyId == _tenantService.CompanyId);

        // Snake_case mapping
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }
        }
    }

    private string ToSnakeCase(string str)
    {
        return string.Concat(str.Select((x, i) => i > 0 && char.IsUpper(x) ? "_" + x.ToString() : x.ToString())).ToLower();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is MultitenantEntity && (e.State == EntityState.Added || e.State == EntityState.Modified));

        foreach (var entityEntry in entries)
        {
            var entity = (MultitenantEntity)entityEntry.Entity;
            if (entityEntry.State == EntityState.Added)
            {
                if (entity.CompanyId == Guid.Empty)
                {
                    entity.CompanyId = _tenantService.CompanyId;
                }
                entity.CreatedAt = DateTime.UtcNow;
            }
            entity.UpdatedAt = DateTime.UtcNow;
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
