// Configuración de PRODUCCIÓN (build de Vercel).
// Reemplaza la URL por la de tu servicio de Render cuando lo despliegues, p. ej.
//   https://glpi-api.onrender.com/api
// El hub de SignalR se deriva automáticamente quitando el sufijo /api.
export const environment = {
  production: true,
  apiUrl: 'https://summit-glpi-api.onrender.com/api'
};
