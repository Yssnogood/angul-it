// ============================================================
// HOME COMPONENT
// The entry point of the app. Generates a fresh set of
// challenges and navigates the user to the captcha page.
// ============================================================

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CaptchaState } from '../../services/captcha-state';
import { ChallengeService } from '../../services/challenge';
import { LanguageService } from '../../services/language';

@Component({
  selector: 'app-home',
  imports: [],                    // no extra Angular modules needed here
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {

  // Using inject() instead of constructor params avoids Angular AOT
  // token-resolution issues when class names differ from the original.
  private router           = inject(Router);
  private captchaState     = inject(CaptchaState);
  private challengeService = inject(ChallengeService);

  // Exposed as public so the template can call lang.t() and lang.toggle()
  lang = inject(LanguageService);

  /**
   * Called when the user clicks "Begin Challenge".
   * 1. Randomises all three challenge prompts for this session.
   * 2. Resets / initialises the progress state.
   * 3. Navigates to the captcha page.
   */
  startCaptcha(): void {
    this.challengeService.generateRandomChallenges(this.lang.currentLang());
    this.captchaState.startNewChallenge();
    this.router.navigate(['/captcha']);
  }
}
