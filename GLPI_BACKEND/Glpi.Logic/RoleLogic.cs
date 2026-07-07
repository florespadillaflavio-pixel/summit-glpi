using Glpi.Entities.DTOs;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class RoleLogic
{
    private readonly RoleRepository _repo = new();
    private readonly ITenantService _tenantService;

    public RoleLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<List<RoleSummaryDto>>> GetAllAsync()
    {
        try
        {
            var roles = _repo.Listar(_tenantService.CompanyId);
            return ReturnValue<List<RoleSummaryDto>>.Ok(roles);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<RoleSummaryDto>> 
                   ?? ReturnValue<List<RoleSummaryDto>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<RoleSummaryDto>> GetByIdAsync(Guid id)
    {
        try
        {
            var role = _repo.Listar(_tenantService.CompanyId).FirstOrDefault(r => r.Id == id);
            return role != null ? ReturnValue<RoleSummaryDto>.Ok(role) : ReturnValue<RoleSummaryDto>.Fail("Rol no encontrado");
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<RoleSummaryDto> ?? ReturnValue<RoleSummaryDto>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> CreateAsync(RoleCreateDto dto)
    {
        try
        {
            dto.RoleType = NormalizeRoleType(dto.RoleType);
            return _repo.Guardar(_tenantService.CompanyId, dto);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateAsync(RoleCreateDto dto)
    {
        try
        {
            dto.RoleType = NormalizeRoleType(dto.RoleType);
            return _repo.Guardar(_tenantService.CompanyId, dto);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue<List<RolePermissionMatrixDto>>> GetPermissionsAsync(Guid roleId)
    {
        try
        {
            var matrix = _repo.ObtenerMatrizPermisos(_tenantService.CompanyId, roleId);
            return ReturnValue<List<RolePermissionMatrixDto>>.Ok(matrix);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<RolePermissionMatrixDto>>
                   ?? ReturnValue<List<RolePermissionMatrixDto>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> SetPermissionsAsync(Guid roleId, List<Guid> permissionIds)
    {
        try
        {
            return _repo.ActualizarPermisos(_tenantService.CompanyId, roleId, permissionIds.ToArray());
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> DeleteAsync(Guid id)
    {
        try
        {
            return _repo.Eliminar(id);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    private static string NormalizeRoleType(string? roleType)
    {
        var value = (roleType ?? "CUSTOM").Trim().ToUpperInvariant();
        return value == "CLIENT" ? "CLIENT" : "CUSTOM";
    }
}
