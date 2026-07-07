using Glpi.Entities.DTOs;
using Glpi.Logic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Glpi.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly AuthLogic _logic;

    public AuthController(AuthLogic logic)
    {
        _logic = logic;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public ActionResult Login([FromBody] LoginDto req)
    {
        var res = _logic.Login(req.Username, req.Password);
        if (!res.Success)
            return BadRequest(res);

        return Ok(res);
    }

    [AllowAnonymous]
    [HttpPost("change-password")]
    public ActionResult ChangePassword([FromBody] ChangePasswordDto req)
    {
        var res = _logic.ChangePassword(req);
        if (!res.Success)
            return BadRequest(res);

        return Ok(res);
    }

    [HttpGet("profile/{userId}")]
    public ActionResult GetProfile(Guid userId)
    {
        var res = _logic.GetProfile(userId);
        if (!res.Success)
            return BadRequest(res);

        return Ok(res);
    }
}
