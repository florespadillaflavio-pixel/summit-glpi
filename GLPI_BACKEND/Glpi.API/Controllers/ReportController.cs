using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportController : ControllerBase
{
    private readonly ReportLogic _logic;

    public ReportController(ReportLogic logic)
    {
        _logic = logic;
    }

    [HttpGet("scheduled")]
    public async Task<ActionResult> GetScheduled()
    {
        var res = await _logic.GetScheduledReportsAsync();
        return Ok(res);
    }

    [HttpPost("scheduled")]
    public async Task<ActionResult> CreateScheduled([FromBody] ScheduledReport report)
    {
        var res = await _logic.CreateScheduledReportAsync(report);
        return Ok(res);
    }

    [HttpDelete("scheduled/{id}")]
    public async Task<ActionResult> DeleteScheduled(Guid id)
    {
        var res = await _logic.DeleteScheduledReportAsync(id);
        return Ok(res);
    }

    // POST /api/Report/ad-hoc/{type}  (type: tickets | assets | sla)
    // Body: { "dateFrom": "YYYY-MM-DD"|null, "dateTo": "YYYY-MM-DD"|null, "format": "PDF"|"EXCEL" }
    // Devuelve el archivo binario (PDF o XLSX) como descarga.
    [HttpPost("ad-hoc/{type}")]
    public ActionResult GenerateAdHoc(string type, [FromBody] AdHocReportRequest request)
    {
        var res = _logic.GenerateAdHoc(type, request);
        if (!res.Success || res.Data == null)
            return BadRequest(res.Message);

        return File(res.Data.Bytes, res.Data.ContentType, res.Data.FileName);
    }
}
