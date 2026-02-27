// ============================================================
// APP ROUTES
// Defines the three navigable routes of the application:
//
//   /        → redirects to /home
//   /home    → Home component (landing page)
//   /captcha → Captcha component (challenge flow)
//   /result  → Result component (protected by completionGuard)
//   **       → any unknown path redirects to /home
// ============================================================

import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Captcha } from './components/captcha/captcha';
import { Result } from './components/result/result';
import { completionGuard } from './guards/completion-guard';

export const routes: Routes = [
  // Default redirect — empty path goes straight to the home page
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Landing / start page
  { path: 'home', component: Home },

  // Active challenge flow (3 stages)
  { path: 'captcha', component: Captcha },

  // Results page — only accessible once all stages are passed (completionGuard)
  { path: 'result', component: Result, canActivate: [completionGuard] },

  // Wildcard — any unrecognised URL falls back to home
  { path: '**', redirectTo: '/home' },
];
