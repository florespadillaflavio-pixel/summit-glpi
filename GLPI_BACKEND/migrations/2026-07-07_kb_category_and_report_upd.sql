-- =============================================================================
-- Migración: 2026-07-07
-- 1) gen_man_kb_category_list  — listado de categorías de la base de conocimiento
-- 2) gen_man_report_scheduled_upd — actualización de reportes programados
-- =============================================================================

-- ── KB / CATEGORÍAS ──────────────────────────────────────────────────────────
-- Devuelve las categorías (kb_category) del tenant. Mantiene el estilo de
-- alcance "owner" del resto de gen_man_*_list: la compañía dueña (is_owner)
-- ve todas las categorías; el resto sólo las suyas. Ordenado por sort_order.
--
-- Nota: la tabla kb_category NO posee columna "description"; las columnas reales
-- son (id, company_id, parent_id, name, icon, sort_order, is_active, created_at),
-- por lo que la función expone id, company_id, name, icon, sort_order, is_active
-- para calzar exactamente con la entidad C# KbCategory.
CREATE OR REPLACE FUNCTION public.gen_man_kb_category_list(p_company_id uuid)
RETURNS TABLE(
    id         uuid,
    company_id uuid,
    name       text,
    icon       text,
    sort_order integer,
    is_active  boolean
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_is_owner BOOLEAN;
BEGIN
    SELECT COALESCE(c.is_owner, FALSE)
    INTO v_is_owner
    FROM company c
    WHERE c.id = p_company_id;

    RETURN QUERY
    SELECT k.id,
           k.company_id,
           k.name::TEXT,
           k.icon::TEXT,
           k.sort_order,
           k.is_active
    FROM kb_category k
    WHERE k.is_active = TRUE
      AND (v_is_owner OR k.company_id = p_company_id)
    ORDER BY k.sort_order;
END;
$function$;

-- ── REPORTES PROGRAMADOS / UPDATE ────────────────────────────────────────────
-- Actualiza un reporte programado del tenant. Mantiene el estilo de firma de
-- gen_man_report_scheduled_ins (character varying, text[] para recipients) y
-- devuelve (p_success, p_message) como el resto de operaciones CUD.
CREATE OR REPLACE FUNCTION public.gen_man_report_scheduled_upd(
    p_id         uuid,
    p_company_id uuid,
    p_name       character varying,
    p_type       character varying,
    p_frequency  character varying,
    p_recipients text[],
    p_format     character varying,
    p_is_active  boolean
)
RETURNS TABLE(p_success boolean, p_message text)
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE scheduled_report
       SET name        = p_name,
           report_type = p_type,
           frequency   = p_frequency,
           recipients  = p_recipients,
           format      = p_format,
           is_active   = p_is_active,
           updated_at  = now_local()
     WHERE id = p_id
       AND company_id = p_company_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Reporte actualizado'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Reporte no encontrado'::TEXT;
    END IF;
END;
$function$;
