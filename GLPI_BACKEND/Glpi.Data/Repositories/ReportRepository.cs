using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Dapper;
using Npgsql;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class ReportRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<ScheduledReport> Listar(Guid companyId)
    {
        return HelpNpg.Query<ScheduledReport>(Conn, "gen_man_report_scheduled_list",
            HelpNpg.P("p_company_id", companyId));
    }

    // ------------------------------------------------------------------
    // Consultas ad-hoc (Dapper directo). Scope multitenant: el "owner"
    // (company.is_owner = TRUE) ve todas las compañías; el resto sólo la suya.
    // ------------------------------------------------------------------

    private bool EsOwner(NpgsqlConnection cx, Guid companyId)
    {
        return cx.QueryFirstOrDefault<bool>(
            "SELECT is_owner FROM company WHERE id = @CompanyId LIMIT 1",
            new { CompanyId = companyId });
    }

    private static void AplicarRangoFechas(
        string columna, DateTime? from, DateTime? to,
        List<string> where, DynamicParameters p)
    {
        if (from.HasValue)
        {
            where.Add($"{columna} >= @DateFrom");
            p.Add("DateFrom", from.Value.Date);
        }
        if (to.HasValue)
        {
            // Rango inclusivo: hasta el final del día indicado.
            where.Add($"{columna} < @DateToExclusive");
            p.Add("DateToExclusive", to.Value.Date.AddDays(1));
        }
    }

    public List<AdHocTicketRow> ConsultarTickets(Guid companyId, DateTime? from, DateTime? to)
    {
        using var cx = new NpgsqlConnection(Conn);
        cx.Open();

        var where = new List<string> { "t.is_active = TRUE" };
        var p = new DynamicParameters();

        if (!EsOwner(cx, companyId))
        {
            where.Add("t.company_id = @CompanyId");
            p.Add("CompanyId", companyId);
        }
        AplicarRangoFechas("t.created_at", from, to, where, p);

        var sql = $@"
            SELECT t.ticket_number                              AS ""TicketNumber"",
                   t.subject                                    AS ""Subject"",
                   COALESCE(cs.name, '')                        AS ""Status"",
                   COALESCE(cp.name, '')                        AS ""Priority"",
                   COALESCE(TRIM(u.first_name || ' ' || u.last_name), '') AS ""Requester"",
                   t.created_at                                 AS ""CreatedAt""
            FROM ticket t
            LEFT JOIN catalog_item cs ON cs.id = t.status_item_id
            LEFT JOIN catalog_item cp ON cp.id = t.priority_item_id
            LEFT JOIN user_account u  ON u.id  = t.requester_id
            WHERE {string.Join(" AND ", where)}
            ORDER BY t.created_at DESC";

        return cx.Query<AdHocTicketRow>(sql, p).ToList();
    }

    public List<AdHocAssetRow> ConsultarAssets(Guid companyId, DateTime? from, DateTime? to)
    {
        using var cx = new NpgsqlConnection(Conn);
        cx.Open();

        var where = new List<string> { "a.is_active = TRUE" };
        var p = new DynamicParameters();

        if (!EsOwner(cx, companyId))
        {
            where.Add("a.company_id = @CompanyId");
            p.Add("CompanyId", companyId);
        }
        AplicarRangoFechas("a.created_at", from, to, where, p);

        var sql = $@"
            SELECT a.asset_tag            AS ""AssetTag"",
                   COALESCE(am.name, '')  AS ""Model"",
                   COALESCE(ct.name, '')  AS ""Type"",
                   COALESCE(cs.name, '')  AS ""Status"",
                   COALESCE(co.name, '')  AS ""Company"",
                   a.created_at           AS ""CreatedAt""
            FROM asset a
            LEFT JOIN asset_model  am ON am.id = a.asset_model_id
            LEFT JOIN catalog_item ct ON ct.id = a.asset_type_item_id
            LEFT JOIN catalog_item cs ON cs.id = a.status_item_id
            LEFT JOIN company       co ON co.id = a.company_id
            WHERE {string.Join(" AND ", where)}
            ORDER BY a.created_at DESC";

        return cx.Query<AdHocAssetRow>(sql, p).ToList();
    }

    public List<AdHocSlaRow> ConsultarSla(Guid companyId, DateTime? from, DateTime? to)
    {
        using var cx = new NpgsqlConnection(Conn);
        cx.Open();

        var where = new List<string> { "t.is_active = TRUE" };
        var p = new DynamicParameters();

        if (!EsOwner(cx, companyId))
        {
            where.Add("t.company_id = @CompanyId");
            p.Add("CompanyId", companyId);
        }
        AplicarRangoFechas("t.created_at", from, to, where, p);

        var sql = $@"
            SELECT t.ticket_number     AS ""TicketNumber"",
                   t.subject           AS ""Subject"",
                   t.due_date          AS ""DueDate"",
                   t.first_response_at AS ""FirstResponseAt"",
                   t.resolved_at       AS ""ResolvedAt"",
                   t.sla_breached      AS ""SlaBreached""
            FROM ticket t
            WHERE {string.Join(" AND ", where)}
            ORDER BY t.created_at DESC";

        return cx.Query<AdHocSlaRow>(sql, p).ToList();
    }

    public ReturnValue Insertar(Guid companyId, ScheduledReport dto, Guid userId)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_report_scheduled_ins",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_name",       dto.Name),
            HelpNpg.P("p_type",       dto.ReportType),
            HelpNpg.P("p_freq",       dto.Frequency),
            HelpNpg.P("p_recipients", dto.Recipients),
            HelpNpg.P("p_filters",    dto.Filters),
            HelpNpg.P("p_format",     dto.Format),
            HelpNpg.P("p_user_id",    userId));
    }

    public ReturnValue Eliminar(Guid companyId, Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_report_scheduled_del",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }
}
