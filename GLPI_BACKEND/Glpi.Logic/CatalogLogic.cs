using Glpi.Entities.Entities;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class CatalogLogic
{
    private readonly CatalogRepository _repo = new();
    private readonly ITenantService _tenantService;

    public CatalogLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<List<CatalogGroup>>> GetAllGroupsAsync()
    {
        try
        {
            var groups = _repo.ListarGrupos(_tenantService.CompanyId);
            return ReturnValue<List<CatalogGroup>>.Ok(groups);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<CatalogGroup>> 
                   ?? ReturnValue<List<CatalogGroup>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<List<CatalogItem>>> GetItemsByGroupCodeAsync(string groupCode)
    {
        try
        {
            var items = _repo.ListarItems(_tenantService.CompanyId, groupCode);
            return ReturnValue<List<CatalogItem>>.Ok(items);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<CatalogItem>>
                   ?? ReturnValue<List<CatalogItem>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> CreateItemAsync(string groupCode, CatalogItem item)
    {
        try
        {
            var group = _repo.ListarGrupos(_tenantService.CompanyId).FirstOrDefault(g => g.Code == groupCode);
            if (group == null) return ReturnValue.Fail("Grupo de catálogo no encontrado");

            item.Id = Guid.Empty;
            item.GroupId = group.Id;
            return _repo.GuardarItem(_tenantService.CompanyId, item);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateItemAsync(CatalogItem item)
    {
        try
        {
            return _repo.GuardarItem(_tenantService.CompanyId, item);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> DeleteItemAsync(Guid id)
    {
        try
        {
            return _repo.EliminarItem(id);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }
}
