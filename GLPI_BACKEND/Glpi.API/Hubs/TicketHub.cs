using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Glpi.API.Hubs;

[Authorize]
public class TicketHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var companyId = Context.User?.FindFirst("CompanyId")?.Value;
        var isInternalClaim = Context.User?.FindFirst("IsInternal")?.Value;
        bool.TryParse(isInternalClaim, out var isInternal);

        if (!string.IsNullOrWhiteSpace(companyId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, TenantGroup(companyId));
            
            if (isInternal)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, InternalGroup(companyId));
            }
        }

        await base.OnConnectedAsync();
    }

    public static string TenantGroup(Guid companyId) => TenantGroup(companyId.ToString());
    public static string TenantGroup(string companyId) => $"tenant:{companyId}";

    public static string InternalGroup(Guid companyId) => InternalGroup(companyId.ToString());
    public static string InternalGroup(string companyId) => $"internal:{companyId}";
}
