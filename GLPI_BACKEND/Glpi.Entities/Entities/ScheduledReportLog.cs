using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("scheduled_report_log")]
public class ScheduledReportLog : BaseEntity
{
    public Guid ReportId { get; set; }
    public Guid CompanyId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "SUCCESS";

    public string FileUrl { get; set; } = string.Empty;

    public string ErrorMsg { get; set; } = string.Empty;

    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;

    public int DurationMs { get; set; } = 0;

    [ForeignKey("ReportId")]
    public virtual ScheduledReport Report { get; set; } = null!;
}
