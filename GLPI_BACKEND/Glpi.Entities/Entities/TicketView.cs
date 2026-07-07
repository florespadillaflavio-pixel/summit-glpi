using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("ticket_view")]
public class TicketView : MultitenantEntity
{
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column(TypeName = "jsonb")]
    public string Filters { get; set; } = "{}";

    public bool IsShared { get; set; } = false;

    [ForeignKey("UserId")]
    public virtual UserAccount User { get; set; } = null!;
}
