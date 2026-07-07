using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.Entities;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class KbRepository
{
    private string Conn => DbConfig.ConnectionString;

    public List<KbArticle> Listar(Guid companyId, Guid? categoryId = null)
    {
        return HelpNpg.Query<KbArticle>(Conn, "gen_man_kb_article_list",
            HelpNpg.P("p_company_id",  companyId),
            HelpNpg.P("p_category_id", categoryId));
    }

    public KbArticle? ObtenerPorId(Guid companyId, Guid id)
    {
        return HelpNpg.QueryOne<KbArticle>(Conn, "gen_man_kb_article_get",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }

    public ReturnValue Insertar(Guid companyId, KbArticle dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_kb_article_ins",
            HelpNpg.P("p_company_id",  companyId),
            HelpNpg.P("p_title",       dto.Title),
            HelpNpg.P("p_summary",     dto.Summary),
            HelpNpg.P("p_content",     dto.Content),
            HelpNpg.P("p_category_id", dto.CategoryId),
            HelpNpg.P("p_author_id",   dto.AuthorId));
    }

    public ReturnValue Actualizar(Guid companyId, KbArticle dto)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_kb_article_upd",
            HelpNpg.P("p_company_id",  companyId),
            HelpNpg.P("p_id",          dto.Id),
            HelpNpg.P("p_title",       dto.Title),
            HelpNpg.P("p_summary",     dto.Summary),
            HelpNpg.P("p_content",     dto.Content),
            HelpNpg.P("p_category_id", dto.CategoryId));
    }

    public ReturnValue Eliminar(Guid companyId, Guid id)
    {
        return HelpNpg.QueryReturn(Conn, "gen_man_kb_article_del",
            HelpNpg.P("p_company_id", companyId),
            HelpNpg.P("p_id",         id));
    }
}
