using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("company")]
public class Company : BaseEntity
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Ruc { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    [MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(150)]
    public string Website { get; set; } = string.Empty;

    public string LogoUrl { get; set; } = string.Empty;

    public bool IsOwner { get; set; } = false;
    public bool IsActive { get; set; } = true;

    [NotMapped]
    public int UserCount { get; set; }

    [NotMapped]
    public int AssetCount { get; set; }

    [NotMapped]
    public int TicketCount { get; set; }
}
