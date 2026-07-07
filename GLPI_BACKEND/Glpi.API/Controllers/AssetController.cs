using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Glpi.Framework.Common;
using Glpi.Framework.Response;
using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AssetController : ControllerBase
{
    private readonly AssetLogic _logic;
    private readonly IFileStorageService _storageService;

    public AssetController(AssetLogic logic, IFileStorageService storageService)
    {
        _logic = logic;
        _storageService = storageService;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var res = await _logic.GetAllAsync();
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var res = await _logic.GetByIdAsync(id);
        if (!res.Success) return NotFound(res);
        return Ok(res);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromForm] string data, IFormFile? file)
    {
        string? uploadedUrl = null;
        try
        {
            var asset = JsonSerializer.Deserialize<AssetCreateUpdateDto>(data, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (asset == null) return BadRequest(ReturnValue.Fail("Datos inválidos"));

            if (file != null && file.Length > 0)
            {
                if (!IsImage(file)) return BadRequest(ReturnValue.Fail("Solo se permiten imágenes JPG, PNG, WEBP, GIF, HEIC o HEIF."));
                uploadedUrl = await _storageService.UploadFileAsync(file, "assets/photos");
                if (!string.IsNullOrEmpty(uploadedUrl)) asset.PhotoUrl = uploadedUrl;
            }

            var res = await _logic.CreateAsync(asset);
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
    public async Task<ActionResult> Update(Guid id, [FromForm] string data, IFormFile? file)
    {
        string? uploadedUrl = null;
        try
        {
            var asset = JsonSerializer.Deserialize<AssetCreateUpdateDto>(data, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (asset == null) return BadRequest(ReturnValue.Fail("Datos inválidos"));

            asset.Id = id;
            var currentRes = await _logic.GetByIdAsync(id);
            var oldPhotoUrl = currentRes.Data?.PhotoUrl;

            if (file != null && file.Length > 0)
            {
                if (!IsImage(file)) return BadRequest(ReturnValue.Fail("Solo se permiten imágenes JPG, PNG, WEBP, GIF, HEIC o HEIF."));
                uploadedUrl = await _storageService.UploadFileAsync(file, "assets/photos");
                if (!string.IsNullOrEmpty(uploadedUrl)) asset.PhotoUrl = uploadedUrl;
            }

            var res = await _logic.UpdateAsync(asset);
            if (res.Success && !string.IsNullOrEmpty(uploadedUrl) && !string.IsNullOrEmpty(oldPhotoUrl))
            {
                await _storageService.DeleteFileByUrlAsync(oldPhotoUrl);
            }
            else if (!res.Success && !string.IsNullOrEmpty(uploadedUrl))
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

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var res = await _logic.DeleteAsync(id);
        return Ok(res);
    }

    private static bool IsImage(IFormFile file)
    {
        var allowedTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"
        };
        var allowedExt = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"
        };

        var ext = Path.GetExtension(file.FileName);
        return allowedTypes.Contains(file.ContentType ?? string.Empty) || allowedExt.Contains(ext);
    }
}
