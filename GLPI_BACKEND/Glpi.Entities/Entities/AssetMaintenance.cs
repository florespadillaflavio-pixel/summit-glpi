using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("asset_maintenance")]
public class AssetMaintenance : MultitenantEntity
{
    public Guid AssetId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = "PREVENTIVE";

    [Required]
    public string Description { get; set; } = string.Empty;

    public Guid? TechnicianId { get; set; }

    public DateTime? ScheduledAt { get; set; }
    public DateTime? PerformedAt { get; set; }

    [Column(TypeName = "numeric(10,2)")]
    public decimal Cost { get; set; } = 0;

    public string Notes { get; set; } = string.Empty;

    [ForeignKey("AssetId")]
    public virtual Asset Asset { get; set; } = null!;

    [ForeignKey("TechnicianId")]
    public virtual UserAccount? Technician { get; set; }
}
