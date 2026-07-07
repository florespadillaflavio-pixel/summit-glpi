# Arquitectura — Summit GLPI

Este documento describe **cómo está construido** Summit GLPI y por qué.
Si vas a hacer cambios estructurales, lee esto primero.

---

## 1. Visión general

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Angular 17 SPA                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Core        │  │  Features    │  │  Shared UI Kit            │  │
│  │  · Auth      │  │  · Tickets   │  │  · Button, Badge, Avatar  │  │
│  │  · HTTP      │  │  · CMDB      │  │  · DataTable, Tabs        │  │
│  │  · Guards    │  │  · KB        │  │  · Modal, Toast           │  │
│  │  · Tenant    │  │  · Admin     │  │                           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS · JSON · JWT Bearer
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    .NET 8 Minimal APIs                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Endpoints    │  │ Application  │  │ Infrastructure            │  │
│  │ (per module) │  │ (use cases)  │  │ · EF Core 8               │  │
│  │              │  │              │  │ · Audit interceptor       │  │
│  │ + Permission │  │ + Validators │  │ · Tenant filter           │  │
│  │   guards     │  │ + Mappers    │  │ · JWT issuer              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ Npgsql · async
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL 15+                                 │
│  · pgcrypto (bcrypt)     · pg_trgm (búsqueda)                       │
│  · Triggers updated_at   · Funciones fn_auth_*, fn_dashboard        │
│  · Schema multitenant por company_id en TODAS las tablas             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multitenancy

**Estrategia: shared schema, shared database** (un único schema, columna `company_id` en cada tabla).

### Por qué esta estrategia

- Una consultora pequeña/mediana no escala a 1000+ tenants.
- Un solo schema = un solo conjunto de migrations.
- Consultas cruzadas posibles para analytics globales (la consultora dueña).
- RLS de PostgreSQL puede sumarse encima sin reescribir nada.

### Cómo se enforce

1. **JWT lleva `tenant_id`** como claim (es el `company_id` del usuario).
2. **Middleware `TenantContextMiddleware`** lo extrae y lo guarda en
   `ITenantContext` (scoped).
3. **EF Core Global Query Filter** en `OnModelCreating`:

   ```csharp
   modelBuilder.Entity<Ticket>()
       .HasQueryFilter(t => t.CompanyId == _tenantContext.CompanyId);
   ```

4. Al hacer `INSERT`, un `SaveChangesInterceptor` setea `CompanyId` automáticamente
   en cualquier entidad que implemente `ITenantOwned`.

### Excepciones

- Tabla `company` y `module` NO tienen filtro de tenant (son globales).
- El usuario `is_owner` puede ver datos de cualquier tenant si tiene el permiso
  `OWNER_VIEW_ALL_TENANTS` (claim especial).

---

## 3. Autenticación y autorización

### Login flow

```
[Web]                       [API]                      [DB]
  │ POST /auth/login          │                          │
  │ {username, password}      │                          │
  ├──────────────────────────►│                          │
  │                           │ SELECT fn_auth_login()   │
  │                           ├─────────────────────────►│
  │                           │ verifica con pgcrypto    │
  │                           │◄─────────────────────────┤
  │                           │ {success, user_id, ...}  │
  │                           │                          │
  │                           │ SELECT fn_user_permissions(uid)
  │                           ├─────────────────────────►│
  │                           │◄─────────────────────────┤
  │                           │                          │
  │ {accessToken, refresh,    │                          │
  │  permissions[], tenant}   │                          │
  │◄──────────────────────────┤                          │
```

### JWT payload

```json
{
  "sub": "uuid-del-usuario",
  "tenant_id": "uuid-de-la-empresa",
  "username": "ealarcon@minera-andina.pe",
  "permissions": ["TICKET_VIEW","TICKET_CREATE","ASSET_VIEW", ...],
  "is_owner": false,
  "exp": 1730131200
}
```

- **Access token**: 15 min.
- **Refresh token**: 30 días, guardado en `user_session` (puede revocarse).
- Si `is_password_temporary = true`, el login responde 200 pero con flag
  `must_change_password` → el frontend redirige a `/auth/change-password`.

### Authorization (permisos atómicos)

NO chequees roles por nombre. Usa atributos:

```csharp
[RequirePermission("TICKET_DELETE")]
app.MapDelete("/tickets/{id}", DeleteTicketHandler);
```

El atributo lee `permissions[]` del JWT y devuelve 403 si falta.

En Angular, un directive `*hasPermission="'TICKET_DELETE'"` hace lo mismo.

---

## 4. Auditoría

### Interceptor automático

`AuditSaveChangesInterceptor` se engancha en `SaveChangesAsync` y emite un
`audit_log` por cada entidad con `[Auditable]`:

```csharp
[Auditable]
public class Ticket : ITenantOwned, ITrackable
{
    // ...
}
```

El interceptor diff-ea propiedades y persiste:

```json
{
  "action": "UPDATE",
  "entity_name": "ticket",
  "entity_id": "uuid",
  "old_values": { "status_item_id": "OPEN_uuid" },
  "new_values": { "status_item_id": "IN_PROGRESS_uuid" }
}
```

### Excepciones globales

Filter `ExceptionToLogFilter` captura cualquier excepción no manejada en endpoints
y la persiste en `exception_log` con `stack_trace`, `request_body` y `user_id`.

---

## 5. Catálogos dinámicos

Estados, prioridades, tipos no son `enum` en C#. Son rows en `catalog_item`.

### Cache

- Al login, el frontend hace GET `/catalogs/all` y lo guarda en `CatalogStore` (signal).
- Cada item incluye `id`, `code`, `name`, `color`, `icon`, `sort_order`.
- TTL: hasta logout. Un invalidate manual existe en el admin de catálogos.

### Patrón de uso

```typescript
// Service
readonly statuses = computed(() =>
  this.catalogs.byGroup('TICKET_STATUS')
);

// Component
<sm-badge [color]="status().color">{{ status().name }}</sm-badge>
```

NO hardcodees `"OPEN"`, `"IN_PROGRESS"` en plantillas. Si necesitás lógica especial
por estado, usa el `code` (que sí es estable).

---

## 6. SLA

Cuatro campos importantes en `ticket`:

| Campo | Cuándo se llena |
|---|---|
| `first_response_at` | Primer comentario público del agente |
| `resolved_at` | Cambio de estado a `RESOLVED` o `CLOSED` |
| `sla_breached` | Calculado al guardar — true si `now() > due_date` y `resolved_at IS NULL` |
| `due_date` | Calculado al crear el ticket sumando `sla_policy.resolution_time_min` |

Los reportes leen estos campos directamente, NO recalculan.

Un **job en background** (HostedService) corre cada 5 min y marca como `sla_breached = true`
los tickets cuya `due_date` ya pasó sin resolución, además de disparar notificación.

---

## 7. Notificaciones

Dos canales: `EMAIL` y `IN_APP` (más adelante: Slack/Teams).

Flujo: evento de dominio → `INotificationService.Send(template_code, recipients, data)`
→ inserta en `notification_log` con `status=PENDING` → un HostedService los procesa
y los envía por SMTP / WebSocket.

Plantillas en `notification_template` por tenant. Variables tipo `{{ticket.number}}`.

---

## 8. Búsquedas

- **Tickets**: `to_tsvector('spanish', subject || ' ' || description)` ya tiene índice GIN.
  Usar `plainto_tsquery` para búsqueda libre.
- **Activos**: igual, sobre `asset_tag + serial_number + notes`.
- **KB**: igual, sobre `title + content`.
- **Fuzzy**: `pg_trgm` ya está habilitado para typos (`similarity()`).

NO uses Elastic / Algolia salvo que el volumen lo justifique (>1M tickets).

---

## 9. Background jobs

Usá `IHostedService` o **Quartz.NET** para:

- SLA breach scanner (cada 5 min)
- Envío de notificaciones (cada 30s)
- Ejecución de `scheduled_report` según `frequency`
- Limpieza de `user_session` expiradas (diario)
- Recordatorios de contratos vencen ≤ `alert_days`

---

## 10. File storage

Adjuntos de tickets, actas de entrega de activos, documentos de contrato:

- **Dev/local**: filesystem en `/uploads/{company_id}/{entity}/{id}/{file}`
- **Prod**: MinIO o S3, mismo path
- BD guarda solo el path/URL (string en `attachments JSONB` o `document_url`)

Hash SHA256 del archivo para detectar duplicados.

---

## 11. Testing

- **Backend**: xUnit + WebApplicationFactory + Testcontainers (PostgreSQL real).
  Apuntar a un schema temporal por test class.
- **Frontend**: Jest + Testing Library Angular. E2E con Playwright para flujos críticos
  (login, crear ticket, asignar activo).

Cobertura mínima por módulo: **70%** en lógica de negocio.

---

## 12. CI/CD (sugerido)

- GitHub Actions:
  1. Lint + tests backend
  2. Lint + tests frontend
  3. Build Docker images
  4. Deploy a staging automático en merge a `main`
- Migrations EF aplicadas en startup con `dotnet ef database update` solo en staging/prod.
