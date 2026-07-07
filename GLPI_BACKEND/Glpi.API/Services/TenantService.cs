using System.Security.Claims;
using Glpi.Framework.Auth;
using Microsoft.AspNetCore.Http;

namespace Glpi.API.Services;

public class TenantService : ITenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid CompanyId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("CompanyId")?.Value;
            return Guid.TryParse(claim, out var guid) ? guid : Guid.Empty;
        }
    }

    public Guid UserId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("UserId")?.Value;
            return Guid.TryParse(claim, out var guid) ? guid : Guid.Empty;
        }
    }

    public string Role
    {
        get
        {
            return _httpContextAccessor.HttpContext?.User.FindFirst("Role")?.Value ?? string.Empty;
        }
    }

    public bool IsInternal
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("IsInternal")?.Value;
            return bool.TryParse(claim, out var val) && val;
        }
    }
}
