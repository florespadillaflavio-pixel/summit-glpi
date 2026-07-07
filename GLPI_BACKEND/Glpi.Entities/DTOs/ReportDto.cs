namespace Glpi.Entities.DTOs;

/// <summary>
/// Cuerpo de la petición para generar un reporte ad-hoc (tickets / assets / sla).
/// </summary>
public class AdHocReportRequest
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string Format { get; set; } = "PDF";
}

/// <summary>
/// Archivo binario resultante de un reporte ad-hoc, listo para devolver como FileContentResult.
/// </summary>
public class AdHocReportFile
{
    public byte[] Bytes { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
}

public class AdHocTicketRow
{
    public string TicketNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Requester { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AdHocAssetRow
{
    public string AssetTag { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AdHocSlaRow
{
    public string TicketNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public DateTime? FirstResponseAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool SlaBreached { get; set; }
}
