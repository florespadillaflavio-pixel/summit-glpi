using System.Security.Cryptography;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace Summit.ERPGeneral.Common;

public class HelpEncrypt
{
    // Clave fija para tokens de recuperación de contraseña
    public const string TokenKey = "SummitERP_ResetKey_v1";

    #region MD5  (hash unidireccional — usar para passwords)

    public static string EncryptorMD5(string texto)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(texto));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    #endregion

    #region AES-256  (cifrado reversible — usar para datos sensibles)

    public static string Encryptor(string texto, string key)
    {
        using var aes = Aes.Create();
        var (k, iv) = DeriveKeyIV(key);
        aes.Key = k; aes.IV = iv;
        var encrypted = aes.EncryptCbc(Encoding.UTF8.GetBytes(texto), iv);
        return Convert.ToBase64String(encrypted);
    }

    public static string Decryptor(string texto, string key)
    {
        using var aes = Aes.Create();
        var (k, iv) = DeriveKeyIV(key);
        aes.Key = k; aes.IV = iv;
        var decrypted = aes.DecryptCbc(Convert.FromBase64String(texto), iv);
        return Encoding.UTF8.GetString(decrypted);
    }

    #endregion

    #region AES-256 URL-SAFE  (base64 sin +/= para querystring)

    public static string EncryptorUrl(string texto, string key) =>
        Encryptor(texto, key)
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

    public static string DecryptorUrl(string texto, string key)
    {
        string base64 = texto.Replace("-", "+").Replace("_", "/");
        int pad = base64.Length % 4;
        if (pad > 0) base64 += new string('=', 4 - pad);
        return Decryptor(base64, key);
    }

    #endregion

    #region BCrypt (hash unidireccional — recomendado para passwords)

    public static string HashBCrypt(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public static bool VerifyBCrypt(string password, string hash)
    {
        try { return BCrypt.Net.BCrypt.Verify(password, hash); }
        catch { return false; }
    }

    #endregion

    #region JWT (Tokens de acceso)

    public static string GenerarTokenJWT(string secretKey, string issuer, string audience, int expireMinutes, IEnumerable<Claim> claims)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expireMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    #endregion

    #region UTILIDADES

    public static string GenerarPasswordAleatorio(int longitud = 10)
    {
        const string valid = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*";
        StringBuilder res = new();
        using (var rng = RandomNumberGenerator.Create())
        {
            byte[] uintBuffer = new byte[sizeof(uint)];
            while (res.Length < longitud)
            {
                rng.GetBytes(uintBuffer);
                uint num = BitConverter.ToUInt32(uintBuffer, 0);
                res.Append(valid[(int)(num % (uint)valid.Length)]);
            }
        }
        return res.ToString();
    }

    #endregion

    #region INTERNO

    private static (byte[] key, byte[] iv) DeriveKeyIV(string password)
    {
        var salt = Encoding.UTF8.GetBytes("SummitERP_Salt_v1");
        var key  = Rfc2898DeriveBytes.Pbkdf2(password, salt, 10_000, HashAlgorithmName.SHA256, 32);
        var iv   = Rfc2898DeriveBytes.Pbkdf2(password, salt, 10_000, HashAlgorithmName.SHA256, 16);
        return (key, iv);
    }

    #endregion
}
