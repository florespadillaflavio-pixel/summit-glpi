# GLPI Backend — Render Deployment

.NET 10 Web API (`Glpi.API`) deployed to Render as a Docker service.

## 1. Rotate the previously-exposed secrets (do this first)

These values were committed to `appsettings.json` in plaintext and must be considered
compromised. **Rotate them before deploying** and only use the new values in Render:

- **Neon database password** — reset it in the Neon console; update the connection string.
- **JWT signing key** (`Jwt:Key`) — generate a new long random secret (rotating it invalidates existing tokens).
- **Cloudinary API secret** — regenerate in the Cloudinary console.

The base `Glpi.API/appsettings.json` no longer contains any secret values (blanked to `""`).
Local development reads the real values from `Glpi.API/appsettings.Development.json`,
which is **excluded from the Docker image** (`.dockerignore`) and should not be committed.

## 2. Render service settings

- **Environment:** Docker
- **Root directory / Docker context:** `GLPI_BACKEND` (so all 5 project folders and `Glpi.slnx` resolve)
- **Dockerfile path:** `Dockerfile` (relative to the root directory above)
- **Health check path:** `/health`
- **Port:** Render injects a dynamic `PORT`; the app binds `http://0.0.0.0:$PORT` automatically.
- **TLS/HTTPS:** terminated at Render's proxy — the app runs plain HTTP and does **not** use HTTPS redirection.

## 3. Required environment variables (Render → Environment)

ASP.NET maps nested config keys via the double-underscore (`__`) convention.

| Env var | Notes |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | Neon Postgres connection string (with the **rotated** password) |
| `Jwt__Key` | New long random signing secret |
| `Jwt__Issuer` | `GlpiAPI` |
| `Jwt__Audience` | `GlpiApp` |
| `Cloudinary__CloudName` | e.g. `dvqt1zkla` |
| `Cloudinary__ApiKey` | Cloudinary API key |
| `Cloudinary__ApiSecret` | **rotated** Cloudinary API secret |
| `Cors__AllowedOrigins` | Comma-separated allowed browser origins, e.g. `https://app.example.com,https://admin.example.com` |

Optional:

| Env var | Notes |
| --- | --- |
| `Swagger__Enabled` | `true` to expose Swagger UI in production (off by default) |
| `Jwt__ExpireMinutes` | Overrides the default `1440` if needed |

## 4. Notes

- **CORS:** if `Cors__AllowedOrigins` is empty in production, the API allows **no** cross-origin
  browser requests (fail-safe). Set it to your frontend origin(s). `AllowAnyOrigin` is only used
  in the Development environment. Credentials are not enabled (the SignalR client uses
  `accessTokenFactory` with `withCredentials: false`).
- **SignalR hub:** `/hubs/tickets` (JWT can be passed via the `access_token` query string).
- **Local Docker run:** `docker compose up --build` from `GLPI_BACKEND`, supplying the `__` vars via a `.env` file
  (see `docker-compose.yml`).
