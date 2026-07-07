using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("ticket")]
public class Ticket : MultitenantEntity
{
    [Required]
    [MaxLength(20)]
    public string TicketNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public Guid TypeItemId { get; set; }
    public Guid StatusItemId { get; set; }
    public Guid PriorityItemId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? SlaPolicyId { get; set; }

    public Guid RequesterId { get; set; }
    public Guid? AssignedToId { get; set; }

    [MaxLength(100)]
    public string AssignedGroup { get; set; } = string.Empty;

    public Guid? AssetId { get; set; }

    public DateTime? DueDate { get; set; }
    public DateTime? FirstResponseAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public bool SlaBreached { get; set; } = false;

    [MaxLength(30)]
    public string Source { get; set; } = "WEB";

    public string[] Tags { get; set; } = Array.Empty<string>();
    public bool IsActive { get; set; } = true;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    [ForeignKey("TypeItemId")]
    public virtual CatalogItem TypeItem { get; set; } = null!;

    [ForeignKey("StatusItemId")]
    public virtual CatalogItem StatusItem { get; set; } = null!;

    [ForeignKey("PriorityItemId")]
    public virtual CatalogItem PriorityItem { get; set; } = null!;

    [ForeignKey("RequesterId")]
    public virtual UserAccount Requester { get; set; } = null!;

    [ForeignKey("AssignedToId")]
    public virtual UserAccount? AssignedTo { get; set; }
}
