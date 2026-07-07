using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Glpi.API.Hubs;
using Glpi.Framework.Auth;
using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TicketController : ControllerBase
{
    private static readonly Guid OwnerCompanyId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private readonly TicketLogic _logic;
    private readonly IHubContext<TicketHub> _hub;
    private readonly ITenantService _tenantService;

    public TicketController(TicketLogic logic, IHubContext<TicketHub> hub, ITenantService tenantService)
    {
        _logic = logic;
        _hub = hub;
        _tenantService = tenantService;
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
    public async Task<ActionResult> Create([FromBody] TicketCreateDto ticket)
    {
        var res = await _logic.CreateAsync(ticket);
        if (res.Success)
        {
            await BroadcastTicketAsync(res.Id, "ticket-created", new { id = res.Id, res.Code });
        }
        return Ok(res);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] TicketUpdateDto ticket)
    {
        var res = await _logic.UpdateAsync(id, ticket);
        if (res.Success)
        {
            await BroadcastTicketAsync(id, "ticket-updated", new { id });
        }
        return Ok(res);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult> UpdateStatus(Guid id, [FromBody] TicketStatusUpdateDto req)
    {
        var res = await _logic.UpdateStatusAsync(id, req.StatusItemId);
        if (res.Success)
        {
            await BroadcastTicketAsync(id, "ticket-status-changed", new { id, statusItemId = req.StatusItemId });
        }
        return Ok(res);
    }

    [HttpPatch("{id}/assign")]
    public async Task<ActionResult> Assign(Guid id, [FromBody] TicketAssignDto req)
    {
        var res = await _logic.AssignAsync(id, req.AssignedToId);
        if (res.Success)
        {
            await BroadcastTicketAsync(id, "ticket-assigned", new { id, assignedToId = req.AssignedToId });
        }
        return Ok(res);
    }

    [HttpGet("{id}/comments")]
    public async Task<ActionResult> GetComments(Guid id)
    {
        var res = await _logic.GetCommentsAsync(id);
        return Ok(res);
    }

    [HttpGet("{id}/history")]
    public async Task<ActionResult> GetHistory(Guid id)
    {
        var res = await _logic.GetHistoryAsync(id);
        return Ok(res);
    }

    [HttpPost("{id}/comments")]
    public async Task<ActionResult> AddComment(Guid id, [FromBody] TicketCommentCreateDto comment)
    {
        if (id != comment.TicketId) return BadRequest();
        var res = await _logic.AddCommentAsync(comment);
        if (res.Success)
        {
            var eventName = comment.IsInternal ? "ticket-note-added" : "ticket-comment-added";
            var payload = new { id, isInternal = comment.IsInternal };

            if (comment.IsInternal)
            {
                // Las notas internas solo se notifican al soporte interno.
                await _hub.Clients.Group(TicketHub.InternalGroup(OwnerCompanyId)).SendAsync(eventName, payload);
            }
            else
            {
                await BroadcastTicketAsync(id, eventName, payload);
            }
        }
        return Ok(res);
    }

    private async Task BroadcastTicketAsync(Guid? ticketId, string eventName, object payload)
    {
        var groups = new HashSet<string>
        {
            TicketHub.TenantGroup(_tenantService.CompanyId),
            TicketHub.TenantGroup(OwnerCompanyId)
        };

        if (ticketId.HasValue)
        {
            var ticketCompanyId = _logic.GetTicketCompanyId(ticketId.Value);
            if (ticketCompanyId.HasValue)
            {
                groups.Add(TicketHub.TenantGroup(ticketCompanyId.Value));
            }
        }

        foreach (var group in groups)
        {
            await _hub.Clients.Group(group).SendAsync(eventName, payload);
        }
    }
}
