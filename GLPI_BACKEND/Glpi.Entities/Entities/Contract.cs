using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("contract")]
public class Contract : MultitenantEntity
{
    [Required]
    [MaxLength(50)]
    public string ContractNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public Guid TypeItemId { get; set; }

    [MaxLength(150)]
    public string VendorName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string VendorContact { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    [Column(TypeName = "numeric(14,2)")]
    public decimal Value { get; set; } = 0;

    [Required]
    [MaxLength(5)]
    public string Currency { get; set; } = "PEN";

    public string DocumentUrl { get; set; } = string.Empty;

    public int AlertDays { get; set; } = 30;

    public bool AutoRenew { get; set; } = false;

    public Guid StatusItemId { get; set; }

    public string Notes { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    [ForeignKey("TypeItemId")]
    public virtual CatalogItem TypeItem { get; set; } = null!;

    [ForeignKey("StatusItemId")]
    public virtual CatalogItem StatusItem { get; set; } = null!;
}
