# API Endpoints — Summit GLPI

Catálogo completo de endpoints REST. Convención: **kebab-case en URLs**, **camelCase en JSON**.

Headers obligatorios en todas las llamadas autenticadas:

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

El `tenant_id` viaja en el JWT — **NO se manda en la URL** (excepto para owner cross-tenant).

---

## 🔐 Auth

| Método | Path | Permiso | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | `{ username, password }` → `{ accessToken, refreshToken, mustChangePassword, user }` |
| POST | `/auth/refresh` | público | `{ refreshToken }` → nuevo par |
| POST | `/auth/logout` | auth | Revoca refresh token |
| POST | `/auth/change-password` | auth | `{ currentPassword, newPassword }` |
| POST | `/auth/forgot-password` | público | `{ email }` |
| POST | `/auth/reset-password` | público | `{ token, newPassword }` |
| GET  | `/auth/me` | auth | Usuario actual + permisos |
| GET  | `/auth/sessions` | auth | Sesiones activas del usuario |
| DELETE | `/auth/sessions/{id}` | auth | Cierra una sesión |

---

## 🎫 Tickets

| Método | Path | Permiso | Descripción |
|---|---|---|---|
| GET    | `/tickets` | `TICKET_VIEW` | Listado paginado. Query: `?status=&priority=&assignedTo=&q=&page=&pageSize=` |
| GET    | `/tickets/{id}` | `TICKET_VIEW` | Detalle completo |
| POST   | `/tickets` | `TICKET_CREATE` | Crear |
| PUT    | `/tickets/{id}` | `TICKET_EDIT` | Actualizar |
| DELETE | `/tickets/{id}` | `TICKET_DELETE` | Soft delete |
| PATCH  | `/tickets/{id}/status` | `TICKET_EDIT` | `{ statusItemId, comment? }` |
| PATCH  | `/tickets/{id}/assign` | `TICKET_ASSIGN` | `{ userId, groupName? }` |
| PATCH  | `/tickets/{id}/priority` | `TICKET_EDIT` | `{ priorityItemId }` |
| POST   | `/tickets/{id}/resolve` | `TICKET_CLOSE` | `{ resolutionNotes }` |
| POST   | `/tickets/{id}/close` | `TICKET_CLOSE` | `{}` |
| POST   | `/tickets/{id}/reopen` | `TICKET_EDIT` | `{ reason }` |
| GET    | `/tickets/{id}/comments` | `TICKET_VIEW` | Lista de comentarios (filtra internos según permiso) |
| POST   | `/tickets/{id}/comments` | `TICKET_COMMENT` | `{ body, isInternal, attachments }` |
| GET    | `/tickets/{id}/activity` | `TICKET_VIEW` | Timeline de cambios (lee `audit_log`) |
| POST   | `/tickets/{id}/relations` | `TICKET_EDIT` | `{ targetTicketId, relationType }` |
| POST   | `/tickets/{id}/kb-links` | `TICKET_EDIT` | `{ articleId }` |
| POST   | `/tickets/{id}/survey` | `TICKET_VIEW` | `{ rating, comment }` (solo requester) |
| GET    | `/tickets/export.csv` | `TICKET_VIEW` | Exporta tickets filtrados |
| POST   | `/tickets/bulk-update` | `TICKET_EDIT` | `{ ids, changes }` |

### Saved views

| GET    | `/ticket-views` |  | Vistas guardadas del usuario |
| POST   | `/ticket-views` |  | Crear vista (`{ name, filters }`) |
| DELETE | `/ticket-views/{id}` |  | Borrar |

---

## 📁 Ticket Categories

| GET    | `/ticket-categories` | `TICKET_VIEW` | Árbol jerárquico |
| POST   | `/ticket-categories` | `CATALOG_MANAGE` | |
| PUT    | `/ticket-categories/{id}` | `CATALOG_MANAGE` | |
| DELETE | `/ticket-categories/{id}` | `CATALOG_MANAGE` | |

---

## ⏱️ SLA Policies

| GET    | `/sla-policies` | `TICKET_VIEW` | |
| POST   | `/sla-policies` | `SLA_MANAGE` | |
| PUT    | `/sla-policies/{id}` | `SLA_MANAGE` | |
| DELETE | `/sla-policies/{id}` | `SLA_MANAGE` | |

---

## 📦 Assets (CMDB)

| Método | Path | Permiso |
|---|---|---|
| GET    | `/assets` | `ASSET_VIEW` | `?type=&status=&locationId=&q=&page=` |
| GET    | `/assets/{id}` | `ASSET_VIEW` | |
| POST   | `/assets` | `ASSET_CREATE` | |
| PUT    | `/assets/{id}` | `ASSET_EDIT` | |
| DELETE | `/assets/{id}` | `ASSET_DELETE` | Soft |
| POST   | `/assets/{id}/assign` | `ASSET_ASSIGN` | `{ userId, locationId?, notes }` |
| POST   | `/assets/{id}/return` | `ASSET_ASSIGN` | `{ returnCondition, notes }` |
| GET    | `/assets/{id}/assignments` | `ASSET_VIEW` | Historial |
| GET    | `/assets/{id}/maintenance` | `ASSET_VIEW` | Mantenimientos |
| POST   | `/assets/{id}/maintenance` | `ASSET_MAINTENANCE` | |
| POST   | `/assets/{id}/relations` | `ASSET_EDIT` | `{ targetAssetId, relationType }` |
| GET    | `/assets/{id}/tickets` | `ASSET_VIEW` | Tickets asociados |
| POST   | `/assets/bulk-import` | `ASSET_CREATE` | CSV upload |
| POST   | `/assets/generate-tag` | `ASSET_CREATE` | → `IT-00000413` (next) |

### Sub-recursos del CMDB

| GET/POST/PUT/DELETE | `/locations` | árbol jerárquico |
| GET/POST/PUT/DELETE | `/manufacturers` | |
| GET/POST/PUT/DELETE | `/asset-models` | |

---

## 📚 Knowledge Base

| GET    | `/kb/articles` | `KB_VIEW` | `?category=&q=&status=&tags=` |
| GET    | `/kb/articles/{id}` | `KB_VIEW` | Incrementa `views` |
| POST   | `/kb/articles` | `KB_MANAGE` | |
| PUT    | `/kb/articles/{id}` | `KB_MANAGE` | |
| DELETE | `/kb/articles/{id}` | `KB_MANAGE` | |
| POST   | `/kb/articles/{id}/publish` | `KB_MANAGE` | |
| POST   | `/kb/articles/{id}/vote` | `KB_VIEW` | `{ helpful: bool }` |
| GET    | `/kb/suggest?query=` | `KB_VIEW` | Para autosuggest al crear ticket |

---

## 📄 Contracts

| GET    | `/contracts` | `CONTRACT_VIEW` | `?status=&type=&expiresIn=` |
| GET    | `/contracts/{id}` | `CONTRACT_VIEW` | |
| POST   | `/contracts` | `CONTRACT_MANAGE` | |
| PUT    | `/contracts/{id}` | `CONTRACT_MANAGE` | |
| DELETE | `/contracts/{id}` | `CONTRACT_MANAGE` | |
| POST   | `/contracts/{id}/assets` | `CONTRACT_MANAGE` | `{ assetIds[] }` |
| DELETE | `/contracts/{id}/assets/{assetId}` | `CONTRACT_MANAGE` | |
| GET    | `/contracts/expiring` | `CONTRACT_VIEW` | `?days=90` |

---

## 👥 Users & Roles

| GET    | `/users` | `USER_VIEW` | |
| GET    | `/users/{id}` | `USER_VIEW` | |
| POST   | `/users` | `USER_CREATE` | Genera contraseña temporal automáticamente |
| PUT    | `/users/{id}` | `USER_EDIT` | |
| DELETE | `/users/{id}` | `USER_DELETE` | Soft |
| POST   | `/users/{id}/reset-password` | `USER_EDIT` | Envía email con código |
| POST   | `/users/{id}/unlock` | `USER_EDIT` | Limpia `locked_until` |
| POST   | `/users/{id}/roles` | `ROLE_MANAGE` | `{ roleIds[] }` |
| GET    | `/roles` | `ROLE_VIEW` | |
| POST   | `/roles` | `ROLE_MANAGE` | |
| PUT    | `/roles/{id}` | `ROLE_MANAGE` | |
| DELETE | `/roles/{id}` | `ROLE_MANAGE` | |
| GET    | `/roles/{id}/permissions` | `ROLE_VIEW` | |
| PUT    | `/roles/{id}/permissions` | `ROLE_MANAGE` | `{ permissionIds[] }` |
| GET    | `/permissions` | `ROLE_VIEW` | Catálogo agrupado por módulo |

---

## 🏢 Tenants / Companies (solo owner)

| GET    | `/tenants` | `OWNER_VIEW_ALL_TENANTS` | |
| GET    | `/tenants/{id}` | `OWNER_VIEW_ALL_TENANTS` | |
| POST   | `/tenants` | `OWNER_MANAGE_TENANTS` | Crea + semilla de catálogos |
| PUT    | `/tenants/{id}` | `OWNER_MANAGE_TENANTS` | |
| POST   | `/tenants/{id}/suspend` | `OWNER_MANAGE_TENANTS` | |

---

## 🏷️ Catálogos dinámicos

| GET    | `/catalogs` | `CATALOG_VIEW` | Todos los grupos del tenant |
| GET    | `/catalogs/all` | auth | Endpoint optimizado para cache al login |
| GET    | `/catalogs/{groupCode}/items` | `CATALOG_VIEW` | Items de un grupo |
| POST   | `/catalogs/{groupCode}/items` | `CATALOG_MANAGE` | |
| PUT    | `/catalogs/items/{id}` | `CATALOG_MANAGE` | |
| DELETE | `/catalogs/items/{id}` | `CATALOG_MANAGE` | Solo si `is_system=false` |
| PATCH  | `/catalogs/items/reorder` | `CATALOG_MANAGE` | `[{ id, sortOrder }]` |

---

## 📊 Reports

| GET    | `/reports/scheduled` | `REPORT_VIEW` | |
| POST   | `/reports/scheduled` | `REPORT_MANAGE` | |
| PUT    | `/reports/scheduled/{id}` | `REPORT_MANAGE` | |
| DELETE | `/reports/scheduled/{id}` | `REPORT_MANAGE` | |
| POST   | `/reports/scheduled/{id}/run` | `REPORT_MANAGE` | Ejecutar ahora |
| GET    | `/reports/scheduled/{id}/history` | `REPORT_VIEW` | |
| POST   | `/reports/ad-hoc/tickets` | `REPORT_VIEW` | `{ filters, format }` → PDF/Excel |
| POST   | `/reports/ad-hoc/assets` | `REPORT_VIEW` | |
| POST   | `/reports/ad-hoc/sla` | `REPORT_VIEW` | |

---

## 📈 Dashboard

| GET    | `/dashboard` | `TICKET_VIEW` | `?from=&to=` → invoca `fn_dashboard()` |
| GET    | `/dashboard/operations` | `TICKET_VIEW` | Kanban para técnicos |

---

## 🔔 Notifications

| GET    | `/notifications` | auth | Bandeja in-app del usuario |
| PATCH  | `/notifications/{id}/read` | auth | |
| POST   | `/notifications/read-all` | auth | |
| GET    | `/notification-templates` | `CONFIG_VIEW` | |
| PUT    | `/notification-templates/{id}` | `CONFIG_EDIT` | |

---

## ⚙️ Configuration

| GET    | `/config` | `CONFIG_VIEW` | Todos los `tenant_config` |
| PUT    | `/config/{key}` | `CONFIG_EDIT` | |
| POST   | `/config/test-smtp` | `CONFIG_EDIT` | Envía un email de prueba |

---

## 🛡️ Audit

| GET    | `/audit` | `AUDIT_VIEW` | `?action=&entity=&userId=&from=&to=&page=` |
| GET    | `/audit/{id}` | `AUDIT_VIEW` | Detalle con `old_values` y `new_values` diff |
| GET    | `/audit/entity/{name}/{id}` | `AUDIT_VIEW` | Timeline de una entidad específica |
| GET    | `/exceptions` | `AUDIT_VIEW` | Errores de aplicación |

---

## 📎 Files

| POST   | `/files/upload` | auth | Multipart. Devuelve `{ url, sha256, sizeBytes }` |
| GET    | `/files/{path}` | auth | Stream del archivo (verifica permisos por entidad) |
| DELETE | `/files/{path}` | auth | |

---

## Convenciones de respuesta

### Éxito

```json
{
  "data": { ... },
  "meta": { "page": 1, "pageSize": 25, "total": 187 }
}
```

### Error

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "El ticket TK-00012999 no existe.",
    "details": { "ticketId": "uuid" }
  }
}
```

### Códigos HTTP

- `200` OK · `201` Created · `204` No Content
- `400` Validation error · `401` Unauthorized · `403` Forbidden
- `404` Not Found · `409` Conflict · `422` Business rule violation
- `500` Server error
