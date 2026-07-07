import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const permissionGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const requiredPermission = route.data['permission'];

  if (!requiredPermission || tokenService.hasPermission(requiredPermission)) {
    return true;
  }

  // Redirigir al dashboard si no tiene permiso
  router.navigate(['/dashboard']);
  return false;
};
