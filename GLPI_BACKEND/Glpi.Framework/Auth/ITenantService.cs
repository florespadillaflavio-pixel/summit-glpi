namespace Glpi.Framework.Auth;

public interface ITenantService
{
    Guid CompanyId { get; }
    Guid UserId { get; }
    string Role { get; }
    bool IsInternal { get; }
}
