using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("ticket_survey")]
public class TicketSurvey : MultitenantEntity
{
    public Guid TicketId { get; set; }

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("TicketId")]
    public virtual Ticket Ticket { get; set; } = null!;
}
