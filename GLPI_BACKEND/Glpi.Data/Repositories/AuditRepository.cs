using Glpi.Framework.Db;
using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class AuditRepository
{
    private string Conn => DbConfig.ConnectionString;

    private class AuditLogPagedRow : AuditLog
    {
        public int TotalCount { get; set; }
    }

    public PagedResultDto<AuditLog> Listar(
        Guid companyId,
        string? action = null,
        string? entity = null,
        string? search = null,
        DateTime? from = null,
        DateTime? to = null,
        int page = 1,
        int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 100);

        var rows = HelpNpg.Query<AuditLogPagedRow>(Conn, "gen_man_audit_list",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_action", action),
            HelpNpg.P("p_entity", entity),
            HelpNpg.P("p_search", search),
            HelpNpg.P("p_from", from),
            HelpNpg.P("p_to", to),
            HelpNpg.P("p_page", page),
            HelpNpg.P("p_page_size", pageSize));

        var totalCount = rows.FirstOrDefault()?.TotalCount ?? 0;
        return new PagedResultDto<AuditLog>
        {
            Items = rows.Cast<AuditLog>().ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize))
        };
    }
}
