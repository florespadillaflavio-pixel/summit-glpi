using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Glpi.Data.Repositories;
using Glpi.Framework.Response;
using Glpi.Entities.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Summit.ERPGeneral.Common;

namespace Glpi.Logic;

public class AuthLogic
{
    private readonly AuthRepository _repo = new();
    private readonly IConfiguration _config;

    public AuthLogic(IConfiguration config)
    {
        _config = config;
    }

    public ReturnValue<LoginResponseDto> Login(string username, string password)
    {
        var res = _repo.Validar(username, password);
        if (!res.Success) return ReturnValue<LoginResponseDto>.Fail(res.Message);

        // Code format: "userId|companyId" or "TEMP|userId"
        var parts = res.Code.Split('|');
        if (parts[0] == "TEMP")
        {
            if (parts.Length < 2 || !Guid.TryParse(parts[1], out var tempUserId))
                return ReturnValue<LoginResponseDto>.Fail("Credenciales inválidas");

            return ReturnValue<LoginResponseDto>.Ok(new LoginResponseDto
            {
                UserId = tempUserId,
                Token = "",
                MustChangePassword = true
            }, res.Message);
        }

        if (parts.Length < 2
            || !Guid.TryParse(parts[0], out var userId)
            || !Guid.TryParse(parts[1], out var companyId))
            return ReturnValue<LoginResponseDto>.Fail("Credenciales inválidas");

        // Fetch profile and permissions
        var profileRes = _repo.ObtenerPerfil(userId);
        var permissions = _repo.ObtenerPermisos(userId);

        var token = GenerarToken(userId, companyId, username, profileRes.Data?.Role ?? "Usuario", profileRes.Data?.IsInternal ?? false);

        return ReturnValue<LoginResponseDto>.Ok(new LoginResponseDto
        {
            Token = token,
            UserId = userId,
            CompanyId = companyId,
            Username = username,
            MustChangePassword = false,
            Profile = profileRes.Success ? profileRes.Data : null,
            Permissions = permissions
        }, res.Message);
    }

    public ReturnValue<LoginResponseDto> ChangePassword(ChangePasswordDto dto)
    {
        // Basic guards.
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
            return ReturnValue<LoginResponseDto>.Fail("La nueva contraseña debe tener al menos 8 caracteres.");

        if (dto.NewPassword == dto.CurrentPassword)
            return ReturnValue<LoginResponseDto>.Fail("La nueva contraseña debe ser diferente a la actual.");

        // Resolve the account so we can verify the current password server-side.
        // (fn_auth_change_password does NOT check the old password, so we must, or
        // any anonymous caller who knows a userId could overwrite it.)
        var profileRes = _repo.ObtenerPerfil(dto.UserId);
        if (!profileRes.Success || profileRes.Data == null)
            return ReturnValue<LoginResponseDto>.Fail("La contraseña actual es incorrecta");

        // Verify the current password through the same login path. A successful Validar
        // counts as a match, including a TEMP result (temp-password user changing it).
        var check = _repo.Validar(profileRes.Data.Username, dto.CurrentPassword);
        if (!check.Success)
            return ReturnValue<LoginResponseDto>.Fail("La contraseña actual es incorrecta");

        var res = _repo.CambiarPassword(dto.UserId, dto.CurrentPassword, dto.NewPassword);
        if (!res.Success) return ReturnValue<LoginResponseDto>.Fail(res.Message);

        // Password updated and is_password_temporary cleared: log the user in immediately.
        return BuildLoggedInResponse(dto.UserId, res.Message);
    }

    private ReturnValue<LoginResponseDto> BuildLoggedInResponse(Guid userId, string message)
    {
        var profileRes = _repo.ObtenerPerfil(userId);
        if (!profileRes.Success || profileRes.Data == null)
            return ReturnValue<LoginResponseDto>.Fail(profileRes.Message);

        var profile = profileRes.Data;
        var permissions = _repo.ObtenerPermisos(userId);

        var token = GenerarToken(userId, profile.CompanyId, profile.Username, profile.Role, profile.IsInternal);

        return ReturnValue<LoginResponseDto>.Ok(new LoginResponseDto
        {
            Token = token,
            UserId = userId,
            CompanyId = profile.CompanyId,
            Username = profile.Username,
            MustChangePassword = false,
            Profile = profile,
            Permissions = permissions
        }, message);
    }

    public ReturnValue<AuthDataDto> GetProfile(Guid userId)
    {
        var profileRes = _repo.ObtenerPerfil(userId);
        if (!profileRes.Success) return ReturnValue<AuthDataDto>.Fail(profileRes.Message);

        var permissions = _repo.ObtenerPermisos(userId);

        return ReturnValue<AuthDataDto>.Ok(new AuthDataDto
        {
            Profile = profileRes.Data!,
            Permissions = permissions
        }, profileRes.Message);
    }

    private string GenerarToken(Guid userId, Guid companyId, string username, string role, bool isInternal)
    {
        var secretKey = _config["Jwt:Key"]!;
        var issuer = _config["Jwt:Issuer"]!;
        var audience = _config["Jwt:Audience"]!;
        var expMinutes = int.TryParse(_config["Jwt:ExpireMinutes"], out var m) ? m : 1440;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, username),
            new Claim("UserId", userId.ToString()),
            new Claim("CompanyId", companyId.ToString()),
            new Claim("Role", role),
            new Claim("IsInternal", isInternal.ToString().ToLower()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        return HelpEncrypt.GenerarTokenJWT(secretKey, issuer, audience, expMinutes, claims);
    }
}
