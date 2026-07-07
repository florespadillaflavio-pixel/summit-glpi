using Glpi.Entities.DTOs;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class TicketLogic
{
    private readonly TicketRepository _repo = new();
    private readonly ITenantService _tenantService;

    public TicketLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<List<TicketSummaryDto>>> GetAllAsync()
    {
        try
        {
            var isExternal = !_tenantService.IsInternal;
            List<TicketSummaryDto> tickets;

            if (isExternal)
            {
                tickets = _repo.Listar(_tenantService.CompanyId, _tenantService.UserId);
            }
            else
            {
                tickets = _repo.Listar(_tenantService.CompanyId);
            }

            return ReturnValue<List<TicketSummaryDto>>.Ok(tickets);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<TicketSummaryDto>> 
                   ?? ReturnValue<List<TicketSummaryDto>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<TicketDetailDto>> GetByIdAsync(Guid id)
    {
        try
        {
            var ticket = _repo.ObtenerPorId(_tenantService.CompanyId, id);
            if (ticket == null) return ReturnValue<TicketDetailDto>.Fail("Ticket no encontrado.");

            var isExternal = !_tenantService.IsInternal;
            if (isExternal)
            {
                if (ticket.RequesterId != _tenantService.UserId)
                {
                    return ReturnValue<TicketDetailDto>.Fail("No tiene permiso para ver este ticket.");
                }
            }

            return ReturnValue<TicketDetailDto>.Ok(ticket);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<TicketDetailDto>
                   ?? ReturnValue<TicketDetailDto>.Fail(ex.Message);
        }
    }

    public Guid? GetTicketCompanyId(Guid id)
    {
        return _repo.ObtenerCompanyId(id);
    }

    public async Task<ReturnValue> CreateAsync(TicketCreateDto dto)
    {
        try
        {
            var isExternal = !_tenantService.IsInternal;

            // Si es Externo (Cliente), forzamos que el solicitante sea él mismo
            if (isExternal)
            {
                dto.RequesterId = _tenantService.UserId;
            }
            // Si es interno (técnico/admin) y no envió requesterId, asumimos que es para él mismo
            else if (dto.RequesterId == Guid.Empty)
            {
                dto.RequesterId = _tenantService.UserId;
            }

            return _repo.Insertar(_tenantService.CompanyId, _tenantService.UserId, dto);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }
    public async Task<ReturnValue> UpdateAsync(Guid id, TicketUpdateDto dto)
    {
        try
        {
            return _repo.Actualizar(_tenantService.CompanyId, id, dto);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateStatusAsync(Guid id, Guid statusItemId)
    {
        try
        {
            return _repo.ActualizarEstado(_tenantService.CompanyId, id, statusItemId);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> AssignAsync(Guid id, Guid? assignedToId)
    {
        try
        {
            return _repo.Asignar(_tenantService.CompanyId, id, assignedToId);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue<List<TicketCommentDto>>> GetCommentsAsync(Guid ticketId)
    {
        try
        {
            var comments = _repo.ListarComentarios(ticketId);
            
            // Si el usuario es externo, solo puede ver comentarios públicos
            if (!_tenantService.IsInternal)
            {
                comments = comments.Where(c => !c.IsInternal).ToList();
            }

            return ReturnValue<List<TicketCommentDto>>.Ok(comments);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<TicketCommentDto>>
                   ?? ReturnValue<List<TicketCommentDto>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<List<TicketHistoryDto>>> GetHistoryAsync(Guid ticketId)
    {
        try
        {
            var history = _repo.ListarHistorial(_tenantService.CompanyId, ticketId);

            // Si el usuario es externo, solo puede ver historial público
            if (!_tenantService.IsInternal)
            {
                history = history.Where(h => !h.IsInternal).ToList();
            }

            return ReturnValue<List<TicketHistoryDto>>.Ok(history);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<TicketHistoryDto>>
                   ?? ReturnValue<List<TicketHistoryDto>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> AddCommentAsync(TicketCommentCreateDto dto)
    {
        try
        {
            // Un usuario externo no puede crear notas internas
            if (!_tenantService.IsInternal)
            {
                dto.IsInternal = false;
            }

            return _repo.InsertarComentario(_tenantService.CompanyId, dto);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }
}
