using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class AuditLogic
{
    private readonly AuditRepository _repo = new();
    private readonly ITenantService _tenantService;

    public AuditLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<PagedResultDto<AuditLog>>> GetAllAsync(
        string? action = null,
        string? entity = null,
        string? search = null,
        DateTime? from = null,
        DateTime? to = null,
        int page = 1,
        int pageSize = 20)
    {
        try
        {
            var logs = _repo.Listar(
                _tenantService.CompanyId,
                Normalize(action),
                Normalize(entity),
                Normalize(search),
                from,
                to,
                page,
                pageSize);

            return ReturnValue<PagedResultDto<AuditLog>>.Ok(logs);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<PagedResultDto<AuditLog>> 
                   ?? ReturnValue<PagedResultDto<AuditLog>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<AuditLog>> GetByIdAsync(Guid id)
    {
        try
        {
            var logs = _repo.Listar(_tenantService.CompanyId, page: 1, pageSize: 1000);
            var log = logs.Items.FirstOrDefault(l => l.Id == id);
            if (log == null) return ReturnValue<AuditLog>.Fail("Log no encontrado");
            return ReturnValue<AuditLog>.Ok(log);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<AuditLog>
                   ?? ReturnValue<AuditLog>.Fail(ex.Message);
        }
    }

    private static string? Normalize(string? value)
    {
        value = value?.Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
