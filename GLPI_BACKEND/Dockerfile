# syntax=docker/dockerfile:1
# Build context must be the GLPI_BACKEND solution root so all 5 project folders resolve.

# ----- Build stage -----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution + all project files first to maximize NuGet restore layer caching.
COPY Glpi.slnx ./
COPY Glpi.API/Glpi.API.csproj Glpi.API/
COPY Glpi.Data/Glpi.Data.csproj Glpi.Data/
COPY Glpi.Entities/Glpi.Entities.csproj Glpi.Entities/
COPY Glpi.Framework/Glpi.Framework.csproj Glpi.Framework/
COPY Glpi.Logic/Glpi.Logic.csproj Glpi.Logic/

RUN dotnet restore Glpi.API/Glpi.API.csproj

# Copy the rest of the source and publish.
COPY . .
RUN dotnet publish Glpi.API/Glpi.API.csproj -c Release -o /app/publish /p:UseAppHost=false

# ----- Runtime stage -----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

# Kestrel in the aspnet image defaults to 8080; Render overrides via the PORT env var (handled in Program.cs).
EXPOSE 8080
ENTRYPOINT ["dotnet", "Glpi.API.dll"]
