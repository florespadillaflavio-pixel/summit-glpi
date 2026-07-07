using Glpi.Entities.Entities;
using Glpi.Logic;
using Glpi.Framework.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class KbController : ControllerBase
{
    private readonly KbLogic _logic;

    public KbController(KbLogic logic)
    {
        _logic = logic;
    }

    [HttpGet("categories")]
    public async Task<ActionResult> GetCategories()
    {
        var res = await _logic.GetCategoriesAsync();
        return Ok(res);
    }

    [HttpGet]
    public async Task<ActionResult> GetArticles([FromQuery] string? q, [FromQuery] Guid? categoryId)
    {
        var res = await _logic.GetAllArticlesAsync(q, categoryId);
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var res = await _logic.GetArticleByIdAsync(id);
        return Ok(res);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] KbArticle article)
    {
        var res = await _logic.CreateArticleAsync(article);
        return Ok(res);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] KbArticle article)
    {
        if (id != article.Id) return BadRequest();
        var res = await _logic.UpdateArticleAsync(article);
        return Ok(res);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var res = await _logic.DeleteArticleAsync(id);
        return Ok(res);
    }
}
