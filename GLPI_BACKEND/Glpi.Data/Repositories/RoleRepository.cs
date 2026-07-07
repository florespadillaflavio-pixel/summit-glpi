using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.DTOs;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class RoleRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<RoleSummaryDto> Listar(Guid companyId)
    {
        return HelpNpg.Query<RoleSummaryDto>(Conn, "gen_man_rol_list",
            HelpNpg.P("p_company_id", companyId));
    }

    public ReturnValue Guardar(Guid companyId, RoleCreateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_rol_save",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         dto.Id),
            HelpNpg.P("p_name",       dto.Name),
            HelpNpg.P("p_desc",       dto.Description),
            HelpNpg.P("p_type",       string.IsNullOrWhiteSpace(dto.RoleType) ? "CUSTOM" : dto.RoleType));
    }

    public List<RolePermissionMatrixDto> ObtenerMatrizPermisos(Guid companyId, Guid roleId)
    {
        return HelpNpg.Query<RolePermissionMatrixDto>(Conn, "gen_man_rol_permisos_get",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_role_id",    roleId));
    }

    public ReturnValue ActualizarPermisos(Guid companyId, Guid roleId, Guid[] permissionIds)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_rol_permisos_upd",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_role_id",    roleId),
            HelpNpg.P("p_perm_ids",   permissionIds));
    }

    public ReturnValue Eliminar(Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_rol_del",
            HelpNpg.P("p_id", id));
    }
}
