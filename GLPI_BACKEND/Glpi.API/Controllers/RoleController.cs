using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RoleController : ControllerBase
{
    private readonly RoleLogic _logic;

    public RoleController(RoleLogic logic)
    {
        _logic = logic;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var res = await _logic.GetAllAsync();
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var res = await _logic.GetByIdAsync(id);
        if (!res.Success) return NotFound(res);
        return Ok(res);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] RoleCreateDto role)
    {
        var res = await _logic.CreateAsync(role);
        return Ok(res);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] RoleCreateDto role)
    {
        if (id != role.Id) return BadRequest();
        var res = await _logic.UpdateAsync(role);
        return Ok(res);
    }

    [HttpGet("{id}/permissions")]
    public async Task<ActionResult> GetPermissions(Guid id)
    {
        var res = await _logic.GetPermissionsAsync(id);
        return Ok(res);
    }

    [HttpPut("{id}/permissions")]
    public async Task<ActionResult> SetPermissions(Guid id, [FromBody] PermissionUpdateDto req)
    {
        var res = await _logic.SetPermissionsAsync(id, req.PermissionIds);
        return Ok(res);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var res = await _logic.DeleteAsync(id);
        return Ok(res);
    }
}
