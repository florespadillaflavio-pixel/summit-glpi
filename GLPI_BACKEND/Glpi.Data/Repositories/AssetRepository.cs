using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.DTOs;
using Glpi.Entities.Entities;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class AssetRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<AssetSummaryDto> Listar(Guid companyId, Guid? userId = null)
    {
        return HelpNpg.Query<AssetSummaryDto>(Conn, "gen_man_asset_list",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_user_id",    userId));
    }

    public Asset? ObtenerPorId(Guid companyId, Guid id)
    {
        return HelpNpg.QueryOne<Asset>(Conn, "gen_man_asset_get",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }

    public ReturnValue Insertar(Guid companyId, AssetCreateUpdateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_asset_ins",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_serial",     dto.SerialNumber),
            HelpNpg.P("p_type_id",    dto.AssetTypeItemId),
            HelpNpg.P("p_status_id",  dto.StatusItemId),
            HelpNpg.P("p_notes",      dto.Notes),
            HelpNpg.P("p_photo_url",  dto.PhotoUrl));
    }

    public ReturnValue Actualizar(Guid companyId, AssetCreateUpdateDto dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_asset_upd",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         dto.Id),
            HelpNpg.P("p_serial",     dto.SerialNumber),
            HelpNpg.P("p_type_id",    dto.AssetTypeItemId),
            HelpNpg.P("p_status_id",  dto.StatusItemId),
            HelpNpg.P("p_notes",      dto.Notes),
            HelpNpg.P("p_photo_url",  dto.PhotoUrl));
    }

    public ReturnValue Eliminar(Guid companyId, Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_asset_del",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }
}
