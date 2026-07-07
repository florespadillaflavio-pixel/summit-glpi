using Glpi.Entities.Entities;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Common;
using Glpi.Framework.Db;
using Npgsql;
using System.Data;

namespace Glpi.Logic;

public class CompanyLogic
{
    private readonly CompanyRepository _repo = new();
    private readonly IFileStorageService _storageService;

    public CompanyLogic(IFileStorageService storageService)
    {
        _storageService = storageService;
    }

    public async Task<ReturnValue<List<Company>>> GetAllAsync()
    {
        try
        {
            var companies = _repo.Listar();
            return ReturnValue<List<Company>>.Ok(companies);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<Company>> 
                   ?? ReturnValue<List<Company>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<Company>> GetByIdAsync(Guid id)
    {
        try
        {
            var company = _repo.ObtenerPorId(id);
            if (company == null) return ReturnValue<Company>.Fail("Empresa no encontrada");
            return ReturnValue<Company>.Ok(company);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<Company>
                   ?? ReturnValue<Company>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> CreateAsync(Company company)
    {
        try
        {
            company.Id = Guid.Empty; // Force insert
            return _repo.Guardar(company);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateAsync(Company company)
    {
        try
        {
            return _repo.Guardar(company);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> ToggleStatusAsync(Guid id)
    {
        try
        {
            var company = _repo.Listar().FirstOrDefault(c => c.Id == id);
            if (company == null) return ReturnValue.Fail("Empresa no encontrada");

            return _repo.ActualizarEstado(id, !company.IsActive);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> DeleteAsync(Guid id)
    {
        using var cx = new NpgsqlConnection(DbConfig.ConnectionString);
        cx.Open();
        using var tra = cx.BeginTransaction();

        try
        {
            // 1. Obtener datos actuales dentro de la transacción
            var company = _repo.ObtenerPorId(cx, tra, id);
            if (company == null) return ReturnValue.Fail("Empresa no encontrada.");

            // 2. Borrar de BD
            var res = _repo.Eliminar(cx, tra, id);

            if (!res.Success)
            {
                tra.Rollback();
                return res;
            }

            // 3. Si tenía logo, borrar de Cloudinary ANTES de confirmar
            if (!string.IsNullOrEmpty(company.LogoUrl))
            {
                var fileDeleted = await _storageService.DeleteFileByUrlAsync(company.LogoUrl);
                if (!fileDeleted)
                {
                    tra.Rollback();
                    return ReturnValue.Fail("No se pudo eliminar el logo del servidor externo. Operación cancelada.");
                }
            }

            tra.Commit();
            return res;
        }
        catch (Exception ex)
        {
            tra.Rollback();
            return HelpException.LogAndNotifyReturn(ex);
        }
    }
}
