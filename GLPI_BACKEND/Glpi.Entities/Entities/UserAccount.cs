using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("user_account")]
public class UserAccount : MultitenantEntity
{
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    public string AvatarUrl { get; set; } = string.Empty;

    public bool IsPasswordTemporary { get; set; } = true;

    [MaxLength(10)]
    public string BackupCode { get; set; } = "000000";

    public bool IsBackupActive { get; set; } = false;
    public DateTime? BackupRequestedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    [ForeignKey("CompanyId")]
    public virtual Company Company { get; set; } = null!;
}
