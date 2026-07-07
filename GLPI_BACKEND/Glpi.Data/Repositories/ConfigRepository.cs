using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.Entities;
using Dapper;
using Npgsql;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class ConfigRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<TenantConfig> Listar(Guid companyId, string? group = null)
    {
        return HelpNpg.Query<TenantConfig>(Conn, "gen_man_tenant_config_list",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_group",      group));
    }

    public ReturnValue Guardar(TenantConfig config)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_tenant_config_save",
            HelpNpg.P("p_company_id", config.CompanyId),
            HelpNpg.P("p_group",      config.ConfigGroup),
            HelpNpg.P("p_key",        config.ConfigKey),
            HelpNpg.P("p_value",      config.ConfigValue),
            HelpNpg.P("p_type",       config.ValueType),
            HelpNpg.P("p_desc",       config.Description),
            HelpNpg.P("p_sensitive",  config.IsSensitive),
            HelpNpg.P("p_user_id",    config.UpdatedBy));
    }

    public Guid? ObtenerCompanyOwner()
    {
        using var cx = new NpgsqlConnection(Conn);
        return cx.QueryFirstOrDefault<Guid?>(@"
            SELECT id
            FROM company
            WHERE is_owner = TRUE
               OR id = '00000000-0000-0000-0000-000000000001'
            ORDER BY created_at
            LIMIT 1");
    }

    public TenantConfig? ObtenerPorClave(Guid companyId, string key)
    {
        using var cx = new NpgsqlConnection(Conn);
        return cx.QueryFirstOrDefault<TenantConfig>(@"
            SELECT id,
                   company_id AS ""CompanyId"",
                   config_group AS ""ConfigGroup"",
                   config_key AS ""ConfigKey"",
                   config_value AS ""ConfigValue"",
                   value_type AS ""ValueType"",
                   description AS ""Description"",
                   is_sensitive AS ""IsSensitive"",
                   updated_at AS ""UpdatedAt"",
                   updated_by AS ""UpdatedBy""
            FROM tenant_config
            WHERE company_id = @CompanyId
              AND UPPER(config_key) = UPPER(@Key)
            LIMIT 1",
            new { CompanyId = companyId, Key = key });
    }
}
