// ============================================================
// CAPTCHA STATE SERVICE
// Single source of truth for the user's progress through the
// captcha challenge. State is persisted to localStorage so that
// a page refresh doesn't wipe progress.
//
// Emits an Observable<CaptchaProgress> for any component that
// wants to reactively subscribe to state changes.
// ============================================================

import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

// ---- Data shapes ----

/** The result recorded for a single completed (or attempted) stage */
export interface ChallengeResult {
  stage:     number;    // which stage this result belongs to (1, 2, or 3)
  completed: boolean;   // was the answer correct?
  answer:    string[];  // the answer(s) the user submitted
  timestamp: number;    // Unix ms timestamp of submission
}

/** The full progress snapshot stored in localStorage and streamed via BehaviorSubject */
export interface CaptchaProgress {
  currentStage: number;           // the stage the user is currently on
  totalStages:  number;           // total number of stages (always 3)
  results:      ChallengeResult[]; // one entry per attempted stage
  isCompleted:  boolean;           // true once all stages pass
  startTime:    number;            // Unix ms timestamp when the run began
}

@Injectable({ providedIn: 'root' })  // singleton across the whole app
export class CaptchaState {

  // ---- Config ----

  /** localStorage key used to persist progress between page loads */
  private readonly STORAGE_KEY  = 'angul-it-captcha-progress';

  /** Fixed challenge count — change here if you add more stages */
  private readonly TOTAL_STAGES = 3;

  // ---- Platform detection ----

  /** Injected platform ID to detect SSR vs browser environments */
  private readonly platformId = inject(PLATFORM_ID);

  /** True when running in a real browser (not during SSR) */
  private readonly isBrowser: boolean;

  // ---- Reactive state ----

  /** Internal subject — holds the current progress and emits on every change */
  private progressSubject: BehaviorSubject<CaptchaProgress>;

  /** Public Observable for components that want to subscribe to progress changes */
  public progress$: Observable<CaptchaProgress>;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Attempt to restore a saved session; fall back to a fresh state
    const initial = this.loadProgress();
    this.progressSubject = new BehaviorSubject<CaptchaProgress>(initial);
    this.progress$       = this.progressSubject.asObservable();
  }

  // ---- Private helpers ----

  /**
   * Reads persisted progress from localStorage.
   * Falls back to a fresh state if nothing is saved or parsing fails.
   */
  private loadProgress(): CaptchaProgress {
    if (!this.isBrowser) return this.createInitialProgress();

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) return JSON.parse(raw) as CaptchaProgress;
    } catch (e) {
      console.error('[CaptchaState] Failed to load progress:', e);
    }
    return this.createInitialProgress();
  }

  /** Returns a brand-new empty progress object */
  private createInitialProgress(): CaptchaProgress {
    return {
      currentStage: 1,
      totalStages:  this.TOTAL_STAGES,
      results:      [],
      isCompleted:  false,
      startTime:    Date.now(),
    };
  }

  /**
   * Persists the given progress to localStorage and pushes it
   * to the BehaviorSubject so all subscribers update immediately.
   */
  private saveProgress(progress: CaptchaProgress): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
      } catch (e) {
        console.error('[CaptchaState] Failed to save progress:', e);
      }
    }
    this.progressSubject.next(progress);
  }

  // ---- Public API ----

  /** Returns the current progress snapshot synchronously */
  getCurrentProgress(): CaptchaProgress {
    return this.progressSubject.value;
  }

  /**
   * Resets to a fresh state and starts the timer.
   * Called when the user clicks "Begin Challenge" on the home page.
   */
  startNewChallenge(): void {
    this.saveProgress(this.createInitialProgress());
  }

  /**
   * Records the result of one stage submission.
   * If a result for this stage already exists it is overwritten
   * (so retries on the same stage get the latest attempt).
   */
  submitChallengeResult(
    stage:     number,
    answer:    string[],
    isCorrect: boolean
  ): void {
    const current = this.getCurrentProgress();

    const newResult: ChallengeResult = {
      stage,
      completed: isCorrect,
      answer,
      timestamp: Date.now(),
    };

    // Replace existing entry for this stage, or append a new one
    const updatedResults = [...current.results];
    const existingIdx    = updatedResults.findIndex(r => r.stage === stage);

    if (existingIdx >= 0) {
      updatedResults[existingIdx] = newResult;
    } else {
      updatedResults.push(newResult);
    }

    this.saveProgress({ ...current, results: updatedResults });
  }

  /**
   * Advances currentStage by 1.
   * Returns true if there are more stages, false if we're already at the last.
   */
  moveToNextStage(): boolean {
    const current = this.getCurrentProgress();

    if (current.currentStage < this.TOTAL_STAGES) {
      this.saveProgress({ ...current, currentStage: current.currentStage + 1 });
      return true;
    }
    return false;  // caller should call completeCaptcha() and navigate to /result
  }

  /**
   * Moves currentStage back by 1.
   * Returns true on success, false if already on stage 1.
   */
  moveToPreviousStage(): boolean {
    const current = this.getCurrentProgress();

    if (current.currentStage > 1) {
      this.saveProgress({ ...current, currentStage: current.currentStage - 1 });
      return true;
    }
    return false;
  }

  /** Marks the captcha as fully completed (unlocks the /result route guard) */
  completeCaptcha(): void {
    const current = this.getCurrentProgress();
    this.saveProgress({ ...current, isCompleted: true });
  }

  /**
   * Completely wipes progress (localStorage + in-memory).
   * Used when starting a fresh run from the result page.
   */
  resetProgress(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.progressSubject.next(this.createInitialProgress());
  }

  /** Returns true if the given stage has a successful (correct) result */
  isStageCompleted(stage: number): boolean {
    const result = this.getCurrentProgress().results.find(r => r.stage === stage);
    return result?.completed ?? false;
  }

  /** Returns the count of stages with a correct answer */
  getCompletedStagesCount(): number {
    return this.getCurrentProgress().results.filter(r => r.completed).length;
  }

  /** Returns true if the current stage has already been answered correctly */
  canProceedToNextStage(): boolean {
    return this.isStageCompleted(this.getCurrentProgress().currentStage);
  }
}
