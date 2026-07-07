using System;

namespace Summit.ERPGeneral.Common
{
    public class HelpConvert
    {
        public static bool ToBool(object value)
        {
            if (value == null || value == DBNull.Value) return false;
            if (value is bool b) return b;
            if (value is int i) return i != 0;
            if (value is string s)
            {
                if (bool.TryParse(s, out var res)) return res;
                if (s == "1") return true;
                if (s == "0") return false;
                if (s.ToLower() == "true") return true;
                if (s.ToLower() == "false") return false;
            }
            return false;
        }
    }
}
