using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Glpi.Entities.Entities;

[Table("kb_article")]
public class KbArticle : MultitenantEntity
{
    public Guid? CategoryId { get; set; }

    [Required]
    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "DRAFT";

    public Guid AuthorId { get; set; }

    public int Views { get; set; } = 0;

    public int HelpfulYes { get; set; } = 0;

    public int HelpfulNo { get; set; } = 0;

    [Column(TypeName = "text[]")]
    public string[] Tags { get; set; } = Array.Empty<string>();

    public bool IsPublic { get; set; } = false;

    public DateTime? PublishedAt { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    [ForeignKey("CategoryId")]
    public virtual KbCategory? Category { get; set; }

    [ForeignKey("AuthorId")]
    public virtual UserAccount Author { get; set; } = null!;
}
