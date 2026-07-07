import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Allows the change-password screen for a user who just logged in with a temp
 * password (pending userId set, no valid token yet) OR an already-authenticated
 * user who wants to change their own password. Anonymous users with nothing
 * pending are redirected to the login page.
 */
export const changePasswordGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.pendingChangeUserId || authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
