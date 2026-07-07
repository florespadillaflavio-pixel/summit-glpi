using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using System.Text.Json;

namespace Glpi.Logic;

public class DashboardLogic
{
    private readonly DashboardRepository _repo = new();

    public DashboardLogic() { }

    public async Task<ReturnValue<JsonDocument>> GetKPIsAsync(Guid companyId, DateTime from, DateTime to)
    {
        try
        {
            var json = _repo.ObtenerKPIs(companyId, from, to);

            if (string.IsNullOrEmpty(json))
                return ReturnValue<JsonDocument>.Fail("No se pudieron obtener métricas");

            var jsonDoc = JsonDocument.Parse(json);
            return ReturnValue<JsonDocument>.Ok(jsonDoc);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<JsonDocument>
                   ?? ReturnValue<JsonDocument>.Fail(ex.Message);
        }
    }
}
