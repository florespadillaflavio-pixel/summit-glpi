namespace Glpi.Entities.DTOs;

public class AssetSummaryDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string AssetTag { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public string TypeCode { get; set; } = string.Empty;
    public string StatusName { get; set; } = string.Empty;
    public string StatusCode { get; set; } = string.Empty;
    public string StatusColor { get; set; } = string.Empty;
    public string AssignedToName { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}

public class AssetCreateUpdateDto
{
    public Guid? Id { get; set; }
    public Guid? CompanyId { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public Guid? AssetModelId { get; set; }
    public Guid AssetTypeItemId { get; set; }
    public Guid StatusItemId { get; set; }
    public Guid? LocationId { get; set; }
    public Guid? AssignedToId { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public decimal PurchasePrice { get; set; }
    public DateTime? WarrantyExpiresAt { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
