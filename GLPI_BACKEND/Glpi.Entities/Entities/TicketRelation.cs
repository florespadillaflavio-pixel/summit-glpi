using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("ticket_relation")]
public class TicketRelation : MultitenantEntity
{
    public Guid SourceTicketId { get; set; }
    public Guid TargetTicketId { get; set; }

    [Required]
    [MaxLength(50)]
    public string RelationType { get; set; } = "RELATED";

    public Guid? CreatedBy { get; set; }

    [ForeignKey("SourceTicketId")]
    public virtual Ticket SourceTicket { get; set; } = null!;

    [ForeignKey("TargetTicketId")]
    public virtual Ticket TargetTicket { get; set; } = null!;
}
