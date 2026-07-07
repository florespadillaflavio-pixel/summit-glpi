using Glpi.Entities.Entities;
using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ContractController : ControllerBase
{
    private readonly ContractLogic _logic;

    public ContractController(ContractLogic logic)
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
        return Ok(res);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] Contract contract)
    {
        var res = await _logic.CreateAsync(contract);
        return Ok(res);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] Contract contract)
    {
        if (id != contract.Id) return BadRequest();
        var res = await _logic.UpdateAsync(contract);
        return Ok(res);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var res = await _logic.DeleteAsync(id);
        return Ok(res);
    }
}
