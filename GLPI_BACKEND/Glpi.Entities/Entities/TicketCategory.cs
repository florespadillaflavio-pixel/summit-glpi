using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("ticket_category")]
public class TicketCategory : MultitenantEntity
{
    public Guid? ParentId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(80)]
    public string Icon { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    [ForeignKey("ParentId")]
    public virtual TicketCategory? Parent { get; set; }
}
