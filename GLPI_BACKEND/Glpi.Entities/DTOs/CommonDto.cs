namespace Glpi.Entities.DTOs;

public class StatusUpdateDto
{
    public bool IsActive { get; set; }
}

public class TicketStatusUpdateDto
{
    public Guid StatusItemId { get; set; }
}

public class PermissionUpdateDto
{
    public List<Guid> PermissionIds { get; set; } = new();
}

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
