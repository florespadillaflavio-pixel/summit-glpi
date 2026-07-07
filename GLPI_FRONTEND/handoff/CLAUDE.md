# Summit GLPI — Instrucciones para Claude Code

> Este archivo lo lee Claude Code automáticamente al abrir esta carpeta.
> Define el stack, las convenciones y las decisiones que NO debes cambiar.

---

## 🎯 Qué estás construyendo

**Summit GLPI** es una plataforma multitenant tipo GLPI (Helpdesk + CMDB + Contratos + KB)
que la consultora **Summit Consulting** ofrece como SaaS a sus clientes corporativos.

Tu trabajo es **convertir los diseños hi-fi de `designs/` en una aplicación funcional**
respetando exactamente el schema de PostgreSQL (`database/schema.sql`) y las decisiones
arquitectónicas listadas más abajo.

---

## 🧱 Stack obligatorio

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | **Angular standalone components** | 17+ |
| Estado UI | **Signals** (no NgRx por ahora) | nativo |
| Estilos | **SCSS** con design tokens · `:host` scope | — |
| HTTP | `HttpClient` + interceptors | nativo |
| Forms | **Reactive Forms** (no template-driven) | — |
| Backend | **.NET 8 Minimal APIs** + EF Core | — |
| BD | **PostgreSQL 15+** con extensiones `pgcrypto`, `pg_trgm` | — |
| Auth | **JWT** access + refresh, bcrypt (vía `pgcrypto`) | — |
| Migrations | EF Core Migrations + el SQL ya provisto como semilla | — |

**No uses:** Bootstrap, Material Angular, Tailwind, jQuery, NgRx, NestJS, Express.

---

## 📐 Decisiones arquitectónicas (NO cambiar)

1. **Multitenancy por `company_id` en cada tabla** (shared schema, shared DB).
   Todas las queries del backend DEBEN filtrar por `company_id` automáticamente
   mediante un `EF Global Query Filter` que lee el claim `tenant_id` del JWT.

2. **PKs `UUID`** con `gen_random_uuid()`. Las DTOs los exponen como `string`.

3. **Catálogos dinámicos**: estados/prioridades/tipos NO son enums en código,
   vienen de `catalog_group` + `catalog_item`. El frontend los carga al login y
   los cachea por tenant.

4. **Permisos atómicos por módulo**: nunca chequees roles por nombre, siempre
   chequea **permission codes** (`TICKET_DELETE`, `ASSET_VIEW`, etc.). Los
   permisos viajan en el JWT.

5. **Auditoría obligatoria**: cualquier `INSERT/UPDATE/DELETE` en tablas de negocio
   pasa por un `IAuditService` que escribe en `audit_log` con `old_values` y
   `new_values` en JSONB.

6. **SLA calculado al cierre**, no en runtime. Los campos `first_response_at`,
   `resolved_at` y `sla_breached` se persisten cuando ocurren los eventos.

7. **Soft delete**: usa el flag `is_active`, nunca borres físicamente.

---

## 🎨 Sistema de diseño

Toda la paleta, tipografía y componentes están en `designs/styles/`. Reglas:

- **No improvises colores.** Usa las variables CSS en `tokens.css`.
- **Paleta primaria**: navy `#143F5C` + teal `#5AAFB8` (logo Summit).
- **Fuentes**: `Plus Jakarta Sans` (UI) + `JetBrains Mono` (IDs, códigos).
- **Border radius**: `4 / 6 / 8 / 12 / 16` px — nada en medio.
- **Sombras**: solo las 4 escalas de `tokens.css`.
- **Iconos**: usa Lucide (`lucide-angular`). NO Material Icons, NO Font Awesome.

Convertir cada `.css` de `designs/styles/` a SCSS partials en
`web/src/styles/`. Mantén los nombres de las variables.

---

## 🗂️ Estructura de carpetas esperada

```
summit-glpi/
├── api/                          # .NET 8 backend
│   ├── Summit.Api/               # Web project (Program.cs, endpoints)
│   ├── Summit.Application/       # Use cases / services
│   ├── Summit.Domain/            # Entities, value objects
│   ├── Summit.Infrastructure/    # EF Core, migrations, repos
│   └── Summit.Api.sln
├── web/                          # Angular 17
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/             # auth, http, guards, interceptors
│   │   │   ├── shared/           # ui components (Button, Badge, Avatar…)
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── tickets/
│   │   │   │   ├── cmdb/
│   │   │   │   ├── kb/
│   │   │   │   ├── admin/
│   │   │   │   ├── contracts/
│   │   │   │   ├── reports/
│   │   │   │   └── client-portal/
│   │   │   └── layouts/
│   │   ├── styles/               # tokens.scss, components.scss, shell.scss
│   │   └── assets/
│   ├── angular.json
│   └── package.json
├── designs/                      # Diseños de referencia (NO modificar)
│   ├── Summit GLPI - Pantallas.html
│   ├── styles/
│   └── screens/
└── docs/
    ├── 01-architecture.md
    ├── 02-design-system.md
    └── screens/                  # spec por pantalla
```

---

## 📋 Convenciones de código

### Angular
- Componentes **standalone**, sin NgModules.
- Inyección con `inject(Service)`, no constructor injection.
- Signals para estado local, `toSignal()` para HTTP.
- Una carpeta por feature, con `routes.ts`, `*.component.ts`, `*.service.ts`.
- Nombre de archivo: kebab-case. Clase: PascalCase + sufijo (`TicketListComponent`).

### .NET
- Minimal APIs agrupados por feature (`app.MapTicketEndpoints()`).
- DTOs nunca exponen entidades EF.
- Validación con FluentValidation.
- Mapeo con Mapster (no AutoMapper).
- Async/await en todo lo que toque BD.
- Naming: `PascalCase` para clases/métodos, `_camelCase` para campos privados.

### PostgreSQL
- Tablas y columnas en `snake_case` (ya definidas en el schema).
- EF Core usa `UseSnakeCaseNamingConvention()` de `EFCore.NamingConventions`.

---

## 🚀 Plan de implementación (orden sugerido)

1. **Bootstrap del proyecto** — solo scaffolding, sin pantallas.
2. **Auth completo** — login, refresh, change-password, JWT con permisos.
3. **Layout app-shell** — sidebar + topbar (admin y cliente).
4. **Catálogos** + admin de usuarios/roles.
5. **Mesa de Ayuda** (módulo principal — más complejo).
6. **CMDB** (segundo módulo grande).
7. **KB**.
8. **Contratos, Reportes, Auditoría**.
9. **Portal del cliente**.
10. **Dashboard** (al final, depende de los datos de los anteriores).

---

## 📚 Documentación que DEBES leer antes de empezar

1. `README.md` — overview del proyecto
2. `docs/01-architecture.md` — decisiones detalladas
3. `docs/02-design-system.md` — tokens y componentes
4. `database/schema.sql` — schema completo con comentarios
5. `docs/screens/00-index.md` — índice de pantallas
6. Para cada feature, lee el `.md` correspondiente en `docs/screens/`
