namespace Glpi.Entities.DTOs;

public class RoleSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public string RoleType { get; set; } = string.Empty;
    public int UserCount { get; set; }
}

public class RolePermissionMatrixDto
{
    public Guid PermissionId { get; set; }
    public string PermissionCode { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string ModuleIcon { get; set; } = string.Empty;
    public bool Granted { get; set; }
}

public class RoleCreateDto
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RoleType { get; set; } = "CUSTOM";
}
