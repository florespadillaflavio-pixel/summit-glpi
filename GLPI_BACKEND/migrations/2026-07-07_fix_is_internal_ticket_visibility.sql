-- =============================================================================
-- Fix: visibilidad de tickets interno/cliente (2026-07-07)
-- Causa: schema.sql perdió role.is_internal y fn_user_profile no devolvía
-- is_internal, por lo que el backend trataba a TODOS como externos y admin/
-- técnico no veían los tickets creados por clientes.
-- =============================================================================

-- 1) Restaurar la columna role.is_internal (interno por defecto).
ALTER TABLE role ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT TRUE;

-- 2) Los roles de tipo Cliente son EXTERNOS; el resto (staff) internos.
UPDATE role SET is_internal = FALSE WHERE name = 'Cliente' OR role_type = 'CLIENT';
UPDATE role SET is_internal = TRUE  WHERE name IN ('Administrador','Técnico');

-- 3) fn_user_profile ahora DEVUELVE is_internal (tomado del rol del usuario).
--    (Cambia la firma RETURNS TABLE -> hay que DROP + CREATE.)
DROP FUNCTION IF EXISTS public.fn_user_profile(uuid);
CREATE FUNCTION public.fn_user_profile(p_user_id uuid)
RETURNS TABLE(
    p_success    boolean,
    p_message    text,
    user_id      uuid,
    username     text,
    first_name   text,
    last_name    text,
    role         text,
    is_internal  boolean,
    company_id   uuid,
    company_name text
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user        RECORD;
    v_company     RECORD;
    v_role        TEXT;
    v_is_internal BOOLEAN;
BEGIN
    SELECT * INTO v_user
    FROM user_account
    WHERE id = p_user_id
      AND is_active = TRUE
      AND (is_deleted = FALSE OR is_deleted IS NULL);

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::text,
            NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text,
            NULL::boolean, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT * INTO v_company FROM company WHERE id = v_user.company_id;

    SELECT r.name, COALESCE(r.is_internal, TRUE)
    INTO v_role, v_is_internal
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
        COALESCE(v_is_internal, FALSE),
        v_user.company_id,
        v_company.name::text;
END;
$function$;
