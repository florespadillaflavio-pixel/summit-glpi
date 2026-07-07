using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Glpi.Logic.AI;
using Glpi.Framework.Response;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AIController : ControllerBase
{
    private readonly AILogic _aiLogic;

    public AIController(AILogic aiLogic)
    {
        _aiLogic = aiLogic;
    }

    [HttpGet("analyze-ticket")]
    public async Task<ActionResult<ReturnValue<string>>> AnalyzeTicket([FromQuery] string subject, [FromQuery] string description)
    {
        var res = await _aiLogic.AnalyzeTicketAsync(subject, description);
        return Ok(res);
    }
}
