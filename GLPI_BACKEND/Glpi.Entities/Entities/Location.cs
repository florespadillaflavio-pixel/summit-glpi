using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("location")]
public class Location : MultitenantEntity
{
    public Guid? ParentId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    [ForeignKey("ParentId")]
    public virtual Location? Parent { get; set; }
}
