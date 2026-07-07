using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.Entities;
using Summit.ERPGeneral.Common;
using System.Data;

namespace Glpi.Data.Repositories;

public class CompanyRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<Company> Listar()
    {
        return HelpNpg.Query<Company>(Conn, "gen_man_company_list");
    }

    public List<Company> Listar(IDbConnection cx, IDbTransaction? tra)
    {
        return HelpNpg.Query<Company>(cx, tra, "gen_man_company_list");
    }

    public Company? ObtenerPorId(Guid id)
    {
        return HelpNpg.QueryOne<Company>(Conn, "gen_man_company_get",
            HelpNpg.P("p_id", id));
    }

    public Company? ObtenerPorId(IDbConnection cx, IDbTransaction? tra, Guid id)
    {
        return HelpNpg.QueryOne<Company>(cx, tra, "gen_man_company_get",
            HelpNpg.P("p_id", id));
    }

    public ReturnValue Guardar(Company dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_company_save",
            HelpNpg.P("p_id",      dto.Id == Guid.Empty ? null : dto.Id),
            HelpNpg.P("p_name",    dto.Name),
            HelpNpg.P("p_ruc",     dto.Ruc),
            HelpNpg.P("p_email",   dto.Email),
            HelpNpg.P("p_website", dto.Website),
            HelpNpg.P("p_address", dto.Address),
            HelpNpg.P("p_phone",   dto.Phone),
            HelpNpg.P("p_logo_url", dto.LogoUrl));
    }

    public ReturnValue ActualizarEstado(Guid id, bool isActive)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_company_status_upd",
            HelpNpg.P("p_id",     id),
            HelpNpg.P("p_active", isActive));
    }

    public ReturnValue Eliminar(Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_company_del",
            HelpNpg.P("p_id", id));
    }

    public ReturnValue Eliminar(IDbConnection cx, IDbTransaction? tra, Guid id)
    {
        return HelpNpg.QueryReturn(cx, tra, "gen_man_company_del",
            HelpNpg.P("p_id", id));
    }
}
