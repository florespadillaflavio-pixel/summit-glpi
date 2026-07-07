# Prompt inicial para Claude Code

Copia y pega este prompt en Claude Code después de abrir la carpeta `summit-glpi/`.

---

## 📋 Prompt para arrancar

```
Hola Claude. Voy a construir Summit GLPI: una plataforma SaaS multitenant tipo GLPI
para la consultora Summit Consulting. Cubre mesa de ayuda, CMDB, contratos, KB,
reportes y auditoría.

Antes de escribir UNA SOLA LÍNEA de código:

1. Lee CLAUDE.md completo (instrucciones que NO debes ignorar).
2. Lee README.md.
3. Lee docs/01-architecture.md.
4. Lee docs/02-design-system.md.
5. Lee database/schema.sql completo y entiende todas las relaciones.
6. Revisa la carpeta designs/ para entender visualmente el producto.

Después dime:
- Qué entendiste del producto (1 párrafo)
- Cualquier decisión arquitectónica que te haga ruido
- Qué módulo propones implementar primero y por qué

NO empieces a codificar hasta que yo confirme.
```

---

## 📋 Prompt para implementar un módulo

Una vez aprobado el plan, usa este prompt por cada módulo:

```
Vamos a implementar el módulo de [Mesa de Ayuda / CMDB / etc].

1. Lee docs/screens/[carpeta del módulo]/*.md
2. Lee las pantallas correspondientes en designs/screens/[archivo].jsx
3. Identifica las tablas involucradas en database/schema.sql

Implementa en este orden:
  a) Entidades EF Core + configuration
  b) DTOs + Mapster profile
  c) FluentValidation validators
  d) Endpoints Minimal API (CRUD + queries específicas)
  e) Tests de integración con WebApplicationFactory
  f) Servicio Angular + signals
  g) Componentes Angular standalone (uno por pantalla)
  h) Routing
  i) Cuando termines, ejecuta los tests y muéstrame el resultado

Respeta:
- Filtro automático por company_id (Global Query Filter)
- Permisos atómicos (atributo [RequirePermission("TICKET_CREATE")])
- Auditoría automática (interceptor de SaveChanges)
- Soft delete con is_active
- Paleta y componentes del design system
```

---

## 📋 Prompt para implementar una pantalla específica

```
Implementa la pantalla de [Detalle de Ticket].

Diseño de referencia: designs/screens/tickets.jsx → función ScreenTicketDetail
Spec: docs/screens/03-helpdesk/02-detalle-ticket.md
Endpoints: docs/03-api-endpoints.md sección "Tickets"

Componentes a crear (todos standalone):
  - TicketDetailComponent (smart, route /tickets/:id)
  - TicketHeaderComponent
  - TicketConversationComponent (con notas internas)
  - TicketSlaCardComponent
  - TicketPropertiesPanelComponent
  - TicketActivityFeedComponent

Estado: Signals locales + service inyectable.
Estilo: SCSS scoped, usa variables de styles/tokens.scss, NO inventes colores.
Loading: skeleton screen mientras carga (no spinners).
Errors: toast service global.

Cuando termines, monta una historia en Storybook (si está configurado)
o muéstrame screenshots del componente renderizado.
```

---

## 💡 Tips para trabajar con Claude Code

1. **Trabaja por módulos chicos**, no le pidas "haz toda la app".
2. **Pídele que lea siempre los `.md` relevantes** antes de codear.
3. **Forzá tests**: "no avances al siguiente endpoint sin test verde".
4. **Pídele un plan antes**: "muéstrame el plan en bullets antes de tocar archivos".
5. Si Claude se desvía del design system, pegale el archivo de tokens otra vez.
6. Al final de cada módulo, pedile que **actualice `docs/screens/[modulo]/IMPLEMENTED.md`**
   con qué quedó hecho y qué falta — así el siguiente prompt arranca con contexto.
