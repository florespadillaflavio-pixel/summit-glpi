using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("notification_template")]
public class NotificationTemplate : MultitenantEntity
{
    [Required]
    [MaxLength(80)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string BodyHtml { get; set; } = string.Empty;

    [Column(TypeName = "text[]")]
    public string[] Variables { get; set; } = Array.Empty<string>();

    public bool IsActive { get; set; } = true;
}
