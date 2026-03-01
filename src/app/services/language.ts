// ============================================================
// LANGUAGE SERVICE
// Centralises all user-facing strings in both French and English.
// Any component that needs translated text injects this service
// and reads from the current `t` (translations) object.
//
// Usage in a component:
//   lang = inject(LanguageService);
//   // in template: {{ lang.t().home.badge }}
//   // toggle:      lang.toggle()
// ============================================================

import { Injectable, signal, computed } from '@angular/core';

// ---- Translation shape ----
// Adding a new language means adding another key to TRANSLATIONS below
// and keeping the same nested structure.

export interface Translations {
  lang: 'fr' | 'en';
  home: {
    badge:         string;
    titleLine1:    string;
    titleLine2:    string;
    subtitle:      string;
    feature1Title: string;
    feature1Desc:  string;
    feature2Title: string;
    feature2Desc:  string;
    feature3Title: string;
    feature3Desc:  string;
    cta:           string;
  };
  captcha: {
    heading:         string;
    instruction:     string;
    stageLabel:      (current: number, total: number) => string;
    feedbackOk:      string;
    feedbackFail:    string;
    retry:           string;
    selected:        (n: number, total: number) => string;
    btnVerify:       string;
    btnSubmit:       string;
    navHome:         string;
    navPrev:         string;
    placeholderNum:  string;
    placeholderText: string;
  };
  result: {
    heading:      string;
    message:      (total: number) => string;
    summaryTitle: string;
    labelStages:  string;
    labelTime:    string;
    labelStatus:  string;
    statusValue:  string;
    btnAgain:     string;
    btnHome:      string;
  };
}

// ---- All strings in both languages ----

const TRANSLATIONS: Record<'fr' | 'en', Translations> = {

  // ---------- FRENCH ----------
  fr: {
    lang: 'fr',
    home: {
      badge:         '[ vérification humaine ]',
      titleLine1:    "Prouvez que vous n'êtes",
      titleLine2:    'pas un robot',
      subtitle:      "Complétez trois défis courts — reconnaissance d'images, un calcul rapide et une saisie de texte — pour confirmer que vous êtes humain.",
      feature1Title: "Reconnaissance d'images",
      feature1Desc:  'Sélectionnez les images correspondantes dans une grille selon la catégorie indiquée.',
      feature2Title: '3 étapes uniques',
      feature2Desc:  'Chaque session génère des défis aléatoires pour rester différent à chaque fois.',
      feature3Title: 'Progression sauvegardée',
      feature3Desc:  'Votre progression est enregistrée localement — vous pouvez actualiser sans risque.',
      cta:           'Commencer le défi →',
    },
    captcha: {
      heading:         'Vérification humaine',
      instruction:     '// complétez le défi pour continuer',
      stageLabel:      (c, t) => `étape_${c}_sur_${t}`,
      feedbackOk:      "✔ correct — passage à l'étape suivante...",
      feedbackFail:    '✘ incorrect — veuillez réessayer.',
      retry:           '↩ réessayer',
      selected:        (n, t) => `${n} / ${t} sélectionné(s)`,
      btnVerify:       'Vérifier la sélection',
      btnSubmit:       'Soumettre la réponse',
      navHome:         '← Accueil',
      navPrev:         '← Précédent',
      placeholderNum:  'votre réponse',
      placeholderText: 'saisir le mot',
    },
    result: {
      heading:      'Accès autorisé',
      message:      (t) => `Les ${t} défis ont été complétés avec succès.\nVous avez été vérifié en tant qu'humain.`,
      summaryTitle: '// résumé de session',
      labelStages:  'étapes_complétées',
      labelTime:    'temps_écoulé',
      labelStatus:  'statut',
      statusValue:  'humain_vérifié',
      btnAgain:     '→ Recommencer',
      btnHome:      "← Retour à l'accueil",
    },
  },

  // ---------- ENGLISH ----------
  en: {
    lang: 'en',
    home: {
      badge:         '[ human verification ]',
      titleLine1:    "Prove you're",
      titleLine2:    'not a robot',
      subtitle:      "Complete three short challenges — image recognition, a quick math problem, and a text prompt — to verify you're human.",
      feature1Title: 'Image Recognition',
      feature1Desc:  'Pick the matching images from a grid based on the given category.',
      feature2Title: '3 Unique Stages',
      feature2Desc:  'Each run pulls random challenges so it stays fresh every time.',
      feature3Title: 'Progress Saved',
      feature3Desc:  'Your stage progress is stored locally — refresh safely.',
      cta:           'Begin Challenge →',
    },
    captcha: {
      heading:         'Human Verification',
      instruction:     '// complete the challenge to continue',
      stageLabel:      (c, t) => `stage_${c}_of_${t}`,
      feedbackOk:      '✔ correct — moving to next stage...',
      feedbackFail:    '✘ incorrect — please try again.',
      retry:           '↩ retry',
      selected:        (n, t) => `${n} / ${t} selected`,
      btnVerify:       'Verify Selection',
      btnSubmit:       'Submit Answer',
      navHome:         '← Home',
      navPrev:         '← Previous',
      placeholderNum:  'your answer',
      placeholderText: 'type the word',
    },
    result: {
      heading:      'Access Granted',
      message:      (t) => `All ${t} challenges completed successfully.\nYou have been verified as human.`,
      summaryTitle: '// session summary',
      labelStages:  'stages_completed',
      labelTime:    'time_elapsed',
      labelStatus:  'status',
      statusValue:  'verified_human',
      btnAgain:     '→ Try Again',
      btnHome:      '← Back to Home',
    },
  },
};

@Injectable({ providedIn: 'root' })
export class LanguageService {

  // ---- Constants ----

  /** localStorage key used to remember the user's language preference */
  private readonly STORAGE_KEY = 'angul-it-lang';

  // ---- Reactive state ----

  /**
   * The currently active language code.
   * Initialised from localStorage so the choice survives page refresh.
   * Falls back to 'fr' if nothing is stored yet.
   */
  private activeLang = signal<'fr' | 'en'>(this.loadLang());

  /**
   * Computed translation object — automatically updates whenever
   * activeLang changes. Components read from this directly.
   */
  readonly t = computed<Translations>(() => TRANSLATIONS[this.activeLang()]);

  /** Exposes the raw current language string (used when generating challenges) */
  readonly currentLang = computed(() => this.activeLang());

  // ---- Private helpers ----

  /**
   * Reads the persisted language from localStorage.
   * Returns 'fr' as default if nothing is saved or the stored value
   * is not a recognised language code.
   */
  private loadLang(): 'fr' | 'en' {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') return stored;
    } catch {
      // localStorage may be unavailable in some SSR or private-mode contexts
    }
    return 'fr';
  }

  /**
   * Persists the chosen language to localStorage so it survives refresh.
   */
  private saveLang(lang: 'fr' | 'en'): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch {
      // Silently ignore if storage is unavailable
    }
  }

  // ---- Public API ----

  /**
   * Switches between French and English, then saves the choice.
   * Called by the language toggle button in every component.
   */
  toggle(): void {
    const next = this.activeLang() === 'fr' ? 'en' : 'fr';
    this.activeLang.set(next);
    this.saveLang(next);
  }

  /** Returns the label for the toggle button (shows the OTHER language to switch TO) */
  toggleLabel(): string {
    return this.activeLang() === 'fr' ? 'EN' : 'FR';
  }
}
