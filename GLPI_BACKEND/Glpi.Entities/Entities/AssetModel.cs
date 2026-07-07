using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("asset_model")]
public class AssetModel : MultitenantEntity
{
    public Guid? ManufacturerId { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(80)]
    public string PartNumber { get; set; } = string.Empty;

    public Guid? AssetTypeItemId { get; set; }

    public bool IsActive { get; set; } = true;

    [ForeignKey("ManufacturerId")]
    public virtual Manufacturer? Manufacturer { get; set; }

    [ForeignKey("AssetTypeItemId")]
    public virtual CatalogItem? AssetTypeItem { get; set; }
}
