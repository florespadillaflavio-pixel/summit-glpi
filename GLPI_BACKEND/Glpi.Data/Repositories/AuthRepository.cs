using Glpi.Framework.Db;
using Glpi.Framework.Response;
using Glpi.Entities.DTOs;
using Summit.ERPGeneral.Common;

namespace Glpi.Data.Repositories;

public class AuthRepository
{
    private string Conn => DbConfig.ConnectionString;

    public ReturnValue Validar(string username, string password)
    {
        return HelpNpg.QueryReturn(Conn, "fn_auth_login",
            HelpNpg.P("p_username", username),
            HelpNpg.P("p_password", password));
    }

    // fn_auth_change_password(p_user_id uuid, p_password varchar) re-hashes the
    // password and clears is_password_temporary. currentPassword is not consumed
    // by the DB function (it does not verify the old password).
    public ReturnValue CambiarPassword(Guid userId, string currentPassword, string newPassword)
    {
        return HelpNpg.QueryReturn(Conn, "fn_auth_change_password",
            HelpNpg.P("p_user_id", userId),
            HelpNpg.P("p_password", newPassword));
    }

    public List<UserPermissionDto> ObtenerPermisos(Guid userId)
    {
        return HelpNpg.Query<UserPermissionDto>(Conn, "fn_user_permissions",
            HelpNpg.P("p_user_id", userId));
    }

    public ReturnValue<UserProfileDto> ObtenerPerfil(Guid userId)
    {
        var data = HelpNpg.QueryOne<UserProfileDto>(Conn, "fn_user_profile",
            HelpNpg.P("p_user_id", userId));

        return data != null 
            ? ReturnValue<UserProfileDto>.Ok(data) 
            : ReturnValue<UserProfileDto>.Fail("Perfil no encontrado");
    }
}
