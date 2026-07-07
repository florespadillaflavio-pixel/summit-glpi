namespace Glpi.Entities.DTOs;

public class TicketSummaryDto
{
    public Guid Id { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StatusName { get; set; } = string.Empty;
    public string StatusCode { get; set; } = string.Empty;
    public string StatusColor { get; set; } = string.Empty;
    public string PriorityName { get; set; } = string.Empty;
    public string PriorityCode { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public string AssignedToName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class TicketDetailDto : TicketSummaryDto
{
    public Guid RequesterId { get; set; }
    public Guid? AssignedToId { get; set; }
    public Guid TypeItemId { get; set; }
    public Guid PriorityItemId { get; set; }
    public Guid? AssetId { get; set; }
    public bool SlaBreached { get; set; }
}

public class TicketCreateDto
{
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid TypeItemId { get; set; }
    public Guid? StatusItemId { get; set; }
    public Guid PriorityItemId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid RequesterId { get; set; }
    public Guid? AssetId { get; set; }
}

public class TicketUpdateDto
{
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid TypeItemId { get; set; }
    public Guid PriorityItemId { get; set; }
    public Guid? AssetId { get; set; }
}

public class TicketAssignDto
{
    public Guid? AssignedToId { get; set; }
}

public class TicketCommentDto
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid AuthorId { get; set; }
    public string Body { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorInitials { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public string Attachments { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
}

public class TicketCommentCreateDto
{
    public Guid TicketId { get; set; }
    public Guid AuthorId { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
}

public class TicketHistoryDto
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string ActorName { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public string OldValues { get; set; } = "{}";
    public string NewValues { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
}
