using Glpi.Entities.Entities;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class ContractLogic
{
    private readonly ContractRepository _repo = new();
    private readonly ITenantService _tenantService;

    public ContractLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<List<Contract>>> GetAllAsync()
    {
        try
        {
            var contracts = _repo.Listar(_tenantService.CompanyId);
            return ReturnValue<List<Contract>>.Ok(contracts);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<Contract>> 
                   ?? ReturnValue<List<Contract>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<Contract>> GetByIdAsync(Guid id)
    {
        try
        {
            var contract = _repo.ObtenerPorId(_tenantService.CompanyId, id);
            if (contract == null) return ReturnValue<Contract>.Fail("Contrato no encontrado");
            return ReturnValue<Contract>.Ok(contract);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<Contract>
                   ?? ReturnValue<Contract>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> CreateAsync(Contract contract)
    {
        try
        {
            return _repo.Insertar(_tenantService.CompanyId, contract);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateAsync(Contract contract)
    {
        try
        {
            return _repo.Actualizar(_tenantService.CompanyId, contract);
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
}
