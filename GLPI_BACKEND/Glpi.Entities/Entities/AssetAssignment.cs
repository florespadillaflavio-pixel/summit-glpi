using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("asset_assignment")]
public class AssetAssignment : MultitenantEntity
{
    public Guid AssetId { get; set; }
    public Guid UserId { get; set; }
    public Guid? LocationId { get; set; }
    public Guid? AssignedBy { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReturnedAt { get; set; }

    public string ReturnCondition { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;

    [ForeignKey("AssetId")]
    public virtual Asset Asset { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual UserAccount User { get; set; } = null!;

    [ForeignKey("LocationId")]
    public virtual Location? Location { get; set; }
}
