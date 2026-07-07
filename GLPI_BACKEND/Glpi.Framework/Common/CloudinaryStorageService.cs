using Microsoft.AspNetCore.Http;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Dapper;
using Glpi.Framework.Auth;
using Glpi.Framework.Db;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Summit.ERPGeneral.Common;
using System.Text.RegularExpressions;

namespace Glpi.Framework.Common
{
    public interface IFileStorageService
    {
        Task<string?> UploadFileAsync(IFormFile file, string folder);
        Task<bool> DeleteFileAsync(string publicId);
        Task<bool> DeleteFileByUrlAsync(string? url);
    }

    public class CloudinaryStorageService : IFileStorageService
    {
        private readonly IConfiguration _config;
        private readonly ITenantService _tenantService;
        private readonly string _encryptionKey;

        public CloudinaryStorageService(IConfiguration config, ITenantService tenantService)
        {
            _config = config;
            _tenantService = tenantService;
            _encryptionKey = config["Jwt:Key"] ?? "SummitGLPI_Default_Key_2026";
        }

        public async Task<string?> UploadFileAsync(IFormFile file, string folder)
        {
            if (file == null || file.Length == 0) return null;

            var cloudinary = BuildCloudinaryClient();
            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams()
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                Transformation = new Transformation().Quality("auto").FetchFormat("auto")
            };

            var uploadResult = await cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary upload failed: {uploadResult.Error.Message}");
            }

            return uploadResult.SecureUrl.ToString();
        }

        public async Task<bool> DeleteFileAsync(string publicId)
        {
            var cloudinary = BuildCloudinaryClient();
            var deletionParams = new DeletionParams(publicId);
            var result = await cloudinary.DestroyAsync(deletionParams);
            return result.Result == "ok";
        }

        public async Task<bool> DeleteFileByUrlAsync(string? url)
        {
            if (string.IsNullOrEmpty(url)) return true;

            try
            {
                // Extraer el Public ID de la URL de Cloudinary
                // Formato: https://res.cloudinary.com/cloudname/image/upload/v123456/folder/subfolder/id.jpg
                var regex = new Regex(@"/upload/(?:v\d+/)?(.+)\.");
                var match = regex.Match(url);

                if (match.Success)
                {
                    var publicId = match.Groups[1].Value;
                    return await DeleteFileAsync(publicId);
                }
            }
            catch
            {
                // No lanzamos error para no bloquear el flujo principal si falla el borrado físico
            }

            return false;
        }

        private Cloudinary BuildCloudinaryClient()
        {
            var settings = LoadTenantStorageSettings();

            var cloudName = settings.GetValueOrDefault("STORAGE_CLOUD_NAME") ?? _config["Cloudinary:CloudName"];
            var apiKey = settings.GetValueOrDefault("STORAGE_API_KEY") ?? _config["Cloudinary:ApiKey"];
            var apiSecret = settings.GetValueOrDefault("STORAGE_API_SECRET") ?? _config["Cloudinary:ApiSecret"];
            var provider = settings.GetValueOrDefault("STORAGE_PROVIDER") ?? "CLOUDINARY";

            if (!string.Equals(provider, "CLOUDINARY", StringComparison.OrdinalIgnoreCase))
            {
                throw new Exception($"Proveedor de almacenamiento no soportado: {provider}");
            }

            if (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
            {
                throw new Exception("Cloudinary no está configurado. Complete Almacenamiento en Configuración.");
            }

            var cloudinary = new Cloudinary(new Account(cloudName, apiKey, apiSecret));
            cloudinary.Api.Secure = true;
            return cloudinary;
        }

        private Dictionary<string, string> LoadTenantStorageSettings()
        {
            if (_tenantService.CompanyId == Guid.Empty) return new Dictionary<string, string>();

            const string sql = """
                SELECT config_key, config_value, is_sensitive
                FROM tenant_config
                WHERE company_id = @CompanyId
                  AND config_group = 'STORAGE'
                """;

            using var conn = new NpgsqlConnection(DbConfig.ConnectionString);
            var rows = conn.Query<StorageConfigRow>(sql, new { CompanyId = _tenantService.CompanyId });
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var row in rows)
            {
                if (string.IsNullOrWhiteSpace(row.ConfigKey)) continue;

                var value = row.ConfigValue ?? string.Empty;
                if (row.IsSensitive && !string.IsNullOrWhiteSpace(value))
                {
                    value = HelpEncrypt.Decryptor(value, _encryptionKey);
                }

                result[row.ConfigKey] = value;
            }

            return result;
        }

        private sealed class StorageConfigRow
        {
            public string ConfigKey { get; set; } = string.Empty;
            public string ConfigValue { get; set; } = string.Empty;
            public bool IsSensitive { get; set; }
        }
    }
}
