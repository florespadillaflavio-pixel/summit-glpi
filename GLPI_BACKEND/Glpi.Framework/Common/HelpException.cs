using System.Data.Common;
using System.Diagnostics;
using System.Text;
using Glpi.Framework.Response;

namespace Summit.ERPGeneral.Common;

public class HelpException
{
    #region LOG Y NOTIFICACIÓN

    public static ReturnValue LogAndNotifyReturn(Exception ex, params object[] datos)
    {
        LogAndNotify(ex, datos);
		//return new ReturnValue { Success = false, Message = "Error interno consulte al adminitrador." };
		return new ReturnValue { Success = false, Message = ex.Message };
	}

	public static void LogAndNotify(Exception ex, params object[] datos)
    {
        SaveToDb(ex, datos);
    }

    // Alias de compatibilidad con código antiguo
    public static void LogManager(Exception ex, params object[] datos)    => LogAndNotify(ex, datos);
    public static void NotifyManager(Exception ex, params object[] datos) => LogAndNotify(ex, datos);

    #endregion

    #region UTILIDADES

    public static string CommandString(DbCommand cmd)
    {
        if (cmd == null) return string.Empty;
        var sb = new StringBuilder();
        sb.Append(cmd.CommandText);
        foreach (DbParameter p in cmd.Parameters)
            sb.Append($" | {p.ParameterName}={p.Value}");
        return sb.ToString();
    }

    #endregion

    #region PRIVADO

    private static void SaveToDb(Exception ex, object[]? datos = null)
    {
        try
        {
            var conn = HelpData.ConetionString();
            if (string.IsNullOrEmpty(conn)) return;

            var inner = ex.InnerException;

            HelpNpg.Execute(conn, "gen_man_exceptionhandling_ins",
                HelpNpg.P("p_date",       DateTime.Now),
                HelpNpg.P("p_type",       inner?.GetType().Name ?? ex.GetType().Name),
                HelpNpg.P("p_message",    inner?.Message        ?? ex.Message),
                HelpNpg.P("p_number",     (inner?.HResult       ?? ex.HResult).ToString()),
                HelpNpg.P("p_module",     HelpConfig.Generales.ModuleName),
                HelpNpg.P("p_dbcommand",  inner != null ? ex.Message : string.Empty), // contexto SQL solo cuando viene de BD
                HelpNpg.P("p_classname",  BuildClassname(ex)),
                HelpNpg.P("p_source",     ex.Source      ?? string.Empty),
                HelpNpg.P("p_stacktrace", BuildFullStack(ex, datos)));
        }
        catch { /* logging failure must not crash the app */ }
    }

    // Extrae "Namespace.Clase.Método (archivo.cs : línea N)" del primer frame significativo.
    private static string BuildClassname(Exception ex)
    {
        try
        {
            var st = new StackTrace(ex, fNeedFileInfo: true);
            for (int i = 0; i < st.FrameCount; i++)
            {
                var frame  = st.GetFrame(i);
                var method = frame?.GetMethod();
                if (method == null) continue;

                var type = method.DeclaringType;
                if (type == null) continue;

                if (type.Namespace?.StartsWith("System")    == true) continue;
                if (type.Namespace?.StartsWith("Microsoft") == true) continue;
                if (type.Namespace?.StartsWith("Npgsql")    == true) continue;
                if (type.Namespace?.StartsWith("Dapper")    == true) continue;
                if (type == typeof(HelpException))                   continue;
                if (type == typeof(HelpNpg))                         continue;

                var file = frame!.GetFileName();
                var line = frame.GetFileLineNumber();

                var location = file != null && line > 0
                    ? $" ({Path.GetFileName(file)} : línea {line})"
                    : string.Empty;

                return $"{type.FullName}.{method.Name}{location}";
            }
            return ExtractClassFromString(ex.StackTrace);
        }
        catch
        {
            return ExtractClassFromString(ex.StackTrace);
        }
    }

    // Stack trace completo encadenando todas las inner exceptions.
    private static string BuildFullStack(Exception ex, object[]? datos)
    {
        var sb = new StringBuilder();

        if (datos?.Length > 0)
            sb.AppendLine($"Contexto extra: {string.Join(" | ", datos)}");

        var current = ex;
        int nivel   = 0;
        while (current != null)
        {
            sb.AppendLine(nivel == 0 ? "=== Excepción ===" : $"=== Inner Exception (nivel {nivel}) ===");
            sb.AppendLine($"Tipo    : {current.GetType().FullName}");
            sb.AppendLine($"Mensaje : {current.Message}");
            if (!string.IsNullOrEmpty(current.StackTrace))
                sb.AppendLine($"Stack   :\n{current.StackTrace}");
            current = current.InnerException;
            nivel++;
        }

        return sb.ToString();
    }

    private static string ExtractClassFromString(string? stackTrace)
    {
        if (string.IsNullOrEmpty(stackTrace)) return string.Empty;
        var lines = stackTrace.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        var line  = lines.FirstOrDefault(l => l.TrimStart().StartsWith("at ")) ?? string.Empty;
        var at    = line.IndexOf("at ", StringComparison.Ordinal);
        if (at < 0) return string.Empty;
        var part = line[(at + 3)..].Trim();
        var dot  = part.LastIndexOf('.');
        return dot > 0 ? part[..dot] : part;
    }

    #endregion
}
