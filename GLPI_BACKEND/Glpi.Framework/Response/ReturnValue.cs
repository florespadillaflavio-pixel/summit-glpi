namespace Glpi.Framework.Response;

public class ReturnValue
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Argument { get; set; } = string.Empty;
    public Guid? Id { get; set; }
    public object? Data { get; set; }

    public static ReturnValue Fail(string message) => new() { Success = false, Message = message };
    public static ReturnValue Ok(string message = "", string code = "") => new() { Success = true, Message = message, Code = code };
    public static ReturnValue Ok(Guid id, string message = "") => new() { Success = true, Message = message, Id = id };
}

public class ReturnValue<T> : ReturnValue
{
    public new T? Data { get; set; }

    public new static ReturnValue<T> Fail(string message) => new() { Success = false, Message = message };
    public static ReturnValue<T> Ok(T data, string message = "") => new() { Success = true, Data = data, Message = message };
}
