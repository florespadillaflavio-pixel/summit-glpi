namespace Glpi.Entities.DTOs;

public class LoginDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    public Guid UserId { get; set; }
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid CompanyId { get; set; }
    public string Username { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; }
    public UserProfileDto? Profile { get; set; }
    public List<UserPermissionDto> Permissions { get; set; } = new();
}

public class AuthDataDto
{
    public UserProfileDto Profile { get; set; } = null!;
    public List<UserPermissionDto> Permissions { get; set; } = new();
}

public class UserPermissionDto
{
    public Guid Permission_Id { get; set; }
    public Guid Module_Id { get; set; }
    public string Permission_Code { get; set; } = string.Empty;
    public string Permission_Name { get; set; } = string.Empty;
    public string Permission_Icon { get; set; } = string.Empty;
    public string Module_Name { get; set; } = string.Empty;
}
