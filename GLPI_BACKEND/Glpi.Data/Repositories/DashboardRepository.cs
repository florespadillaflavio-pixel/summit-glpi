using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.DTOs;
using Summit.ERPGeneral.Common;
using System.Text.Json;

namespace Glpi.Data.Repositories;

public class DashboardRepository
{
    private string Conn => DbConfig.ConnectionString;

    public string ObtenerKPIs(Guid companyId, DateTime from, DateTime to)
    {
        return HelpNpg.QueryOne<string>(Conn, "fn_dashboard",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_date_from", from.Date),
            HelpNpg.P("p_date_to", to.Date)) ?? string.Empty;
    }
}
