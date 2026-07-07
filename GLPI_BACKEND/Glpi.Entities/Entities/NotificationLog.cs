using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("notification_log")]
public class NotificationLog : BaseEntity
{
    public Guid CompanyId { get; set; }

    [Required]
    [MaxLength(80)]
    public string TemplateCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Channel { get; set; } = "EMAIL";

    public Guid? RecipientId { get; set; }

    [Required]
    [MaxLength(150)]
    public string RecipientEmail { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Body { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "PENDING";

    public DateTime? SentAt { get; set; }

    public string ErrorMsg { get; set; } = string.Empty;
}
