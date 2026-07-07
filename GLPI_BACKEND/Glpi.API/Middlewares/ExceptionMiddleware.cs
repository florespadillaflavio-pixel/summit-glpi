using System.Net;
using System.Text.Json;
using Glpi.Framework.Response;
using Summit.ERPGeneral.Common;

namespace Glpi.API.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Algo salió mal en GLPI: {ex.Message}");
            HelpException.LogAndNotify(ex);
            await HandleExceptionAsync(httpContext, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = ReturnValue.Fail("Error interno del servidor en GLPI.");
        // Opcional: Agregar detalle del error si no es producción
        response.Code = exception.Message;

        return context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
