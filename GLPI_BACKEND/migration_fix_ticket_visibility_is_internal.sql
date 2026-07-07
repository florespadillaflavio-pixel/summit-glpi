-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: arreglar visibilidad de tickets para usuarios internos
-- (técnicos / administradores).
--
-- PROBLEMA: un ticket creado por un cliente no lo veían los técnicos ni los
-- administradores. Causa: fn_user_profile NO devolvía la columna is_internal,
-- así que el claim JWT "IsInternal" salía SIEMPRE en false y TODOS los usuarios
-- eran tratados como externos (solo veían sus propios tickets).
--
-- SOLUCIÓN: fn_user_profile ahora devuelve is_internal = company.is_owner.
-- Así los usuarios de la empresa dueña (Summit) quedan como internos y usan la
-- consulta gen_man_ticket_list(company_id) que ve TODOS los tickets.
--
-- No requiere recompilar el backend .NET: el código ya espera este campo.
-- Después de aplicar, los usuarios deben CERRAR SESIÓN Y VOLVER A ENTRAR para
-- que se emita un token nuevo con el claim correcto.
--
-- Idempotente: se puede ejecutar varias veces sin problema.
-- ─────────────────────────────────────────────────────────────────────────────

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
