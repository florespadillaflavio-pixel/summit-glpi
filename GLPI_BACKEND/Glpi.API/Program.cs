using Microsoft.OpenApi.Models;
using Glpi.API.Hubs;
using Glpi.Framework.Db;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Glpi.Data;
using Microsoft.EntityFrameworkCore;
using Glpi.Framework.Auth;
using Glpi.Framework.Common;
using Glpi.Framework.Mail;
using Glpi.API.Services;
using Glpi.Logic;
using Glpi.Logic.AI;

var builder = WebApplication.CreateBuilder(args);

// 0. Bind to Render's dynamic $PORT (Render injects PORT; TLS is terminated at its proxy).
//    Falls back to Kestrel's default (8080 in the aspnet container) when PORT is not set.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Configurar Dapper para mapear snake_case a PascalCase (full_name -> FullName)
Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

// 1. Inicializar DbConfig y EF Core
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(connectionString))
{
    connectionString = connectionString.Trim().Replace("\n", "").Replace("\r", "");
}
DbConfig.Initialize(connectionString!);

builder.Services.AddDbContext<GlpiDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Configurar Servicios y DI
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSignalR();

// DI para Servicios de Aplicación
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IFileStorageService, CloudinaryStorageService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<AuthLogic>();
builder.Services.AddScoped<TicketLogic>();
builder.Services.AddScoped<AssetLogic>();
builder.Services.AddScoped<CatalogLogic>();
builder.Services.AddScoped<UserLogic>();
builder.Services.AddScoped<RoleLogic>();
builder.Services.AddScoped<CompanyLogic>();
builder.Services.AddScoped<KbLogic>();
builder.Services.AddScoped<ContractLogic>();
builder.Services.AddScoped<AuditLogic>();
builder.Services.AddScoped<ReportLogic>();
builder.Services.AddScoped<ConfigLogic>();
builder.Services.AddScoped<DashboardLogic>();
builder.Services.AddScoped<AILogic>();

// 3. Configurar Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { 
        Title = "Glpi.API", 
        Version = "v1",
        Description = "Backend para Sistema GLPI Personalizado - Multitenant" 
    });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// 4. Configurar JWT
var jwtKey = builder.Configuration["Jwt:Key"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

// 5. CORS
//    Origins come from config "Cors:AllowedOrigins" (comma-separated string or array;
//    env var Cors__AllowedOrigins). No AllowCredentials: the SignalR client uses
//    accessTokenFactory / withCredentials:false, which is incompatible with credentials + WithOrigins.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
        }
        else if (builder.Environment.IsDevelopment())
        {
            // No origins configured: only wide-open in Development for local convenience.
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            // Production with nothing configured: fail safe to an empty allow-list.
            policy.WithOrigins(Array.Empty<string>()).AllowAnyHeader().AllowAnyMethod();
        }
    });
});

// 5b. Health check for Render liveness probes.
builder.Services.AddHealthChecks();

var app = builder.Build();

// 6. Middleware
app.UseMiddleware<Glpi.API.Middlewares.ExceptionMiddleware>();

// Swagger: on in Development, or when explicitly enabled in prod via Swagger__Enabled=true.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Glpi API V1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// Liveness endpoint for Render.
app.MapHealthChecks("/health");

app.MapControllers();
app.MapHub<TicketHub>("/hubs/tickets");

app.Run();
