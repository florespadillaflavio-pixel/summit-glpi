using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.Entities;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class CatalogRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<CatalogGroup> ListarGrupos(Guid companyId)
    {
        return HelpNpg.Query<CatalogGroup>(Conn, "gen_man_catalog_group_list",
            HelpNpg.P("p_company_id", companyId));
    }

    public List<CatalogItem> ListarItems(Guid companyId, string groupCode)
    {
        return HelpNpg.Query<CatalogItem>(Conn, "gen_man_catalog_item_list",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_group_code", groupCode));
    }

    public ReturnValue GuardarItem(Guid companyId, CatalogItem dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_catalog_item_save",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         dto.Id == Guid.Empty ? null : dto.Id),
            HelpNpg.P("p_group_id",   dto.GroupId),
            HelpNpg.P("p_code",       dto.Code),
            HelpNpg.P("p_name",       dto.Name),
            HelpNpg.P("p_desc",       dto.Description),
            HelpNpg.P("p_color",      dto.Color),
            HelpNpg.P("p_icon",       dto.Icon),
            HelpNpg.P("p_sort",       dto.SortOrder),
            HelpNpg.P("p_is_default", dto.IsDefault),
            HelpNpg.P("p_is_active",  dto.IsActive));
    }

    public ReturnValue EliminarItem(Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_catalog_item_del",
            HelpNpg.P("p_id", id));
    }
}
