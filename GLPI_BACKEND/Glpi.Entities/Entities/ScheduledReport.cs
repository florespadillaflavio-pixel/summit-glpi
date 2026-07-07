using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("scheduled_report")]
public class ScheduledReport : MultitenantEntity
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ReportType { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Frequency { get; set; } = "WEEKLY";

    public DateTime? NextRunAt { get; set; }

    [Column(TypeName = "text[]")]
    public string[] Recipients { get; set; } = Array.Empty<string>();

    [Column(TypeName = "jsonb")]
    public string Filters { get; set; } = "{}";

    [Required]
    [MaxLength(10)]
    public string Format { get; set; } = "PDF";

    public bool IsActive { get; set; } = true;

    public Guid? CreatedBy { get; set; }
}
