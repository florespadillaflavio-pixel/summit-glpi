using System.Data;
using System.Reflection;
using Dapper;
using Npgsql;
using NpgsqlTypes;
using Glpi.Framework.Response;
using Glpi.Framework.Db;

namespace Summit.ERPGeneral.Common
{
    // Parámetro nombrado — úsalo dentro de Query/Execute
    public record NpgParam(string Name, object? Value);

    public class HelpNpg
    {
        #region P()  — crea un parámetro nombrado
        public static NpgParam P(string name, object? value) => new(name, value);
        #endregion

        #region SELECT — Query y QueryOne

        public static List<T> Query<T>(string conn, string fn, params NpgParam[] args)
        {
            try
            {
                var (sql, dp) = Build(fn, args);
                using var cx = new NpgsqlConnection(conn);
                return cx.Query<T>(sql, dp, commandTimeout: 200, commandType: CommandType.Text).ToList();
            }
            catch (Exception ex) { throw new Exception(Context(fn, args), ex); }
        }

        public static List<T> Query<T>(IDbConnection cx, IDbTransaction? tra, string fn, params NpgParam[] args)
        {
            var (sql, dp) = Build(fn, args);
            return cx.Query<T>(sql, dp, transaction: tra, commandTimeout: 200, commandType: CommandType.Text).ToList();
        }

        public static T? QueryOne<T>(string conn, string fn, params NpgParam[] args)
        {
            try
            {
                var (sql, dp) = Build(fn, args);
                using var cx = new NpgsqlConnection(conn);
                return cx.QueryFirstOrDefault<T>(sql, dp, commandTimeout: 200, commandType: CommandType.Text);
            }
            catch (Exception ex) { throw new Exception(Context(fn, args), ex); }
        }

        public static T? QueryOne<T>(IDbConnection cx, IDbTransaction? tra, string fn, params NpgParam[] args)
        {
            var (sql, dp) = Build(fn, args);
            return cx.QueryFirstOrDefault<T>(sql, dp, transaction: tra, commandTimeout: 200, commandType: CommandType.Text);
        }

        #endregion

        #region CUD — QueryReturn y Execute

        public static ReturnValue QueryReturn(string conn, string fn, params NpgParam[] args)
        {
            try
            {
                var (sql, dp) = Build(fn, args);
                using var cx  = new NpgsqlConnection(conn);
                return MapReturn(cx.QueryFirstOrDefault<dynamic>(sql, dp, commandTimeout: 200, commandType: CommandType.Text));
            }
            catch (Exception ex) { throw new Exception(Context(fn, args), ex); }
        }

        public static ReturnValue QueryReturn(IDbConnection cx, IDbTransaction? tra, string fn, params NpgParam[] args)
        {
            var (sql, dp) = Build(fn, args);
            return MapReturn(cx.QueryFirstOrDefault<dynamic>(sql, dp, transaction: tra, commandTimeout: 200, commandType: CommandType.Text));
        }

        private static ReturnValue MapReturn(dynamic? row)
        {
            var r = new ReturnValue { Success = true };
            if (row == null) return r;

            var dict = (IDictionary<string, object>)row;
            foreach (var kv in dict)
            {
                var key = kv.Key.ToLowerInvariant();
                var val = kv.Value;
                if      (key is "message"  or "p_message")  r.Message  = val?.ToString() ?? "";
                else if (key is "code"     or "p_code")     r.Code     = val?.ToString() ?? "";
                else if (key is "success"  or "p_success")  r.Success  = HelpConvert.ToBool(val ?? false);
                else if (key is "argument" or "p_argument") r.Argument = val?.ToString() ?? "";
                else if (key is "id"       or "p_id")       r.Id       = val != null && Guid.TryParse(val.ToString(), out var g) ? g : null;
            }

            if (!dict.Keys.Any(k => k is "success" or "p_success"))
                r.Success = !r.Message.ToLowerInvariant().Contains("error");

            return r;
        }

        public static int Execute(string conn, string fn, params NpgParam[] args)
        {
            try
            {
                var (sql, dp) = Build(fn, args);
                using var cx  = new NpgsqlConnection(conn);
                return cx.Execute(sql, dp, commandTimeout: 200, commandType: CommandType.Text);
            }
            catch (Exception ex) { throw new Exception(Context(fn, args), ex); }
        }

        public static int Execute(IDbConnection cx, IDbTransaction? tra, string fn, params NpgParam[] args)
        {
            var (sql, dp) = Build(fn, args);
            return cx.Execute(sql, dp, transaction: tra, commandTimeout: 200, commandType: CommandType.Text);
        }

        #endregion

        #region MAPPER

        public static List<T> Mapper<T>(NpgsqlDataReader reader)
        {
            if (reader == null) return new List<T>();
            try
            {
                var list = new List<T>();
                var parser = reader.GetRowParser<T>();
                while (reader.Read()) list.Add(parser(reader));
                reader.Close();
                return list;
            }
            catch
            {
                if (!reader.IsClosed) reader.Close();
                return new List<T>();
            }
        }

        #endregion

        #region INTERNO

        private static (string sql, DynamicParameters dp) Build(string fn, NpgParam[] args)
        {
            var dp    = new DynamicParameters();
            var names = new List<string>();
            foreach (var p in args)
            {
                dp.Add(p.Name, p.Value);
                names.Add("@" + p.Name);
            }
            string sql = names.Count > 0
                ? $"SELECT * FROM {fn}({string.Join(", ", names)})"
                : $"SELECT * FROM {fn}()";
            return (sql, dp);
        }

        private static string Context(string fn, NpgParam[] args) =>
            args.Length > 0
                ? $"{fn}({string.Join(", ", args.Select(p => $"{p.Name}={p.Value}"))})"
                : $"{fn}()";

        #endregion
    }
}
