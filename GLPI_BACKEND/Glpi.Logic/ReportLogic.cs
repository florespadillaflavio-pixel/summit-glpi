using Glpi.Entities.Entities;
using Glpi.Entities.DTOs;
using Glpi.Framework.Response;
using Glpi.Data.Repositories;
using Summit.ERPGeneral.Common;
using Glpi.Framework.Auth;

namespace Glpi.Logic;

public class ReportLogic
{
    private readonly ReportRepository _repo = new();
    private readonly ITenantService _tenantService;

    public ReportLogic(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public async Task<ReturnValue<List<ScheduledReport>>> GetScheduledReportsAsync()
    {
        try
        {
            var reports = _repo.Listar(_tenantService.CompanyId);
            return ReturnValue<List<ScheduledReport>>.Ok(reports);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<List<ScheduledReport>> 
                   ?? ReturnValue<List<ScheduledReport>>.Fail(ex.Message);
        }
    }

    public async Task<ReturnValue> CreateScheduledReportAsync(ScheduledReport report)
    {
        try
        {
            return _repo.Insertar(_tenantService.CompanyId, report, _tenantService.UserId);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> UpdateScheduledReportAsync(Guid id, ScheduledReport report)
    {
        try
        {
            report.Id = id;
            return _repo.Actualizar(_tenantService.CompanyId, report);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    public async Task<ReturnValue> DeleteScheduledReportAsync(Guid id)
    {
        try
        {
            return _repo.Eliminar(_tenantService.CompanyId, id);
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex);
        }
    }

    // ------------------------------------------------------------------
    // Reportes ad-hoc: tickets / assets / sla  ->  PDF, Excel o Word
    // ------------------------------------------------------------------

    public ReturnValue<AdHocReportFile> GenerateAdHoc(string type, AdHocReportRequest req)
    {
        try
        {
            var tipo = (type ?? string.Empty).Trim().ToLowerInvariant();
            if (tipo != "tickets" && tipo != "assets" && tipo != "sla")
                return ReturnValue<AdHocReportFile>.Fail("Tipo de reporte inválido. Use tickets, assets o sla.");

            var formato = (req?.Format ?? "PDF").Trim().ToUpperInvariant();
            if (formato != "PDF" && formato != "EXCEL" && formato != "WORD")
                return ReturnValue<AdHocReportFile>.Fail("Formato inválido. Use PDF, EXCEL o WORD.");

            var from = req?.DateFrom;
            var to = req?.DateTo;
            if (from.HasValue && to.HasValue && from.Value.Date > to.Value.Date)
                return ReturnValue<AdHocReportFile>.Fail("La fecha inicial no puede ser mayor que la fecha final.");

            var companyId = _tenantService.CompanyId;

            string title;
            string[] columns;
            List<string[]> rows;
            var summary = new List<(string Label, string Value)>();
            string baseName;

            switch (tipo)
            {
                case "tickets":
                {
                    title = "Reporte de Tickets";
                    baseName = "reporte-tickets";
                    columns = new[] { "N° Ticket", "Asunto", "Estado", "Prioridad", "Solicitante", "Creado" };
                    var data = _repo.ConsultarTickets(companyId, from, to);
                    rows = data.Select(x => new[]
                    {
                        x.TicketNumber,
                        x.Subject,
                        x.Status,
                        x.Priority,
                        x.Requester,
                        x.CreatedAt.ToString("yyyy-MM-dd")
                    }).ToList();

                    summary.Add(("Total de tickets", data.Count.ToString()));
                    foreach (var g in data.GroupBy(x => string.IsNullOrWhiteSpace(x.Status) ? "(sin estado)" : x.Status)
                                          .OrderByDescending(g => g.Count()))
                        summary.Add(($"Estado - {g.Key}", g.Count().ToString()));
                    foreach (var g in data.GroupBy(x => string.IsNullOrWhiteSpace(x.Priority) ? "(sin prioridad)" : x.Priority)
                                          .OrderByDescending(g => g.Count()))
                        summary.Add(($"Prioridad - {g.Key}", g.Count().ToString()));
                    break;
                }
                case "assets":
                {
                    title = "Reporte de Activos";
                    baseName = "reporte-assets";
                    columns = new[] { "Etiqueta", "Modelo", "Tipo", "Estado", "Compañía", "Creado" };
                    var data = _repo.ConsultarAssets(companyId, from, to);
                    rows = data.Select(x => new[]
                    {
                        x.AssetTag,
                        x.Model,
                        x.Type,
                        x.Status,
                        x.Company,
                        x.CreatedAt.ToString("yyyy-MM-dd")
                    }).ToList();

                    summary.Add(("Total de activos", data.Count.ToString()));
                    foreach (var g in data.GroupBy(x => string.IsNullOrWhiteSpace(x.Status) ? "(sin estado)" : x.Status)
                                          .OrderByDescending(g => g.Count()))
                        summary.Add(($"Estado - {g.Key}", g.Count().ToString()));
                    foreach (var g in data.GroupBy(x => string.IsNullOrWhiteSpace(x.Type) ? "(sin tipo)" : x.Type)
                                          .OrderByDescending(g => g.Count()))
                        summary.Add(($"Tipo - {g.Key}", g.Count().ToString()));
                    break;
                }
                default: // sla
                {
                    title = "Reporte de Cumplimiento SLA";
                    baseName = "reporte-sla";
                    columns = new[] { "N° Ticket", "Asunto", "Vencimiento", "1ra Respuesta", "Resuelto", "SLA" };
                    var data = _repo.ConsultarSla(companyId, from, to);
                    rows = data.Select(x => new[]
                    {
                        x.TicketNumber,
                        x.Subject,
                        x.DueDate?.ToString("yyyy-MM-dd HH:mm") ?? "-",
                        x.FirstResponseAt?.ToString("yyyy-MM-dd HH:mm") ?? "-",
                        x.ResolvedAt?.ToString("yyyy-MM-dd HH:mm") ?? "-",
                        x.SlaBreached ? "Incumplido" : "OK"
                    }).ToList();

                    var breached = data.Count(x => x.SlaBreached);
                    summary.Add(("Total de tickets", data.Count.ToString()));
                    summary.Add(("SLA incumplidos", breached.ToString()));
                    summary.Add(("SLA cumplidos", (data.Count - breached).ToString()));
                    break;
                }
            }

            byte[] bytes;
            string contentType;
            string ext;

            if (formato == "EXCEL")
            {
                bytes = ReportExporter.BuildExcel(title, from, to, columns, rows, summary);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                ext = "xlsx";
            }
            else if (formato == "WORD")
            {
                bytes = ReportExporter.BuildWord(title, from, to, columns, rows, summary);
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                ext = "docx";
            }
            else
            {
                bytes = ReportExporter.BuildPdf(title, from, to, columns, rows, summary);
                contentType = "application/pdf";
                ext = "pdf";
            }

            var fileName = $"{baseName}-{DateTime.Now:yyyyMMdd}.{ext}";

            return ReturnValue<AdHocReportFile>.Ok(new AdHocReportFile
            {
                Bytes = bytes,
                ContentType = contentType,
                FileName = fileName
            });
        }
        catch (Exception ex)
        {
            return HelpException.LogAndNotifyReturn(ex) as ReturnValue<AdHocReportFile>
                   ?? ReturnValue<AdHocReportFile>.Fail(ex.Message);
        }
    }
}
