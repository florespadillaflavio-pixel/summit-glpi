using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("user_session")]
public class UserSession : BaseEntity
{
    public Guid UserId { get; set; }

    [Required]
    public string RefreshToken { get; set; } = string.Empty;

    public string DeviceInfo { get; set; } = string.Empty;

    [MaxLength(45)]
    public string IpAddress { get; set; } = string.Empty;

    public string UserAgent { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public bool IsActive { get; set; } = true;

    [ForeignKey("UserId")]
    public virtual UserAccount User { get; set; } = null!;
}
