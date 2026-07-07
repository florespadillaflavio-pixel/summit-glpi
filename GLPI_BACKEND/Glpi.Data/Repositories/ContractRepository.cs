using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.Entities;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class ContractRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<Contract> Listar(Guid companyId)
    {
        return HelpNpg.Query<Contract>(Conn, "gen_man_contract_list",
            HelpNpg.P("p_company_id", companyId));
    }

    public Contract? ObtenerPorId(Guid companyId, Guid id)
    {
        return HelpNpg.QueryOne<Contract>(Conn, "gen_man_contract_get",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }

    public ReturnValue Insertar(Guid companyId, Contract dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_contract_ins",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_number",     dto.ContractNumber),
            HelpNpg.P("p_name",       dto.Name),
            HelpNpg.P("p_vendor",     dto.VendorName),
            HelpNpg.P("p_start",      dto.StartDate),
            HelpNpg.P("p_end",        dto.EndDate),
            HelpNpg.P("p_status_id",  dto.StatusItemId),
            HelpNpg.P("p_type_id",    dto.TypeItemId),
            HelpNpg.P("p_value",      dto.Value));
    }

    public ReturnValue Actualizar(Guid companyId, Contract dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_contract_upd",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         dto.Id),
            HelpNpg.P("p_number",     dto.ContractNumber),
            HelpNpg.P("p_name",       dto.Name),
            HelpNpg.P("p_vendor",     dto.VendorName),
            HelpNpg.P("p_start",      dto.StartDate),
            HelpNpg.P("p_end",        dto.EndDate),
            HelpNpg.P("p_status_id",  dto.StatusItemId),
            HelpNpg.P("p_type_id",    dto.TypeItemId),
            HelpNpg.P("p_value",      dto.Value));
    }

    public ReturnValue Eliminar(Guid companyId, Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_contract_del",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }
}
