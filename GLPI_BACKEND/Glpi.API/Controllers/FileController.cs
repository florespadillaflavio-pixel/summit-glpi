using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Glpi.Framework.Common;
using Glpi.Framework.Response;
using System.Transactions;

namespace Glpi.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class FileController : ControllerBase
    {
        private readonly IFileStorageService _storageService;

        public FileController(IFileStorageService storageService)
        {
            _storageService = storageService;
        }

        [HttpPost("upload")]
        public async Task<ActionResult<ReturnValue<string>>> Upload(IFormFile file, [FromQuery] string folder = "general")
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(ReturnValue<string>.Fail("No se proporcionó ningún archivo."));
                }

                // Las subidas a Cloudinary no se pueden revertir mediante TransactionScope (son externas).
                // La recomendación es subir primero y si la operación lógica posterior falla, 
                // manejar la limpieza manualmente o mediante un proceso de purga.
                var url = await _storageService.UploadFileAsync(file, folder);

                if (string.IsNullOrEmpty(url))
                {
                    return StatusCode(500, ReturnValue<string>.Fail("Error al subir el archivo a Cloudinary."));
                }

                return Ok(ReturnValue<string>.Ok(url, "Archivo subido correctamente."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ReturnValue<string>.Fail(ex.Message));
            }
        }
    }
}
