using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("ticket_comment")]
public class TicketComment : MultitenantEntity
{
    public Guid TicketId { get; set; }
    public Guid AuthorId { get; set; }

    [Required]
    public string Body { get; set; } = string.Empty;

    public bool IsInternal { get; set; } = false;

    [Column(TypeName = "jsonb")]
    public string Attachments { get; set; } = "[]";

    [ForeignKey("TicketId")]
    public virtual Ticket Ticket { get; set; } = null!;

    [ForeignKey("AuthorId")]
    public virtual UserAccount Author { get; set; } = null!;
}
