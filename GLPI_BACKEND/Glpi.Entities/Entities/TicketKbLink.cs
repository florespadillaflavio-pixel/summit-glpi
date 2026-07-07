using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("ticket_kb_link")]
public class TicketKbLink : MultitenantEntity
{
    public Guid TicketId { get; set; }
    public Guid ArticleId { get; set; }

    [ForeignKey("TicketId")]
    public virtual Ticket Ticket { get; set; } = null!;

    [ForeignKey("ArticleId")]
    public virtual KbArticle Article { get; set; } = null!;
}
