using Glpi.Entities.Entities;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;
using Glpi.Entities.DTOs;
using Microsoft.Extensions.Configuration;

namespace Glpi.Logic;

public class ConfigLogic
{
    private readonly ConfigRepository _repo = new();
    private readonly ITenantService _tenantService;
    private readonly string _encryptionKey;

    public ConfigLogic(ITenantService tenantService, IConfiguration config)
    {
        _tenantService = tenantService;
        _encryptionKey = config["Jwt:Key"] ?? "SummitGLPI_Default_Key_2026"; // Usamos la misma del JWT o una dedicada
    }

    public async Task<ReturnValue<List<TenantConfig>>> GetConfigsAsync(string? group = null)
    {
        try
        {
            var configs = _repo.Listar(_tenantService.CompanyId, group);
            
            // Si es sensible, ocultamos el valor para el frontend (no lo desencriptamos aquí por seguridad)
            foreach (var c in configs.Where(x => x.IsSensitive))
            {
                c.ConfigValue = "********";
            }

            return ReturnValue<List<TenantConfig>>.Ok(configs);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<TenantConfig>> 
                   ?? ReturnValue<List<TenantConfig>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> SaveConfigAsync(ConfigSaveDto dto)
    {
        try
        {
            var config = new TenantConfig
            {
                CompanyId = _tenantService.CompanyId,
                ConfigGroup = dto.ConfigGroup.ToUpper(),
                ConfigKey = dto.ConfigKey.ToUpper(),
                ValueType = dto.ValueType.ToUpper(),
                Description = dto.Description,
                IsSensitive = dto.IsSensitive,
                UpdatedBy = null, // Debería venir del token si es necesario
                ConfigValue = dto.ConfigValue
            };

            // Si es sensible, encriptamos antes de guardar
            if (config.IsSensitive && !string.IsNullOrEmpty(config.ConfigValue))
            {
                config.ConfigValue = HelpEncrypt.Encryptor(config.ConfigValue, _encryptionKey);
            }

            return _repo.Guardar(config);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    /// <summary>
    /// Uso interno para servicios del backend (Email, AI, etc.)
    /// </summary>
    public string GetDecryptedValue(string key)
    {
        var normalizedKey = key.ToUpper();
        var config = _repo.ObtenerPorClave(_tenantService.CompanyId, normalizedKey);

        if (config == null)
        {
            var ownerCompanyId = _repo.ObtenerCompanyOwner();
            if (ownerCompanyId.HasValue && ownerCompanyId.Value != _tenantService.CompanyId)
            {
                config = _repo.ObtenerPorClave(ownerCompanyId.Value, normalizedKey);
            }
        }
        
        if (config == null) return string.Empty;
        
        if (config.IsSensitive)
        {
            return HelpEncrypt.Decryptor(config.ConfigValue, _encryptionKey);
        }
        
        return config.ConfigValue;
    }
}
