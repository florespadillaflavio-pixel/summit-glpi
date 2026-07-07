using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("exception_log")]
public class ExceptionLog : BaseEntity
{
    public Guid? CompanyId { get; set; }
    public Guid? UserId { get; set; }

    [Required]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Method { get; set; } = string.Empty;

    public int StatusCode { get; set; } = 500;

    [Required]
    public string Message { get; set; } = string.Empty;

    public string StackTrace { get; set; } = string.Empty;

    public string RequestBody { get; set; } = string.Empty;
}
