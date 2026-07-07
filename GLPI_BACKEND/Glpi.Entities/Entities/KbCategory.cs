using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("kb_category")]
public class KbCategory : MultitenantEntity
{
    public Guid? ParentId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(80)]
    public string Icon { get; set; } = string.Empty;

    public int SortOrder { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    [ForeignKey("ParentId")]
    public virtual KbCategory? Parent { get; set; }
}
