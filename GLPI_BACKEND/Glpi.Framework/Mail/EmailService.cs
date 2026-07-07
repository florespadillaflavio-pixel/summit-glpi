using Dapper;
using Glpi.Framework.Auth;
using Glpi.Framework.Db;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Summit.ERPGeneral.Common;
using System.Net;
using System.Net.Mail;
using System.Net.Sockets;
using Glpi.Framework.Response;

namespace Glpi.Framework.Mail;

public class EmailService
{
    private readonly ITenantService _tenantService;
    private readonly string _encryptionKey;

    public EmailService(ITenantService tenantService, IConfiguration config)
    {
        _tenantService = tenantService;
        _encryptionKey = config["Jwt:Key"] ?? "SummitGLPI_Default_Key_2026";
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        var settings = LoadMailSettings();
        var host = settings.GetValueOrDefault("MAIL_SMTP_HOST");
        var user = settings.GetValueOrDefault("MAIL_SMTP_USER");
        var pass = settings.GetValueOrDefault("MAIL_SMTP_PASS");
        var fromEmail = settings.GetValueOrDefault("MAIL_FROM_EMAIL");
        var fromName = settings.GetValueOrDefault("MAIL_FROM_NAME") ?? "Summit GLPI";
        var portRaw = settings.GetValueOrDefault("MAIL_SMTP_PORT") ?? "587";
        var sslRaw = settings.GetValueOrDefault("MAIL_SMTP_SSL") ?? "true";

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(pass) || string.IsNullOrWhiteSpace(fromEmail))
        {
            throw new InvalidOperationException("SMTP no está configurado. Complete Correo SMTP en Configuración.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        message.To.Add(to);

        using var client = new SmtpClient(host, int.TryParse(portRaw, out var port) ? port : 587)
        {
            EnableSsl = bool.TryParse(sslRaw, out var ssl) ? ssl : true,
            Credentials = new NetworkCredential(user, pass)
        };

        await client.SendMailAsync(message);
    }

    public async Task<ReturnValue> TestConnectionAsync()
    {
        var settings = LoadMailSettings();
        var host = settings.GetValueOrDefault("MAIL_SMTP_HOST");
        var user = settings.GetValueOrDefault("MAIL_SMTP_USER");
        var pass = settings.GetValueOrDefault("MAIL_SMTP_PASS");
        var fromEmail = settings.GetValueOrDefault("MAIL_FROM_EMAIL");
        var portRaw = settings.GetValueOrDefault("MAIL_SMTP_PORT") ?? "587";

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(user) ||
            string.IsNullOrWhiteSpace(pass) ||
            string.IsNullOrWhiteSpace(fromEmail))
        {
            return ReturnValue.Fail("SMTP no está configurado. Complete servidor, usuario, contraseña y correo remitente.");
        }

        if (!int.TryParse(portRaw, out var port) || port <= 0 || port > 65535)
        {
            return ReturnValue.Fail("El puerto SMTP configurado no es válido.");
        }

        try
        {
            using var client = new TcpClient();
            var connectTask = client.ConnectAsync(host, port);
            var completed = await Task.WhenAny(connectTask, Task.Delay(TimeSpan.FromSeconds(5)));

            if (completed != connectTask || !client.Connected)
                return ReturnValue.Fail("No se pudo conectar al servidor SMTP configurado.");

            return ReturnValue.Ok("Conexión SMTP validada correctamente.");
        }
        catch
        {
            return ReturnValue.Fail("No se pudo conectar al servidor SMTP configurado.");
        }
    }

    private Dictionary<string, string> LoadMailSettings()
    {
        if (_tenantService.CompanyId == Guid.Empty) return new Dictionary<string, string>();

        const string sql = """
            SELECT config_key, config_value, is_sensitive
            FROM tenant_config
            WHERE company_id = @CompanyId
              AND config_group = 'MAIL'
            """;

        using var conn = new NpgsqlConnection(DbConfig.ConnectionString);
        var rows = conn.Query<MailConfigRow>(sql, new { CompanyId = _tenantService.CompanyId });
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var value = row.ConfigValue ?? string.Empty;
            if (row.IsSensitive && !string.IsNullOrWhiteSpace(value))
            {
                value = HelpEncrypt.Decryptor(value, _encryptionKey);
            }

            result[row.ConfigKey] = value;
        }

        return result;
    }

    private sealed class MailConfigRow
    {
        public string ConfigKey { get; set; } = string.Empty;
        public string ConfigValue { get; set; } = string.Empty;
        public bool IsSensitive { get; set; }
    }
}
