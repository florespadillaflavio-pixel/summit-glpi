using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Glpi.Logic;
using Glpi.Framework.Response;
using Glpi.Framework.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly UserLogic _logic;
    private readonly IFileStorageService _storageService;

    public UserController(UserLogic logic, IFileStorageService storageService)
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
            var user = JsonSerializer.Deserialize<UserCreateUpdateDto>(data, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (user == null) return BadRequest(ReturnValue.Fail("Datos inválidos"));

            if (file != null && file.Length > 0)
            {
                uploadedUrl = await _storageService.UploadFileAsync(file, "users/avatars");
                if (!string.IsNullOrEmpty(uploadedUrl)) user.AvatarUrl = uploadedUrl;
            }

            var res = await _logic.CreateAsync(user);
            
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
        string? newUploadedUrl = null;
        try
        {
            var user = JsonSerializer.Deserialize<UserCreateUpdateDto>(data, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (user == null) return BadRequest(ReturnValue.Fail("Datos inválidos"));
            
            user.Id = id;
            var currentRes = await _logic.GetByIdAsync(id);
            var oldAvatarUrl = currentRes.Data?.AvatarUrl;

            if (file != null && file.Length > 0)
            {
                newUploadedUrl = await _storageService.UploadFileAsync(file, "users/avatars");
                if (!string.IsNullOrEmpty(newUploadedUrl)) user.AvatarUrl = newUploadedUrl;
            }

            var res = await _logic.UpdateAsync(user);

            if (res.Success && !string.IsNullOrEmpty(newUploadedUrl) && !string.IsNullOrEmpty(oldAvatarUrl))
            {
                await _storageService.DeleteFileByUrlAsync(oldAvatarUrl);
            }
            else if (!res.Success && !string.IsNullOrEmpty(newUploadedUrl))
            {
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

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var res = await _logic.DeleteAsync(id);
        return Ok(res);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult> UpdateStatus(Guid id, [FromBody] StatusUpdateDto req)
    {
        var res = await _logic.UpdateStatusAsync(id, req.IsActive);
        return Ok(res);
    }
}
