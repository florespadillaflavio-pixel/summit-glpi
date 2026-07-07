using Glpi.Entities.DTOs;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;
using Glpi.Framework.Common;
using Glpi.Framework.Db;
using Glpi.Framework.Mail;
using Npgsql;
using System.Data;
using System.Net;

namespace Glpi.Logic;

public class UserLogic
{
    private readonly UserRepository _repo = new();
    private readonly RoleRepository _roleRepo = new();
    private readonly ITenantService _tenantService;
    private readonly IFileStorageService _storageService;
    private readonly EmailService _emailService;

    public UserLogic(ITenantService tenantService, IFileStorageService storageService, EmailService emailService)
    {
        _tenantService = tenantService;
        _storageService = storageService;
        _emailService = emailService;
    }

    public async Task<ReturnValue<List<UserSummaryDto>>> GetAllAsync()
    {
        try
        {
            var users = _repo.Listar(_tenantService.CompanyId);
            return ReturnValue<List<UserSummaryDto>>.Ok(users);
        }
        catch (Exception ex)
        {
            HelpException.LogAndNotify(ex);
            var msg = ex.InnerException?.Message ?? ex.Message;
            return ReturnValue<List<UserSummaryDto>>.Fail(msg);
        }
    }

    public async Task<ReturnValue<UserDetailsDto>> GetByIdAsync(Guid id)
    {
        try
        {
            var user = _repo.ObtenerPorId(_tenantService.CompanyId, id);
            if (user == null) return ReturnValue<UserDetailsDto>.Fail("Usuario no encontrado");

            // Asegurar que RoleIds se llene si RoleId tiene valor
            if (user.RoleId.HasValue && (user.RoleIds == null || !user.RoleIds.Any()))
            {
                user.RoleIds = new List<Guid> { user.RoleId.Value };
            }

            return ReturnValue<UserDetailsDto>.Ok(user);
        }
        catch (Exception ex)
        {
            HelpException.LogAndNotify(ex);
            var msg = ex.InnerException?.Message ?? ex.Message;
            return ReturnValue<UserDetailsDto>.Fail(msg);
        }
    }

    public async Task<ReturnValue> CreateAsync(UserCreateUpdateDto dto)
    {
        try
        {
            var validation = ValidateCompanyByRole(dto);
            if (!validation.Success) return validation;

            var plainPassword = dto.Password;

            // Negocio: Hashear password antes de enviar al repo
            if (!string.IsNullOrEmpty(dto.Password))
                dto.Password = HelpEncrypt.HashBCrypt(dto.Password);
            
            var res = _repo.Insertar(dto);
            if (!res.Success) return res;

            if (!string.IsNullOrWhiteSpace(plainPassword))
            {
                var mailRes = await TrySendWelcomeEmailAsync(dto, plainPassword);
                if (mailRes.Success)
                {
                    res.Message = $"{res.Message}. Credenciales enviadas por correo.";
                }
                else
                {
                    res.Message = $"{res.Message}. No se enviaron credenciales por correo: {mailRes.Message}";
                }
            }

            return res;
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateAsync(UserCreateUpdateDto dto)
    {
        try
        {
            var validation = ValidateCompanyByRole(dto);
            if (!validation.Success) return validation;

            if (!string.IsNullOrEmpty(dto.Password))
                dto.Password = HelpEncrypt.HashBCrypt(dto.Password);

            return _repo.Actualizar(dto);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> DeleteAsync(Guid id)
    {
        using var cx = new NpgsqlConnection(DbConfig.ConnectionString);
        cx.Open();
        using var tra = cx.BeginTransaction();

        try
        {
            // 1. Obtener datos actuales dentro de la transacción
            var user = _repo.ObtenerPorId(cx, tra, _tenantService.CompanyId, id);
            if (user == null) return ReturnValue.Fail("Usuario no encontrado.");

            // 2. Realizar borrado en base de datos (Soft Delete)
            var res = _repo.Eliminar(cx, tra, id);
            
            if (!res.Success) 
            {
                tra.Rollback();
                return res;
            }

            // 3. Si tenía foto, intentar borrar de Cloudinary ANTES de confirmar la transacción
            if (!string.IsNullOrEmpty(user.AvatarUrl))
            {
                // El borrado de archivo es una operación externa. 
                // Si falla, revertimos el borrado en BD para asegurar que no queden "huérfanos".
                var fileDeleted = await _storageService.DeleteFileByUrlAsync(user.AvatarUrl);
                if (!fileDeleted)
                {
                    tra.Rollback();
                    return ReturnValue.Fail("No se pudo eliminar el archivo del servidor externo. Operación cancelada.");
                }
            }

            // 4. Si todo OK, confirmamos la transacción en la BD
            tra.Commit();
            return res;
        }
        catch (Exception ex)
        {
            tra.Rollback();
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateStatusAsync(Guid id, bool isActive)
    {
        try
        {
            return _repo.ActualizarEstado(id, isActive);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    private ReturnValue ValidateCompanyByRole(UserCreateUpdateDto dto)
    {
        if (dto.RoleIds == null || dto.RoleIds.Count == 0)
            return ReturnValue.Fail("Debe seleccionar al menos un rol.");

        var roles = _roleRepo.Listar(_tenantService.CompanyId)
            .Where(r => dto.RoleIds.Contains(r.Id))
            .ToList();

        if (roles.Count != dto.RoleIds.Count)
            return ReturnValue.Fail("Uno o más roles seleccionados no existen para esta empresa.");

        var onlyClientRoles = roles.All(IsClientRole);
        if (!onlyClientRoles && dto.CompanyId != _tenantService.CompanyId)
            return ReturnValue.Fail("Los roles administrativos o técnicos solo pueden pertenecer a la empresa interna.");

        return ReturnValue.Ok();
    }

    private static bool IsClientRole(RoleSummaryDto role)
    {
        return role.RoleType.Trim().Equals("CLIENT", StringComparison.OrdinalIgnoreCase)
            || role.Name.Trim().Equals("Cliente", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<ReturnValue> TrySendWelcomeEmailAsync(UserCreateUpdateDto dto, string plainPassword)
    {
        try
        {
            var smtp = await _emailService.TestConnectionAsync();
            if (!smtp.Success) return smtp;

            var fullName = $"{dto.FirstName} {dto.LastName}".Trim();
            var safeName = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(fullName) ? dto.Username : fullName);
            var safeUser = WebUtility.HtmlEncode(dto.Username);
            var safePass = WebUtility.HtmlEncode(plainPassword);

            var body = $"""
                <div style="font-family:Arial,sans-serif;color:#0d1b26;line-height:1.5">
                  <h2 style="color:#143f5c;margin-bottom:8px">Bienvenido a Summit GLPI</h2>
                  <p>Hola <strong>{safeName}</strong>, se creó tu acceso a la plataforma.</p>
                  <div style="background:#f4f7f9;border:1px solid #d8e0e7;border-radius:8px;padding:14px;margin:16px 0">
                    <p style="margin:0 0 8px"><strong>Usuario:</strong> {safeUser}</p>
                    <p style="margin:0"><strong>Contraseña temporal:</strong> {safePass}</p>
                  </div>
                  <p>Por seguridad, cambia tu contraseña en el primer ingreso o desde tu perfil.</p>
                </div>
                """;

            await _emailService.SendEmailAsync(dto.Username, "Tus credenciales de acceso - Summit GLPI", body);
            return ReturnValue.Ok("Credenciales enviadas por correo.");
        }
        catch (Exception ex)
        {
            return ReturnValue.Fail(ex.Message);
        }
    }
}
