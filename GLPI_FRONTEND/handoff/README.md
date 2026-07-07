# Summit GLPI

Plataforma multitenant tipo GLPI para la consultora **Summit Consulting**.

Cubre Mesa de Ayuda, CMDB / Inventario, Contratos, Base de Conocimiento, Reportes,
Catálogos dinámicos, Roles y permisos atómicos por módulo, Auditoría completa y
Portal del Cliente.

---

## 🚀 Quick start (3 pasos)

```bash
# 1. Levantar PostgreSQL (Docker)
docker run --name summit-pg -e POSTGRES_PASSWORD=summit \
  -p 5432:5432 -d postgres:15

# 2. Crear DB y aplicar schema
docker exec -i summit-pg psql -U postgres -c "CREATE DATABASE summit_glpi;"
docker exec -i summit-pg psql -U postgres -d summit_glpi < database/schema.sql

# 3. Levantar API + Web
cd api && dotnet run --project Summit.Api
cd web && npm install && npm start
```

Credenciales iniciales (ver `database/schema.sql`):

```
Usuario:  admin@consultora.pe
Password: Admin123!
```

---

## 📐 Stack

- **Frontend**: Angular 17 standalone components + Signals + SCSS
- **Backend**: .NET 8 Minimal APIs + EF Core + FluentValidation + Mapster
- **BD**: PostgreSQL 15 con `pgcrypto` y `pg_trgm`
- **Auth**: JWT (access + refresh) · bcrypt nativo de Postgres

---

## 📂 Documentación

| Archivo | Para qué |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Instrucciones para Claude Code (auto-load) |
| [`00-PROMPT-INICIAL.md`](./00-PROMPT-INICIAL.md) | Prompt para arrancar |
| [`docs/01-architecture.md`](./docs/01-architecture.md) | Arquitectura completa |
| [`docs/02-design-system.md`](./docs/02-design-system.md) | Paleta, tipografía, componentes |
| [`docs/03-api-endpoints.md`](./docs/03-api-endpoints.md) | Catálogo de endpoints REST |
| [`docs/04-multitenancy.md`](./docs/04-multitenancy.md) | Cómo funciona el aislamiento por tenant |
| [`docs/screens/`](./docs/screens/) | Spec por pantalla con mapeo a BD |
| [`database/schema.sql`](./database/schema.sql) | Schema completo |
| [`designs/`](./designs/) | Diseños HTML/CSS de referencia |

---

## 🗂️ Módulos

| # | Módulo | Tablas principales | Pantallas |
|---|---|---|---|
| 1 | **Auth** | `user_account`, `user_session`, `role`, `user_role` | Login · Recuperar · Cambio pwd |
| 2 | **Helpdesk** | `ticket`, `ticket_comment`, `ticket_category`, `sla_policy` | Listado · Detalle · Crear |
| 3 | **CMDB** | `asset`, `asset_assignment`, `asset_maintenance`, `location` | Listado · Detalle · Crear · Ubicaciones |
| 4 | **KB** | `kb_article`, `ticket_kb_link` | Centro · Artículo |
| 5 | **Contratos** | `contract`, `contract_asset` | Listado + timeline |
| 6 | **Admin** | `user_account`, `role`, `permission`, `catalog_*`, `company` | Usuarios · Roles · Tenants · Catálogos |
| 7 | **Reportes** | `scheduled_report`, `scheduled_report_log` | Programados |
| 8 | **Auditoría** | `audit_log`, `exception_log` | Log inmutable |

---

## 🎨 Marca

Paleta extraída del logo de **Summit Consulting**:

- **Navy primario**: `#143F5C`
- **Teal acento**: `#5AAFB8`
- **Tipografía**: Plus Jakarta Sans (UI) + JetBrains Mono (códigos)

Detalles en [`docs/02-design-system.md`](./docs/02-design-system.md).
