// ============================================================
// CHALLENGE SERVICE
// Generates and validates the three captcha challenge stages.
//
// Stage 1 — select-multiple : click all tiles matching a category
//   → Each variant now has a RANDOMISED tile layout (Fisher-Yates
//     shuffle) so correct answers appear in different positions
//     every session instead of always being at fixed spots.
//
// Stage 2 — math : solve an arithmetic equation
//   → Expanded pool: 18 problems covering +, −, ×, ÷
//
// Stage 3 — text-input : type the displayed word exactly
//   → Words are now real French words with correct meaning.
//     Each entry accepts both its accented form and a plain
//     ASCII fallback so users without French keyboards still pass.
//
// Challenges are regenerated each time generateRandomChallenges()
// is called (once per "Begin Challenge" / "Recommencer" click).
// ============================================================

import { Injectable } from '@angular/core';

// ---- Data shapes ----

/** A single tile in the image-selection grid */
export interface ImageItem {
  id:    string;  // unique ID used to track user selections
  emoji: string;  // emoji displayed in the tile
  label: string;  // short text label shown below the emoji
}

/** All the data needed to render and validate one challenge stage */
export interface ChallengeData {
  stage:          number;
  question:       string;                                       // instruction shown at the top of the panel
  type:           'select-multiple' | 'math' | 'text-input';
  images?:        ImageItem[];    // only present for select-multiple
  mathProblem?:   string;         // only present for math
  textPrompt?:    string;         // only present for text-input; the word shown to the user
  textHint?:      string;         // optional subtitle hint below the word (bilingual)
  correctAnswers: string[];       // list of accepted answer values
}

// ---- Internal bilingual image-tile shape ----
// Labels are stored in both languages here and resolved to a flat
// string when generateRandomChallenges(lang) is called.

interface BilingualImageItem {
  id:    string;
  emoji: string;
  label: { fr: string; en: string };
  isTarget: boolean; // true = this tile belongs to the "correct" category
}

interface ImageVariant {
  question:       { fr: string; en: string };
  items:          BilingualImageItem[];
}

@Injectable({ providedIn: 'root' })
export class ChallengeService {

  // ===========================================================
  // STAGE 1 — Image-selection variants
  //
  // Design note on randomisation:
  //   Each variant stores ALL tiles (targets + distractors) with
  //   an `isTarget` flag. At generation time the whole array is
  //   shuffled with Fisher-Yates so the positions differ each run.
  //   Tile IDs are re-assigned after shuffle so the DOM order
  //   matches the logical IDs used in correctAnswers.
  // ===========================================================

  private imageVariants: ImageVariant[] = [
    // ---- Variant A: Animals ----
    {
      question: {
        fr: 'Sélectionnez toutes les cases montrant un ANIMAL',
        en: 'Select all tiles that show an ANIMAL',
      },
      items: [
        { id: '', emoji: '🐕', label: { fr: 'Chien',    en: 'Dog'       }, isTarget: true  },
        { id: '', emoji: '🚗', label: { fr: 'Voiture',  en: 'Car'       }, isTarget: false },
        { id: '', emoji: '🐈', label: { fr: 'Chat',     en: 'Cat'       }, isTarget: true  },
        { id: '', emoji: '🏠', label: { fr: 'Maison',   en: 'House'     }, isTarget: false },
        { id: '', emoji: '🦁', label: { fr: 'Lion',     en: 'Lion'      }, isTarget: true  },
        { id: '', emoji: '⚽', label: { fr: 'Ballon',   en: 'Ball'      }, isTarget: false },
        { id: '', emoji: '🐘', label: { fr: 'Éléphant', en: 'Elephant'  }, isTarget: true  },
        { id: '', emoji: '🌳', label: { fr: 'Arbre',    en: 'Tree'      }, isTarget: false },
        { id: '', emoji: '🐦', label: { fr: 'Oiseau',   en: 'Bird'      }, isTarget: true  },
      ],
    },

    // ---- Variant B: Food ----
    {
      question: {
        fr: 'Sélectionnez toutes les cases montrant un ALIMENT',
        en: 'Select all tiles that show a FOOD item',
      },
      items: [
        { id: '', emoji: '🍕', label: { fr: 'Pizza',   en: 'Pizza'     }, isTarget: true  },
        { id: '', emoji: '⚽', label: { fr: 'Ballon',  en: 'Ball'      }, isTarget: false },
        { id: '', emoji: '🍔', label: { fr: 'Burger',  en: 'Burger'    }, isTarget: true  },
        { id: '', emoji: '💻', label: { fr: 'Ordi',    en: 'Laptop'    }, isTarget: false },
        { id: '', emoji: '🍎', label: { fr: 'Pomme',   en: 'Apple'     }, isTarget: true  },
        { id: '', emoji: '🎮', label: { fr: 'Console', en: 'Console'   }, isTarget: false },
        { id: '', emoji: '🍰', label: { fr: 'Gâteau',  en: 'Cake'      }, isTarget: true  },
        { id: '', emoji: '📚', label: { fr: 'Livres',  en: 'Books'     }, isTarget: false },
        { id: '', emoji: '🍦', label: { fr: 'Glace',   en: 'Ice Cream' }, isTarget: true  },
      ],
    },

    // ---- Variant C: Vehicles ----
    {
      question: {
        fr: 'Sélectionnez toutes les cases montrant un VÉHICULE',
        en: 'Select all tiles that show a VEHICLE',
      },
      items: [
        { id: '', emoji: '🚗', label: { fr: 'Voiture',   en: 'Car'        }, isTarget: true  },
        { id: '', emoji: '🍎', label: { fr: 'Pomme',     en: 'Apple'      }, isTarget: false },
        { id: '', emoji: '✈️', label: { fr: 'Avion',     en: 'Plane'      }, isTarget: true  },
        { id: '', emoji: '🌸', label: { fr: 'Fleur',     en: 'Flower'     }, isTarget: false },
        { id: '', emoji: '🚲', label: { fr: 'Vélo',      en: 'Bike'       }, isTarget: true  },
        { id: '', emoji: '📱', label: { fr: 'Téléphone', en: 'Phone'      }, isTarget: false },
        { id: '', emoji: '🚢', label: { fr: 'Bateau',    en: 'Ship'       }, isTarget: true  },
        { id: '', emoji: '🎨', label: { fr: 'Art',       en: 'Art'        }, isTarget: false },
        { id: '', emoji: '🚁', label: { fr: 'Hélico',    en: 'Helicopter' }, isTarget: true  },
      ],
    },

    // ---- Variant D: Sports ----
    {
      question: {
        fr: 'Sélectionnez toutes les cases montrant un SPORT',
        en: 'Select all tiles that show a SPORT',
      },
      items: [
        { id: '', emoji: '⚽', label: { fr: 'Football',  en: 'Football'   }, isTarget: true  },
        { id: '', emoji: '🌙', label: { fr: 'Lune',      en: 'Moon'       }, isTarget: false },
        { id: '', emoji: '🏀', label: { fr: 'Basket',    en: 'Basketball' }, isTarget: true  },
        { id: '', emoji: '🍕', label: { fr: 'Pizza',     en: 'Pizza'      }, isTarget: false },
        { id: '', emoji: '🎾', label: { fr: 'Tennis',    en: 'Tennis'     }, isTarget: true  },
        { id: '', emoji: '🚂', label: { fr: 'Train',     en: 'Train'      }, isTarget: false },
        { id: '', emoji: '🏊', label: { fr: 'Natation',  en: 'Swimming'   }, isTarget: true  },
        { id: '', emoji: '🌵', label: { fr: 'Cactus',    en: 'Cactus'     }, isTarget: false },
        { id: '', emoji: '🚴', label: { fr: 'Cyclisme',  en: 'Cycling'    }, isTarget: true  },
      ],
    },

    // ---- Variant E: Nature ----
    {
      question: {
        fr: 'Sélectionnez toutes les cases montrant un élément de la NATURE',
        en: 'Select all tiles that show a NATURE element',
      },
      items: [
        { id: '', emoji: '🌳', label: { fr: 'Arbre',     en: 'Tree'       }, isTarget: true  },
        { id: '', emoji: '🚗', label: { fr: 'Voiture',   en: 'Car'        }, isTarget: false },
        { id: '', emoji: '🌺', label: { fr: 'Fleur',     en: 'Flower'     }, isTarget: true  },
        { id: '', emoji: '💡', label: { fr: 'Ampoule',   en: 'Bulb'       }, isTarget: false },
        { id: '', emoji: '🌊', label: { fr: 'Vague',     en: 'Wave'       }, isTarget: true  },
        { id: '', emoji: '📱', label: { fr: 'Téléphone', en: 'Phone'      }, isTarget: false },
        { id: '', emoji: '🏔️', label: { fr: 'Montagne',  en: 'Mountain'   }, isTarget: true  },
        { id: '', emoji: '🏠', label: { fr: 'Maison',    en: 'House'      }, isTarget: false },
        { id: '', emoji: '🌙', label: { fr: 'Lune',      en: 'Moon'       }, isTarget: true  },
      ],
    },
  ];

  // ===========================================================
  // STAGE 2 — Math problem pool
  // Expanded to 18 problems across 4 operations (+, −, ×, ÷).
  // Equations use Unicode symbols (×, ÷, −) for clean rendering.
  // ===========================================================

  private mathPool = [
    // Addition
    { problem: '7 + 5 = ?',   answer: '12' },
    { problem: '8 + 6 = ?',   answer: '14' },
    { problem: '13 + 9 = ?',  answer: '22' },
    { problem: '17 + 8 = ?',  answer: '25' },
    { problem: '25 + 37 = ?', answer: '62' },
    // Subtraction
    { problem: '9 − 4 = ?',   answer: '5'  },
    { problem: '20 − 7 = ?',  answer: '13' },
    { problem: '18 − 9 = ?',  answer: '9'  },
    { problem: '31 − 14 = ?', answer: '17' },
    { problem: '50 − 23 = ?', answer: '27' },
    // Multiplication
    { problem: '6 × 3 = ?',   answer: '18' },
    { problem: '4 × 7 = ?',   answer: '28' },
    { problem: '9 × 5 = ?',   answer: '45' },
    { problem: '8 × 6 = ?',   answer: '48' },
    { problem: '7 × 7 = ?',   answer: '49' },
    // Division
    { problem: '15 ÷ 3 = ?',  answer: '5'  },
    { problem: '24 ÷ 6 = ?',  answer: '4'  },
    { problem: '36 ÷ 4 = ?',  answer: '9'  },
  ];

  /** Stage 2 framing question — the equation display is language-neutral */
  private mathQuestion = {
    fr: "Résolvez l'équation ci-dessous",
    en: 'Solve the equation below',
  };

  // ===========================================================
  // STAGE 3 — Word pool
  //
  // Each entry has:
  //   word     — bilingual object { fr, en } — the word DISPLAYED
  //              to the user (uppercase) in the current language
  //   variants — all accepted inputs; validation is case-insensitive
  //              (done via .toLowerCase() in validateAnswer) so we
  //              only need to store the lowercase canonical form here
  //   hint     — short bilingual subtitle under the displayed word
  // ===========================================================

  private wordPool = [
    {
      word:     { fr: 'MAISON',   en: 'HOUSE'   },
      variants: ['maison', 'house'],
      hint:     { fr: 'domicile / logement', en: 'domicile / home' },
    },
    {
      word:     { fr: 'LUMIÈRE',  en: 'LIGHT'   },
      variants: ['lumière', 'lumiere', 'light'],
      hint:     { fr: 'clarté / éclairage', en: 'clarity / brightness' },
    },
    {
      word:     { fr: 'FORÊT',    en: 'FOREST'  },
      variants: ['forêt', 'foret', 'forest'],
      hint:     { fr: 'bois / sylve', en: 'woods / woodland' },
    },
    {
      word:     { fr: 'SOLEIL',   en: 'SUN'     },
      variants: ['soleil', 'sun'],
      hint:     { fr: 'astre du jour', en: 'star of the day' },
    },
    {
      word:     { fr: 'RIVIÈRE',  en: 'RIVER'   },
      variants: ['rivière', 'riviere', 'river'],
      hint:     { fr: "cours d'eau", en: 'flowing water' },
    },
    {
      word:     { fr: 'NUAGE',    en: 'CLOUD'   },
      variants: ['nuage', 'cloud'],
      hint:     { fr: "formation de vapeur d'eau", en: 'water vapour formation' },
    },
    {
      word:     { fr: 'ÉTOILE',   en: 'STAR'    },
      variants: ['étoile', 'etoile', 'star'],
      hint:     { fr: 'astre lumineux', en: 'luminous celestial body' },
    },
    {
      word:     { fr: 'CHEMIN',   en: 'PATH'    },
      variants: ['chemin', 'path'],
      hint:     { fr: 'sentier / voie', en: 'track / walkway' },
    },
    {
      word:     { fr: 'OISEAU',   en: 'BIRD'    },
      variants: ['oiseau', 'bird'],
      hint:     { fr: 'animal à plumes', en: 'feathered animal' },
    },
    {
      word:     { fr: 'JARDIN',   en: 'GARDEN'  },
      variants: ['jardin', 'garden'],
      hint:     { fr: 'espace vert cultivé', en: 'cultivated green space' },
    },
  ];

  /** Stage 3 framing question per language */
  private textQuestion = {
    fr: 'Saisissez exactement le mot affiché ci-dessous',
    en: 'Type the word shown below exactly',
  };

  /**
   * The active set of three challenges for this session.
   * Re-populated by generateRandomChallenges() on every new run.
   */
  private activeChallenges: ChallengeData[] = [];

  /**
   * Raw bilingual data for the active session, keyed by stage number.
   * Stored alongside activeChallenges so the reactive getters
   * (getQuestionByStage, getHintByStage, getTilesByStage) can
   * re-translate without regenerating challenges.
   */
  private rawVariants: Record<number, {
    question: { fr: string; en: string };
    hint?:    { fr: string; en: string };
    word?:    { fr: string; en: string };
    tiles?:   Array<{ id: string; emoji: string; label: { fr: string; en: string } }>;
  }> = {};

  constructor() {
    // Seed with French by default (matches LanguageService default)
    this.generateRandomChallenges('fr');
  }

  // ---- Private helpers ----

  /** Returns a random element from any array */
  private pick<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Fisher-Yates in-place shuffle.
   * Used to randomise tile positions in the image grid so correct
   * answers don't always appear at the same fixed positions.
   */
  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ---- Public API ----

  /**
   * Randomly selects one variant per stage and builds the challenge list.
   *
   * @param lang  Current language ('fr' | 'en') — controls which translated
   *              strings are baked into the ChallengeData objects.
   *
   * Stage 1: shuffles tiles so positions vary each run, then records
   *          which post-shuffle IDs are targets as correctAnswers.
   * Stage 2: picks a random equation from the expanded 18-problem pool.
   * Stage 3: picks a random real French word and stores all accepted forms.
   */
  generateRandomChallenges(lang: 'fr' | 'en' = 'fr'): void {
    const imgVariant  = this.pick(this.imageVariants);
    const mathProblem = this.pick(this.mathPool);
    const textEntry   = this.pick(this.wordPool);

    // --- Stage 1: shuffle tiles and re-assign sequential IDs ---
    // We deep-clone items first so the original array is never mutated
    // (important: we need a stable source for the next session's shuffle).
    const clonedItems = imgVariant.items.map(item => ({ ...item }));
    const shuffled    = this.shuffle(clonedItems);

    // Assign new IDs based on shuffled position (1-based string)
    shuffled.forEach((item, index) => { item.id = String(index + 1); });

    // correctAnswers = IDs of tiles that are targets in the shuffled order
    const correctIds = shuffled
      .filter(item => item.isTarget)
      .map(item => item.id);

    // Flatten bilingual items to plain ImageItem using current language
    const flatImages: ImageItem[] = shuffled.map(item => ({
      id:    item.id,
      emoji: item.emoji,
      label: item.label[lang],
    }));

    this.activeChallenges = [
      // Stage 1 — randomised image grid
      {
        stage:          1,
        question:       imgVariant.question[lang],
        type:           'select-multiple',
        images:         flatImages,
        correctAnswers: correctIds,
      },

      // Stage 2 — random math equation (language-neutral numbers)
      {
        stage:          2,
        question:       this.mathQuestion[lang],
        type:           'math',
        mathProblem:    mathProblem.problem,
        correctAnswers: [mathProblem.answer],
      },

      // Stage 3 — word displayed in current language, case-insensitive validation
      {
        stage:          3,
        question:       this.textQuestion[lang],
        type:           'text-input',
        textPrompt:     textEntry.word[lang],       // FR word shown in FR, EN word in EN
        textHint:       textEntry.hint[lang],       // contextual hint below the word
        correctAnswers: textEntry.variants,         // lowercase canonical forms only
      },
    ];

    // Store raw bilingual data so reactive getters can re-translate
    // when the user toggles the language mid-challenge without regenerating.
    this.rawVariants = {
      1: {
        question: imgVariant.question,
        // Store shuffled tiles with both-language labels for live re-translation
        tiles: shuffled.map(item => ({
          id:    item.id,
          emoji: item.emoji,
          label: item.label,
        })),
      },
      2: {
        question: this.mathQuestion,
        // No hint or tiles for math stage
      },
      3: {
        question: this.textQuestion,
        hint:     textEntry.hint,
        word:     textEntry.word,
        // No tiles for text stage
      },
    };
  }

  /** Returns the challenge for the given stage number, or undefined if not found */
  getChallengeByStage(stage: number): ChallengeData | undefined {
    return this.activeChallenges.find(c => c.stage === stage);
  }

  /**
   * Returns the translated question string for a stage in the given language.
   * Used by the captcha component's liveQuestion computed signal so the
   * question updates immediately when the user toggles FR ↔ EN mid-challenge.
   */
  getQuestionByStage(stage: number, lang: 'fr' | 'en'): string {
    return this.rawVariants[stage]?.question[lang] ?? '';
  }

  /**
   * Returns the translated hint string for stage 3 in the given language.
   * Returns undefined for stages that have no hint (stages 1 and 2).
   */
  getHintByStage(stage: number, lang: 'fr' | 'en'): string | undefined {
    return this.rawVariants[stage]?.hint?.[lang];
  }

  /**
   * Returns the displayed word for stage 3 in the given language.
   * Used by the liveWord computed signal in the captcha component
   * so the word updates when the language is toggled mid-challenge.
   */
  getWordByStage(stage: number, lang: 'fr' | 'en'): string | undefined {
    return this.rawVariants[stage]?.word?.[lang];
  }

  /**
   * Returns the image tiles for stage 1 with labels translated to lang.
   * The tile positions (IDs) stay fixed for the session — only labels change.
   * Returns undefined for stages that have no image grid.
   */
  getTilesByStage(stage: number, lang: 'fr' | 'en'): ImageItem[] | undefined {
    const bilingualTiles = this.rawVariants[stage]?.tiles;
    if (!bilingualTiles) return undefined;
    return bilingualTiles.map(t => ({ id: t.id, emoji: t.emoji, label: t.label[lang] }));
  }

  /**
   * Validates the user's answer(s) against the correct answers for a stage.
   *
   * math / text-input : expects exactly one submitted string, checked
   *                     against the correctAnswers array (case-sensitive,
   *                     but multiple variants in the array cover casing).
   * select-multiple   : submitted ID set must exactly match correctAnswers
   *                     (sorted comparison, order-independent).
   */
  validateAnswer(stage: number, submitted: string[]): boolean {
    const challenge = this.getChallengeByStage(stage);
    if (!challenge) return false;

    if (challenge.type === 'math' || challenge.type === 'text-input') {
      if (submitted.length !== 1) return false;

      // Math answers are numeric strings — compare as-is.
      // Text answers use case-insensitive comparison so the user doesn't
      // need to worry about capitalisation — we normalise to lowercase
      // and compare against the lowercase variants stored in the pool.
      const normalised = submitted[0].toLowerCase();
      return challenge.correctAnswers.includes(normalised);
    }

    // Multi-select: sort both arrays and compare element by element
    const sortedSubmitted = [...submitted].sort();
    const sortedCorrect   = [...challenge.correctAnswers].sort();

    if (sortedSubmitted.length !== sortedCorrect.length) return false;
    return sortedSubmitted.every((id, i) => id === sortedCorrect[i]);
  }

  /** Returns all active challenges (useful for debugging / testing) */
  getAllChallenges(): ChallengeData[] {
    return this.activeChallenges;
  }
}
