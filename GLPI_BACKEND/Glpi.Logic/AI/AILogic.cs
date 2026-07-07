using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Glpi.Framework.Response;

namespace Glpi.Logic.AI;

public interface IAIService
{
    Task<string> GetCompletionAsync(string prompt, string? systemPrompt = null);
}

public class AILogic
{
    private readonly ConfigLogic _configLogic;
    private readonly HttpClient _httpClient;

    public AILogic(ConfigLogic configLogic)
    {
        _configLogic = configLogic;
        _httpClient = new HttpClient();
    }

    public async Task<ReturnValue<string>> AnalyzeTicketAsync(string subject, string description)
    {
        try
        {
            var provider = _configLogic.GetDecryptedValue("AI_PROVIDER");
            if (string.IsNullOrEmpty(provider)) provider = "GEMINI";

            var prompt = $@"Analiza el siguiente ticket de soporte y genera un JSON con:
            1. 'category': Una categoría sugerida (Soporte Técnico, Hardware, Software, Redes, Accesos).
            2. 'priority': Prioridad (BAJA, MEDIA, ALTA, URGENTE).
            3. 'summary': Un resumen de 1 oración.
            
            Ticket:
            Asunto: {subject}
            Descripción: {description}";

            string result;
            if (provider == "GEMINI") result = await CallGeminiAsync(prompt);
            else if (provider == "CLAUDE") result = await CallClaudeAsync(prompt);
            else if (provider == "OPENAI") result = await CallOpenAIAsync(prompt);
            else return ReturnValue<string>.Fail("Proveedor de IA no configurado o no soportado.");

            return ReturnValue<string>.Ok(result, "Análisis de IA completado");
        }
        catch (Exception ex)
        {
            return ReturnValue<string>.Fail($"Error en IA: {ex.Message}");
        }
    }

    private async Task<string> CallGeminiAsync(string prompt)
    {
        var apiKey = _configLogic.GetDecryptedValue("AI_GEMINI_KEY");
        if (string.IsNullOrEmpty(apiKey)) throw new Exception("API Key de Gemini no configurada");

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.3,
                maxOutputTokens = 1000
            }
        };

        const int maxRetries = 2;
        var delaySeconds = 5;

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                if (attempt == maxRetries)
                    throw new Exception("Gemini: límite de cuota excedido. Activa billing en https://aistudio.google.com");

                var errorBody = await response.Content.ReadAsStringAsync();
                try
                {
                    using var errDoc = JsonDocument.Parse(errorBody);
                    var details = errDoc.RootElement.GetProperty("error").GetProperty("details").EnumerateArray();
                    foreach (var detail in details)
                    {
                        if (detail.TryGetProperty("retryDelay", out var retryDelayProp))
                        {
                            var delayStr = retryDelayProp.GetString() ?? "60s";
                            delaySeconds = Math.Min(15, int.Parse(delayStr.Replace("s", "")) + 2);
                            break;
                        }
                    }
                }
                catch { /* usa delay por defecto */ }

                await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                throw new Exception($"Gemini error {(int)response.StatusCode}: {errorBody}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var candidates = doc.RootElement.GetProperty("candidates");
            if (candidates.GetArrayLength() == 0)
                throw new Exception("Gemini no devolvió candidatos en la respuesta.");

            var content = candidates[0].GetProperty("content");
            var parts = content.GetProperty("parts");
            if (parts.GetArrayLength() == 0)
                throw new Exception("Gemini no devolvió partes en la respuesta.");

            return parts[0].GetProperty("text").GetString() ?? "";
        }

        throw new Exception("Gemini: se agotaron los reintentos.");
    }

    private async Task<string> CallClaudeAsync(string prompt)
    {
        var apiKey = _configLogic.GetDecryptedValue("AI_CLAUDE_KEY");
        if (string.IsNullOrEmpty(apiKey)) throw new Exception("API Key de Claude no configurada");

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");

        var payload = new
        {
            model = "claude-haiku-4-5-20251001",
            max_tokens = 1000,
            messages = new[] { new { role = "user", content = prompt } }
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Exception($"Claude error {(int)response.StatusCode}: {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
    }

    private async Task<string> CallOpenAIAsync(string prompt)
    {
        var apiKey = _configLogic.GetDecryptedValue("AI_OPENAI_KEY");
        if (string.IsNullOrEmpty(apiKey)) throw new Exception("API Key de OpenAI no configurada");

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = new
        {
            model = "gpt-3.5-turbo",
            messages = new[] { new { role = "user", content = prompt } }
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Exception($"OpenAI error {(int)response.StatusCode}: {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
    }
}
