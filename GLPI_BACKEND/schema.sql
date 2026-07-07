-- =============================================================================
-- SUMMIT GLPI — SCHEMA CONSOLIDADO (RECREACIÓN DESDE CERO)
-- BD objetivo: glpidb (Neon PostgreSQL)
-- =============================================================================
--
-- QUÉ ES ESTE ARCHIVO
--   Consolida en un solo script reproducible los ~20 parches SQL que se fueron
--   aplicando uno por uno sobre la base de datos viva. Para cada tabla / función
--   almacenada se tomó la ÚLTIMA definición autoritativa. Ejecutar este archivo
--   sobre un Postgres vacío recrea la base de datos completa (esquema + seed).
--
--   Reemplaza / consolida:
--     database_setup.sql, database_functions.sql, database_functions_full.sql,
--     EJECUTAR_EN_BD.sql, fix_audit_logging.sql, update_timezone_peru.sql,
--     fix_asset_client_cloudinary.sql, fix_asset_photo_ticket_context.sql,
--     fix_ticket_flow_external_internal.sql,
--     fix_ticket_requester_company_visibility.sql, update_audit_pagination.sql,
--     update_ticket_comments_fix.sql, cleanup_functions.sql,
--     fix_catalog_active_field.sql, fix_external_ticket_catalogs.sql,
--     fix_catalog_item_delete.sql, fix_catalog_save_and_selection.sql,
--     fix_dashboard_function.sql, fix_role_permissions_ids.sql,
--     fix_user_get_owner_scope.sql, update_config_system.sql,
--     update_deletion_logic.sql, update_more_deletion_logic.sql
--     (y los parches ya superados: update_ticket_assign/history, fix_audit_list,
--      fix_catalog_groupid, fix_user_crud/list_*, update_catalog_icons).
--
-- ESTRUCTURA
--   Sección 0: Este encabezado
--   Sección 1: Extensiones + nota de timezone
--   Sección 2: Funciones utilitarias / triggers (now_local, updated_at, auditoría)
--   Sección 3: Tablas (en orden de dependencia de FK; columnas drift ya integradas)
--   Sección 4: Índices
--   Sección 5: Triggers (updated_at + auditoría)
--   Sección 6: Funciones de negocio (fn_auth_login autoritativo, permisos/perfil,
--              dashboard y todos los gen_man_*)
--   Sección 7: Datos semilla (seed)
--
-- IDEMPOTENCIA
--   Usa CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION y guardas
--   DROP FUNCTION IF EXISTS donde una firma / tipo de retorno cambió respecto a
--   versiones antiguas. Se puede re-ejecutar sin error sobre un Postgres vacío.
--
-- ⚠️  VALIDACIÓN (HACER ANTES DE CONFIAR EN ESTE ARCHIVO)
--   1. Ejecutar este schema.sql contra un Postgres LOCAL vacío y verificar que
--      corre de principio a fin sin errores.
--   2. Comparar contra el Neon vivo:
--        - Funciones:  SELECT proname, pg_get_function_identity_arguments(oid)
--                      FROM pg_proc WHERE pronamespace='public'::regnamespace
--                      ORDER BY 1,2;   (diff local vs Neon)
--        - Columnas:   SELECT table_name, column_name, data_type
--                      FROM information_schema.columns
--                      WHERE table_schema='public' ORDER BY 1,2;  (diff)
--   3. FUNCIONES QUE EL BACKEND LLAMA PERO NINGÚN .sql DEFINÍA (creadas a mano en
--      Neon, NO reproducibles desde estos archivos — deben recuperarse aparte):
--        gen_man_asset_del, gen_man_catalog_group_list, gen_man_company_get,
--        gen_man_company_status_upd, gen_man_contract_del/get/ins/upd,
--        gen_man_kb_article_del/get/ins/upd, gen_man_kb_category_list,
--        gen_man_report_scheduled_del/ins/list, gen_man_ticket_upd
--      Este archivo NO las inventa. Dumpearlas del Neon vivo con pg_get_functiondef
--      e integrarlas aquí antes de considerar el schema completo.
-- =============================================================================


-- =============================================================================
-- SECCIÓN 1 — EXTENSIONES + TIMEZONE
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- búsqueda fuzzy por similitud

-- ─── Timezone (de update_timezone_peru.sql) ──────────────────────────────────
-- Estos ALTER son específicos de Neon (nombres de BD/rol). Ejecutar manualmente
-- adaptando el nombre real de la base y del rol propietario. Se dejan comentados
-- porque fallarían en un Postgres genérico con otros nombres.
--   ALTER DATABASE glpidb SET timezone TO 'America/Lima';
--   ALTER ROLE neondb_owner SET timezone TO 'America/Lima';
--   ALTER ROLE neondb_owner IN DATABASE glpidb SET timezone TO 'America/Lima';


-- =============================================================================
-- SECCIÓN 2 — FUNCIONES UTILITARIAS / TRIGGERS
--   Deben existir ANTES de tablas/funciones que dependen de ellas.
--   now_local() es dependencia de casi todas las funciones de negocio.
-- =============================================================================

-- ── now_local() (database_functions.sql) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.now_local()
 RETURNS timestamp without time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN NOW() AT TIME ZONE 'America/Lima';
END;
$function$;

-- ── set_updated_at()  (database_functions.sql; usa now_local) ─────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now_local();
    RETURN NEW;
END;
$function$;

-- ── update_updated_at()  (database_setup.sql; usado por triggers updated_at) ──
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── fn_audit_row_change()  (fix_audit_logging.sql) ───────────────────────────
-- Bitácora automática AFTER INSERT/UPDATE/DELETE para tablas con company_id.
CREATE OR REPLACE FUNCTION public.fn_audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_company_id uuid;
    v_entity_id uuid;
    v_entity_key text;
    v_old jsonb := '{}'::jsonb;
    v_new jsonb := '{}'::jsonb;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old := to_jsonb(OLD);
        IF v_old ? 'id' THEN
            v_entity_id := (v_old ->> 'id')::uuid;
        END IF;
        IF v_old ? 'company_id' THEN
            v_company_id := (v_old ->> 'company_id')::uuid;
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new := to_jsonb(NEW);
        IF v_new ? 'id' THEN
            v_entity_id := (v_new ->> 'id')::uuid;
        END IF;
        IF v_new ? 'company_id' THEN
            v_company_id := (v_new ->> 'company_id')::uuid;
        END IF;
    END IF;

    -- La tabla company no es multitenant; se audita en el tenant owner.
    IF v_company_id IS NULL AND TG_TABLE_NAME = 'company' THEN
        v_company_id := '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    IF v_company_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- No guardar hashes ni datos sensibles en la bitacora.
    IF TG_TABLE_NAME = 'user_account' THEN
        v_old := v_old - 'password_hash';
        v_new := v_new - 'password_hash';
    END IF;

    IF v_entity_id IS NULL THEN
        v_entity_key := COALESCE(
            v_new ->> 'role_id',
            v_old ->> 'role_id',
            v_new ->> 'user_id',
            v_old ->> 'user_id',
            v_new ->> 'permission_id',
            v_old ->> 'permission_id',
            v_new ->> 'config_key',
            v_old ->> 'config_key',
            TG_TABLE_NAME
        );
    END IF;

    INSERT INTO public.audit_log (
        company_id,
        user_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at
    )
    VALUES (
        v_company_id,
        NULL,
        TG_OP,
        CASE
            WHEN v_entity_id IS NULL AND v_entity_key IS NOT NULL THEN TG_TABLE_NAME || ':' || v_entity_key
            ELSE TG_TABLE_NAME
        END,
        v_entity_id,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN v_old ELSE '{}'::jsonb END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN v_new ELSE '{}'::jsonb END,
        '',
        'db-trigger',
        now()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


-- =============================================================================
-- SECCIÓN 3 — TABLAS
--   Reordenadas en orden de dependencia de FK para correr top-to-bottom en un
--   Postgres vacío (el database_setup.sql original tenía forward-refs de ticket
--   hacia ticket_category / sla_policy / asset definidas más abajo).
--   Columnas "drift" ya integradas: role.role_type, asset.photo_url,
--   tenant_config (config_group/config_key/config_value/value_type/description/
--   is_sensitive + UNIQUE(company_id, config_key)).
-- =============================================================================

-- Empresas / Tenants
CREATE TABLE IF NOT EXISTS company (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(150) NOT NULL,
    ruc               VARCHAR(20)  NOT NULL,
    address           TEXT         NOT NULL DEFAULT '',
    phone             VARCHAR(30)  NOT NULL DEFAULT '',
    email             VARCHAR(100) NOT NULL DEFAULT '',
    website           VARCHAR(150) NOT NULL DEFAULT '',
    logo_url          TEXT         NOT NULL DEFAULT '',
    is_owner          BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Módulos del sistema
CREATE TABLE IF NOT EXISTS module (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(80)  NOT NULL DEFAULT '',
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Usuarios  (is_deleted integrado: era ALTER en EJECUTAR_EN_BD.sql)
CREATE TABLE IF NOT EXISTS user_account (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id            UUID        NOT NULL REFERENCES company(id),
    username              VARCHAR(100) NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,
    first_name            VARCHAR(100) NOT NULL,
    last_name             VARCHAR(100) NOT NULL,
    phone                 VARCHAR(30)  NOT NULL DEFAULT '',
    avatar_url            TEXT         NOT NULL DEFAULT '',
    is_password_temporary BOOLEAN      NOT NULL DEFAULT TRUE,
    backup_code           VARCHAR(10)  NOT NULL DEFAULT '000000',
    is_backup_active      BOOLEAN      NOT NULL DEFAULT FALSE,
    backup_requested_at   TIMESTAMPTZ,
    last_login_at         TIMESTAMPTZ,
    failed_login_attempts INT          NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted            BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by            UUID,
    updated_by            UUID,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, username)
);

-- Grupos de catálogo (estados, prioridades, tipos)
CREATE TABLE IF NOT EXISTS catalog_group (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Items de catálogo
CREATE TABLE IF NOT EXISTS catalog_item (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    group_id    UUID        NOT NULL REFERENCES catalog_group(id),
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    color       VARCHAR(10)  NOT NULL DEFAULT '#888888',
    icon        VARCHAR(80)  NOT NULL DEFAULT '',
    sort_order  INT          NOT NULL DEFAULT 0,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, group_id, code)
);

-- Roles por tenant  (role_type integrado: usado por EJECUTAR_EN_BD.sql, ningún
-- parche lo agregaba explícitamente → se define aquí)
CREATE TABLE IF NOT EXISTS role (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    name        VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    role_type   VARCHAR(30)  NOT NULL DEFAULT 'CUSTOM',
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by  UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Permisos atómicos
CREATE TABLE IF NOT EXISTS permission (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID        NOT NULL REFERENCES module(id),
    code        VARCHAR(80)  NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    permission_icon VARCHAR(80)  NOT NULL DEFAULT '',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Asignación rol → permisos
CREATE TABLE IF NOT EXISTS role_permission (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID        NOT NULL REFERENCES company(id),
    role_id       UUID        NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id UUID        NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    granted       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Asignación usuario → roles
CREATE TABLE IF NOT EXISTS user_role (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    user_id     UUID        NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    role_id     UUID        NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Sesiones de usuario (para refresh token)
CREATE TABLE IF NOT EXISTS user_session (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    refresh_token   TEXT        NOT NULL,
    device_info     TEXT        NOT NULL DEFAULT '',
    ip_address      VARCHAR(45) NOT NULL DEFAULT '',
    user_agent      TEXT        NOT NULL DEFAULT '',
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorías jerárquicas de tickets
CREATE TABLE IF NOT EXISTS ticket_category (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    parent_id   UUID        REFERENCES ticket_category(id),
    name        VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    icon        VARCHAR(80)  NOT NULL DEFAULT '',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Políticas de SLA
CREATE TABLE IF NOT EXISTS sla_policy (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID        NOT NULL REFERENCES company(id),
    name                 VARCHAR(100) NOT NULL,
    description          TEXT         NOT NULL DEFAULT '',
    priority_item_id     UUID        NOT NULL REFERENCES catalog_item(id),
    first_response_min   INT          NOT NULL DEFAULT 60,
    resolution_time_min  INT          NOT NULL DEFAULT 480,
    business_hours_only  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Ubicaciones jerárquicas (para activos)
CREATE TABLE IF NOT EXISTS location (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    parent_id   UUID        REFERENCES location(id),
    name        VARCHAR(100) NOT NULL,
    address     TEXT         NOT NULL DEFAULT '',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fabricantes de activos
CREATE TABLE IF NOT EXISTS manufacturer (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    name        VARCHAR(100) NOT NULL,
    website     VARCHAR(150) NOT NULL DEFAULT '',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Modelos de activos
CREATE TABLE IF NOT EXISTS asset_model (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES company(id),
    manufacturer_id UUID        REFERENCES manufacturer(id),
    name            VARCHAR(150) NOT NULL,
    part_number     VARCHAR(80)  NOT NULL DEFAULT '',
    asset_type_item_id UUID     REFERENCES catalog_item(id),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Activos (CMDB)  (photo_url integrado: era ALTER en
-- fix_asset_photo_ticket_context.sql)
CREATE TABLE IF NOT EXISTS asset (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID        NOT NULL REFERENCES company(id),
    asset_tag            VARCHAR(50)  NOT NULL,
    serial_number        VARCHAR(100) NOT NULL DEFAULT '',
    asset_model_id       UUID        REFERENCES asset_model(id),
    asset_type_item_id   UUID        NOT NULL REFERENCES catalog_item(id),
    status_item_id       UUID        NOT NULL REFERENCES catalog_item(id),
    location_id          UUID        REFERENCES location(id),
    assigned_to_id       UUID        REFERENCES user_account(id),
    -- Tipos verificados contra Neon vivo (2026-07-06): assigned_at es timestamp
    -- SIN tz; purchase_date y warranty_expires_at son DATE (no timestamp).
    assigned_at          TIMESTAMP,
    purchase_date        DATE,
    purchase_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
    warranty_expires_at  DATE,
    supplier             VARCHAR(150) NOT NULL DEFAULT '',
    invoice_number       VARCHAR(80)  NOT NULL DEFAULT '',
    specifications       JSONB        NOT NULL DEFAULT '{}',
    notes                TEXT         NOT NULL DEFAULT '',
    photo_url            TEXT         NOT NULL DEFAULT '',
    is_software          BOOLEAN      NOT NULL DEFAULT FALSE,
    license_key          TEXT         NOT NULL DEFAULT '',
    license_expires_at   DATE,
    seats_total          INT          NOT NULL DEFAULT 1,
    seats_used           INT          NOT NULL DEFAULT 0,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by           UUID,
    updated_by           UUID,
    -- created_at timestamp SIN tz: gen_man_asset_list/_get lo devuelven a una
    -- columna TIMESTAMP. Ver nota de tipos en el encabezado.
    created_at           TIMESTAMP    NOT NULL DEFAULT now_local(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, asset_tag)
);

-- Tickets  (todas las FK forward ya resueltas: ticket_category, sla_policy y
-- asset se definen arriba)
CREATE TABLE IF NOT EXISTS ticket (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID        NOT NULL REFERENCES company(id),
    ticket_number    VARCHAR(20)  NOT NULL,
    subject          VARCHAR(200) NOT NULL,
    description      TEXT         NOT NULL,
    type_item_id     UUID        NOT NULL REFERENCES catalog_item(id),
    status_item_id   UUID        NOT NULL REFERENCES catalog_item(id),
    priority_item_id UUID        NOT NULL REFERENCES catalog_item(id),
    category_id      UUID        REFERENCES ticket_category(id),
    sla_policy_id    UUID        REFERENCES sla_policy(id),
    requester_id     UUID        NOT NULL REFERENCES user_account(id),
    assigned_to_id   UUID        REFERENCES user_account(id),
    assigned_group   VARCHAR(100) NOT NULL DEFAULT '',
    asset_id         UUID        REFERENCES asset(id),
    due_date         TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    resolved_at      TIMESTAMPTZ,
    closed_at        TIMESTAMPTZ,
    sla_breached     BOOLEAN      NOT NULL DEFAULT FALSE,
    source           VARCHAR(30)  NOT NULL DEFAULT 'WEB',
    tags             TEXT[]       NOT NULL DEFAULT '{}',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by       UUID,
    updated_by       UUID,
    -- created_at timestamp SIN tz: gen_man_ticket_list/_get/_history lo devuelven
    -- a una columna TIMESTAMP. Ver nota de tipos en el encabezado.
    created_at       TIMESTAMP    NOT NULL DEFAULT now_local(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Comentarios de tickets
CREATE TABLE IF NOT EXISTS ticket_comment (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    ticket_id   UUID        NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL REFERENCES user_account(id),
    body        TEXT         NOT NULL,
    is_internal BOOLEAN      NOT NULL DEFAULT FALSE,
    attachments JSONB        NOT NULL DEFAULT '[]',
    -- created_at timestamp SIN tz: gen_man_ticket_history devuelve c.created_at a
    -- una columna TIMESTAMP.
    created_at  TIMESTAMP    NOT NULL DEFAULT now_local(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Relaciones entre tickets
CREATE TABLE IF NOT EXISTS ticket_relation (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES company(id),
    source_ticket_id UUID       NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
    target_ticket_id UUID       NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
    relation_type   VARCHAR(50)  NOT NULL DEFAULT 'RELATED',
    created_by      UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(source_ticket_id, target_ticket_id)
);

-- Encuestas de satisfacción
CREATE TABLE IF NOT EXISTS ticket_survey (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    ticket_id   UUID        NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
    rating      INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT         NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticket_id)
);

-- Base de Conocimiento — Categorías
CREATE TABLE IF NOT EXISTS kb_category (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    parent_id   UUID        REFERENCES kb_category(id),
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(80)  NOT NULL DEFAULT '',
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Base de Conocimiento — Artículos
CREATE TABLE IF NOT EXISTS kb_article (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID        NOT NULL REFERENCES company(id),
    category_id   UUID        REFERENCES kb_category(id),
    title         VARCHAR(250) NOT NULL,
    content       TEXT         NOT NULL,
    summary       TEXT         NOT NULL DEFAULT '',
    status        VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    author_id     UUID        NOT NULL REFERENCES user_account(id),
    views         INT          NOT NULL DEFAULT 0,
    helpful_yes   INT          NOT NULL DEFAULT 0,
    helpful_no    INT          NOT NULL DEFAULT 0,
    tags          TEXT[]       NOT NULL DEFAULT '{}',
    is_public     BOOLEAN      NOT NULL DEFAULT FALSE,
    published_at  TIMESTAMPTZ,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    UUID,
    updated_by    UUID,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Vínculo ticket ↔ artículo KB
CREATE TABLE IF NOT EXISTS ticket_kb_link (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    ticket_id   UUID        NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
    article_id  UUID        NOT NULL REFERENCES kb_article(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(ticket_id, article_id)
);

-- Historial de asignaciones de activos
CREATE TABLE IF NOT EXISTS asset_assignment (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES company(id),
    asset_id        UUID        NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES user_account(id),
    location_id     UUID        REFERENCES location(id),
    assigned_by     UUID,
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    returned_at     TIMESTAMPTZ,
    return_condition TEXT        NOT NULL DEFAULT '',
    notes           TEXT         NOT NULL DEFAULT ''
);

-- Mantenimientos de activos
CREATE TABLE IF NOT EXISTS asset_maintenance (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES company(id),
    asset_id        UUID        NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    type            VARCHAR(50)  NOT NULL DEFAULT 'PREVENTIVE',
    description     TEXT         NOT NULL,
    technician_id   UUID        REFERENCES user_account(id),
    scheduled_at    TIMESTAMPTZ,
    performed_at    TIMESTAMPTZ,
    cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes           TEXT         NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Contratos
CREATE TABLE IF NOT EXISTS contract (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES company(id),
    contract_number VARCHAR(50)  NOT NULL,
    name            VARCHAR(200) NOT NULL,
    type_item_id    UUID        NOT NULL REFERENCES catalog_item(id),
    vendor_name     VARCHAR(150) NOT NULL DEFAULT '',
    vendor_contact  VARCHAR(150) NOT NULL DEFAULT '',
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    value           NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(5)   NOT NULL DEFAULT 'PEN',
    document_url    TEXT         NOT NULL DEFAULT '',
    alert_days      INT          NOT NULL DEFAULT 30,
    auto_renew      BOOLEAN      NOT NULL DEFAULT FALSE,
    status_item_id  UUID        NOT NULL REFERENCES catalog_item(id),
    notes           TEXT         NOT NULL DEFAULT '',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Activos vinculados a contratos
CREATE TABLE IF NOT EXISTS contract_asset (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    contract_id UUID        NOT NULL REFERENCES contract(id) ON DELETE CASCADE,
    asset_id    UUID        NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, asset_id)
);

-- Reportes programados
CREATE TABLE IF NOT EXISTS scheduled_report (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES company(id),
    name            VARCHAR(150) NOT NULL,
    report_type     VARCHAR(50)  NOT NULL,
    frequency       VARCHAR(20)  NOT NULL DEFAULT 'WEEKLY',
    next_run_at     TIMESTAMPTZ,
    recipients      TEXT[]       NOT NULL DEFAULT '{}',
    filters         JSONB        NOT NULL DEFAULT '{}',
    format          VARCHAR(10)  NOT NULL DEFAULT 'PDF',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Log de ejecuciones de reportes
CREATE TABLE IF NOT EXISTS scheduled_report_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id   UUID        NOT NULL REFERENCES scheduled_report(id) ON DELETE CASCADE,
    company_id  UUID        NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS',
    file_url    TEXT         NOT NULL DEFAULT '',
    error_msg   TEXT         NOT NULL DEFAULT '',
    executed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    duration_ms INT          NOT NULL DEFAULT 0
);

-- Plantillas de notificaciones
CREATE TABLE IF NOT EXISTS notification_template (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    code        VARCHAR(80)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    subject     VARCHAR(250) NOT NULL,
    body_html   TEXT         NOT NULL,
    variables   TEXT[]       NOT NULL DEFAULT '{}',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Log de notificaciones enviadas
CREATE TABLE IF NOT EXISTS notification_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL,
    template_code   VARCHAR(80)  NOT NULL,
    channel         VARCHAR(20)  NOT NULL DEFAULT 'EMAIL',
    recipient_id    UUID,
    recipient_email VARCHAR(150) NOT NULL DEFAULT '',
    subject         VARCHAR(250) NOT NULL DEFAULT '',
    body            TEXT         NOT NULL DEFAULT '',
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    sent_at         TIMESTAMPTZ,
    error_msg       TEXT         NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Log de auditoría (inmutable)  (user_agent ya integrado)
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL,
    user_id     UUID,
    action      VARCHAR(20)  NOT NULL,
    entity_name VARCHAR(80)  NOT NULL,
    entity_id   UUID,
    old_values  JSONB        NOT NULL DEFAULT '{}',
    new_values  JSONB        NOT NULL DEFAULT '{}',
    ip_address  VARCHAR(45)  NOT NULL DEFAULT '',
    user_agent  TEXT         NOT NULL DEFAULT '',
    -- created_at timestamp SIN tz: gen_man_ticket_history devuelve a.created_at a
    -- una columna TIMESTAMP (gen_man_audit_list ya lo castea).
    created_at  TIMESTAMP    NOT NULL DEFAULT now_local()
);

-- Log de excepciones
CREATE TABLE IF NOT EXISTS exception_log (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID,
    user_id      UUID,
    endpoint     TEXT         NOT NULL DEFAULT '',
    method       VARCHAR(10)  NOT NULL DEFAULT '',
    status_code  INT          NOT NULL DEFAULT 500,
    message      TEXT         NOT NULL,
    stack_trace  TEXT         NOT NULL DEFAULT '',
    request_body TEXT         NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Configuración del tenant  (REDEFINIDA según update_config_system.sql: el shape
-- key/value del database_setup.sql original quedó obsoleto).
CREATE TABLE IF NOT EXISTS tenant_config (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID         NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    config_group  VARCHAR(50)  NOT NULL DEFAULT 'GENERAL',
    config_key    VARCHAR(100) NOT NULL,
    config_value  TEXT         NOT NULL DEFAULT '',
    value_type    VARCHAR(20)  NOT NULL DEFAULT 'STRING',
    description   TEXT         NOT NULL DEFAULT '',
    is_sensitive  BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_by    UUID,
    -- updated_at timestamp SIN tz: gen_man_tenant_config_list lo devuelve a una
    -- columna TIMESTAMP WITHOUT TIME ZONE (update_config_system.sql).
    updated_at    TIMESTAMP    NOT NULL DEFAULT now_local(),
    UNIQUE(company_id, config_key)
);

-- Vistas guardadas de tickets (por usuario)
CREATE TABLE IF NOT EXISTS ticket_view (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        NOT NULL REFERENCES company(id),
    user_id     UUID        NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    filters     JSONB        NOT NULL DEFAULT '{}',
    is_shared   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECCIÓN 4 — ÍNDICES  (database_setup.sql)
-- =============================================================================

-- Multitenancy (todos los queries filtran por company_id)
CREATE INDEX IF NOT EXISTS idx_user_account_company    ON user_account(company_id);
CREATE INDEX IF NOT EXISTS idx_catalog_group_company   ON catalog_group(company_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_company    ON catalog_item(company_id);
CREATE INDEX IF NOT EXISTS idx_ticket_company          ON ticket(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_company           ON asset(company_id);
CREATE INDEX IF NOT EXISTS idx_role_company            ON role(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_company        ON contract(company_id);

-- Búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_ticket_fts ON ticket USING GIN (
    to_tsvector('spanish', coalesce(subject,'') || ' ' || coalesce(description,''))
);
CREATE INDEX IF NOT EXISTS idx_asset_fts ON asset USING GIN (
    to_tsvector('spanish', coalesce(asset_tag,'') || ' ' || coalesce(serial_number,'') || ' ' || coalesce(notes,''))
);
CREATE INDEX IF NOT EXISTS idx_kb_article_fts ON kb_article USING GIN (
    to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(content,''))
);

-- Búsqueda fuzzy
CREATE INDEX IF NOT EXISTS idx_user_account_trgm ON user_account USING GIN (
    (first_name || ' ' || last_name || ' ' || username) gin_trgm_ops
);

-- Queries frecuentes
CREATE INDEX IF NOT EXISTS idx_ticket_status       ON ticket(company_id, status_item_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assigned     ON ticket(company_id, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_ticket_requester    ON ticket(company_id, requester_id);
CREATE INDEX IF NOT EXISTS idx_ticket_due_date     ON ticket(due_date) WHERE sla_breached = FALSE;
CREATE INDEX IF NOT EXISTS idx_ticket_number       ON ticket(company_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_asset_tag           ON asset(company_id, asset_tag);
CREATE INDEX IF NOT EXISTS idx_contract_end_date   ON contract(company_id, end_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity    ON audit_log(company_id, entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user      ON audit_log(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_status    ON notification_log(status, created_at);
CREATE INDEX IF NOT EXISTS idx_session_token       ON user_session(refresh_token) WHERE is_active = TRUE;


-- =============================================================================
-- SECCIÓN 5 — TRIGGERS
-- =============================================================================

-- ── Triggers updated_at automático  (database_setup.sql) ─────────────────────
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'company','user_account','catalog_group','catalog_item','ticket','asset',
        'role','ticket_category','sla_policy','ticket_comment','kb_article',
        'location','asset_model','contract','scheduled_report','notification_template','tenant_config'
    ]
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
            CREATE TRIGGER trg_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        ', t, t, t, t);
    END LOOP;
END$$;

-- ── Triggers de auditoría  (fix_audit_logging.sql) ───────────────────────────
DROP TRIGGER IF EXISTS trg_audit_user_account ON public.user_account;
CREATE TRIGGER trg_audit_user_account
AFTER INSERT OR UPDATE OR DELETE ON public.user_account
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_role ON public.role;
CREATE TRIGGER trg_audit_role
AFTER INSERT OR UPDATE OR DELETE ON public.role
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_company ON public.company;
CREATE TRIGGER trg_audit_company
AFTER INSERT OR UPDATE OR DELETE ON public.company
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_catalog_item ON public.catalog_item;
CREATE TRIGGER trg_audit_catalog_item
AFTER INSERT OR UPDATE OR DELETE ON public.catalog_item
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_ticket ON public.ticket;
CREATE TRIGGER trg_audit_ticket
AFTER INSERT OR UPDATE OR DELETE ON public.ticket
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_asset ON public.asset;
CREATE TRIGGER trg_audit_asset
AFTER INSERT OR UPDATE OR DELETE ON public.asset
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_contract ON public.contract;
CREATE TRIGGER trg_audit_contract
AFTER INSERT OR UPDATE OR DELETE ON public.contract
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_kb_article ON public.kb_article;
CREATE TRIGGER trg_audit_kb_article
AFTER INSERT OR UPDATE OR DELETE ON public.kb_article
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_tenant_config ON public.tenant_config;
CREATE TRIGGER trg_audit_tenant_config
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_config
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

-- Cobertura automática: cualquier tabla con company_id + id (excepto logs).
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'company_id'
          AND c.table_name NOT IN ('audit_log', 'exception_log')
          AND EXISTS (
              SELECT 1
              FROM information_schema.columns idc
              WHERE idc.table_schema = c.table_schema
                AND idc.table_name = c.table_name
                AND idc.column_name = 'id'
          )
        ORDER BY c.table_name
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_audit_' || r.table_name, r.table_name);
        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change()',
            'trg_audit_' || r.table_name,
            r.table_name
        );
    END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role_permission ON public.role_permission;
CREATE TRIGGER trg_audit_role_permission
AFTER INSERT OR UPDATE OR DELETE ON public.role_permission
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();


-- =============================================================================
-- SECCIÓN 6 — FUNCIONES DE NEGOCIO
-- =============================================================================

-- ── AUTENTICACIÓN ────────────────────────────────────────────────────────────

-- fn_auth_login — AUTORITATIVO (EJECUTAR_EN_BD.sql): forma record / OUT-params.
-- Supera las versiones TABLE(text,text) y ext de database_functions.sql.
DROP FUNCTION IF EXISTS public.fn_auth_login(text, text);
DROP FUNCTION IF EXISTS public.fn_auth_login(character varying, character varying);
CREATE OR REPLACE FUNCTION public.fn_auth_login(
    p_username character varying,
    p_password character varying,
    OUT p_success boolean,
    OUT p_message character varying,
    OUT p_code text
) RETURNS record LANGUAGE plpgsql AS $$
DECLARE
    d_user RECORD;
BEGIN
    p_success := FALSE;
    p_code    := '';

    SELECT u.id, u.password_hash, u.is_password_temporary,
           u.first_name, u.last_name, u.company_id,
           u.failed_login_attempts, u.locked_until, u.is_active
    INTO d_user
    FROM user_account u
    WHERE UPPER(TRIM(u.username)) = UPPER(TRIM(p_username))
      AND u.is_deleted = FALSE
    LIMIT 1;

    IF d_user IS NULL THEN
        p_message := 'Usuario o contraseña incorrectos.'; RETURN;
    END IF;

    IF NOT d_user.is_active THEN
        p_message := 'Cuenta desactivada. Contacte al administrador.'; RETURN;
    END IF;

    IF d_user.locked_until IS NOT NULL AND d_user.locked_until > now_local() THEN
        p_message := 'Cuenta bloqueada temporalmente. Intente más tarde.'; RETURN;
    END IF;

    -- Verificar bcrypt
    IF d_user.password_hash != crypt(p_password, d_user.password_hash) THEN
        UPDATE user_account
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE WHEN failed_login_attempts + 1 >= 5
                                THEN now_local() + INTERVAL '30 minutes'
                                ELSE NULL END,
            updated_at = now_local()
        WHERE id = d_user.id;
        p_message := 'Usuario o contraseña incorrectos.'; RETURN;
    END IF;

    -- Reset intentos fallidos
    UPDATE user_account
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = now_local(),
        updated_at = now_local()
    WHERE id = d_user.id;

    IF d_user.is_password_temporary THEN
        p_success := TRUE;
        p_code    := 'TEMP|' || d_user.id::TEXT;
        p_message := 'Contraseña temporal. Debe cambiar su contraseña.';
        RETURN;
    END IF;

    p_success := TRUE;
    p_message := 'Bienvenido al sistema.';
    p_code    := d_user.id::TEXT || '|' || d_user.company_id::TEXT;
END;
$$;

-- fn_auth_change_password  (database_functions.sql — baseline)
CREATE OR REPLACE FUNCTION public.fn_auth_change_password(p_user_id uuid, p_password character varying, OUT p_success boolean, OUT p_message character varying)
 RETURNS record
 LANGUAGE plpgsql
AS $function$
DECLARE d_rows INT;
BEGIN
    UPDATE user_account
    SET password_hash = crypt(p_password, gen_salt('bf')),
        is_password_temporary = FALSE,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = now_local()
    WHERE id = p_user_id AND is_active = TRUE;
    GET DIAGNOSTICS d_rows = ROW_COUNT;
    IF d_rows > 0 THEN
        p_success := TRUE; p_message := 'Contraseña actualizada correctamente.';
    ELSE
        p_success := FALSE; p_message := 'Usuario no encontrado o inactivo.';
    END IF;
END;
$function$;

-- fn_auth_login_ext  (database_functions.sql — baseline; no lo llama el backend
-- pero se conserva para no perder la definición histórica)
CREATE OR REPLACE FUNCTION public.fn_auth_login_ext(p_username character varying, p_password character varying, OUT p_success boolean, OUT p_message character varying, OUT p_code text)
 RETURNS record
 LANGUAGE plpgsql
AS $function$
DECLARE
    d_user          RECORD;
BEGIN
    p_success := FALSE;
    p_code    := '';

    SELECT u.id, u.password_hash, u.is_password_temporary,
           u.first_name, u.last_name, u.company_id,
           u.failed_login_attempts, u.locked_until, u.is_active
    INTO d_user
    FROM user_account u
    WHERE UPPER(TRIM(u.username)) = UPPER(TRIM(p_username))
      AND u.is_deleted = FALSE
    LIMIT 1;

    IF d_user IS NULL OR NOT d_user.is_active THEN
        p_message := 'Usuario o contraseña incorrectos.'; RETURN;
    END IF;

    IF d_user.locked_until IS NOT NULL AND d_user.locked_until > now_local() THEN
        p_message := 'Cuenta bloqueada temporalmente. Intente más tarde.'; RETURN;
    END IF;

    IF d_user.password_hash != crypt(p_password, d_user.password_hash) THEN
        UPDATE user_account
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE WHEN failed_login_attempts + 1 >= 5
                                THEN now_local() + INTERVAL '30 minutes'
                                ELSE NULL END,
            updated_at = now_local()
        WHERE id = d_user.id;
        p_message := 'Usuario o contraseña incorrectos.'; RETURN;
    END IF;

    UPDATE user_account
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = now_local(),
        updated_at = now_local()
    WHERE id = d_user.id;

    IF d_user.is_password_temporary THEN
        p_success := TRUE;
        p_code    := 'TEMP|' || d_user.id::TEXT;
        p_message := 'Contraseña temporal. Debe cambiar su contraseña.';
        RETURN;
    END IF;

    p_success := TRUE;
    p_message := 'Bienvenido al sistema.';
    p_code    := d_user.id::TEXT || '|' || d_user.company_id::TEXT;
END;
$function$;

-- ── PERMISOS Y PERFIL ────────────────────────────────────────────────────────

-- fn_user_permissions  (database_functions.sql)
CREATE OR REPLACE FUNCTION public.fn_user_permissions(p_user_id uuid)
 RETURNS TABLE(permission_id uuid, module_id uuid, permission_code text, permission_name text, permission_icon text, module_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id                    AS permission_id,
        p.module_id             AS module_id,
        p.code::TEXT            AS permission_code,
        p.name::TEXT            AS permission_name,
        p.permission_icon::TEXT AS permission_icon,
        m.name::TEXT            AS module_name
    FROM public.user_role ur
    INNER JOIN public.role r            ON r.id = ur.role_id AND r.is_active = TRUE
    INNER JOIN public.role_permission rp ON rp.role_id = r.id AND rp.granted = TRUE
    INNER JOIN public.permission p      ON p.id = rp.permission_id AND p.is_active = TRUE
    INNER JOIN public.module m          ON m.id = p.module_id AND m.is_active = TRUE
    WHERE ur.user_id = p_user_id
    ORDER BY module_name, permission_code;
END;
$function$;

-- fn_user_permissions_summary  (database_functions.sql — baseline)
CREATE OR REPLACE FUNCTION public.fn_user_permissions_summary(p_user_id uuid)
 RETURNS TABLE(module_code character varying, module_name character varying, permission_code character varying, permission_name character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        m.code::VARCHAR,
        m.name::VARCHAR,
        p.code::VARCHAR,
        p.name::VARCHAR
    FROM public.user_account u
    INNER JOIN public.user_role ur       ON ur.user_id = u.id
    INNER JOIN public.role r            ON r.id = ur.role_id AND r.is_active = TRUE
    INNER JOIN public.role_permission rp ON rp.role_id = r.id AND rp.granted = TRUE
    INNER JOIN public.permission p      ON p.id = rp.permission_id AND p.is_active = TRUE
    INNER JOIN public.module m          ON m.id = p.module_id AND m.is_active = TRUE
    WHERE u.id = p_user_id AND u.is_active = TRUE
    ORDER BY m.code, p.code;
END;
$function$;

-- fn_user_profile  (database_functions.sql)
-- is_internal: TRUE si el usuario pertenece a la empresa dueña (company.is_owner).
-- De aquí sale el claim JWT "IsInternal" (AuthLogic.GenerarToken) que decide si un
-- usuario ve TODOS los tickets (interno: técnico/admin) o solo los suyos (cliente).
-- Cambia la firma (columna is_internal nueva), por eso se hace DROP antes del CREATE.
DROP FUNCTION IF EXISTS public.fn_user_profile(uuid);
CREATE OR REPLACE FUNCTION public.fn_user_profile(p_user_id uuid)
 RETURNS TABLE(p_success boolean, p_message text, user_id uuid, username text, first_name text, last_name text, role text, is_internal boolean, company_id uuid, company_name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user RECORD;
    v_company RECORD;
    v_role TEXT;
BEGIN
    SELECT * INTO v_user
    FROM user_account
    WHERE id = p_user_id
      AND is_active = TRUE
      AND (is_deleted = FALSE OR is_deleted IS NULL);

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::text, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, FALSE, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT * INTO v_company FROM company WHERE id = v_user.company_id;

    SELECT r.name INTO v_role
    FROM user_role ur
    JOIN role r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    LIMIT 1;

    RETURN QUERY
    SELECT
        TRUE,
        'Perfil obtenido'::text,
        v_user.id,
        v_user.username::text,
        v_user.first_name::text,
        v_user.last_name::text,
        COALESCE(v_role, 'Usuario')::text,
        COALESCE(v_company.is_owner, FALSE),
        v_user.company_id,
        v_company.name::text;
END;
$function$;

-- ── DASHBOARD ────────────────────────────────────────────────────────────────
-- fn_dashboard — AUTORITATIVO (fix_dashboard_function.sql): RETURNS text, scope
-- owner, + overloads timestamp / timestamptz. Supera las versiones json de
-- database_setup.sql y database_functions.sql.
DROP FUNCTION IF EXISTS public.fn_dashboard(uuid, date, date);

CREATE OR REPLACE FUNCTION public.fn_dashboard(
    p_company_id uuid,
    p_date_from date,
    p_date_to date
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    WITH scoped_tickets AS (
        SELECT t.*
        FROM ticket t
        WHERE t.is_active = true
          AND t.created_at::date BETWEEN p_date_from AND p_date_to
          AND (
              t.company_id = p_company_id
              OR p_company_id = '00000000-0000-0000-0000-000000000001'::uuid
          )
    )
    SELECT jsonb_build_object(
        'totalTickets', COALESCE((SELECT count(*) FROM scoped_tickets), 0),
        'openTickets', COALESCE((
            SELECT count(*)
            FROM scoped_tickets t
            JOIN catalog_item ci ON ci.id = t.status_item_id
            WHERE ci.code = 'OPEN'
        ), 0),
        'inProgressTickets', COALESCE((
            SELECT count(*)
            FROM scoped_tickets t
            JOIN catalog_item ci ON ci.id = t.status_item_id
            WHERE ci.code = 'IN_PROGRESS'
        ), 0),
        'resolvedToday', COALESCE((
            SELECT count(*)
            FROM ticket t
            JOIN catalog_item ci ON ci.id = t.status_item_id
            WHERE t.is_active = true
              AND ci.code = 'RESOLVED'
              AND t.resolved_at::date = current_date
              AND (
                  t.company_id = p_company_id
                  OR p_company_id = '00000000-0000-0000-0000-000000000001'::uuid
              )
        ), 0),
        'slaBreached', COALESCE((
            SELECT count(*)
            FROM scoped_tickets
            WHERE COALESCE(sla_breached, false) = true
        ), 0),
        'avgResolutionHrs', COALESCE((
            SELECT round(avg(extract(epoch FROM (resolved_at - created_at)) / 3600)::numeric, 2)
            FROM scoped_tickets
            WHERE resolved_at IS NOT NULL
        ), 0),
        'totalAssets', COALESCE((
            SELECT count(*)
            FROM asset a
            WHERE a.is_active = true
              AND (
                  a.company_id = p_company_id
                  OR p_company_id = '00000000-0000-0000-0000-000000000001'::uuid
              )
        ), 0),
        'expiringContracts', COALESCE((
            SELECT count(*)
            FROM contract c
            WHERE c.is_active = true
              AND c.end_date BETWEEN current_date AND current_date + interval '30 days'
              AND (
                  c.company_id = p_company_id
                  OR p_company_id = '00000000-0000-0000-0000-000000000001'::uuid
              )
        ), 0),
        'ticketsByPriority', COALESCE((
            SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.sort_order)
            FROM (
                SELECT ci.name AS priority, ci.code, ci.sort_order, count(*) AS count
                FROM scoped_tickets t
                JOIN catalog_item ci ON ci.id = t.priority_item_id
                GROUP BY ci.name, ci.code, ci.sort_order
            ) sub
        ), '[]'::jsonb),
        'ticketsByStatus', COALESCE((
            SELECT jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.sort_order)
            FROM (
                SELECT ci.name AS status, ci.code, ci.color, ci.sort_order, count(*) AS count
                FROM scoped_tickets t
                JOIN catalog_item ci ON ci.id = t.status_item_id
                GROUP BY ci.name, ci.code, ci.color, ci.sort_order
            ) sub
        ), '[]'::jsonb)
    )
    INTO v_result;

    RETURN v_result::text;
END;
$function$;

DROP FUNCTION IF EXISTS public.fn_dashboard(uuid, timestamp without time zone, timestamp without time zone);
CREATE OR REPLACE FUNCTION public.fn_dashboard(
    p_company_id uuid,
    p_date_from timestamp without time zone,
    p_date_to timestamp without time zone
)
RETURNS text
LANGUAGE sql
AS $function$
    SELECT public.fn_dashboard(p_company_id, p_date_from::date, p_date_to::date);
$function$;

DROP FUNCTION IF EXISTS public.fn_dashboard(uuid, timestamp with time zone, timestamp with time zone);
CREATE OR REPLACE FUNCTION public.fn_dashboard(
    p_company_id uuid,
    p_date_from timestamp with time zone,
    p_date_to timestamp with time zone
)
RETURNS text
LANGUAGE sql
AS $function$
    SELECT public.fn_dashboard(p_company_id, p_date_from::date, p_date_to::date);
$function$;

-- ── CORRELATIVOS  (database_functions.sql) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_asset_tag()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    next_num INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(asset_tag FROM 4) AS INT)), 0) + 1
    INTO next_num
    FROM asset;
    RETURN 'IT-' || LPAD(next_num::TEXT, 8, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    next_num INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INT)), 0) + 1
    INTO next_num
    FROM ticket;
    RETURN 'TK-' || LPAD(next_num::TEXT, 8, '0');
END;
$function$;

-- ── MANEJO DE EXCEPCIONES  (database_functions.sql) ──────────────────────────
CREATE OR REPLACE FUNCTION gen_man_exceptionhandling_ins(
    p_date       TIMESTAMPTZ,
    p_type       VARCHAR,
    p_message    TEXT,
    p_number     VARCHAR,
    p_module     VARCHAR,
    p_dbcommand  TEXT,
    p_classname  VARCHAR,
    p_source     VARCHAR,
    p_stacktrace TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO exception_log (
        created_at, endpoint, method, status_code, message, stack_trace, request_body
    ) VALUES (
        p_date, p_classname, p_type, p_number::INT, p_message, p_stacktrace, p_dbcommand
    );
END;
$$ LANGUAGE plpgsql;

-- ── COMPAÑÍAS / TENANTS ──────────────────────────────────────────────────────

-- gen_man_company_list  (database_functions_full.sql)
CREATE OR REPLACE FUNCTION gen_man_company_list()
RETURNS TABLE (id UUID, name TEXT, ruc TEXT, email TEXT, is_owner BOOLEAN, is_active BOOLEAN, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY SELECT c.id, c.name::TEXT, c.ruc::TEXT, c.email::TEXT, c.is_owner, c.is_active, c.created_at FROM company c ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- gen_man_company_save  (database_functions_full.sql)
CREATE OR REPLACE FUNCTION gen_man_company_save(p_id UUID, p_name VARCHAR, p_ruc VARCHAR, p_email VARCHAR, p_website VARCHAR, p_address TEXT, p_phone VARCHAR)
RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO company (name, ruc, email, website, address, phone) VALUES (p_name, p_ruc, p_email, p_website, p_address, p_phone);
        RETURN QUERY SELECT TRUE, 'Empresa registrada'::TEXT;
    ELSE
        UPDATE company SET name = p_name, ruc = p_ruc, email = p_email, website = p_website, address = p_address, phone = p_phone, updated_at = now_local() WHERE id = p_id;
        RETURN QUERY SELECT TRUE, 'Empresa actualizada'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- gen_man_company_del — AUTORITATIVO (update_deletion_logic.sql): borrado físico
-- con validación de owner y colaboradores.
CREATE OR REPLACE FUNCTION gen_man_company_del(p_id UUID)
RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    -- Validar si es la empresa dueña (Owner)
    IF EXISTS (SELECT 1 FROM company WHERE id = p_id AND is_owner = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'No se puede eliminar la organización principal del sistema.'::TEXT;
        RETURN;
    END IF;

    -- Validar si tiene usuarios asociados
    IF EXISTS (SELECT 1 FROM user_account WHERE company_id = p_id AND is_deleted = FALSE) THEN
        RETURN QUERY SELECT FALSE, 'No se puede eliminar la empresa porque tiene colaboradores activos asociados.'::TEXT;
        RETURN;
    END IF;

    -- Eliminación física
    DELETE FROM company WHERE id = p_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Organización eliminada permanentemente del sistema.'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'La organización no existe o ya fue eliminada.'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ── USUARIOS ─────────────────────────────────────────────────────────────────

-- gen_man_usuario_list — AUTORITATIVO (fix_ticket_requester_company_visibility.sql):
-- scope owner + rol vía LATERAL. Supera cleanup_functions.sql / EJECUTAR / baseline.
DROP FUNCTION IF EXISTS public.gen_man_usuario_list(uuid);
CREATE OR REPLACE FUNCTION public.gen_man_usuario_list(p_company_id UUID)
RETURNS TABLE (
    id            UUID,
    username      VARCHAR,
    first_name    VARCHAR,
    last_name     VARCHAR,
    full_name     TEXT,
    email         VARCHAR,
    phone         VARCHAR,
    role          VARCHAR,
    role_id       UUID,
    company       VARCHAR,
    company_id    UUID,
    is_active     BOOLEAN,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ,
    avatar_url    TEXT
) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        NULLIF(TRIM(u.first_name || ' ' || u.last_name), '')::TEXT AS full_name,
        u.username AS email,
        COALESCE(u.phone, '') AS phone,
        COALESCE(r.name, 'Usuario') AS role,
        r.id AS role_id,
        c.name AS company,
        u.company_id,
        u.is_active,
        u.last_login_at::TIMESTAMPTZ,
        u.created_at::TIMESTAMPTZ,
        COALESCE(u.avatar_url, '') AS avatar_url
    FROM user_account u
    JOIN company c ON c.id = u.company_id
    LEFT JOIN LATERAL (
        SELECT r0.id, r0.name
        FROM user_role ur
        JOIN role r0 ON r0.id = ur.role_id
        WHERE ur.user_id = u.id
        ORDER BY r0.is_system DESC, r0.name
        LIMIT 1
    ) r ON TRUE
    WHERE u.is_deleted = FALSE
      AND u.is_active = TRUE
      AND (v_is_owner OR u.company_id = p_company_id)
    ORDER BY c.is_owner DESC, c.name, u.first_name, u.last_name, u.username;
END;
$$ LANGUAGE plpgsql;

-- gen_man_usuario_get — AUTORITATIVO / ÚNICO (fix_user_get_owner_scope.sql):
-- permite al owner editar usuarios de cualquier tenant.
CREATE OR REPLACE FUNCTION public.gen_man_usuario_get(p_company_id uuid, p_id uuid)
RETURNS TABLE(
    id uuid,
    username text,
    first_name text,
    last_name text,
    full_name text,
    email text,
    role text,
    role_id uuid,
    company text,
    company_id uuid,
    phone text,
    is_active boolean,
    last_login_at timestamp without time zone,
    avatar_url text
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        u.id::uuid,
        u.username::text,
        u.first_name::text,
        u.last_name::text,
        (COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::text AS full_name,
        u.username::text AS email,
        COALESCE(r.name, 'Usuario')::text AS role,
        r.id::uuid AS role_id,
        c.name::text AS company,
        c.id::uuid AS company_id,
        u.phone::text,
        u.is_active::boolean,
        u.last_login_at::timestamp,
        u.avatar_url::text
    FROM user_account u
    JOIN company c ON c.id = u.company_id
    LEFT JOIN user_role ur ON ur.user_id = u.id
    LEFT JOIN role r ON r.id = ur.role_id
    WHERE u.id = p_id
      AND u.is_deleted = FALSE
      AND (
          u.company_id = p_company_id
          OR p_company_id = '00000000-0000-0000-0000-000000000001'::uuid
      )
    LIMIT 1;
END;
$function$;

-- gen_man_usuario_ins — AUTORITATIVO (cleanup_functions.sql): 8-arg con avatar_url.
DROP FUNCTION IF EXISTS gen_man_usuario_ins(uuid, character varying, character varying, character varying, character varying, character varying, uuid[], text);
DROP FUNCTION IF EXISTS gen_man_usuario_ins(uuid, character varying, character varying, character varying, character varying, character varying, uuid[]);
CREATE OR REPLACE FUNCTION gen_man_usuario_ins(
    p_company_id   UUID,
    p_username     VARCHAR,
    p_password_h   VARCHAR,
    p_first_name   VARCHAR,
    p_last_name    VARCHAR,
    p_phone        VARCHAR,
    p_role_ids     UUID[],
    p_avatar_url   TEXT
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT, p_id UUID) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM user_account WHERE company_id = p_company_id AND username = p_username AND is_deleted = FALSE) THEN
        RETURN QUERY SELECT FALSE, 'El correo electrónico ya está registrado en esta empresa.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    INSERT INTO user_account (
        company_id, username, password_hash, first_name, last_name, phone,
        avatar_url, is_active, is_deleted, is_password_temporary, created_at, updated_at
    ) VALUES (
        p_company_id, p_username, p_password_h, p_first_name, p_last_name, p_phone,
        p_avatar_url, TRUE, FALSE, TRUE, now_local(), now_local()
    )
    RETURNING id INTO v_user_id;

    IF p_role_ids IS NOT NULL THEN
        INSERT INTO user_role (company_id, user_id, role_id, created_at, updated_at)
        SELECT p_company_id, v_user_id, r_id, now_local(), now_local()
        FROM unnest(p_role_ids) AS r_id;
    END IF;

    RETURN QUERY SELECT TRUE, 'Usuario creado correctamente'::TEXT, v_user_id;
END;
$$ LANGUAGE plpgsql;

-- gen_man_usuario_upd — AUTORITATIVO (cleanup_functions.sql): 9-arg con avatar_url
-- y company_id.
DROP FUNCTION IF EXISTS gen_man_usuario_upd(uuid, character varying, character varying, character varying, character varying, character varying, uuid[], text, uuid);
DROP FUNCTION IF EXISTS gen_man_usuario_upd(uuid, character varying, character varying, character varying, character varying, character varying, uuid[], uuid);
DROP FUNCTION IF EXISTS gen_man_usuario_upd(uuid, character varying, character varying, character varying, character varying, character varying, uuid[]);
CREATE OR REPLACE FUNCTION gen_man_usuario_upd(
    p_id           UUID,
    p_first_name   VARCHAR,
    p_last_name    VARCHAR,
    p_username     VARCHAR,
    p_phone        VARCHAR,
    p_password_h   VARCHAR,
    p_role_ids     UUID[],
    p_avatar_url   TEXT,
    p_company_id   UUID
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_account WHERE id = p_id) THEN
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT;
        RETURN;
    END IF;

    UPDATE user_account SET
        first_name = p_first_name,
        last_name  = p_last_name,
        username   = p_username,
        phone      = p_phone,
        avatar_url = p_avatar_url,
        company_id = COALESCE(p_company_id, company_id),
        password_hash = COALESCE(NULLIF(p_password_h, ''), password_hash),
        updated_at = now_local()
    WHERE id = p_id;

    IF p_role_ids IS NOT NULL THEN
        DELETE FROM user_role WHERE user_id = p_id;
        INSERT INTO user_role (company_id, user_id, role_id, created_at, updated_at)
        SELECT COALESCE(p_company_id, (SELECT u.company_id FROM user_account u WHERE u.id = p_id)), p_id, r_id, now_local(), now_local()
        FROM unnest(p_role_ids) AS r_id;
    END IF;

    RETURN QUERY SELECT TRUE, 'Usuario actualizado correctamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- gen_man_usuario_del — AUTORITATIVO (update_deletion_logic.sql): borrado físico
-- o soft-delete forzado si tiene historial de tickets.
CREATE OR REPLACE FUNCTION gen_man_usuario_del(p_id UUID)
RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    -- Validar si tiene tickets asociados (como solicitante o asignado)
    IF EXISTS (SELECT 1 FROM ticket WHERE requester_id = p_id OR assigned_to_id = p_id) THEN
        -- Si tiene historial, hacemos soft-delete forzado
        UPDATE user_account SET is_deleted = TRUE, is_active = FALSE, updated_at = now_local() WHERE id = p_id;
        RETURN QUERY SELECT TRUE, 'El usuario tiene historial y ha sido desactivado permanentemente.'::TEXT;
        RETURN;
    END IF;

    -- Eliminación física si no tiene historial crítico
    DELETE FROM user_account WHERE id = p_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Colaborador eliminado correctamente.'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'El usuario no existe.'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- gen_man_usuario_status_upd  (database_functions.sql)
CREATE OR REPLACE FUNCTION gen_man_usuario_status_upd(p_id UUID, p_active BOOLEAN)
RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    UPDATE user_account SET
        is_active = p_active,
        updated_at = now_local()
    WHERE id = p_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Estado actualizado correctamente'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ── ROLES ────────────────────────────────────────────────────────────────────

-- gen_man_rol_list — AUTORITATIVO (EJECUTAR_EN_BD.sql): incluye role_type.
DROP FUNCTION IF EXISTS gen_man_rol_list(UUID);
CREATE OR REPLACE FUNCTION gen_man_rol_list(p_company_id UUID)
RETURNS TABLE (
    id          UUID,
    name        TEXT,
    description TEXT,
    is_system   BOOLEAN,
    role_type   TEXT,
    user_count  INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id::UUID,
        r.name::TEXT,
        r.description::TEXT,
        r.is_system::BOOLEAN,
        r.role_type::TEXT,
        (SELECT COUNT(*)::INT
         FROM user_role ur
         JOIN user_account u ON u.id = ur.user_id
         WHERE ur.role_id = r.id AND u.is_deleted = FALSE)::INT as user_count
    FROM role r
    WHERE r.company_id = p_company_id
      AND r.is_active = TRUE
    ORDER BY r.is_system DESC, r.name ASC;
END;
$$ LANGUAGE plpgsql;

-- gen_man_rol_save — AUTORITATIVO (EJECUTAR_EN_BD.sql).
DROP FUNCTION IF EXISTS gen_man_rol_save(UUID, UUID, VARCHAR, TEXT, VARCHAR);
CREATE OR REPLACE FUNCTION gen_man_rol_save(
    p_company_id UUID,
    p_id_param   UUID,
    p_name       VARCHAR,
    p_desc       TEXT,
    p_type       VARCHAR
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT, p_id UUID) AS $$
DECLARE v_id UUID := p_id_param;
BEGIN
    -- Si el ID es NULL o es el GUID vacío, interpretarlo como inserción
    IF v_id IS NULL OR v_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
        INSERT INTO role (company_id, name, description, role_type, is_active)
        VALUES (p_company_id, p_name, p_desc, p_type, TRUE)
        RETURNING id INTO v_id;
        RETURN QUERY SELECT TRUE, 'Rol creado correctamente'::TEXT, v_id;
    ELSE
        UPDATE role SET
            name = p_name,
            description = p_desc,
            updated_at = now_local()
        WHERE id = v_id AND is_system = FALSE;

        IF FOUND THEN
            RETURN QUERY SELECT TRUE, 'Rol actualizado correctamente'::TEXT, v_id;
        ELSE
            RETURN QUERY SELECT FALSE, 'Rol no encontrado o es de sistema'::TEXT, v_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- gen_man_rol_del — AUTORITATIVO (update_more_deletion_logic.sql).
DROP FUNCTION IF EXISTS gen_man_rol_del(UUID);
CREATE OR REPLACE FUNCTION gen_man_rol_del(p_id UUID)
RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    -- Validar si es rol de sistema
    IF EXISTS (SELECT 1 FROM role WHERE id = p_id AND is_system = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'No se puede eliminar un rol de sistema.'::TEXT;
        RETURN;
    END IF;

    -- Validar si tiene usuarios asociados
    IF EXISTS (SELECT 1 FROM user_role WHERE role_id = p_id) THEN
        RETURN QUERY SELECT FALSE, 'No se puede eliminar el rol porque tiene usuarios asignados.'::TEXT;
        RETURN;
    END IF;

    -- Eliminación física
    DELETE FROM role WHERE id = p_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Perfil de acceso eliminado permanentemente.'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'El rol no existe o ya fue eliminado.'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- gen_man_rol_permisos_get — AUTORITATIVO (fix_role_permissions_ids.sql).
CREATE OR REPLACE FUNCTION gen_man_rol_permisos_get(p_company_id UUID, p_role_id UUID)
RETURNS TABLE (
    permission_id   UUID,
    permission_code TEXT,
    permission_name TEXT,
    module_name     TEXT,
    module_icon     TEXT,
    granted         BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id::UUID as permission_id,
        p.code::TEXT as permission_code,
        p.name::TEXT as permission_name,
        m.name::TEXT as module_name,
        m.icon::TEXT as module_icon,
        EXISTS(SELECT 1 FROM role_permission rp WHERE rp.role_id = p_role_id AND rp.permission_id = p.id AND rp.granted = TRUE)::BOOLEAN as granted
    FROM permission p
    JOIN module m ON m.id = p.module_id
    WHERE p.is_active = TRUE
    ORDER BY m.sort_order, p.code;
END;
$$ LANGUAGE plpgsql;

-- gen_man_rol_permisos_upd — AUTORITATIVO (fix_role_permissions_ids.sql): usa
-- UUID[] p_perm_ids. Supera la versión TEXT[] (p_perm_codes) de EJECUTAR_EN_BD.sql.
DROP FUNCTION IF EXISTS gen_man_rol_permisos_upd(UUID, UUID, TEXT[]);
CREATE OR REPLACE FUNCTION gen_man_rol_permisos_upd(
    p_company_id UUID,
    p_role_id    UUID,
    p_perm_ids   UUID[]
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    -- Limpiar permisos actuales
    DELETE FROM role_permission WHERE role_id = p_role_id;

    -- Insertar nuevos (solo los que existen en la tabla permission)
    INSERT INTO role_permission (company_id, role_id, permission_id, granted)
    SELECT p_company_id, p_role_id, p.id, TRUE
    FROM permission p
    WHERE p.id = ANY(p_perm_ids);

    RETURN QUERY SELECT TRUE, 'Permisos actualizados correctamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ── CATÁLOGOS ────────────────────────────────────────────────────────────────

-- gen_man_catalog_item_list — MERGE:
--   base fix_catalog_active_field.sql  → salida group_id + is_active (10 cols)
--   + fix_external_ticket_catalogs.sql → fallback al tenant owner cuando el tenant
--     actual no tiene items activos del grupo. Un solo cuerpo consolidado.
DROP FUNCTION IF EXISTS gen_man_catalog_item_list(UUID, VARCHAR);
CREATE OR REPLACE FUNCTION gen_man_catalog_item_list(p_company_id UUID, p_group_code VARCHAR)
RETURNS TABLE (
    id UUID,
    group_id UUID,
    code TEXT,
    name TEXT,
    description TEXT,
    color TEXT,
    icon TEXT,
    sort_order INT,
    is_default BOOLEAN,
    is_active BOOLEAN
) AS $$
DECLARE
    v_owner_company_id UUID;
    v_effective_company_id UUID;
BEGIN
    SELECT c.id
    INTO v_owner_company_id
    FROM company c
    WHERE c.is_owner = TRUE
    ORDER BY c.created_at
    LIMIT 1;

    v_owner_company_id := COALESCE(v_owner_company_id, '00000000-0000-0000-0000-000000000001'::UUID);

    -- ¿El tenant actual tiene catálogos activos para este grupo? Si no, usar owner.
    SELECT cg.company_id
    INTO v_effective_company_id
    FROM catalog_group cg
    JOIN catalog_item ci ON ci.group_id = cg.id
    WHERE cg.company_id = p_company_id
      AND cg.code = p_group_code
      AND cg.is_active = TRUE
      AND ci.is_active = TRUE
    LIMIT 1;

    v_effective_company_id := COALESCE(v_effective_company_id, v_owner_company_id);

    -- Salida completa (incluye group_id + is_active para la vista de mantenimiento).
    RETURN QUERY
    SELECT ci.id,
           ci.group_id,
           ci.code::TEXT,
           ci.name::TEXT,
           ci.description::TEXT,
           ci.color::TEXT,
           COALESCE(NULLIF(ci.icon, ''), 'circle')::TEXT,
           ci.sort_order,
           ci.is_default,
           ci.is_active
    FROM catalog_item ci
    JOIN catalog_group cg ON cg.id = ci.group_id
    WHERE ci.company_id = v_effective_company_id
      AND cg.company_id = v_effective_company_id
      AND cg.code = p_group_code
    ORDER BY ci.sort_order, ci.name;
END;
$$ LANGUAGE plpgsql;

-- gen_man_catalog_item_save — AUTORITATIVO (fix_catalog_save_and_selection.sql).
CREATE OR REPLACE FUNCTION gen_man_catalog_item_save(
    p_company_id UUID,
    p_id         UUID,
    p_group_id   UUID,
    p_code       VARCHAR,
    p_name       VARCHAR,
    p_desc       TEXT,
    p_color      VARCHAR,
    p_icon       VARCHAR,
    p_sort       INT,
    p_is_default BOOLEAN DEFAULT FALSE,
    p_is_active  BOOLEAN DEFAULT TRUE
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    IF p_id IS NULL THEN
        -- Insertar nuevo
        INSERT INTO catalog_item (
            company_id, group_id, code, name, description, color, icon, sort_order, is_default, is_active, created_at, updated_at
        ) VALUES (
            p_company_id, p_group_id, p_code, p_name, p_desc, p_color, p_icon, p_sort, p_is_default, p_is_active, now_local(), now_local()
        );
        RETURN QUERY SELECT TRUE, 'Ítem de catálogo creado correctamente'::TEXT;
    ELSE
        -- Actualizar existente
        UPDATE catalog_item SET
            group_id = p_group_id,
            code = p_code,
            name = p_name,
            description = p_desc,
            color = p_color,
            icon = p_icon,
            sort_order = p_sort,
            is_default = p_is_default,
            is_active = p_is_active,
            updated_at = now_local()
        WHERE id = p_id AND company_id = p_company_id;

        IF FOUND THEN
            RETURN QUERY SELECT TRUE, 'Ítem de catálogo actualizado correctamente'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, 'Ítem no encontrado'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- gen_man_catalog_item_del — AUTORITATIVO (fix_catalog_item_delete.sql): usa la
-- columna correcta asset_type_item_id (la variante de update_more_deletion_logic.sql
-- referenciaba asset.type_id inexistente y fue descartada).
CREATE OR REPLACE FUNCTION public.gen_man_catalog_item_del(p_id uuid)
RETURNS TABLE(p_success boolean, p_message text)
LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (SELECT 1 FROM catalog_item WHERE id = p_id AND is_system = true) THEN
        RETURN QUERY SELECT false, 'No se puede eliminar un valor predefinido del sistema.'::text;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM asset
        WHERE asset_type_item_id = p_id OR status_item_id = p_id
    ) OR EXISTS (
        SELECT 1
        FROM ticket
        WHERE type_item_id = p_id OR status_item_id = p_id OR priority_item_id = p_id
    ) THEN
        RETURN QUERY SELECT false, 'Este valor está en uso por registros existentes y no puede ser eliminado.'::text;
        RETURN;
    END IF;

    DELETE FROM catalog_item WHERE id = p_id;

    IF FOUND THEN
        RETURN QUERY SELECT true, 'Valor maestro eliminado correctamente.'::text;
    ELSE
        RETURN QUERY SELECT false, 'El valor no existe.'::text;
    END IF;
END;
$function$;

-- ── TICKETS / MESA DE AYUDA ──────────────────────────────────────────────────

-- gen_man_ticket_list (1-arg) — AUTORITATIVO (fix_ticket_flow_external_internal.sql):
-- scope owner; lista tickets de todas las empresas cliente si es owner.
DROP FUNCTION IF EXISTS gen_man_ticket_list(uuid);
DROP FUNCTION IF EXISTS gen_man_ticket_list(uuid, uuid);
CREATE OR REPLACE FUNCTION gen_man_ticket_list(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    ticket_number VARCHAR,
    subject TEXT,
    description TEXT,
    requester_name TEXT,
    assigned_to_name TEXT,
    status_name TEXT,
    status_color TEXT,
    priority_name TEXT,
    priority_color TEXT,
    created_at TIMESTAMP,
    status_code TEXT,
    priority_code TEXT
) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    RETURN QUERY
    SELECT t.id,
           t.ticket_number,
           t.subject::TEXT,
           COALESCE(t.description, '')::TEXT,
           COALESCE(NULLIF(TRIM(req.first_name || ' ' || req.last_name), ''), 'Sin solicitante')::TEXT,
           COALESCE(NULLIF(TRIM(ass.first_name || ' ' || ass.last_name), ''), 'Sin asignar')::TEXT,
           st.name::TEXT,
           st.color::TEXT,
           pr.name::TEXT,
           pr.color::TEXT,
           t.created_at,
           st.code::TEXT,
           pr.code::TEXT
    FROM ticket t
    LEFT JOIN user_account req ON req.id = t.requester_id
    LEFT JOIN user_account ass ON ass.id = t.assigned_to_id
    JOIN catalog_item st ON st.id = t.status_item_id
    JOIN catalog_item pr ON pr.id = t.priority_item_id
    WHERE t.is_active = TRUE
      AND (v_is_owner OR t.company_id = p_company_id)
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_list (2-arg) — AUTORITATIVO (fix_ticket_flow_external_internal.sql):
-- vista del usuario externo (sus tickets: requester o asignado) dentro de su empresa.
CREATE OR REPLACE FUNCTION gen_man_ticket_list(p_company_id UUID, p_user_id UUID)
RETURNS TABLE (
    id UUID,
    ticket_number VARCHAR,
    subject TEXT,
    description TEXT,
    requester_name TEXT,
    assigned_to_name TEXT,
    status_name TEXT,
    status_color TEXT,
    priority_name TEXT,
    priority_color TEXT,
    created_at TIMESTAMP,
    status_code TEXT,
    priority_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id,
           t.ticket_number,
           t.subject::TEXT,
           COALESCE(t.description, '')::TEXT,
           COALESCE(NULLIF(TRIM(req.first_name || ' ' || req.last_name), ''), 'Sin solicitante')::TEXT,
           COALESCE(NULLIF(TRIM(ass.first_name || ' ' || ass.last_name), ''), 'Sin asignar')::TEXT,
           st.name::TEXT,
           st.color::TEXT,
           pr.name::TEXT,
           pr.color::TEXT,
           t.created_at,
           st.code::TEXT,
           pr.code::TEXT
    FROM ticket t
    LEFT JOIN user_account req ON req.id = t.requester_id
    LEFT JOIN user_account ass ON ass.id = t.assigned_to_id
    JOIN catalog_item st ON st.id = t.status_item_id
    JOIN catalog_item pr ON pr.id = t.priority_item_id
    WHERE t.company_id = p_company_id
      AND t.is_active = TRUE
      AND (t.requester_id = p_user_id OR t.assigned_to_id = p_user_id)
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_get — AUTORITATIVO (fix_ticket_flow_external_internal.sql).
CREATE OR REPLACE FUNCTION gen_man_ticket_get(p_company_id UUID, p_id UUID)
RETURNS TABLE (
    id UUID,
    ticket_number TEXT,
    subject TEXT,
    description TEXT,
    status_name TEXT,
    status_code TEXT,
    status_color TEXT,
    priority_name TEXT,
    priority_code TEXT,
    requester_name TEXT,
    requester_id UUID,
    assigned_to_name TEXT,
    assigned_to_id UUID,
    type_item_id UUID,
    priority_item_id UUID,
    asset_id UUID,
    sla_breached BOOLEAN,
    created_at TIMESTAMP
) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    RETURN QUERY
    SELECT t.id,
           t.ticket_number::TEXT,
           t.subject::TEXT,
           COALESCE(t.description, '')::TEXT,
           st.name::TEXT,
           st.code::TEXT,
           st.color::TEXT,
           pr.name::TEXT,
           pr.code::TEXT,
           COALESCE(NULLIF(TRIM(req.first_name || ' ' || req.last_name), ''), 'Sin solicitante')::TEXT,
           t.requester_id,
           COALESCE(NULLIF(TRIM(ass.first_name || ' ' || ass.last_name), ''), 'Sin asignar')::TEXT,
           t.assigned_to_id,
           t.type_item_id,
           t.priority_item_id,
           t.asset_id,
           t.sla_breached,
           t.created_at
    FROM ticket t
    JOIN catalog_item st ON st.id = t.status_item_id
    JOIN catalog_item pr ON pr.id = t.priority_item_id
    LEFT JOIN user_account req ON req.id = t.requester_id
    LEFT JOIN user_account ass ON ass.id = t.assigned_to_id
    WHERE t.id = p_id
      AND t.is_active = TRUE
      AND (v_is_owner OR t.company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_ins — AUTORITATIVO (fix_ticket_requester_company_visibility.sql):
-- 8-arg con p_created_by; guarda el ticket bajo la empresa real del solicitante.
DROP FUNCTION IF EXISTS public.gen_man_ticket_ins(uuid, varchar, text, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.gen_man_ticket_ins(uuid, varchar, text, uuid, uuid, uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.gen_man_ticket_ins(
    p_company_id UUID,
    p_subject VARCHAR,
    p_desc TEXT,
    p_type_id UUID,
    p_priority_id UUID,
    p_requester_id UUID,
    p_asset_id UUID,
    p_created_by UUID DEFAULT NULL
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT, p_id UUID) AS $$
DECLARE
    v_id UUID;
    v_num TEXT;
    v_status_id UUID;
    v_owner_company_id UUID;
    v_ticket_company_id UUID;
    v_requester_company_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    SELECT c.id
    INTO v_owner_company_id
    FROM company c
    WHERE c.is_owner = TRUE
    ORDER BY c.created_at
    LIMIT 1;

    v_owner_company_id := COALESCE(v_owner_company_id, '00000000-0000-0000-0000-000000000001'::UUID);

    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    SELECT u.company_id
    INTO v_requester_company_id
    FROM user_account u
    WHERE u.id = p_requester_id
      AND u.is_deleted = FALSE
      AND u.is_active = TRUE
    LIMIT 1;

    IF v_requester_company_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'El solicitante seleccionado no existe o está inactivo.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF NOT v_is_owner AND v_requester_company_id <> p_company_id THEN
        RETURN QUERY SELECT FALSE, 'No puede abrir tickets para usuarios de otra empresa.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    v_ticket_company_id := v_requester_company_id;

    SELECT ci.id
    INTO v_status_id
    FROM catalog_item ci
    JOIN catalog_group cg ON cg.id = ci.group_id
    WHERE ci.company_id = v_ticket_company_id
      AND cg.company_id = v_ticket_company_id
      AND cg.code = 'TICKET_STATUS'
      AND ci.code = 'OPEN'
      AND ci.is_active = TRUE
    LIMIT 1;

    IF v_status_id IS NULL THEN
        SELECT ci.id
        INTO v_status_id
        FROM catalog_item ci
        JOIN catalog_group cg ON cg.id = ci.group_id
        WHERE ci.company_id = v_owner_company_id
          AND cg.company_id = v_owner_company_id
          AND cg.code = 'TICKET_STATUS'
          AND ci.code = 'OPEN'
          AND ci.is_active = TRUE
        LIMIT 1;
    END IF;

    IF v_status_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No existe el estado inicial OPEN para tickets.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_type_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Selecciona el tipo de ticket.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_priority_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Selecciona la prioridad del ticket.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_asset_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM asset a
        WHERE a.id = p_asset_id
          AND a.is_active = TRUE
          AND (v_is_owner OR a.company_id = v_ticket_company_id OR a.company_id = v_owner_company_id)
    ) THEN
        RETURN QUERY SELECT FALSE, 'El activo seleccionado no existe o no está disponible para este ticket.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    v_num := generate_ticket_number();

    INSERT INTO ticket (
        company_id,
        ticket_number,
        subject,
        description,
        type_item_id,
        status_item_id,
        priority_item_id,
        requester_id,
        asset_id,
        created_by
    )
    VALUES (
        v_ticket_company_id,
        v_num,
        p_subject,
        p_desc,
        p_type_id,
        v_status_id,
        p_priority_id,
        p_requester_id,
        p_asset_id,
        COALESCE(p_created_by, p_requester_id)
    )
    RETURNING id INTO v_id;

    RETURN QUERY SELECT TRUE, 'Ticket creado: ' || v_num, v_id;
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_status_upd — AUTORITATIVO (fix_ticket_flow_external_internal.sql).
CREATE OR REPLACE FUNCTION gen_man_ticket_status_upd(p_company_id UUID, p_id UUID, p_status_id UUID)
RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    UPDATE ticket
       SET status_item_id = p_status_id,
           updated_at = now_local()
     WHERE id = p_id
       AND is_active = TRUE
       AND (v_is_owner OR company_id = p_company_id);

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Estado actualizado'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Ticket no encontrado'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_assign — AUTORITATIVO (fix_ticket_flow_external_internal.sql).
CREATE OR REPLACE FUNCTION gen_man_ticket_assign(p_company_id UUID, p_id UUID, p_assigned_to_id UUID DEFAULT NULL)
RETURNS TABLE (success BOOLEAN, message TEXT, id UUID) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    IF NOT EXISTS (
        SELECT 1
        FROM ticket t
        WHERE t.id = p_id
          AND t.is_active = TRUE
          AND (v_is_owner OR t.company_id = p_company_id)
    ) THEN
        RETURN QUERY SELECT FALSE, 'Ticket no encontrado.'::TEXT, p_id;
        RETURN;
    END IF;

    IF p_assigned_to_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM user_account u
        WHERE u.id = p_assigned_to_id
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          AND (u.company_id = p_company_id OR v_is_owner)
    ) THEN
        RETURN QUERY SELECT FALSE, 'El técnico seleccionado no existe o no está activo.'::TEXT, p_id;
        RETURN;
    END IF;

    UPDATE ticket
       SET assigned_to_id = p_assigned_to_id,
           updated_at = now_local()
     WHERE ticket.id = p_id
       AND ticket.is_active = TRUE
       AND (v_is_owner OR ticket.company_id = p_company_id);

    RETURN QUERY SELECT TRUE, 'Ticket asignado correctamente.'::TEXT, p_id;
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_comment_ins — AUTORITATIVO (fix_ticket_flow_external_internal.sql):
-- guarda el comentario con la company_id real del ticket.
CREATE OR REPLACE FUNCTION gen_man_ticket_comment_ins(
    p_company_id UUID,
    p_ticket_id UUID,
    p_author_id UUID,
    p_body TEXT,
    p_is_internal BOOLEAN
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT, p_id UUID) AS $$
DECLARE
    v_id UUID;
    v_is_owner BOOLEAN;
    v_ticket_company_id UUID;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    SELECT t.company_id
    INTO v_ticket_company_id
    FROM ticket t
    WHERE t.id = p_ticket_id
      AND t.is_active = TRUE
      AND (v_is_owner OR t.company_id = p_company_id);

    IF v_ticket_company_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Ticket no encontrado.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    INSERT INTO ticket_comment (company_id, ticket_id, author_id, body, is_internal)
    VALUES (v_ticket_company_id, p_ticket_id, p_author_id, p_body, p_is_internal)
    RETURNING ticket_comment.id INTO v_id;

    RETURN QUERY SELECT TRUE, 'Comentario agregado'::TEXT, v_id;
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_comment_list — AUTORITATIVO (update_ticket_comments_fix.sql):
-- columnas de salida en PascalCase que espera el DTO del backend.
DROP FUNCTION IF EXISTS public.gen_man_ticket_comment_list(uuid);
CREATE OR REPLACE FUNCTION public.gen_man_ticket_comment_list(p_ticket_id uuid)
RETURNS TABLE (
    "Id" uuid,
    "TicketId" uuid,
    "AuthorId" uuid,
    "AuthorName" text,
    "AuthorInitials" text,
    "Body" text,
    "IsInternal" boolean,
    "Attachments" text,
    "CreatedAt" timestamp without time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc.ticket_id,
        tc.author_id,
        concat_ws(' ', u.first_name, u.last_name)::text AS "AuthorName",
        (
            upper(left(coalesce(u.first_name, ''), 1)) ||
            upper(left(coalesce(u.last_name, ''), 1))
        )::text AS "AuthorInitials",
        tc.body::text,
        tc.is_internal,
        coalesce(tc.attachments, '[]'::jsonb)::text,
        tc.created_at::timestamp without time zone
    FROM public.ticket_comment tc
    JOIN public.user_account u ON u.id = tc.author_id
    WHERE tc.ticket_id = p_ticket_id
    ORDER BY tc.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- gen_man_ticket_history — AUTORITATIVO (fix_ticket_flow_external_internal.sql):
-- une auditoría + comentarios del ticket.
CREATE OR REPLACE FUNCTION gen_man_ticket_history(p_company_id UUID, p_ticket_id UUID)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    action TEXT,
    title TEXT,
    detail TEXT,
    actor_name TEXT,
    is_internal BOOLEAN,
    old_values TEXT,
    new_values TEXT,
    created_at TIMESTAMP
) AS $$
DECLARE
    v_is_owner BOOLEAN;
    v_ticket_company_id UUID;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    SELECT t.company_id
    INTO v_ticket_company_id
    FROM ticket t
    WHERE t.id = p_ticket_id
      AND (v_is_owner OR t.company_id = p_company_id);

    IF v_ticket_company_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT a.id,
           'AUDIT'::TEXT AS event_type,
           a.action::TEXT,
           CASE
               WHEN a.action = 'INSERT' THEN 'Ticket creado'
               WHEN a.action = 'UPDATE' THEN 'Ticket actualizado'
               WHEN a.action = 'DELETE' THEN 'Ticket eliminado'
               ELSE 'Actividad del ticket'
           END AS title,
           CASE
               WHEN a.action = 'INSERT' THEN 'Se registró el ticket en la mesa de ayuda.'
               WHEN a.action = 'UPDATE' THEN 'Se actualizaron datos del ticket.'
               WHEN a.action = 'DELETE' THEN 'Se eliminó el ticket.'
               ELSE 'Se registró una actividad sobre el ticket.'
           END AS detail,
           COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Sistema')::TEXT AS actor_name,
           FALSE AS is_internal,
           COALESCE(a.old_values::TEXT, '{}') AS old_values,
           COALESCE(a.new_values::TEXT, '{}') AS new_values,
           a.created_at
    FROM audit_log a
    LEFT JOIN user_account u ON u.id = a.user_id
    WHERE a.company_id = v_ticket_company_id
      AND a.entity_name = 'ticket'
      AND a.entity_id = p_ticket_id

    UNION ALL

    SELECT c.id,
           CASE WHEN c.is_internal THEN 'NOTE' ELSE 'COMMENT' END::TEXT AS event_type,
           'COMMENT'::TEXT AS action,
           CASE WHEN c.is_internal THEN 'Nota interna agregada' ELSE 'Respuesta agregada' END::TEXT AS title,
           c.body::TEXT AS detail,
           COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Usuario')::TEXT AS actor_name,
           c.is_internal,
           '{}'::TEXT AS old_values,
           jsonb_build_object(
               'body', c.body,
               'is_internal', c.is_internal,
               'author_id', c.author_id,
               'ticket_id', c.ticket_id
           )::TEXT AS new_values,
           c.created_at
    FROM ticket_comment c
    LEFT JOIN user_account u ON u.id = c.author_id
    WHERE c.company_id = v_ticket_company_id
      AND c.ticket_id = p_ticket_id

    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ── CMDB / ACTIVOS ───────────────────────────────────────────────────────────
-- Familia de activos AUTORITATIVA (fix_asset_client_cloudinary.sql): activos
-- ligados a empresa cliente, scope owner, photo_url (Cloudinary), company_name.

DROP FUNCTION IF EXISTS public.gen_man_asset_list(uuid, uuid);
DROP FUNCTION IF EXISTS public.gen_man_asset_list(uuid);
DROP FUNCTION IF EXISTS public.gen_man_asset_get(uuid, uuid);
DROP FUNCTION IF EXISTS gen_man_asset_ins(uuid, character varying, uuid, uuid, text);
DROP FUNCTION IF EXISTS gen_man_asset_upd(uuid, uuid, character varying, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.gen_man_asset_list(p_company_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    company_name TEXT,
    asset_tag TEXT,
    serial_number TEXT,
    model_name TEXT,
    type_name TEXT,
    type_code TEXT,
    status_name TEXT,
    status_code TEXT,
    status_color TEXT,
    assigned_to_name TEXT,
    location_name TEXT,
    photo_url TEXT,
    created_at TIMESTAMP,
    is_active BOOLEAN
) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    RETURN QUERY
    SELECT a.id,
           a.company_id,
           co.name::TEXT AS company_name,
           a.asset_tag::TEXT,
           COALESCE(a.serial_number, '')::TEXT,
           COALESCE(am.name, '')::TEXT AS model_name,
           COALESCE(tp.name, 'Activo TI')::TEXT AS type_name,
           COALESCE(tp.code, '')::TEXT AS type_code,
           COALESCE(st.name, 'Sin estado')::TEXT AS status_name,
           COALESCE(st.code, '')::TEXT AS status_code,
           COALESCE(st.color, '#64748b')::TEXT AS status_color,
           COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Sin asignar')::TEXT AS assigned_to_name,
           COALESCE(loc.name, 'Sin ubicación')::TEXT AS location_name,
           COALESCE(a.photo_url, '')::TEXT AS photo_url,
           a.created_at,
           a.is_active
    FROM asset a
    JOIN company co ON co.id = a.company_id
    LEFT JOIN asset_model am ON am.id = a.asset_model_id
    LEFT JOIN catalog_item tp ON tp.id = a.asset_type_item_id
    LEFT JOIN catalog_item st ON st.id = a.status_item_id
    LEFT JOIN user_account u ON u.id = a.assigned_to_id
    LEFT JOIN location loc ON loc.id = a.location_id
    WHERE a.is_active = TRUE
      AND (v_is_owner OR a.company_id = p_company_id)
    ORDER BY co.name, a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.gen_man_asset_get(p_company_id UUID, p_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    company_name TEXT,
    asset_tag TEXT,
    serial_number TEXT,
    asset_model_id UUID,
    asset_type_item_id UUID,
    asset_type_name TEXT,
    status_item_id UUID,
    status_name TEXT,
    status_color TEXT,
    location_id UUID,
    location_name TEXT,
    assigned_to_id UUID,
    assigned_to_name TEXT,
    assigned_at TIMESTAMP,
    purchase_date TIMESTAMP,
    purchase_price NUMERIC,
    warranty_expires_at TIMESTAMP,
    photo_url TEXT,
    notes TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    RETURN QUERY
    SELECT a.id,
           a.company_id,
           co.name::TEXT AS company_name,
           a.asset_tag::TEXT,
           COALESCE(a.serial_number, '')::TEXT,
           a.asset_model_id,
           a.asset_type_item_id,
           COALESCE(tp.name, 'Activo TI')::TEXT AS asset_type_name,
           a.status_item_id,
           COALESCE(st.name, 'Sin estado')::TEXT AS status_name,
           COALESCE(st.color, '#64748b')::TEXT AS status_color,
           a.location_id,
           COALESCE(loc.name, 'Sin ubicación')::TEXT AS location_name,
           a.assigned_to_id,
           COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Sin asignar')::TEXT AS assigned_to_name,
           a.assigned_at,
           a.purchase_date,
           a.purchase_price,
           a.warranty_expires_at,
           COALESCE(a.photo_url, '')::TEXT AS photo_url,
           COALESCE(a.notes, '')::TEXT AS notes,
           a.is_active,
           a.created_at
    FROM asset a
    JOIN company co ON co.id = a.company_id
    LEFT JOIN catalog_item tp ON tp.id = a.asset_type_item_id
    LEFT JOIN catalog_item st ON st.id = a.status_item_id
    LEFT JOIN user_account u ON u.id = a.assigned_to_id
    LEFT JOIN location loc ON loc.id = a.location_id
    WHERE a.id = p_id
      AND a.is_active = TRUE
      AND (v_is_owner OR a.company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.gen_man_asset_ins(
    p_company_id UUID,
    p_serial VARCHAR,
    p_type_id UUID,
    p_status_id UUID,
    p_notes TEXT,
    p_photo_url TEXT DEFAULT ''
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT, p_id UUID) AS $$
DECLARE
    v_id UUID;
    v_tag TEXT;
BEGIN
    IF p_company_id IS NULL OR p_company_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
        RETURN QUERY SELECT FALSE, 'Seleccione el cliente/empresa del activo.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM company WHERE id = p_company_id AND is_active = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'La empresa seleccionada no existe o está inactiva.'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    v_tag := generate_asset_tag();

    INSERT INTO asset (
        company_id,
        asset_tag,
        serial_number,
        asset_type_item_id,
        status_item_id,
        notes,
        photo_url
    )
    VALUES (
        p_company_id,
        v_tag,
        p_serial,
        p_type_id,
        p_status_id,
        p_notes,
        COALESCE(p_photo_url, '')
    )
    RETURNING id INTO v_id;

    RETURN QUERY SELECT TRUE, 'Activo registrado: ' || v_tag, v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.gen_man_asset_upd(
    p_company_id UUID,
    p_id UUID,
    p_serial VARCHAR,
    p_type_id UUID,
    p_status_id UUID,
    p_notes TEXT,
    p_photo_url TEXT DEFAULT ''
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    UPDATE asset
       SET serial_number = p_serial,
           asset_type_item_id = p_type_id,
           status_item_id = p_status_id,
           notes = p_notes,
           photo_url = COALESCE(p_photo_url, ''),
           updated_at = now_local()
     WHERE id = p_id
       AND (v_is_owner OR company_id = p_company_id);

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Activo actualizado'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Activo no encontrado'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ── KB / BASE DE CONOCIMIENTO ────────────────────────────────────────────────

-- gen_man_kb_article_list  (database_functions_full.sql)
CREATE OR REPLACE FUNCTION gen_man_kb_article_list(p_company_id UUID, p_category_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, title TEXT, category_name TEXT, author_name TEXT, views INT, published_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id, a.title::TEXT, c.name::TEXT, (u.first_name || ' ' || u.last_name)::TEXT, a.views, a.published_at
    FROM kb_article a
    LEFT JOIN kb_category c ON c.id = a.category_id
    JOIN user_account u ON u.id = a.author_id
    WHERE a.company_id = p_company_id AND a.is_active = TRUE
      AND (p_category_id IS NULL OR a.category_id = p_category_id)
    ORDER BY a.views DESC;
END;
$$ LANGUAGE plpgsql;

-- ── CONTRATOS ────────────────────────────────────────────────────────────────

-- gen_man_contract_list  (database_functions_full.sql)
CREATE OR REPLACE FUNCTION gen_man_contract_list(p_company_id UUID)
RETURNS TABLE (id UUID, contract_number TEXT, name TEXT, vendor TEXT, start_date DATE, end_date DATE, status_name TEXT, value NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id, c.contract_number::TEXT, c.name::TEXT, c.vendor_name::TEXT, c.start_date::DATE, c.end_date::DATE,
        st.name::TEXT, c.value
    FROM contract c
    JOIN catalog_item st ON st.id = c.status_item_id
    WHERE c.company_id = p_company_id AND c.is_active = TRUE
    ORDER BY c.end_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ── AUDITORÍA ────────────────────────────────────────────────────────────────

-- gen_man_audit_list — AUTORITATIVO (update_audit_pagination.sql): 8-arg paginado
-- con filtros. Supera la versión 2-arg de fix_audit_logging.sql / full.sql.
DROP FUNCTION IF EXISTS public.gen_man_audit_list(uuid, integer);
CREATE OR REPLACE FUNCTION public.gen_man_audit_list(
    p_company_id uuid,
    p_action varchar DEFAULT NULL,
    p_entity varchar DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_from timestamp DEFAULT NULL,
    p_to timestamp DEFAULT NULL,
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 20
)
RETURNS TABLE(
    id uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    company_id uuid,
    user_id uuid,
    action varchar,
    entity_name varchar,
    entity_id uuid,
    old_values text,
    new_values text,
    ip_address varchar,
    user_agent text,
    total_count integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_page integer := GREATEST(COALESCE(p_page, 1), 1);
    v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 20), 5), 100);
    v_offset integer := 0;
    v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
BEGIN
    v_offset := (v_page - 1) * v_page_size;

    RETURN QUERY
    WITH filtered AS (
        SELECT a.*
        FROM public.audit_log a
        WHERE a.company_id = p_company_id
          AND (NULLIF(TRIM(COALESCE(p_action, '')), '') IS NULL OR upper(a.action) = upper(TRIM(p_action)))
          AND (
              NULLIF(TRIM(COALESCE(p_entity, '')), '') IS NULL
              OR lower(split_part(a.entity_name, ':', 1)) = lower(TRIM(p_entity))
              OR lower(a.entity_name) = lower(TRIM(p_entity))
          )
          AND (p_from IS NULL OR a.created_at >= p_from)
          AND (p_to IS NULL OR a.created_at < p_to)
          AND (
              v_search IS NULL
              OR a.entity_name ILIKE ('%' || v_search || '%')
              OR COALESCE(a.entity_id::text, '') ILIKE ('%' || v_search || '%')
              OR COALESCE(a.user_id::text, '') ILIKE ('%' || v_search || '%')
              OR COALESCE(a.ip_address, '') ILIKE ('%' || v_search || '%')
              OR COALESCE(a.user_agent, '') ILIKE ('%' || v_search || '%')
              OR COALESCE(a.old_values::text, '') ILIKE ('%' || v_search || '%')
              OR COALESCE(a.new_values::text, '') ILIKE ('%' || v_search || '%')
          )
    ),
    counted AS (
        SELECT
            f.*,
            COUNT(*) OVER()::integer AS total_count
        FROM filtered f
    )
    SELECT
        c.id,
        c.created_at::timestamp,
        COALESCE(c.created_at, now())::timestamp AS updated_at,
        c.company_id,
        c.user_id,
        c.action,
        c.entity_name,
        c.entity_id,
        COALESCE(c.old_values, '{}'::jsonb)::text,
        COALESCE(c.new_values, '{}'::jsonb)::text,
        COALESCE(c.ip_address, '')::varchar,
        COALESCE(c.user_agent, '')::text,
        c.total_count
    FROM counted c
    ORDER BY c.created_at DESC
    LIMIT v_page_size
    OFFSET v_offset;
END;
$$;

-- ── CONFIGURACIÓN DEL TENANT  (update_config_system.sql) ─────────────────────

-- gen_man_tenant_config_list
CREATE OR REPLACE FUNCTION gen_man_tenant_config_list(p_company_id UUID, p_group VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id           UUID,
    company_id   UUID,
    config_group VARCHAR,
    config_key   VARCHAR,
    config_value TEXT,
    value_type   VARCHAR,
    description  TEXT,
    is_sensitive BOOLEAN,
    updated_at   TIMESTAMP WITHOUT TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id, c.company_id, c.config_group, c.config_key, c.config_value,
        c.value_type, c.description, c.is_sensitive, c.updated_at
    FROM tenant_config c
    WHERE c.company_id = p_company_id
      AND (p_group IS NULL OR c.config_group = p_group)
    ORDER BY c.config_group, c.config_key;
END;
$$ LANGUAGE plpgsql;

-- gen_man_tenant_config_save
CREATE OR REPLACE FUNCTION gen_man_tenant_config_save(
    p_company_id UUID,
    p_group      VARCHAR,
    p_key        VARCHAR,
    p_value      TEXT,
    p_type       VARCHAR,
    p_desc       TEXT,
    p_sensitive  BOOLEAN,
    p_user_id    UUID
) RETURNS TABLE (p_success BOOLEAN, p_message TEXT) AS $$
BEGIN
    INSERT INTO tenant_config (company_id, config_group, config_key, config_value, value_type, description, is_sensitive, updated_by, updated_at)
    VALUES (p_company_id, p_group, p_key, p_value, p_type, p_desc, p_sensitive, p_user_id, now_local())
    ON CONFLICT (company_id, config_key) DO UPDATE SET
        config_value = EXCLUDED.config_value,
        config_group = EXCLUDED.config_group,
        value_type   = EXCLUDED.value_type,
        description  = EXCLUDED.description,
        is_sensitive = EXCLUDED.is_sensitive,
        updated_by   = EXCLUDED.updated_by,
        updated_at   = now_local();

    RETURN QUERY SELECT TRUE, 'Configuración guardada correctamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCIONES RECUPERADAS DEL NEON VIVO (2026-07-06, solo lectura)
-- Estas 18 funciones el backend las llama pero NINGÚN archivo .sql las definía
-- (se habían creado a mano en Neon). Dumpeadas con pg_get_functiondef.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.gen_man_asset_del(p_company_id uuid, p_id uuid)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE asset SET is_active = FALSE, updated_at = now_local() WHERE id = p_id AND company_id = p_company_id;
    RETURN QUERY SELECT TRUE, 'Activo eliminado'::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_catalog_group_get(p_company_id uuid, p_id uuid)
 RETURNS TABLE(id uuid, code text, name text, description text, is_system boolean, is_active boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY SELECT cg.id, cg.code::TEXT, cg.name::TEXT, cg.description::TEXT, cg.is_system, cg.is_active 
    FROM catalog_group cg WHERE cg.company_id = p_company_id AND cg.id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_catalog_group_list(p_company_id uuid)
 RETURNS TABLE(id uuid, code text, name text, description text, is_system boolean, is_active boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY SELECT cg.id, cg.code::TEXT, cg.name::TEXT, cg.description::TEXT, cg.is_system, cg.is_active 
    FROM catalog_group cg WHERE cg.company_id = p_company_id ORDER BY cg.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_company_get(p_id uuid)
 RETURNS TABLE(id uuid, name text, ruc text, email text, website text, address text, phone text, logo_url text, is_owner boolean, is_active boolean, created_at timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id, 
        c.name::TEXT, 
        c.ruc::TEXT, 
        c.email::TEXT, 
        c.website::TEXT, 
        c.address::TEXT, 
        c.phone::TEXT, 
        c.logo_url::TEXT, 
        c.is_owner, 
        c.is_active, 
        c.created_at
    FROM company c
    WHERE c.id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_company_status_upd(p_id uuid, p_active boolean)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE company SET is_active = p_active, updated_at = now_local() WHERE id = p_id;
    IF FOUND THEN RETURN QUERY SELECT TRUE, 'Estado de empresa actualizado'::TEXT;
    ELSE RETURN QUERY SELECT FALSE, 'Empresa no encontrada'::TEXT; END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_contract_del(p_company_id uuid, p_id uuid)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE contract SET is_active = FALSE, updated_at = now_local() WHERE id = p_id AND company_id = p_company_id;
    RETURN QUERY SELECT TRUE, 'Contrato eliminado'::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_contract_get(p_company_id uuid, p_id uuid)
 RETURNS TABLE(id uuid, contract_number text, name text, vendor_name text, start_date date, end_date date, status_item_id uuid, type_item_id uuid, value numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY SELECT c.id, c.contract_number::TEXT, c.name::TEXT, c.vendor_name::TEXT, c.start_date, c.end_date, c.status_item_id, c.type_item_id, c.value FROM contract c WHERE c.id = p_id AND c.company_id = p_company_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_contract_ins(p_company_id uuid, p_number character varying, p_name character varying, p_vendor character varying, p_start date, p_end date, p_status_id uuid, p_type_id uuid, p_value numeric)
 RETURNS TABLE(p_success boolean, p_message text, p_id uuid)
 LANGUAGE plpgsql
AS $function$
DECLARE v_id UUID;
BEGIN
    INSERT INTO contract (company_id, contract_number, name, vendor_name, start_date, end_date, status_item_id, type_item_id, value) VALUES (p_company_id, p_number, p_name, p_vendor, p_start, p_end, p_status_id, p_type_id, p_value) RETURNING id INTO v_id;
    RETURN QUERY SELECT TRUE, 'Contrato creado'::TEXT, v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_contract_upd(p_company_id uuid, p_id uuid, p_number character varying, p_name character varying, p_vendor character varying, p_start date, p_end date, p_status_id uuid, p_type_id uuid, p_value numeric)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE contract SET contract_number = p_number, name = p_name, vendor_name = p_vendor, start_date = p_start, end_date = p_end, status_item_id = p_status_id, type_item_id = p_type_id, value = p_value, updated_at = now_local() WHERE id = p_id AND company_id = p_company_id;
    IF FOUND THEN RETURN QUERY SELECT TRUE, 'Contrato actualizado'::TEXT; ELSE RETURN QUERY SELECT FALSE, 'Contrato no encontrado'::TEXT; END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_kb_article_del(p_company_id uuid, p_id uuid)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE kb_article SET is_active = FALSE, updated_at = now_local() WHERE id = p_id AND company_id = p_company_id;
    RETURN QUERY SELECT TRUE, 'Artículo eliminado'::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_kb_article_get(p_company_id uuid, p_id uuid)
 RETURNS TABLE(id uuid, title text, summary text, content text, category_id uuid, status text, author_id uuid, is_public boolean, tags text[])
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY SELECT a.id, a.title::TEXT, a.summary::TEXT, a.content::TEXT, a.category_id, a.status::TEXT, a.author_id, a.is_public, a.tags FROM kb_article a WHERE a.id = p_id AND a.company_id = p_company_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_kb_article_ins(p_company_id uuid, p_title character varying, p_summary text, p_content text, p_category_id uuid, p_author_id uuid)
 RETURNS TABLE(p_success boolean, p_message text, p_id uuid)
 LANGUAGE plpgsql
AS $function$
DECLARE v_id UUID;
BEGIN
    INSERT INTO kb_article (company_id, title, summary, content, category_id, author_id) VALUES (p_company_id, p_title, p_summary, p_content, p_category_id, p_author_id) RETURNING id INTO v_id;
    RETURN QUERY SELECT TRUE, 'Artículo creado'::TEXT, v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_kb_article_upd(p_company_id uuid, p_id uuid, p_title character varying, p_summary text, p_content text, p_category_id uuid)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE kb_article SET title = p_title, summary = p_summary, content = p_content, category_id = p_category_id, updated_at = now_local() WHERE id = p_id AND company_id = p_company_id;
    IF FOUND THEN RETURN QUERY SELECT TRUE, 'Artículo actualizado'::TEXT; ELSE RETURN QUERY SELECT FALSE, 'Artículo no encontrado'::TEXT; END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_report_scheduled_del(p_company_id uuid, p_id uuid)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE scheduled_report SET is_active = FALSE, updated_at = now_local() WHERE id = p_id AND company_id = p_company_id;
    RETURN QUERY SELECT TRUE, 'Reporte cancelado'::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_report_scheduled_ins(p_company_id uuid, p_name character varying, p_type character varying, p_freq character varying, p_recipients text[], p_filters text, p_format character varying, p_user_id uuid)
 RETURNS TABLE(p_success boolean, p_message text, p_id uuid)
 LANGUAGE plpgsql
AS $function$
DECLARE v_id UUID;
BEGIN
    INSERT INTO scheduled_report (company_id, name, report_type, frequency, recipients, filters, format, created_by) VALUES (p_company_id, p_name, p_type, p_freq, p_recipients, p_filters, p_format, p_user_id) RETURNING id INTO v_id;
    RETURN QUERY SELECT TRUE, 'Reporte programado'::TEXT, v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_report_scheduled_list(p_company_id uuid)
 RETURNS TABLE(id uuid, name text, report_type text, frequency text, next_run_at timestamp with time zone, recipients text[], filters text, format text, is_active boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY SELECT r.id, r.name::TEXT, r.report_type::TEXT, r.frequency::TEXT, r.next_run_at, r.recipients, r.filters::TEXT, r.format::TEXT, r.is_active FROM scheduled_report r WHERE r.company_id = p_company_id AND r.is_active = TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_tenant_config_upd(p_company_id uuid, p_key character varying, p_value text)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE tenant_config SET value = p_value, updated_at = now_local() WHERE key = p_key AND company_id = p_company_id;
    IF NOT FOUND THEN
        INSERT INTO tenant_config (company_id, key, value, value_type) VALUES (p_company_id, p_key, p_value, 'STRING');
    END IF;
    RETURN QUERY SELECT TRUE, 'Configuración actualizada'::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gen_man_ticket_upd(p_company_id uuid, p_id uuid, p_subject character varying, p_desc text, p_type_id uuid, p_priority_id uuid, p_asset_id uuid)
 RETURNS TABLE(p_success boolean, p_message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE ticket SET 
        subject = p_subject, description = p_desc, 
        type_item_id = p_type_id, priority_item_id = p_priority_id, 
        asset_id = p_asset_id, updated_at = now_local()
    WHERE id = p_id AND company_id = p_company_id;
    IF FOUND THEN RETURN QUERY SELECT TRUE, 'Ticket actualizado'::TEXT;
    ELSE RETURN QUERY SELECT FALSE, 'Ticket no encontrado'::TEXT; END IF;
END;
$function$
;



-- =============================================================================
-- SECCIÓN 7 — DATOS SEMILLA (SEED)
-- =============================================================================

-- Módulos del sistema
INSERT INTO module (code, name, icon, sort_order) VALUES
  ('HELPDESK',   'Mesa de Ayuda',       'ticket-check', 1),
  ('CMDB',       'CMDB / Inventario',   'package',      2),
  ('KB',         'Base Conocimiento',   'book-open',    3),
  ('CONTRACTS',  'Contratos',           'file-text',    4),
  ('REPORTS',    'Reportes',            'bar-chart-3',  5),
  ('ADMIN',      'Administración',      'settings',     6),
  ('AUDIT',      'Auditoría',           'shield',       7)
ON CONFLICT (code) DO NOTHING;

-- Permisos atómicos por módulo
INSERT INTO permission (module_id, code, name) VALUES
  -- Helpdesk
  ((SELECT id FROM module WHERE code='HELPDESK'), 'TICKET_VIEW',    'Ver tickets'),
  ((SELECT id FROM module WHERE code='HELPDESK'), 'TICKET_CREATE',  'Crear tickets'),
  ((SELECT id FROM module WHERE code='HELPDESK'), 'TICKET_EDIT',    'Editar tickets'),
  ((SELECT id FROM module WHERE code='HELPDESK'), 'TICKET_DELETE',  'Eliminar tickets'),
  ((SELECT id FROM module WHERE code='HELPDESK'), 'TICKET_ASSIGN',  'Asignar tickets'),
  ((SELECT id FROM module WHERE code='HELPDESK'), 'TICKET_CLOSE',   'Cerrar/resolver tickets'),
  ((SELECT id FROM module WHERE code='HELPDESK'), 'TICKET_COMMENT', 'Comentar tickets'),
  -- CMDB
  ((SELECT id FROM module WHERE code='CMDB'), 'ASSET_VIEW',        'Ver activos'),
  ((SELECT id FROM module WHERE code='CMDB'), 'ASSET_CREATE',      'Crear activos'),
  ((SELECT id FROM module WHERE code='CMDB'), 'ASSET_EDIT',        'Editar activos'),
  ((SELECT id FROM module WHERE code='CMDB'), 'ASSET_DELETE',      'Eliminar activos'),
  ((SELECT id FROM module WHERE code='CMDB'), 'ASSET_ASSIGN',      'Asignar activos'),
  ((SELECT id FROM module WHERE code='CMDB'), 'ASSET_MAINTENANCE', 'Gestionar mantenimientos'),
  -- KB
  ((SELECT id FROM module WHERE code='KB'), 'KB_VIEW',    'Ver artículos KB'),
  ((SELECT id FROM module WHERE code='KB'), 'KB_MANAGE',  'Crear/editar artículos KB'),
  -- Contratos
  ((SELECT id FROM module WHERE code='CONTRACTS'), 'CONTRACT_VIEW',   'Ver contratos'),
  ((SELECT id FROM module WHERE code='CONTRACTS'), 'CONTRACT_MANAGE', 'Gestionar contratos'),
  -- Reportes
  ((SELECT id FROM module WHERE code='REPORTS'), 'REPORT_VIEW',   'Ver reportes'),
  ((SELECT id FROM module WHERE code='REPORTS'), 'REPORT_MANAGE', 'Crear/ejecutar reportes'),
  -- Admin
  ((SELECT id FROM module WHERE code='ADMIN'), 'USER_VIEW',     'Ver usuarios'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'USER_CREATE',   'Crear usuarios'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'USER_EDIT',     'Editar usuarios'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'USER_DELETE',   'Eliminar usuarios'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'ROLE_VIEW',     'Ver roles'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'ROLE_MANAGE',   'Gestionar roles'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'COMPANY_VIEW',  'Ver tenants'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'CATALOG_VIEW',  'Ver catálogos'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'CATALOG_MANAGE','Gestionar catálogos'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'CONFIG_VIEW',   'Ver configuración'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'CONFIG_EDIT',   'Editar configuración'),
  ((SELECT id FROM module WHERE code='ADMIN'), 'SLA_MANAGE',    'Gestionar SLA'),
  -- Auditoría
  ((SELECT id FROM module WHERE code='AUDIT'), 'AUDIT_VIEW', 'Ver log de auditoría')
ON CONFLICT (code) DO NOTHING;

-- Empresa propietaria (Summit Consulting)
INSERT INTO company (id, name, ruc, email, is_owner, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Summit Consulting', '20123456789', 'admin@summitconsulting.pe', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Admin inicial de Summit  (admin@summitconsulting.pe / Admin123!)
INSERT INTO user_account (id, company_id, username, password_hash, first_name, last_name, is_password_temporary, is_active) VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'admin@summitconsulting.pe',
    crypt('Admin123!', gen_salt('bf', 10)),
    'Admin',
    'Summit',
    FALSE,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- Rol Administrador para la empresa owner  (role_type SYSTEM: la columna es nueva
-- respecto al seed original; se marca explícitamente por ser rol de sistema)
INSERT INTO role (id, company_id, name, description, role_type, is_system) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Administrador', 'Acceso total al sistema', 'SYSTEM', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Asignar todos los permisos al rol Admin
INSERT INTO role_permission (company_id, role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', id
FROM permission
ON CONFLICT DO NOTHING;

-- Asignar rol Admin al usuario admin
INSERT INTO user_role (company_id, user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- Catálogos base para la empresa owner (se replican al crear cada tenant)
-- Estados de ticket
DO $$
DECLARE v_grp UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM catalog_group WHERE company_id = '00000000-0000-0000-0000-000000000001' AND code = 'TICKET_STATUS') THEN
    INSERT INTO catalog_group (company_id, code, name, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', 'TICKET_STATUS', 'Estados de Ticket', TRUE)
    RETURNING id INTO v_grp;

    INSERT INTO catalog_item (company_id, group_id, code, name, color, sort_order, is_system, is_default) VALUES
      ('00000000-0000-0000-0000-000000000001', v_grp, 'OPEN',        'Abierto',     '#2e90fa', 1, TRUE, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'IN_PROGRESS', 'En Progreso', '#f79009', 2, TRUE, FALSE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'PENDING',     'Pendiente',   '#94a3b1', 3, TRUE, FALSE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'RESOLVED',    'Resuelto',    '#2faa6f', 4, TRUE, FALSE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'CLOSED',      'Cerrado',     '#6c7e8d', 5, TRUE, FALSE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'CANCELLED',   'Cancelado',   '#f04438', 6, TRUE, FALSE);
  END IF;
END $$;

DO $$
DECLARE v_grp UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM catalog_group WHERE company_id = '00000000-0000-0000-0000-000000000001' AND code = 'TICKET_PRIORITY') THEN
    INSERT INTO catalog_group (company_id, code, name, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', 'TICKET_PRIORITY', 'Prioridades de Ticket', TRUE)
    RETURNING id INTO v_grp;

    INSERT INTO catalog_item (company_id, group_id, code, name, color, sort_order, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', v_grp, 'CRITICAL', 'Crítica', '#f04438', 1, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'HIGH',     'Alta',    '#f79009', 2, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'MEDIUM',   'Media',   '#2e90fa', 3, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'LOW',      'Baja',    '#2faa6f', 4, TRUE);
  END IF;
END $$;

DO $$
DECLARE v_grp UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM catalog_group WHERE company_id = '00000000-0000-0000-0000-000000000001' AND code = 'TICKET_TYPE') THEN
    INSERT INTO catalog_group (company_id, code, name, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', 'TICKET_TYPE', 'Tipos de Ticket', TRUE)
    RETURNING id INTO v_grp;

    INSERT INTO catalog_item (company_id, group_id, code, name, color, sort_order, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', v_grp, 'INCIDENT', 'Incidente',  '#f04438', 1, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'REQUEST',  'Solicitud',  '#2e90fa', 2, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'CHANGE',   'Cambio',     '#f79009', 3, FALSE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'PROBLEM',  'Problema',   '#b54708', 4, FALSE);
  END IF;
END $$;

DO $$
DECLARE v_grp UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM catalog_group WHERE company_id = '00000000-0000-0000-0000-000000000001' AND code = 'ASSET_STATUS') THEN
    INSERT INTO catalog_group (company_id, code, name, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', 'ASSET_STATUS', 'Estados de Activo', TRUE)
    RETURNING id INTO v_grp;

    INSERT INTO catalog_item (company_id, group_id, code, name, color, sort_order, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', v_grp, 'ACTIVE',   'Activo',        '#2faa6f', 1, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'REPAIR',   'En reparación', '#f79009', 2, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'RETIRED',  'De baja',       '#f04438', 3, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'RESERVED', 'En reserva',    '#94a3b1', 4, FALSE);
  END IF;
END $$;

DO $$
DECLARE v_grp UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM catalog_group WHERE company_id = '00000000-0000-0000-0000-000000000001' AND code = 'ASSET_TYPE') THEN
    INSERT INTO catalog_group (company_id, code, name, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', 'ASSET_TYPE', 'Tipos de Activo', TRUE)
    RETURNING id INTO v_grp;

    INSERT INTO catalog_item (company_id, group_id, code, name, color, sort_order, is_system) VALUES
      ('00000000-0000-0000-0000-000000000001', v_grp, 'LAPTOP',    'Laptop',    '#143f5c', 1, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'DESKTOP',   'Desktop',   '#143f5c', 2, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'SERVER',    'Servidor',  '#b54708', 3, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'MONITOR',   'Monitor',   '#175cd3', 4, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'NETWORK',   'Red',       '#2b8a93', 5, TRUE),
      ('00000000-0000-0000-0000-000000000001', v_grp, 'PERIPHERAL','Periférico','#6c7e8d', 6, FALSE);
  END IF;
END $$;

-- Marcador de auditoría automática habilitada  (fix_audit_logging.sql, idempotente)
INSERT INTO public.audit_log (
    company_id, action, entity_name, old_values, new_values, ip_address, user_agent, created_at
)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'CREATE',
    'audit_config',
    '{}'::jsonb,
    jsonb_build_object('message', 'Auditoria automatica habilitada'),
    '',
    'migration',
    now()
WHERE NOT EXISTS (
    SELECT 1
    FROM public.audit_log
    WHERE company_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND entity_name = 'audit_config'
);

-- =============================================================================
-- FIN DEL SCHEMA CONSOLIDADO
-- =============================================================================
