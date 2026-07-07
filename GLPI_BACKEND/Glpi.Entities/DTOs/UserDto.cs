namespace Glpi.Entities.DTOs;

public class UserSummaryDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Guid? RoleId { get; set; }
    public string Company { get; set; } = string.Empty;
    public Guid CompanyId { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string AvatarUrl { get; set; } = string.Empty;
}

public class UserCreateUpdateDto
{
    public Guid? Id { get; set; }
    public Guid CompanyId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty; // Email
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public List<Guid> RoleIds { get; set; } = new();
}

public class UserDetailsDto : UserCreateUpdateDto
{
    public bool IsActive { get; set; }
    public new string? AvatarUrl { get; set; }
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Guid? RoleId { get; set; }
    public new Guid CompanyId { get; set; }
}
