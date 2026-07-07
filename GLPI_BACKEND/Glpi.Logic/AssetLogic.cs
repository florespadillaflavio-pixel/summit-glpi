using Glpi.Entities.DTOs;
using Glpi.Entities.Entities;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class AssetLogic
{
    private readonly AssetRepository _repo = new();
    private readonly ITenantService _tenantService;

    public AssetLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<List<AssetSummaryDto>>> GetAllAsync()
    {
        try
        {
            var assets = _repo.Listar(_tenantService.CompanyId);
            return ReturnValue<List<AssetSummaryDto>>.Ok(assets);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<AssetSummaryDto>> 
                   ?? ReturnValue<List<AssetSummaryDto>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<Asset>> GetByIdAsync(Guid id)
    {
        try
        {
            var asset = _repo.ObtenerPorId(_tenantService.CompanyId, id);
            if (asset == null) return ReturnValue<Asset>.Fail("Activo no encontrado");
            return ReturnValue<Asset>.Ok(asset);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<Asset>
                   ?? ReturnValue<Asset>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> CreateAsync(AssetCreateUpdateDto dto)
    {
        try
        {
            var targetCompanyId = ResolveTargetCompany(dto.CompanyId);
            return _repo.Insertar(targetCompanyId, dto);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateAsync(AssetCreateUpdateDto dto)
    {
        try
        {
            return _repo.Actualizar(_tenantService.CompanyId, dto);
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
            return _repo.Eliminar(_tenantService.CompanyId, id);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    private Guid ResolveTargetCompany(Guid? requestedCompanyId)
    {
        if (!_tenantService.IsInternal) return _tenantService.CompanyId;
        return requestedCompanyId.HasValue && requestedCompanyId.Value != Guid.Empty
            ? requestedCompanyId.Value
            : _tenantService.CompanyId;
    }
}
