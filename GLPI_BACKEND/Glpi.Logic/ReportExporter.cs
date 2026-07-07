using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using DocumentFormat.OpenXml.Packaging;
using Wp = DocumentFormat.OpenXml.Wordprocessing;

namespace Glpi.Logic;

/// <summary>
/// Genera reportes tabulares en PDF (QuestPDF) y Excel (ClosedXML) a partir de
/// datos genéricos: título, rango de fechas, resumen y una tabla de filas.
/// </summary>
public static class ReportExporter
{
    // La licencia Community de QuestPDF debe fijarse una sola vez antes de
    // generar cualquier documento; el constructor estático lo garantiza.
    static ReportExporter()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    private static string RangoTexto(DateTime? from, DateTime? to)
    {
        var desde = from.HasValue ? from.Value.ToString("yyyy-MM-dd") : "inicio";
        var hasta = to.HasValue ? to.Value.ToString("yyyy-MM-dd") : "hoy";
        return $"Periodo: {desde}  -  {hasta}";
    }

    public static byte[] BuildPdf(
        string title,
        DateTime? from,
        DateTime? to,
        string[] columns,
        List<string[]> rows,
        List<(string Label, string Value)> summary)
    {
        // Se fuerza el acceso al tipo para asegurar que el static ctor (licencia) corrió.
        _ = title;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(28);
                page.DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Grey.Darken3));

                page.Header().Column(col =>
                {
                    col.Item().Text(title).FontSize(18).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingTop(2).Text(RangoTexto(from, to))
                        .FontSize(9).FontColor(Colors.Grey.Medium);
                });

                page.Content().PaddingVertical(10).Column(col =>
                {
                    if (summary.Count > 0)
                    {
                        col.Item().PaddingBottom(8).Column(s =>
                        {
                            s.Item().PaddingBottom(2).Text("Resumen").Bold().FontSize(11);
                            foreach (var (label, value) in summary)
                            {
                                s.Item().Text(t =>
                                {
                                    t.Span($"{label}: ").SemiBold();
                                    t.Span(value);
                                });
                            }
                        });
                    }

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cd =>
                        {
                            foreach (var _ in columns) cd.RelativeColumn();
                        });

                        table.Header(header =>
                        {
                            foreach (var c in columns)
                            {
                                header.Cell()
                                    .Background(Colors.Grey.Lighten2)
                                    .Padding(4)
                                    .Text(c).Bold();
                            }
                        });

                        foreach (var row in rows)
                        {
                            foreach (var cell in row)
                            {
                                table.Cell()
                                    .BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                                    .Padding(4)
                                    .Text(cell ?? string.Empty);
                            }
                        }
                    });

                    if (rows.Count == 0)
                    {
                        col.Item().PaddingTop(10).AlignCenter()
                            .Text("Sin datos para el periodo seleccionado.")
                            .Italic().FontColor(Colors.Grey.Medium);
                    }
                });

                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Generado el " + DateTime.Now.ToString("yyyy-MM-dd HH:mm") + "  -  Pagina ");
                    t.CurrentPageNumber();
                    t.Span(" / ");
                    t.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    public static byte[] BuildExcel(
        string title,
        DateTime? from,
        DateTime? to,
        string[] columns,
        List<string[]> rows,
        List<(string Label, string Value)> summary)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Reporte");

        int r = 1;

        var titleCell = ws.Cell(r, 1);
        titleCell.Value = title;
        titleCell.Style.Font.Bold = true;
        titleCell.Style.Font.FontSize = 14;
        r++;

        ws.Cell(r, 1).Value = RangoTexto(from, to);
        ws.Cell(r, 1).Style.Font.FontColor = XLColor.Gray;
        r += 2;

        if (summary.Count > 0)
        {
            var sumHeader = ws.Cell(r, 1);
            sumHeader.Value = "Resumen";
            sumHeader.Style.Font.Bold = true;
            r++;
            foreach (var (label, value) in summary)
            {
                ws.Cell(r, 1).Value = label;
                ws.Cell(r, 1).Style.Font.Bold = true;
                ws.Cell(r, 2).Value = value;
                r++;
            }
            r++;
        }

        // Encabezado de la tabla
        int headerRow = r;
        for (int c = 0; c < columns.Length; c++)
        {
            var cell = ws.Cell(headerRow, c + 1);
            cell.Value = columns[c];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.LightGray;
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        }
        r++;

        foreach (var row in rows)
        {
            for (int c = 0; c < row.Length; c++)
            {
                ws.Cell(r, c + 1).Value = row[c] ?? string.Empty;
            }
            r++;
        }

        if (columns.Length > 0)
        {
            var tableRange = ws.Range(headerRow, 1, Math.Max(headerRow, r - 1), columns.Length);
            tableRange.SetAutoFilter();
        }
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public static byte[] BuildWord(
        string title,
        DateTime? from,
        DateTime? to,
        string[] columns,
        List<string[]> rows,
        List<(string Label, string Value)> summary)
    {
        columns ??= Array.Empty<string>();
        rows ??= new List<string[]>();
        summary ??= new List<(string Label, string Value)>();

        // MemoryStream.ToArray() sigue funcionando tras cerrar el documento,
        // por eso se lee fuera del using que vuelca el paquete .docx.
        var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(
                   ms, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            var body = new Wp.Body();

            // Titulo
            body.AppendChild(TextParagraph(title ?? string.Empty, bold: true, halfPointSize: 32));

            // Rango de fechas
            body.AppendChild(TextParagraph(RangoTexto(from, to), halfPointSize: 18, color: "808080"));

            // Resumen
            if (summary.Count > 0)
            {
                body.AppendChild(TextParagraph("Resumen", bold: true, halfPointSize: 22));
                foreach (var (label, value) in summary)
                {
                    var p = new Wp.Paragraph();
                    var labelRun = new Wp.Run(
                        new Wp.RunProperties(new Wp.Bold()),
                        new Wp.Text($"{label}: ")
                            { Space = DocumentFormat.OpenXml.SpaceProcessingModeValues.Preserve });
                    var valueRun = new Wp.Run(
                        new Wp.Text(value ?? string.Empty)
                            { Space = DocumentFormat.OpenXml.SpaceProcessingModeValues.Preserve });
                    p.AppendChild(labelRun);
                    p.AppendChild(valueRun);
                    body.AppendChild(p);
                }
            }

            // Separador
            body.AppendChild(new Wp.Paragraph());

            // Tabla de datos
            if (columns.Length > 0)
            {
                var table = new Wp.Table();
                table.AppendChild(new Wp.TableProperties(
                    new Wp.TableWidth { Type = Wp.TableWidthUnitValues.Pct, Width = "5000" },
                    new Wp.TableBorders(
                        new Wp.TopBorder { Val = Wp.BorderValues.Single, Size = 4, Color = "BFBFBF" },
                        new Wp.BottomBorder { Val = Wp.BorderValues.Single, Size = 4, Color = "BFBFBF" },
                        new Wp.LeftBorder { Val = Wp.BorderValues.Single, Size = 4, Color = "BFBFBF" },
                        new Wp.RightBorder { Val = Wp.BorderValues.Single, Size = 4, Color = "BFBFBF" },
                        new Wp.InsideHorizontalBorder { Val = Wp.BorderValues.Single, Size = 4, Color = "BFBFBF" },
                        new Wp.InsideVerticalBorder { Val = Wp.BorderValues.Single, Size = 4, Color = "BFBFBF" })));

                // Encabezado
                var headerRow = new Wp.TableRow();
                foreach (var c in columns)
                    headerRow.AppendChild(BuildCell(c ?? string.Empty, header: true));
                table.AppendChild(headerRow);

                // Filas
                foreach (var row in rows)
                {
                    var tr = new Wp.TableRow();
                    for (int i = 0; i < columns.Length; i++)
                    {
                        var text = (row != null && i < row.Length) ? (row[i] ?? string.Empty) : string.Empty;
                        tr.AppendChild(BuildCell(text));
                    }
                    table.AppendChild(tr);
                }

                body.AppendChild(table);
            }

            if (rows.Count == 0)
            {
                body.AppendChild(TextParagraph(
                    "Sin datos para el periodo seleccionado.",
                    halfPointSize: 18, color: "808080", italic: true));
            }

            mainPart.Document = new Wp.Document(body);
            mainPart.Document.Save();
        }

        return ms.ToArray();
    }

    private static Wp.Paragraph TextParagraph(
        string text,
        bool bold = false,
        int halfPointSize = 20,
        string? color = null,
        bool italic = false)
    {
        var runProps = new Wp.RunProperties();
        if (bold) runProps.AppendChild(new Wp.Bold());
        if (italic) runProps.AppendChild(new Wp.Italic());
        if (!string.IsNullOrEmpty(color)) runProps.AppendChild(new Wp.Color { Val = color });
        runProps.AppendChild(new Wp.FontSize { Val = halfPointSize.ToString() });

        var run = new Wp.Run();
        run.AppendChild(runProps);
        run.AppendChild(new Wp.Text(text ?? string.Empty)
            { Space = DocumentFormat.OpenXml.SpaceProcessingModeValues.Preserve });

        return new Wp.Paragraph(run);
    }

    private static Wp.TableCell BuildCell(string text, bool header = false)
    {
        var cell = new Wp.TableCell();
        if (header)
        {
            cell.AppendChild(new Wp.TableCellProperties(
                new Wp.Shading
                {
                    Val = Wp.ShadingPatternValues.Clear,
                    Color = "auto",
                    Fill = "D9D9D9"
                }));
        }
        cell.AppendChild(TextParagraph(text ?? string.Empty, bold: header, halfPointSize: 18));
        return cell;
    }
}
