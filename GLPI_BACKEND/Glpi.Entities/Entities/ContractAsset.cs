using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("contract_asset")]
public class ContractAsset : MultitenantEntity
{
    public Guid ContractId { get; set; }
    public Guid AssetId { get; set; }

    [ForeignKey("ContractId")]
    public virtual Contract Contract { get; set; } = null!;

    [ForeignKey("AssetId")]
    public virtual Asset Asset { get; set; } = null!;
}
