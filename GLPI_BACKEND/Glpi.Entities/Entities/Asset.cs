using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("asset")]
public class Asset : MultitenantEntity
{
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string AssetTag { get; set; } = string.Empty;

    [MaxLength(100)]
    public string SerialNumber { get; set; } = string.Empty;

    public Guid? AssetModelId { get; set; }
    public Guid AssetTypeItemId { get; set; }
    public string AssetTypeName { get; set; } = string.Empty;
    public Guid StatusItemId { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string StatusColor { get; set; } = string.Empty;
    public Guid? LocationId { get; set; }
    public string LocationName { get; set; } = string.Empty;

    public Guid? AssignedToId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public DateTime? AssignedAt { get; set; }

    public DateTime? PurchaseDate { get; set; }
    public decimal PurchasePrice { get; set; } = 0;
    public DateTime? WarrantyExpiresAt { get; set; }

    [MaxLength(150)]
    public string Supplier { get; set; } = string.Empty;

    [MaxLength(80)]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Column(TypeName = "jsonb")]
    public string Specifications { get; set; } = "{}";

    public string PhotoUrl { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public bool IsSoftware { get; set; } = false;
    public string LicenseKey { get; set; } = string.Empty;
    public DateTime? LicenseExpiresAt { get; set; }
    public int SeatsTotal { get; set; } = 1;
    public int SeatsUsed { get; set; } = 0;

    public bool IsActive { get; set; } = true;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    [ForeignKey("AssetTypeItemId")]
    public virtual CatalogItem AssetTypeItem { get; set; } = null!;

    [ForeignKey("StatusItemId")]
    public virtual CatalogItem StatusItem { get; set; } = null!;

    [ForeignKey("AssignedToId")]
    public virtual UserAccount? AssignedTo { get; set; }
}
