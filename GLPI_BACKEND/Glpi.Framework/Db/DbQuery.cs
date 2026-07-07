using Npgsql;
using Glpi.Framework.Response;
using System.Data;
using System.Reflection;
using System.Text.Json;

namespace Glpi.Framework.Db;

public sealed class DbQuery
{
    private readonly string _function;
    private readonly List<(string Name, object? Value)> _params = new();

    private DbQuery(string function) => _function = function;

    public static DbQuery Exec(string function) => new(function);

    public DbQuery Add(string name, object? value)
    {
        _params.Add((name, value));
        return this;
    }

    private NpgsqlCommand Build(NpgsqlConnection cnn)
    {
        var paramNames = string.Join(", ", _params.Select(p => $"@{p.Name}"));
        var query = $"SELECT * FROM {_function}({paramNames})";
        
        var cmd = new NpgsqlCommand(query, cnn);
        foreach (var (name, value) in _params)
        {
            cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }
        return cmd;
    }

    private static NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(DbConfig.ConnectionString);
    }

    public List<T> ToList<T>() where T : new()
    {
        using var cnn = CreateConnection();
        cnn.Open();
        using var cmd = Build(cnn);
        using var reader = cmd.ExecuteReader();
        var list = new List<T>();
        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
        
        while (reader.Read())
        {
            var item = new T();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                var colName = reader.GetName(i);
                var prop = properties.FirstOrDefault(p => p.Name.Equals(colName, StringComparison.InvariantCultureIgnoreCase));
                if (prop != null && !reader.IsDBNull(i))
                {
                    var val = reader.GetValue(i);
                    prop.SetValue(item, val == DBNull.Value ? null : val);
                }
            }
            list.Add(item);
        }
        return list;
    }

    public ReturnValue ToResult()
    {
        using var cnn = CreateConnection();
        cnn.Open();
        using var cmd = Build(cnn);
        using var reader = cmd.ExecuteReader();
        
        if (!reader.Read()) return ReturnValue.Fail("Sin respuesta de la base de datos.");

        var res = new ReturnValue();
        for (int i = 0; i < reader.FieldCount; i++)
        {
            var name = reader.GetName(i).ToLower();
            var val = reader.GetValue(i);
            if (val == DBNull.Value) continue;

            if (name == "p_success") res.Success = Convert.ToBoolean(val);
            else if (name == "p_message") res.Message = val.ToString() ?? "";
            else if (name == "p_code") res.Code = val.ToString() ?? "";
        }
        return res;
    }

    public ReturnValue<T> ToResult<T>() where T : new()
    {
        using var cnn = CreateConnection();
        cnn.Open();
        using var cmd = Build(cnn);
        using var reader = cmd.ExecuteReader();
        
        if (!reader.Read()) return ReturnValue<T>.Fail("Sin respuesta de la base de datos.");

        var res = new ReturnValue<T>();
        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
        
        for (int i = 0; i < reader.FieldCount; i++)
        {
            var colName = reader.GetName(i).ToLower();
            var val = reader.GetValue(i);
            if (val == DBNull.Value) continue;

            if (colName == "p_success") res.Success = Convert.ToBoolean(val);
            else if (colName == "p_message") res.Message = val.ToString() ?? "";
            else if (colName == "p_code") res.Code = val.ToString() ?? "";
            
            var prop = properties.FirstOrDefault(p => p.Name.Equals(colName, StringComparison.InvariantCultureIgnoreCase));
            if (prop != null)
            {
                if (res.Data == null) res.Data = new T();
                prop.SetValue(res.Data, val);
            }
        }
        return res;
    }

    public string ToJson()
    {
        using var cnn = CreateConnection();
        cnn.Open();
        using var cmd = Build(cnn);
        using var reader = cmd.ExecuteReader();
        
        var rows = new List<Dictionary<string, object>>();
        while (reader.Read())
        {
            var row = new Dictionary<string, object>();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.GetValue(i) == DBNull.Value ? null! : reader.GetValue(i);
            }
            rows.Add(row);
        }

        if (rows.Count == 1 && rows[0].Count == 1)
        {
            var val = rows[0].Values.First();
            if (val is string s && (s.Trim().StartsWith("{") || s.Trim().StartsWith("[")))
                return s;
        }

        return JsonSerializer.Serialize(rows);
    }
}
