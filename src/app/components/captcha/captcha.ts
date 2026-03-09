// ============================================================
// CAPTCHA COMPONENT
// Handles the three-stage challenge flow:
//   Stage 1 → image selection
//   Stage 2 → math problem
//   Stage 3 → text / word input
//
// Flow summary:
//   ngOnInit → loadChallenge → user interacts → submitAnswer
//   → (correct) nextChallenge / navigate to /result
//   → (wrong)   show error feedback → resetFeedback → retry
// ============================================================

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  computed,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';

import { CaptchaState } from '../../services/captcha-state';
import { ChallengeService, ChallengeData } from '../../services/challenge';
import { LanguageService } from '../../services/language';

@Component({
  selector: 'app-captcha',
  imports: [CommonModule, FormsModule],  // CommonModule → *ngIf / *ngFor; FormsModule → [(ngModel)]
  templateUrl: './captcha.html',
  styleUrl: './captcha.css',
})
export class Captcha implements OnInit, OnDestroy {

  // ---- State bound to the template ----

  /**
   * Current stage as a signal so the four computed signals
   * (liveQuestion, liveTiles, liveWord, liveHint) automatically
   * re-run whenever the stage advances or goes back.
   * Plain number assignment would be invisible to computed().
   */
  currentStage = signal(1);

  /** Total number of stages (mirrors value from CaptchaState) */
  totalStages = 3;

  /** The active challenge object (undefined until loadChallenge runs) */
  currentChallenge?: ChallengeData;

  /** Set of image IDs the user has clicked in the image-grid challenge */
  selectedImages: Set<string> = new Set();

  /** Bound to the <input> for math and text challenges */
  userInput = '';

  /** Controls whether the feedback strip is visible */
  showFeedback = false;

  /** True when the last submitted answer was correct */
  isCorrect = false;

  // ---- Private subscriptions (cleaned up on destroy) ----

  /** Subscription to the auto-advance timer after a correct answer */
  private advanceTimer?: Subscription;

  // Using inject() avoids Angular AOT DI token resolution problems
  private router           = inject(Router);
  private captchaState     = inject(CaptchaState);
  private challengeService = inject(ChallengeService);
  private cdr              = inject(ChangeDetectorRef); // pushes changes after async timer

  // Exposed as public so the template can call lang.t() and lang.toggle()
  lang = inject(LanguageService);

  /**
   * Reactive question text — re-derived whenever the language signal
   * changes so toggling FR ↔ EN mid-challenge updates the question
   * immediately without reloading the challenge data.
   *
   * The ChallengeService always holds both-language data internally;
   * we just ask it for the current stage's challenge in the new language.
   */
  readonly liveQuestion = computed(() => {
    const lang  = this.lang.currentLang();
    const stage = this.currentStage();   // tracked dependency — re-runs on stage change
    return this.challengeService.getQuestionByStage(stage, lang);
  });

  /**
   * Reactive hint text for stage 3 (word challenge).
   * Same pattern as liveQuestion — updates on language toggle and stage change.
   */
  readonly liveHint = computed(() => {
    const lang  = this.lang.currentLang();
    const stage = this.currentStage();
    return this.challengeService.getHintByStage(stage, lang);
  });

  /**
   * Reactive tile labels for stage 1 (image grid).
   * Re-maps the current tiles to translated labels when language or stage changes.
   */
  readonly liveTiles = computed(() => {
    const lang  = this.lang.currentLang();
    const stage = this.currentStage();
    return this.challengeService.getTilesByStage(stage, lang);
  });

  /**
   * Reactive displayed word for stage 3.
   * Switches between the French and English word when language or stage changes.
   */
  readonly liveWord = computed(() => {
    const lang  = this.lang.currentLang();
    const stage = this.currentStage();
    return this.challengeService.getWordByStage(stage, lang);
  });

  // ---- Lifecycle ----

  ngOnInit(): void {
    // Restore stage position from persisted state
    // (so a page refresh doesn't lose progress)
    const progress = this.captchaState.getCurrentProgress();
    this.currentStage.set(progress.currentStage);
    this.totalStages  = progress.totalStages;
    this.loadChallenge();
  }

  ngOnDestroy(): void {
    // Cancel any pending timer so we don't get post-destroy navigation
    this.advanceTimer?.unsubscribe();
  }

  // ---- Challenge loading ----

  /**
   * Fetches the challenge for the current stage from the service,
   * and resets all per-challenge UI state.
   */
  private loadChallenge(): void {
    this.currentChallenge = this.challengeService.getChallengeByStage(this.currentStage());
    this.selectedImages.clear();
    this.userInput    = '';
    this.showFeedback = false;
    this.isCorrect    = false;
  }

  // ---- Image-grid interaction ----

  /**
   * Toggles a tile's selected state.
   * Called by (click) on each image-tile in the grid.
   */
  toggleImageSelection(imageId: string): void {
    if (this.selectedImages.has(imageId)) {
      this.selectedImages.delete(imageId);
    } else {
      this.selectedImages.add(imageId);
    }
  }

  /** Returns true if the given image tile is currently selected */
  isImageSelected(imageId: string): boolean {
    return this.selectedImages.has(imageId);
  }

  // ---- Answer submission ----

  /**
   * Collects the user's answer, validates it, saves the result
   * to CaptchaState, and either:
   *   • advances to the next stage (correct)
   *   • shows the error feedback strip (wrong)
   */
  submitAnswer(): void {
    let answerPayload: string[];

    if (this.currentChallenge?.type === 'select-multiple') {
      // Image grid: require at least one tile selected
      if (this.selectedImages.size === 0) {
        alert('Select at least one image.');
        return;
      }
      answerPayload = Array.from(this.selectedImages);

    } else {
      // Math or text: require a non-empty input value
      const trimmed = String(this.userInput).trim();
      if (!trimmed) {
        alert('Please enter an answer.');
        return;
      }
      answerPayload = [trimmed];
    }

    // Validate against the correct answers stored in the service
    this.isCorrect = this.challengeService.validateAnswer(
      this.currentStage(),
      answerPayload
    );

    // Persist this attempt to CaptchaState (for the summary on the result page)
    this.captchaState.submitChallengeResult(
      this.currentStage(),
      answerPayload,
      this.isCorrect
    );

    // Show feedback strip
    this.showFeedback = true;
    this.cdr.detectChanges();

    if (this.isCorrect) {
      // Auto-advance after 800 ms so the user can see the "correct" message
      this.advanceTimer?.unsubscribe();
      this.advanceTimer = timer(800).subscribe(() => {
        this.showFeedback = false;
        this.nextChallenge();
        this.cdr.detectChanges();
      });
    }
    // If incorrect, the user must click "↩ retry" (see resetFeedback)
  }

  // ---- Navigation ----

  /** Navigates back to the home page */
  goBack(): void {
    this.router.navigate(['/home']);
  }

  /** Moves one stage backward (button only shown when currentStage > 1) */
  previousStage(): void {
    if (this.captchaState.moveToPreviousStage()) {
      this.currentStage.update((s: number) => s - 1);
      this.loadChallenge();
    }
  }

  /**
   * Advances to the next stage.
   * If there are no more stages, marks the captcha as complete
   * and navigates to the result page.
   */
  nextChallenge(): void {
    const hasMore = this.captchaState.moveToNextStage();

    if (!hasMore) {
      // All stages passed → mark complete and show result
      this.captchaState.completeCaptcha();
      this.router.navigate(['/result']);
    } else {
      this.currentStage.update((s: number) => s + 1);
      this.loadChallenge();
    }
  }

  /** Returns true when the "← Previous" button should be visible */
  canGoBack(): boolean {
    return this.currentStage() > 1;
  }

  // ---- Feedback reset ----

  /**
   * Hides the feedback strip and clears the current input,
   * allowing the user to try the same challenge again.
   */
  resetFeedback(): void {
    this.showFeedback = false;
    this.selectedImages.clear();
    this.userInput = '';
  }
}
