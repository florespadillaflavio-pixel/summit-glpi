using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("tenant_config")]
public class TenantConfig : MultitenantEntity
{
    [Required]
    [MaxLength(50)]
    public string ConfigGroup { get; set; } = "GENERAL";

    [Required]
    [MaxLength(100)]
    public string ConfigKey { get; set; } = string.Empty;

    [Required]
    public string ConfigValue { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string ValueType { get; set; } = "STRING";

    public string Description { get; set; } = string.Empty;

    public bool IsSensitive { get; set; } = false;

    public Guid? UpdatedBy { get; set; }
}
