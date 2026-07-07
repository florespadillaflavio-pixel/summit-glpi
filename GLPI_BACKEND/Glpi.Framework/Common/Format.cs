using System;

namespace Summit.ERPGeneral.Common;

public class Format
{
    public static string ToMoneyString(decimal value) => value.ToString("C");
    public static string ToMoneyString(decimal? value) => value.HasValue ? value.Value.ToString("C") : string.Empty;
    public static string ToMoneyString(double value) => value.ToString("C");
    public static string ToMoneyString(double? value) => value.HasValue ? value.Value.ToString("C") : string.Empty;
    public static string ToMoneyString(object value) => value != null ? Convert.ToDecimal(value).ToString("C") : string.Empty;
    
    public static string ToFechaString(DateTime value) => value.ToString("dd/MM/yyyy");
    public static string ToFechaString(DateTime? value) => value.HasValue ? value.Value.ToString("dd/MM/yyyy") : string.Empty;
    public static string ToFechaMinString(DateTime? value) => value.HasValue ? value.Value.ToString("dd/MM/yyyy 00:00:00") : string.Empty;
    public static string ToFechaMaxString(DateTime? value) => value.HasValue ? value.Value.ToString("dd/MM/yyyy 23:59:59") : string.Empty;
}
