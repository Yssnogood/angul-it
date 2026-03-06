// ============================================================
// COMPLETION GUARD
// Route guard applied to the /result page.
// Prevents users from navigating directly to /result without
// having actually completed all captcha stages.
//
// Usage in app.routes.ts:
//   { path: 'result', component: Result, canActivate: [completionGuard] }
// ============================================================

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CaptchaState } from '../services/captcha-state';

export const completionGuard: CanActivateFn = (_route, _state) => {
  // Inject the services we need (functional guard style — no class required)
  const captchaState = inject(CaptchaState);
  const router       = inject(Router);

  const progress = captchaState.getCurrentProgress();

  if (progress.isCompleted) {
    // Captcha is complete — allow access to the result page
    return true;
  }

  // Not complete yet — redirect to the captcha page instead
  router.navigate(['/captcha']);
  return false;
};
