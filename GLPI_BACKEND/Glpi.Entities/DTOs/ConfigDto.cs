namespace Glpi.Entities.DTOs;

public class ConfigSaveDto
{
    public string ConfigGroup { get; set; } = string.Empty;
    public string ConfigKey { get; set; } = string.Empty;
    public string ConfigValue { get; set; } = string.Empty;
    public string ValueType { get; set; } = "STRING";
    public string Description { get; set; } = string.Empty;
    public bool IsSensitive { get; set; } = false;
}

public class SmtpTestDto
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Pass { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
}
