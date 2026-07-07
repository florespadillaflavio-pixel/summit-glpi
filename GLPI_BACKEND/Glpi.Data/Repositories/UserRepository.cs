using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.DTOs;
using Summit.ERPGeneral.Common;
using System.Data;
using Dapper;

namespace Glpi.Data.Repositories;

public class UserRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<UserSummaryDto> Listar(Guid companyId)
    {
        return HelpNpg.Query<UserSummaryDto>(Conn, "gen_man_usuario_list",
            HelpNpg.P("p_company_id", companyId));
    }

    public List<UserSummaryDto> Listar(IDbConnection cx, IDbTransaction? tra, Guid companyId)
    {
        return HelpNpg.Query<UserSummaryDto>(cx, tra, "gen_man_usuario_list",
            HelpNpg.P("p_company_id", companyId));
    }

    public UserDetailsDto? ObtenerPorId(Guid companyId, Guid id)
    {
        return HelpNpg.QueryOne<UserDetailsDto>(Conn, "gen_man_usuario_get",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }

    public UserDetailsDto? ObtenerPorId(IDbConnection cx, IDbTransaction? tra, Guid companyId, Guid id)
    {
        return HelpNpg.QueryOne<UserDetailsDto>(cx, tra, "gen_man_usuario_get",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }

    public ReturnValue Insertar(UserCreateUpdateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_usuario_ins",
            HelpNpg.P("p_company_id", dto.CompanyId),
            HelpNpg.P("p_username",   dto.Username),
            HelpNpg.P("p_password_h", dto.Password),
            HelpNpg.P("p_first_name", dto.FirstName),
            HelpNpg.P("p_last_name",  dto.LastName),
            HelpNpg.P("p_phone",      dto.Phone),
            HelpNpg.P("p_role_ids",   dto.RoleIds.ToArray()),
            HelpNpg.P("p_avatar_url", dto.AvatarUrl));
    }

    public ReturnValue Actualizar(UserCreateUpdateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_usuario_upd",
            HelpNpg.P("p_id",         dto.Id),
            HelpNpg.P("p_first_name", dto.FirstName),
            HelpNpg.P("p_last_name",  dto.LastName),
            HelpNpg.P("p_username",   dto.Username),
            HelpNpg.P("p_phone",      dto.Phone),
            HelpNpg.P("p_password_h", dto.Password),
            HelpNpg.P("p_role_ids",   dto.RoleIds.ToArray()),
            HelpNpg.P("p_avatar_url", dto.AvatarUrl),
            HelpNpg.P("p_company_id", dto.CompanyId));
    }

    public ReturnValue Eliminar(Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_usuario_del",
            HelpNpg.P("p_id", id));
    }

    public ReturnValue Eliminar(IDbConnection cx, IDbTransaction? tra, Guid id)
    {
        return HelpNpg.QueryReturn(cx, tra, "gen_man_usuario_del",
            HelpNpg.P("p_id", id));
    }

    public ReturnValue ActualizarEstado(Guid id, bool isActive)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_usuario_status_upd",
            HelpNpg.P("p_id",     id),
            HelpNpg.P("p_active", isActive));
    }
}
