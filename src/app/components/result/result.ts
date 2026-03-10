// ============================================================
// RESULT COMPONENT
// Loaded after the user completes all captcha stages.
// Reads the final progress snapshot and displays a summary.
// ============================================================

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CaptchaState } from '../../services/captcha-state';
import { ChallengeService } from '../../services/challenge';
import { LanguageService } from '../../services/language';

@Component({
  selector: 'app-result',
  imports: [],
  templateUrl: './result.html',
  styleUrl: './result.css',
})
export class Result implements OnInit {

  /** Total number of stages (from state) */
  totalStages = 3;

  /** How many stages the user actually completed with a correct answer */
  completedStages = 0;

  /** Elapsed seconds since the challenge was started */
  timeTaken = 0;

  // Using inject() avoids Angular AOT DI token resolution problems
  private router           = inject(Router);
  private captchaState     = inject(CaptchaState);
  private challengeService = inject(ChallengeService);

  // Exposed as public so the template can call lang.t() and lang.toggle()
  lang = inject(LanguageService);

  ngOnInit(): void {
    // Pull the persisted progress snapshot to populate the summary panel
    const progress = this.captchaState.getCurrentProgress();
    this.totalStages     = progress.totalStages;
    this.completedStages = this.captchaState.getCompletedStagesCount();

    // Calculate elapsed time in seconds (startTime is a Unix ms timestamp)
    this.timeTaken = Math.floor((Date.now() - progress.startTime) / 1000);
  }

  // ---- Actions ----

  /**
   * Generates a fresh set of random challenges, resets state,
   * and navigates directly back into the captcha flow.
   */
  startNewChallenge(): void {
    this.challengeService.generateRandomChallenges(this.lang.currentLang());
    this.captchaState.resetProgress();
    this.captchaState.startNewChallenge();
    this.router.navigate(['/captcha']);
  }

  /** Returns to the home/landing page */
  goHome(): void {
    this.router.navigate(['/home']);
  }

  // ---- Helpers ----

  /**
   * Formats the elapsed seconds into a human-readable string.
   * Examples: "7s", "1m 23s"
   */
  getFormattedTime(): string {
    const minutes = Math.floor(this.timeTaken / 60);
    const seconds = this.timeTaken % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
}
