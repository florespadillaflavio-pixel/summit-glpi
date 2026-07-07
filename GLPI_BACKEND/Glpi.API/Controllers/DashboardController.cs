using Glpi.Logic;
using Glpi.Framework.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly DashboardLogic _logic;
    private readonly ITenantService _tenantService;

    public DashboardController(DashboardLogic logic, ITenantService tenantService)
    {
        _logic = logic;
        _tenantService = tenantService;
    }

    [HttpGet]
    public async Task<ActionResult> GetKPIs([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-1);
        var toDate = to ?? DateTime.UtcNow;
        
        var res = await _logic.GetKPIsAsync(_tenantService.CompanyId, fromDate, toDate);
        return Ok(res);
    }
}
