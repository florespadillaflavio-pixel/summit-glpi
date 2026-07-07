namespace Glpi.Framework.Db;

public static class DbConfig
{
    private static string _connectionString = "";

    public static void Initialize(string connectionString)
    {
        _connectionString = connectionString;
    }

    public static string ConnectionString
    {
        get
        {
            if (string.IsNullOrEmpty(_connectionString))
                throw new InvalidOperationException("DbConfig no inicializado. Llame DbConfig.Initialize() en Program.cs.");
            return _connectionString;
        }
    }
}
