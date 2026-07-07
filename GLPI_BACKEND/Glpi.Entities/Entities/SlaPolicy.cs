using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("sla_policy")]
public class SlaPolicy : MultitenantEntity
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public Guid PriorityItemId { get; set; }

    public int FirstResponseMin { get; set; } = 60;

    public int ResolutionTimeMin { get; set; } = 480;

    public bool BusinessHoursOnly { get; set; } = true;

    public bool IsActive { get; set; } = true;

    [ForeignKey("PriorityItemId")]
    public virtual CatalogItem PriorityItem { get; set; } = null!;
}
