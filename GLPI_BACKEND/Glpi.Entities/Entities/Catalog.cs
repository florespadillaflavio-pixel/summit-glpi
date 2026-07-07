using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("catalog_group")]
public class CatalogGroup : MultitenantEntity
{
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
    public bool IsSystem { get; set; } = false;
    public bool IsActive { get; set; } = true;
}

[Table("catalog_item")]
public class CatalogItem : MultitenantEntity
{
    public Guid GroupId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Color { get; set; } = "#888888";

    [MaxLength(80)]
    public string Icon { get; set; } = string.Empty;

    public int SortOrder { get; set; } = 0;
    public bool IsDefault { get; set; } = false;
    public bool IsSystem { get; set; } = false;
    public bool IsActive { get; set; } = true;

    [ForeignKey("GroupId")]
    public virtual CatalogGroup? Group { get; set; }
}
