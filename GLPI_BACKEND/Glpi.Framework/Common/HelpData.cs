using Glpi.Framework.Db;

namespace Summit.ERPGeneral.Common
{
    public class HelpData
    {
        public static string ConetionString() => DbConfig.ConnectionString;
    }
}
