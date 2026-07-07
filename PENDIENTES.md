# Summit GLPI — Lista de Pendientes

> Estado al 2026-05-14. Referencia para continuar el desarrollo del backend y conectar el frontend.

---

## 1. BASE DE DATOS

Ejecutar `GLPI_BACKEND/database_setup.sql` contra la instancia Neon PostgreSQL.  
Ese archivo crea todas las tablas, índices, triggers y funciones almacenadas que faltan.

**Tablas que NO existen aún y deben crearse:**

| Tabla | Descripción |
|-------|-------------|
| `module` | Módulos del sistema (Mesa de Ayuda, CMDB, etc.) |
| `permission` | Permisos atómicos (TICKET_VIEW, ASSET_EDIT…) |
| `role` | Roles (Admin, Técnico, Cliente, Supervisor) |
| `role_permission` | Relación N:M rol ↔ permiso |
| `user_role` | Relación N:M usuario ↔ rol |
| `user_session` | Sesiones activas con refresh token y device info |
| `ticket_category` | Categorías jerárquicas de tickets |
| `sla_policy` | Políticas SLA (tiempo respuesta / resolución por prioridad) |
| `ticket_comment` | Comentarios e interacciones del ticket (tipo: reply/note/activity) |
| `ticket_relation` | Relaciones entre tickets (duplicado, relacionado, padre/hijo) |
| `ticket_survey` | Encuestas de satisfacción post-cierre |
| `kb_category` | Categorías de la base de conocimiento |
| `kb_article` | Artículos de la base de conocimiento |
| `ticket_kb_link` | Vínculos ticket ↔ artículo KB |
| `location` | Ubicaciones físicas (campus, planta, oficina) |
| `manufacturer` | Fabricantes de activos |
| `asset_model` | Modelos de activos |
| `asset_assignment` | Asignaciones de activos a usuarios |
| `asset_maintenance` | Historial de mantenimiento de activos |
| `contract` | Contratos con proveedores |
| `contract_asset` | Relación N:M contrato ↔ activo |
| `scheduled_report` | Reportes programados |
| `scheduled_report_log` | Ejecuciones de reportes programados |
| `notification_template` | Plantillas de email/in-app |
| `notification_log` | Log de notificaciones enviadas |
| `audit_log` | Auditoría inmutable de cambios (quién, qué, cuándo) |
| `exception_log` | Log de errores del sistema |
| `tenant_config` | Configuración por empresa (SMTP, SLA defaults, etc.) |
| `ticket_view` | Vistas guardadas / filtros personalizados |

**Funciones almacenadas que deben existir:**

| Función | Descripción |
|---------|-------------|
| `fn_auth_login(email, password)` | Validación bcrypt + lockout + devuelve JWT payload |
| `fn_user_permissions(user_id, company_id)` | Devuelve array de permisos del usuario |
| `fn_user_profile(user_id, company_id)` | Devuelve perfil completo (nombre, rol, empresa, avatar) |
| `fn_dashboard(company_id)` | Devuelve KPIs y métricas del dashboard en JSON |

---

## 2. BACKEND — ENTIDADES FALTANTES (`Glpi.Entities`)

Los siguientes archivos de entidad `.cs` deben crearse en `Glpi.Entities/Entities/`:

```
Role.cs
Permission.cs
Module.cs
UserRole.cs
RolePermission.cs
UserSession.cs
TicketCategory.cs
SlaPolicy.cs
TicketComment.cs
TicketRelation.cs
TicketSurvey.cs
KbCategory.cs
KbArticle.cs
Location.cs
Manufacturer.cs
AssetModel.cs
AssetAssignment.cs
AssetMaintenance.cs
Contract.cs
ContractAsset.cs
AuditLog.cs
TenantConfig.cs
```

**DTOs faltantes** en `Glpi.Entities/DTOs/`:

```
TicketListDto.cs         — para la tabla de tickets (sin objetos anidados pesados)
TicketDetailDto.cs       — ticket completo con comentarios y activo
TicketCreateDto.cs       — campos necesarios para crear un ticket
TicketCommentDto.cs      — crear/leer comentarios
AssetDto.cs              — lista y detalle de activos
AssetCreateDto.cs
KbArticleDto.cs
KbArticleCreateDto.cs
ContractDto.cs
ContractCreateDto.cs
UserDto.cs               — lista y detalle de usuarios
UserCreateDto.cs
UserUpdateDto.cs
RoleDto.cs
RoleCreateDto.cs
PermissionDto.cs
CompanyDto.cs
CompanyCreateDto.cs
CatalogGroupDto.cs
CatalogItemDto.cs
DashboardDto.cs          — KPIs para el dashboard
AuditLogDto.cs
ReportQueryDto.cs        — parámetros para generar reportes
ChangePasswordDto.cs
```

---

## 3. BACKEND — REPOSITORIOS FALTANTES (`Glpi.Data/Repositories/`)

| Repositorio | Operaciones principales |
|-------------|------------------------|
| `TicketRepository.cs` | GetAll (filtros), GetById (con comentarios), Create, Update, AddComment, GetStats |
| `AssetRepository.cs` | GetAll, GetById, Create, Update, Delete, Assign, GetHistory |
| `KbRepository.cs` | GetCategories, SearchArticles, GetById, Create, Update, Delete, IncrementViews |
| `ContractRepository.cs` | GetAll, GetById, Create, Update, Expire |
| `UserRepository.cs` | GetAll, GetById, Create, Update, Activate/Deactivate, GetSessions |
| `RoleRepository.cs` | GetAll, GetById, Create, Update, Delete, GetPermissions, SetPermissions |
| `CompanyRepository.cs` | GetAll, GetById, Create, Update |
| `CatalogRepository.cs` | GetGroups, GetItems, CreateGroup, CreateItem, UpdateItem, DeleteItem |
| `AuditRepository.cs` | GetAll (con filtros), GetById |
| `ReportRepository.cs` | GetTicketMetrics, GetAssetMetrics, GetSlaMetrics, GetUserMetrics |
| `ConfigRepository.cs` | GetTenantConfig, UpdateTenantConfig |
| `DashboardRepository.cs` | GetKPIs (llama a fn_dashboard) |

---

## 4. BACKEND — LÓGICA DE NEGOCIO FALTANTE (`Glpi.Logic/`)

| Clase | Descripción |
|-------|-------------|
| `AssetLogic.cs` | CRUD activos, asignaciones, historial de mantenimiento |
| `KbLogic.cs` | Gestión de artículos KB, búsqueda full-text |
| `ContractLogic.cs` | CRUD contratos, alertas de vencimiento |
| `UserLogic.cs` | CRUD usuarios, cambio de rol, bloqueo/desbloqueo |
| `RoleLogic.cs` | CRUD roles, gestión de permisos |
| `CompanyLogic.cs` | CRUD empresas (multitenant) |
| `CatalogLogic.cs` | Catálogos de items (estados, prioridades, tipos) |
| `ReportLogic.cs` | Generar reportes, exportar CSV/PDF |
| `AuditLogic.cs` | Consultar log de auditoría con filtros |
| `ConfigLogic.cs` | Leer/actualizar configuración por tenant |
| `DashboardLogic.cs` | Obtener KPIs y métricas para dashboard |
| `NotificationLogic.cs` | Enviar notificaciones por email e in-app |

---

## 5. BACKEND — CONTROLADORES FALTANTES (`Glpi.API/Controllers/`)

| Controlador | Endpoints mínimos |
|-------------|-------------------|
| `AssetController.cs` | GET /api/asset · GET /api/asset/{id} · POST /api/asset · PUT /api/asset/{id} · DELETE /api/asset/{id} · POST /api/asset/{id}/assign |
| `KbController.cs` | GET /api/kb · GET /api/kb/{id} · POST /api/kb · PUT /api/kb/{id} · DELETE /api/kb/{id} · GET /api/kb/categories |
| `ContractController.cs` | GET /api/contract · GET /api/contract/{id} · POST /api/contract · PUT /api/contract/{id} |
| `UserController.cs` | GET /api/user · GET /api/user/{id} · POST /api/user · PUT /api/user/{id} · PATCH /api/user/{id}/status |
| `RoleController.cs` | GET /api/role · GET /api/role/{id} · POST /api/role · PUT /api/role/{id} · DELETE /api/role/{id} · PUT /api/role/{id}/permissions |
| `CompanyController.cs` | GET /api/company · GET /api/company/{id} · POST /api/company · PUT /api/company/{id} |
| `CatalogController.cs` | GET /api/catalog · GET /api/catalog/{group} · POST /api/catalog/item · PUT /api/catalog/item/{id} · DELETE /api/catalog/item/{id} |
| `ReportController.cs` | GET /api/report/tickets · GET /api/report/assets · GET /api/report/sla · GET /api/report/users · GET /api/report/export |
| `AuditController.cs` | GET /api/audit (con filtros: user, entity, action, dateFrom, dateTo) · GET /api/audit/{id} |
| `ConfigController.cs` | GET /api/config · PUT /api/config · PUT /api/config/smtp · PUT /api/config/sla · PUT /api/config/notifications |
| `DashboardController.cs` | GET /api/dashboard (KPIs) |
| `TicketController.cs` *(ampliar)* | PUT /api/ticket/{id} · PATCH /api/ticket/{id}/status · POST /api/ticket/{id}/comment · GET /api/ticket/{id}/comments · POST /api/ticket/{id}/close |

---

## 6. BACKEND — MEJORAS AL CÓDIGO EXISTENTE

### `AuthController.cs`
- [ ] `POST /api/auth/forgot-password` — enviar email con token de reset
- [ ] `POST /api/auth/reset-password` — validar token y cambiar contraseña
- [ ] `POST /api/auth/change-password` — cambiar contraseña autenticado
- [ ] `POST /api/auth/refresh` — renovar JWT con refresh token
- [ ] `POST /api/auth/logout` — invalidar sesión en `user_session`

### `Program.cs`
- [ ] Registrar todos los Logic y Repository nuevos en DI
- [ ] Configurar CORS correctamente para `http://localhost:4200`
- [ ] Añadir middleware de auditoría (interceptar cambios y escribir en `audit_log`)
- [ ] Configurar Swagger con autenticación JWT Bearer
- [ ] Añadir rate limiting para endpoints de auth

### `GlpiDbContext.cs`
- [ ] Añadir `DbSet<>` para todas las entidades nuevas
- [ ] Configurar Global Query Filter para `company_id` en todas las entidades multitenant
- [ ] Configurar `HasColumnType("text[]")` para el campo `Tags` de Ticket

---

## 7. FRONTEND — SERVICIOS A CONECTAR (`Glpi.FRONTEND`)

Los servicios Angular actualmente usan **datos hardcodeados** (mock). Deben conectarse a los endpoints reales una vez que el backend esté disponible.

| Servicio | Archivo | Estado |
|---------|---------|--------|
| `AuthService` | `core/services/auth.service.ts` | ✅ Conectado |
| `TicketService` | `core/services/ticket.service.ts` | ⚠️ Parcial (list/detail hardcoded) |
| `AssetService` | `core/services/asset.service.ts` | ❌ Pendiente crear |
| `KbService` | `core/services/kb.service.ts` | ❌ Pendiente crear |
| `ContractService` | `core/services/contract.service.ts` | ❌ Pendiente crear |
| `UserService` | `core/services/user.service.ts` | ❌ Pendiente crear |
| `RoleService` | `core/services/role.service.ts` | ❌ Pendiente crear |
| `CompanyService` | `core/services/company.service.ts` | ❌ Pendiente crear |
| `CatalogService` | `core/services/catalog.service.ts` | ❌ Pendiente crear |
| `ReportService` | `core/services/report.service.ts` | ❌ Pendiente crear |
| `AuditService` | `core/services/audit.service.ts` | ❌ Pendiente crear |
| `ConfigService` | `core/services/config.service.ts` | ❌ Pendiente crear |
| `DashboardService` | `core/services/dashboard.service.ts` | ❌ Pendiente crear |
| `NotificationService` | `core/services/notification.service.ts` | ❌ Pendiente crear |

**Páginas que reemplazan datos mock por llamadas HTTP:**

| Página | Datos que necesita del backend |
|--------|-------------------------------|
| `dashboard.ts` | GET /api/dashboard |
| `ticket-list.ts` | GET /api/ticket (con paginación y filtros) |
| `ticket-detail.ts` | GET /api/ticket/{id}, GET /api/ticket/{id}/comments |
| `ticket-create.ts` | POST /api/ticket, GET /api/catalog, GET /api/asset, GET /api/kb |
| `cmdb.ts` | GET /api/asset |
| `kb.ts` | GET /api/kb, GET /api/kb/categories |
| `contracts.ts` | GET /api/contract |
| `reports.ts` | GET /api/report/* |
| `audit.ts` | GET /api/audit |
| `config.ts` | GET /api/config, PUT /api/config/* |
| `admin/users.ts` | GET /api/user, POST /api/user, PUT /api/user |
| `admin/roles.ts` | GET /api/role, GET /api/role/{id}/permissions, PUT |
| `admin/companies.ts` | GET /api/company |
| `admin/catalogs.ts` | GET /api/catalog, POST/PUT/DELETE items |
| `profile.ts` | GET /api/auth/profile, PUT /api/auth/change-password |

---

## 8. ORDEN DE IMPLEMENTACIÓN SUGERIDO

```
Fase 1 — Base de datos
  1. Ejecutar database_setup.sql en Neon
  2. Verificar fn_auth_login y fn_user_permissions con datos seed

Fase 2 — Auth completo
  3. forgot-password / reset-password (email + token)
  4. refresh-token + logout

Fase 3 — Tickets completo
  5. Entidad TicketComment
  6. TicketRepository (filtros, comentarios)
  7. TicketLogic (update, comment, close, stats)
  8. TicketController (PUT, PATCH status, comments)
  9. Conectar ticket-list.ts, ticket-detail.ts, ticket-create.ts

Fase 4 — Administración
  10. Role, Permission, UserRole, RolePermission entidades
  11. UserRepository + UserLogic + UserController
  12. RoleRepository + RoleLogic + RoleController
  13. Conectar admin/users.ts y admin/roles.ts

Fase 5 — CMDB
  14. AssetModel, AssetAssignment entidades
  15. AssetRepository + AssetLogic + AssetController
  16. Conectar cmdb.ts

Fase 6 — KB y Contratos
  17. KbCategory, KbArticle entidades
  18. KbRepository + KbLogic + KbController
  19. Contract, ContractAsset entidades
  20. ContractRepository + ContractLogic + ContractController
  21. Conectar kb.ts y contracts.ts

Fase 7 — Reportes y Auditoría
  22. ReportLogic + ReportController
  23. AuditLog con middleware automático
  24. AuditController
  25. Conectar reports.ts y audit.ts

Fase 8 — Configuración y Dashboard
  26. TenantConfig entidad
  27. ConfigController
  28. DashboardController (llama fn_dashboard)
  29. Conectar config.ts y dashboard.ts
```

---

## 9. INFRAESTRUCTURA PENDIENTE

- [ ] **Variables de entorno**: mover connection string de `appsettings.json` a `.env` / secrets
- [ ] **JWT Secret**: mover a variable de entorno segura (no hardcoded)
- [ ] **SMTP**: configurar EmailService con credenciales reales
- [ ] **Swagger UI**: disponible en `http://localhost:5236/swagger`
- [ ] **Health check**: `GET /api/health` para monitoreo
- [ ] **Rate limiting**: en endpoints de login y reset-password
- [ ] **Paginación estándar**: implementar `PagedResult<T>` en todos los listados
- [ ] **Filtros genéricos**: query params `?page=1&size=20&sort=createdAt&dir=desc`
