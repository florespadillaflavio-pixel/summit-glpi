using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Glpi.Logic;
using Glpi.Framework.Response;
using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using System.Net.Sockets;

namespace Glpi.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConfigController : ControllerBase
{
    private readonly ConfigLogic _logic;

    public ConfigController(ConfigLogic logic)
    {
        _logic = logic;
    }

    [HttpGet]
    public async Task<ActionResult<ReturnValue<List<TenantConfig>>>> GetConfigs([FromQuery] string? group = null)
    {
        var res = await _logic.GetConfigsAsync(group);
        return Ok(res);
    }

    [HttpPost]
    public async Task<ActionResult<ReturnValue>> SaveConfig([FromBody] ConfigSaveDto dto)
    {
        var res = await _logic.SaveConfigAsync(dto);
        return Ok(res);
    }

    [HttpPost("test-smtp")]
    public async Task<ActionResult<ReturnValue>> TestSmtp([FromBody] SmtpTestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Host))
            return Ok(ReturnValue.Fail("Ingrese el servidor SMTP."));

        if (dto.Port <= 0 || dto.Port > 65535)
            return Ok(ReturnValue.Fail("Ingrese un puerto SMTP válido."));

        try
        {
            using var client = new TcpClient();
            var connectTask = client.ConnectAsync(dto.Host, dto.Port);
            var completed = await Task.WhenAny(connectTask, Task.Delay(TimeSpan.FromSeconds(5)));

            if (completed != connectTask || !client.Connected)
                return Ok(ReturnValue.Fail("No se pudo conectar al servidor SMTP."));

            return Ok(ReturnValue.Ok("Conexión SMTP validada correctamente."));
        }
        catch
        {
            return Ok(ReturnValue.Fail("No se pudo conectar al servidor SMTP."));
        }
    }
}
