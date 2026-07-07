using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Glpi.Entities.Entities;
using Glpi.Logic;
using Glpi.Framework.Response;
using Glpi.Framework.Common;
using System.Text.Json;

namespace Glpi.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompanyController : ControllerBase
{
    private readonly CompanyLogic _logic;
    private readonly IFileStorageService _storageService;

    public CompanyController(CompanyLogic logic, IFileStorageService storageService)
    {
        _logic = logic;
        _storageService = storageService;
    }

    [HttpGet]
    public async Task<ActionResult<ReturnValue<List<Company>>>> GetAll()
    {
        var res = await _logic.GetAllAsync();
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReturnValue<Company>>> GetById(Guid id)
    {
        var res = await _logic.GetByIdAsync(id);
        if (!res.Success) return NotFound(res);
        return Ok(res);
    }

    [HttpPost]
    public async Task<ActionResult<ReturnValue>> Create([FromForm] string data, IFormFile? file)
    {
        string? uploadedUrl = null;
        try
        {
            var company = JsonSerializer.Deserialize<Company>(data, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (company == null) return BadRequest(ReturnValue.Fail("Datos inválidos"));

            if (file != null && file.Length > 0)
            {
                uploadedUrl = await _storageService.UploadFileAsync(file, "tenants/logos");
                if (!string.IsNullOrEmpty(uploadedUrl)) company.LogoUrl = uploadedUrl;
            }

            var res = await _logic.CreateAsync(company);
            
            // ROLLBACK MANUAL si falla la BD después de subir a la nube
            if (!res.Success && !string.IsNullOrEmpty(uploadedUrl))
            {
                await _storageService.DeleteFileByUrlAsync(uploadedUrl);
            }

            return Ok(res);
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrEmpty(uploadedUrl)) await _storageService.DeleteFileByUrlAsync(uploadedUrl);
            return StatusCode(500, ReturnValue.Fail(ex.Message));
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ReturnValue>> Update(Guid id, [FromForm] string data, IFormFile? file)
    {
        string? newUploadedUrl = null;
        try
        {
            var company = JsonSerializer.Deserialize<Company>(data, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (company == null) return BadRequest(ReturnValue.Fail("Datos inválidos"));
            
            company.Id = id;

            // 1. Obtener datos actuales para limpiar el logo anterior si cambia
            var currentRes = await _logic.GetByIdAsync(id);
            var oldLogoUrl = currentRes.Data?.LogoUrl;

            if (file != null && file.Length > 0)
            {
                newUploadedUrl = await _storageService.UploadFileAsync(file, "tenants/logos");
                if (!string.IsNullOrEmpty(newUploadedUrl)) company.LogoUrl = newUploadedUrl;
            }

            var res = await _logic.UpdateAsync(company);
            
            if (res.Success && !string.IsNullOrEmpty(newUploadedUrl) && !string.IsNullOrEmpty(oldLogoUrl))
            {
                // Limpiar logo antiguo solo si el nuevo se guardó bien
                await _storageService.DeleteFileByUrlAsync(oldLogoUrl);
            }
            else if (!res.Success && !string.IsNullOrEmpty(newUploadedUrl))
            {
                // Rollback del nuevo archivo si falló el update en BD
                await _storageService.DeleteFileByUrlAsync(newUploadedUrl);
            }

            return Ok(res);
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrEmpty(newUploadedUrl)) await _storageService.DeleteFileByUrlAsync(newUploadedUrl);
            return StatusCode(500, ReturnValue.Fail(ex.Message));
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ReturnValue>> ToggleStatus(Guid id)
    {
        var res = await _logic.ToggleStatusAsync(id);
        return Ok(res);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ReturnValue>> Delete(Guid id)
    {
        var res = await _logic.DeleteAsync(id);
        return Ok(res);
    }
}
