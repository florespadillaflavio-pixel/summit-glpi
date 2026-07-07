using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private readonly AuditLogic _logic;

    public AuditController(AuditLogic logic)
    {
        _logic = logic;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] string? action,
        [FromQuery] string? entity,
        [FromQuery] string? q,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var res = await _logic.GetAllAsync(action, entity, q, from, to, page, pageSize);
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var res = await _logic.GetByIdAsync(id);
        return Ok(res);
    }
}
