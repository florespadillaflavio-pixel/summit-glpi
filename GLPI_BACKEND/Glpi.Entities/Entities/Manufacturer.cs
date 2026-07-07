using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("manufacturer")]
public class Manufacturer : MultitenantEntity
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(150)]
    public string Website { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
