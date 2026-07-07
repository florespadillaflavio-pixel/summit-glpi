using Glpi.Entities.Entities;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class KbLogic
{
    private readonly KbRepository _repo = new();
    private readonly ITenantService _tenantService;

    public KbLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<List<KbCategory>>> GetCategoriesAsync()
    {
        try
        {
            var categories = _repo.ListarCategorias(_tenantService.CompanyId);
            return ReturnValue<List<KbCategory>>.Ok(categories);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<KbCategory>>
                   ?? ReturnValue<List<KbCategory>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<List<KbArticle>>> GetAllArticlesAsync(string? query = null, Guid? categoryId = null)
    {
        try
        {
            var articles = _repo.Listar(_tenantService.CompanyId, categoryId);
            
            // Filtro local si query no es nulo, ya que la función base de DB devuelve todo
            if (!string.IsNullOrEmpty(query))
            {
                var q = query.ToLower();
                articles = articles.Where(a => 
                    (a.Title?.ToLower().Contains(q) ?? false) || 
                    (a.Content?.ToLower().Contains(q) ?? false)).ToList();
            }

            return ReturnValue<List<KbArticle>>.Ok(articles);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<KbArticle>> 
                   ?? ReturnValue<List<KbArticle>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue<KbArticle>> GetArticleByIdAsync(Guid id)
    {
        try
        {
            var article = _repo.ObtenerPorId(_tenantService.CompanyId, id);
            if (article == null) return ReturnValue<KbArticle>.Fail("Artículo no encontrado");
            return ReturnValue<KbArticle>.Ok(article);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<KbArticle>
                   ?? ReturnValue<KbArticle>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> CreateArticleAsync(KbArticle article)
    {
        try
        {
            article.AuthorId = _tenantService.UserId;
            return _repo.Insertar(_tenantService.CompanyId, article);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateArticleAsync(KbArticle article)
    {
        try
        {
            return _repo.Actualizar(_tenantService.CompanyId, article);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> DeleteArticleAsync(Guid id)
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
