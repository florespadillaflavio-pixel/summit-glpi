using Glpi.Entities.Entities;
using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CatalogController : ControllerBase
{
    private readonly CatalogLogic _logic;

    public CatalogController(CatalogLogic logic)
    {
        _logic = logic;
    }

    [HttpGet]
    public async Task<ActionResult> GetAllGroups()
    {
        var res = await _logic.GetAllGroupsAsync();
        return Ok(res);
    }

    [HttpGet("{groupCode}/items")]
    public async Task<ActionResult> GetGroupItems(string groupCode)
    {
        var res = await _logic.GetItemsByGroupCodeAsync(groupCode);
        return Ok(res);
    }

    [HttpPost("{groupCode}/items")]
    public async Task<ActionResult> CreateItem(string groupCode, [FromBody] CatalogItem item)
    {
        var res = await _logic.CreateItemAsync(groupCode, item);
        return Ok(res);
    }

    [HttpPut("items/{id}")]
    public async Task<ActionResult> UpdateItem(Guid id, [FromBody] CatalogItem item)
    {
        if (id != item.Id) return BadRequest();
        var res = await _logic.UpdateItemAsync(item);
        return Ok(res);
    }

    [HttpDelete("items/{id}")]
    public async Task<ActionResult> DeleteItem(Guid id)
    {
        var res = await _logic.DeleteItemAsync(id);
        return Ok(res);
    }
}
