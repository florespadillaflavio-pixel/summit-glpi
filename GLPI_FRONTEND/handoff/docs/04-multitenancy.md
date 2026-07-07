# Multitenancy en Summit GLPI

Cómo funciona el aislamiento de datos por empresa cliente, paso a paso.

---

## El problema

Una sola instancia de Summit GLPI sirve a múltiples clientes:

```
Summit Consulting (owner)
  ├── Minera Andina S.A.        ← tenant 1
  ├── Banco del Sur             ← tenant 2
  ├── Inversiones Norte         ← tenant 3
  └── ...
```

Cada uno debe ver SOLO sus tickets, activos, usuarios, etc. **Cero filtraciones**.

---

## La solución: `company_id` en cada tabla

Cada tabla de negocio tiene una columna `company_id UUID NOT NULL`.
Toda query DEBE filtrar por ella. Lo enforce-amos en EF Core, no a mano.

```sql
-- ✅ Bien
SELECT * FROM ticket WHERE company_id = $1 AND is_active = TRUE;

-- ❌ Nunca
SELECT * FROM ticket WHERE is_active = TRUE;
```

---

## Implementación en .NET

### 1. Marca las entidades

```csharp
public interface ITenantOwned
{
    Guid CompanyId { get; set; }
}

public class Ticket : ITenantOwned
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Subject { get; set; }
    // ...
}
```

### 2. Tenant context (scoped)

```csharp
public interface ITenantContext
{
    Guid CompanyId { get; }
    Guid UserId { get; }
    bool IsOwner { get; }
    string[] Permissions { get; }
}

public class TenantContext : ITenantContext
{
    public Guid CompanyId { get; init; }
    public Guid UserId { get; init; }
    public bool IsOwner { get; init; }
    public string[] Permissions { get; init; }
}
```

### 3. Middleware que lo llena desde el JWT

```csharp
public class TenantContextMiddleware
{
    public async Task InvokeAsync(HttpContext ctx, ITenantContext tenantCtx)
    {
        if (ctx.User?.Identity?.IsAuthenticated == true)
        {
            var companyId = Guid.Parse(ctx.User.FindFirst("tenant_id")!.Value);
            var userId    = Guid.Parse(ctx.User.FindFirst("sub")!.Value);
            var isOwner   = ctx.User.FindFirst("is_owner")?.Value == "true";
            var perms     = ctx.User.FindAll("permission").Select(c => c.Value).ToArray();

            ((TenantContext)tenantCtx).Apply(companyId, userId, isOwner, perms);
        }
        await _next(ctx);
    }
}
```

### 4. Global Query Filter en EF Core

```csharp
public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public AppDbContext(DbContextOptions opts, ITenantContext tenant) : base(opts)
    {
        _tenant = tenant;
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Auto-aplica filtro a TODA entidad que implemente ITenantOwned
        foreach (var entity in b.Model.GetEntityTypes())
        {
            if (typeof(ITenantOwned).IsAssignableFrom(entity.ClrType))
            {
                var parameter = Expression.Parameter(entity.ClrType, "e");
                var prop = Expression.Property(parameter, nameof(ITenantOwned.CompanyId));
                var tenantId = Expression.Property(
                    Expression.Constant(_tenant),
                    nameof(ITenantContext.CompanyId)
                );
                var body = Expression.Equal(prop, tenantId);
                var lambda = Expression.Lambda(body, parameter);
                b.Entity(entity.ClrType).HasQueryFilter(lambda);
            }
        }
    }
}
```

Resultado: cualquier `dbContext.Tickets.ToListAsync()` filtra automáticamente.

### 5. Interceptor para INSERTs

```csharp
public class TenantInsertInterceptor : SaveChangesInterceptor
{
    private readonly ITenantContext _tenant;

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct)
    {
        foreach (var entry in eventData.Context!.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added && entry.Entity is ITenantOwned owned)
            {
                if (owned.CompanyId == Guid.Empty)
                    owned.CompanyId = _tenant.CompanyId;
            }
        }
        return base.SavingChangesAsync(eventData, result, ct);
    }
}
```

### 6. Registrar todo en `Program.cs`

```csharp
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddDbContext<AppDbContext>((sp, opts) =>
{
    opts.UseNpgsql(connectionString)
        .UseSnakeCaseNamingConvention()
        .AddInterceptors(sp.GetRequiredService<TenantInsertInterceptor>(),
                         sp.GetRequiredService<AuditSaveChangesInterceptor>());
});

app.UseAuthentication();
app.UseMiddleware<TenantContextMiddleware>();
app.UseAuthorization();
```

---

## Excepciones (cross-tenant)

El usuario `is_owner = TRUE` de Summit Consulting puede ver datos de cualquier tenant.

### Endpoint impersonation

```csharp
app.MapGet("/owner/tenants/{tenantId}/dashboard", async (
    Guid tenantId,
    ITenantContext tenant,
    AppDbContext db) =>
{
    if (!tenant.IsOwner)
        return Results.Forbid();

    // Pasar por alto el filtro solo en este endpoint
    var data = await db.Tickets
        .IgnoreQueryFilters()
        .Where(t => t.CompanyId == tenantId)
        .ToListAsync();

    return Results.Ok(data);
});
```

### Análitica global

La consultora dueña ve métricas agregadas con `.IgnoreQueryFilters()`,
PERO el resto del sistema sigue restringido.

---

## Validación adicional (paranoia justificada)

### Filtro en service layer

NUNCA confíes solo en el query filter. Validá explícitamente que las FKs
referencien rows del mismo tenant:

```csharp
public async Task<Ticket> CreateAsync(CreateTicketDto dto)
{
    // Verificar que el activo referenciado es del mismo tenant
    var assetExists = await _db.Assets
        .AnyAsync(a => a.Id == dto.AssetId);  // ← el filter ya restringe

    if (!assetExists)
        throw new ValidationException("Activo no encontrado en este tenant");

    // ... crear ticket
}
```

### Row-Level Security (opcional, futuro)

Postgres soporta RLS nativo. Cuando el negocio crezca:

```sql
ALTER TABLE ticket ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON ticket
    USING (company_id = current_setting('app.current_tenant')::uuid);
```

Y desde .NET, antes de cada query:

```csharp
await db.Database.ExecuteSqlAsync(
    $"SET LOCAL app.current_tenant = {_tenant.CompanyId}"
);
```

**Defensa en profundidad** — incluso si tu código tiene un bug, Postgres rechaza la query.

---

## Tests obligatorios

Cada repository/service debe tener un test que verifique aislamiento:

```csharp
[Fact]
public async Task GetTickets_FiltrаByTenant()
{
    // Arrange: 2 tenants con 1 ticket cada uno
    var tenantA = await SeedTenant("A");
    var tenantB = await SeedTenant("B");

    // Act: contexto del tenant A
    using var scope = CreateScopeForTenant(tenantA);
    var svc = scope.ServiceProvider.GetRequiredService<TicketService>();
    var result = await svc.GetAllAsync();

    // Assert
    Assert.Single(result);
    Assert.All(result, t => Assert.Equal(tenantA, t.CompanyId));
}
```

---

## Checklist por cada feature nueva

- [ ] La entidad implementa `ITenantOwned`
- [ ] La migration agrega `company_id NOT NULL`
- [ ] La migration crea índice `idx_xxx_company` en `company_id`
- [ ] La FK a otras tablas valida mismo tenant
- [ ] Tests verifican aislamiento entre tenants
- [ ] Si es endpoint cross-tenant, requiere claim `is_owner=true`
