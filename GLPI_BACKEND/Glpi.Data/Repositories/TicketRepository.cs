using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.DTOs;
using Dapper;
using Npgsql;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class TicketRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<TicketSummaryDto> Listar(Guid companyId, Guid? userId = null)
    {
        if (userId == null)
        {
            return HelpNpg.Query<TicketSummaryDto>(Conn, "gen_man_ticket_list",
                HelpNpg.P("p_company_id", companyId));
        }

        return HelpNpg.Query<TicketSummaryDto>(Conn, "gen_man_ticket_list",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_user_id",    userId));
    }

    public TicketDetailDto? ObtenerPorId(Guid companyId, Guid id)
    {
        return HelpNpg.QueryOne<TicketDetailDto>(Conn, "gen_man_ticket_get",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }

    public Guid? ObtenerCompanyId(Guid id)
    {
        using var cx = new NpgsqlConnection(Conn);
        return cx.QueryFirstOrDefault<Guid?>(@"
            SELECT company_id
            FROM ticket
            WHERE id = @Id
              AND is_active = TRUE
            LIMIT 1",
            new { Id = id });
    }

    public ReturnValue Insertar(Guid companyId, Guid createdBy, TicketCreateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_ticket_ins",
            HelpNpg.P("p_company_id",   companyId),
            HelpNpg.P("p_subject",      dto.Subject),
            HelpNpg.P("p_desc",         dto.Description),
            HelpNpg.P("p_type_id",      dto.TypeItemId),
            HelpNpg.P("p_priority_id",  dto.PriorityItemId),
            HelpNpg.P("p_requester_id", dto.RequesterId),
            HelpNpg.P("p_asset_id",     dto.AssetId),
            HelpNpg.P("p_created_by",   createdBy));
    }

    public ReturnValue Actualizar(Guid companyId, Guid id, TicketUpdateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_ticket_upd",
            HelpNpg.P("p_company_id",   companyId),
            HelpNpg.P("p_id",           id),
            HelpNpg.P("p_subject",      dto.Subject),
            HelpNpg.P("p_desc",         dto.Description),
            HelpNpg.P("p_type_id",      dto.TypeItemId),
            HelpNpg.P("p_priority_id",  dto.PriorityItemId),
            HelpNpg.P("p_asset_id",     dto.AssetId));
    }

    public ReturnValue ActualizarEstado(Guid companyId, Guid id, Guid statusId)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_ticket_status_upd",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id),
            HelpNpg.P("p_status_id",  statusId));
    }

    public ReturnValue Asignar(Guid companyId, Guid id, Guid? assignedToId)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_ticket_assign",
            HelpNpg.P("p_company_id",     companyId),
            HelpNpg.P("p_id",             id),
            HelpNpg.P("p_assigned_to_id", assignedToId));
    }

    public List<TicketCommentDto> ListarComentarios(Guid ticketId)
    {
        return HelpNpg.Query<TicketCommentDto>(Conn, "gen_man_ticket_comment_list",
            HelpNpg.P("p_ticket_id", ticketId));
    }

    public List<TicketHistoryDto> ListarHistorial(Guid companyId, Guid ticketId)
    {
        return HelpNpg.Query<TicketHistoryDto>(Conn, "gen_man_ticket_history",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_ticket_id", ticketId));
    }

    public ReturnValue InsertarComentario(Guid companyId, TicketCommentCreateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_ticket_comment_ins",
            HelpNpg.P("p_company_id",  companyId),
            HelpNpg.P("p_ticket_id",   dto.TicketId),
            HelpNpg.P("p_author_id",   dto.AuthorId),
            HelpNpg.P("p_body",        dto.Body),
            HelpNpg.P("p_is_internal", dto.IsInternal));
    }
}
