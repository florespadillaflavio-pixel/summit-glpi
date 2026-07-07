using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("module")]
public class Module : BaseEntity
{
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(80)]
    public string Icon { get; set; } = string.Empty;

    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

[Table("permission")]
public class Permission : BaseEntity
{
    public Guid ModuleId { get; set; }

    [Required]
    [MaxLength(80)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(80)]
    [Column("permission_icon")]
    public string Icon { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    [ForeignKey("ModuleId")]
    public virtual Module Module { get; set; } = null!;
}

[Table("role")]
public class Role : MultitenantEntity
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    [Column("role_type")]
    public string RoleType { get; set; } = "CUSTOM";

    [Column("is_system")]
    public bool IsSystem { get; set; } = false;

    public bool IsActive { get; set; } = true;
    public Guid? CreatedBy { get; set; }
}

[Table("role_permission")]
public class RolePermission : MultitenantEntity
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
    public bool Granted { get; set; } = true;

    [ForeignKey("RoleId")]
    public virtual Role Role { get; set; } = null!;

    [ForeignKey("PermissionId")]
    public virtual Permission Permission { get; set; } = null!;
}

[Table("user_role")]
public class UserRole : MultitenantEntity
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
}
