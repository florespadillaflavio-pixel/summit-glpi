using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("audit_log")]
public class AuditLog : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid? UserId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string EntityName { get; set; } = string.Empty;

    public Guid? EntityId { get; set; }

    [Column(TypeName = "jsonb")]
    public string OldValues { get; set; } = "{}";

    [Column(TypeName = "jsonb")]
    public string NewValues { get; set; } = "{}";

    [MaxLength(45)]
    public string IpAddress { get; set; } = string.Empty;

    public string UserAgent { get; set; } = string.Empty;
}
