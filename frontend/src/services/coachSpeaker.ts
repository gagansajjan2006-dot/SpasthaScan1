/**
 * coachSpeaker.ts
 * ---------------
 * Task E6: Spoken Guidance Engine for the Camera Coach.
 *
 * Implements:
 * 1. Web Speech API (speechSynthesis) to speak each new coachMessage state once.
 * 2. Strict 2-second minimum gap between utterances and zero message repeats.
 * 3. Mute toggle (default off / audible, persisted in localStorage).
 * 4. Voice selection by UI language ('en-IN', 'hi-IN', 'kn-IN' when available).
 * 5. Accessibility settings compliance (reduced-motion check & safe utterance cleanup).
 * 6. Silent graceful fallback when Web Speech API is unsupported.
 */

export type CoachLanguage = 'en-IN' | 'hi-IN' | 'kn-IN';

export const COACH_TRANSLATIONS: Record<string, Record<CoachLanguage, string>> = {
  'Position document flat & centered': {
    'en-IN': 'Position document flat and centered',
    'hi-IN': 'दस्तावेज़ को सीधा और बीच में रखें',
    'kn-IN': 'ದಾಖಲೆಯನ್ನು ನೇರವಾಗಿ ಮತ್ತು ಮಧ್ಯದಲ್ಲಿ ಇರಿಸಿ',
  },
  'Hold steady to capture': {
    'en-IN': 'Hold the phone steady to capture',
    'hi-IN': 'फ़ोटो खींचने के लिए फ़ोन स्थिर रखें',
    'kn-IN': 'ಸೆರೆಹಿಡಿಯಲು ಫೋನ್ ಅನ್ನು ಸ್ಥಿರವಾಗಿಡಿ',
  },
  'Hold the phone steady or use both hands': {
    'en-IN': 'Hold the phone steady or use both hands',
    'hi-IN': 'फ़ोन को स्थिर रखें या दोनों हाथों का प्रयोग करें',
    'kn-IN': 'ಫೋನ್ ಅನ್ನು ಸ್ಥಿರವಾಗಿಡಿ ಅಥವಾ ಎರಡೂ ಕೈಗಳನ್ನು ಬಳಸಿ',
  },
  'Tap the text to focus and move slightly farther back': {
    'en-IN': 'Tap the text to focus and move slightly farther back',
    'hi-IN': 'फ़ोकस करने के लिए टेक्स्ट पर टैप करें और थोड़ा पीछे हटें',
    'kn-IN': 'ಫೋಕಸ್ ಮಾಡಲು ಪಠ್ಯವನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ ಮತ್ತು ಸ್ವಲ್ಪ ಹಿಂದಕ್ಕೆ ಸರಿಸಿ',
  },
  'Move document closer to fill the frame': {
    'en-IN': 'Move document closer to fill the frame',
    'hi-IN': 'फ़्रेम भरने के लिए दस्तावेज़ को पास लाएँ',
    'kn-IN': 'ಫ್ರೇಮ್ ತುಂಬಲು ದಾಖಲೆಯನ್ನು ಹತ್ತಿರಕ್ಕೆ ತನ್ನಿ',
  },
  'Avoid bright light or glare on the document': {
    'en-IN': 'Avoid bright light or glare on the document',
    'hi-IN': 'दस्तावेज़ पर तेज़ रोशनी या चमक से बचें',
    'kn-IN': 'ದಾಖಲೆಯ ಮೇಲೆ ಪ್ರಖರ ಬೆಳಕು ಅಥವಾ ಹೊಳಪನ್ನು ತಪ್ಪಿಸಿ',
  },
  'Move to a well-lit area': {
    'en-IN': 'Move to a well-lit area',
    'hi-IN': 'अच्छी रोशनी वाली जगह पर जाएँ',
    'kn-IN': 'ಉತ್ತಮ ಬೆಳಕಿರುವ ಜಾಗಕ್ಕೆ ಹೋಗಿ',
  },
  'Document aligned, ready to capture': {
    'en-IN': 'Document aligned, ready to capture',
    'hi-IN': 'दस्तावेज़ संरेखित है, फ़ोटो खींचने के लिए तैयार',
    'kn-IN': 'ದಾಖಲೆ ಜೋಡಿಸಲಾಗಿದೆ, ಸೆರೆಹಿಡಿಯಲು ಸಿದ್ಧವಾಗಿದೆ',
  },
};

export interface CoachSpeakerOptions {
  speechSynthesis?: SpeechSynthesis | null;
  storage?: Storage | null;
  minGapMs?: number;
  nowFn?: () => number;
  muteStorageKey?: string;
  langStorageKey?: string;
}

export class CoachSpeaker {
  private synth: SpeechSynthesis | null = null;
  private storage: Storage | null = null;
  private minGapMs: number = 2000;
  private nowFn: () => number = () => Date.now();
  private muteStorageKey: string = 'spasthascan_coach_muted';
  private langStorageKey: string = 'spasthascan_ui_lang';

  private muted: boolean = false;
  private currentLanguage: CoachLanguage = 'en-IN';
  private lastSpokenMessage: string | null = null;
  private lastSpokenTimestamp: number = 0;
  private voices: SpeechSynthesisVoice[] = [];

  constructor(options?: CoachSpeakerOptions) {
    if (options?.minGapMs !== undefined) this.minGapMs = options.minGapMs;
    if (options?.nowFn) this.nowFn = options.nowFn;
    if (options?.muteStorageKey) this.muteStorageKey = options.muteStorageKey;
    if (options?.langStorageKey) this.langStorageKey = options.langStorageKey;

    // Resolve Storage
    if (options?.storage !== undefined) {
      this.storage = options.storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    }

    // Resolve SpeechSynthesis
    if (options?.speechSynthesis !== undefined) {
      this.synth = options.speechSynthesis;
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }

    // Initialize Mute State (default: false / unmuted)
    this.muted = this.readMuteFromStorage();

    // Initialize UI Language (default: 'en-IN')
    this.currentLanguage = this.readLanguageFromStorage();

    // Initialize Voices
    this.initVoices();
  }

  /**
   * Check whether Web Speech API is supported in this runtime.
   */
  public isSupported(): boolean {
    return Boolean(
      this.synth &&
      (typeof SpeechSynthesisUtterance !== 'undefined' || typeof (globalThis as any).SpeechSynthesisUtterance !== 'undefined')
    );
  }

  /**
   * Initialize and refresh available voices from SpeechSynthesis.
   */
  private initVoices(): void {
    if (!this.synth) return;
    try {
      this.voices = this.synth.getVoices() || [];
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', () => {
          try {
            this.voices = this.synth?.getVoices() || [];
          } catch {
            // silent fallback
          }
        });
      }
    } catch {
      // silent fallback
    }
  }

  /**
   * Read mute toggle state from localStorage. Default is false (unmuted).
   */
  private readMuteFromStorage(): boolean {
    if (!this.storage) return false;
    try {
      const val = this.storage.getItem(this.muteStorageKey);
      return val === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Read UI Language state from localStorage. Default is 'en-IN'.
   */
  private readLanguageFromStorage(): CoachLanguage {
    if (!this.storage) return 'en-IN';
    try {
      const val = this.storage.getItem(this.langStorageKey);
      if (val === 'hi-IN' || val === 'kn-IN' || val === 'en-IN') {
        return val;
      }
      return 'en-IN';
    } catch {
      return 'en-IN';
    }
  }

  /**
   * Is spoken guidance currently muted?
   */
  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Set mute state (true = muted, false = sound enabled).
   * Persists immediately to localStorage.
   */
  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.storage) {
      try {
        this.storage.setItem(this.muteStorageKey, String(muted));
      } catch {
        // silent fallback
      }
    }
    if (muted) {
      this.cancel();
    }
  }

  /**
   * Toggle mute state and return new state.
   */
  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Get current UI language.
   */
  public getLanguage(): CoachLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current UI language and persist to localStorage.
   */
  public setLanguage(lang: CoachLanguage): void {
    this.currentLanguage = lang;
    if (this.storage) {
      try {
        this.storage.setItem(this.langStorageKey, lang);
      } catch {
        // silent fallback
      }
    }
  }

  /**
   * Respect accessibility preferences (e.g. prefers-reduced-motion).
   */
  public isReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  /**
   * Select the best matching voice for the target language.
   * Matches exact tag (e.g. 'en-IN', 'hi-IN', 'kn-IN'), then prefix ('hi', 'kn', 'en').
   */
  public getVoiceForLanguage(lang: CoachLanguage): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    try {
      if (this.voices.length === 0) {
        this.voices = this.synth.getVoices() || [];
      }
      const target = lang.toLowerCase().replace('_', '-');
      const targetPrefix = target.split('-')[0];

      // Exact match
      const exact = this.voices.find(
        (v) => v.lang.toLowerCase().replace('_', '-') === target
      );
      if (exact) return exact;

      // Prefix match (e.g. 'hi' for 'hi-IN', 'kn' for 'kn-IN')
      const prefixMatch = this.voices.find((v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix)
      );
      if (prefixMatch) return prefixMatch;

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Translate a coachMessage to the requested language if a translation is available.
   */
  public translateMessage(message: string, lang: CoachLanguage): string {
    const trimmed = message.trim();
    if (COACH_TRANSLATIONS[trimmed] && COACH_TRANSLATIONS[trimmed][lang]) {
      return COACH_TRANSLATIONS[trimmed][lang];
    }
    return trimmed;
  }

  /**
   * Speak a new coachMessage state.
   *
   * Constraints enforced:
   * 1. Speaks each new coachMessage state ONCE (no repeats of identical message).
   * 2. Strict 2-second minimum gap between utterances.
   * 3. Mute toggle respected (silent when muted).
   * 4. Chooses voice by UI language (en-IN, hi-IN, kn-IN).
   * 5. Silent fallback when unsupported.
   *
   * @param message The coaching text cue to speak.
   * @param lang Optional language override (defaults to current UI language).
   * @returns true if utterance was queued/spoken, false if suppressed or unsupported.
   */
  public speak(message: string, lang?: CoachLanguage): boolean {
    // 1. Silent fallback if Web Speech API unsupported
    if (!this.isSupported() || !this.synth) {
      return false;
    }

    // 2. Suppress when muted
    if (this.muted) {
      return false;
    }

    // 3. Ignore empty or blank text
    const trimmed = (message || '').trim();
    if (!trimmed) {
      return false;
    }

    // 4. Constraint: NO REPEATS (speak each new coachMessage state once)
    if (trimmed === this.lastSpokenMessage) {
      return false;
    }

    // 5. Constraint: 2-SECOND MINIMUM GAP
    const now = this.nowFn();
    if (now - this.lastSpokenTimestamp < this.minGapMs) {
      return false;
    }

    const targetLang = lang || this.currentLanguage;
    const textToSpeak = this.translateMessage(trimmed, targetLang);

    try {
      const UtteranceClass =
        typeof SpeechSynthesisUtterance !== 'undefined'
          ? SpeechSynthesisUtterance
          : (globalThis as any).SpeechSynthesisUtterance;

      if (!UtteranceClass) {
        return false;
      }

      const utterance = new UtteranceClass(textToSpeak);
      utterance.lang = targetLang;

      // Select voice
      const voice = this.getVoiceForLanguage(targetLang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = 0.95; // Clear coaching cadence
      utterance.pitch = 1.0;

      // Cancel any ongoing speaking to prevent speech overlap
      this.synth.cancel();

      // Speak
      this.synth.speak(utterance);

      // Record state
      this.lastSpokenMessage = trimmed;
      this.lastSpokenTimestamp = now;

      return true;
    } catch {
      // Fall back silently when unsupported or error occurs
      return false;
    }
  }

  /**
   * Cancel any active or queued speech synthesis.
   */
  public cancel(): void {
    if (!this.synth) return;
    try {
      this.synth.cancel();
    } catch {
      // silent fallback
    }
  }

  /**
   * Reset tracking state (useful for tests or modal unmount).
   */
  public reset(): void {
    this.cancel();
    this.lastSpokenMessage = null;
    this.lastSpokenTimestamp = 0;
  }

  /**
   * Get last spoken message.
   */
  public getLastSpokenMessage(): string | null {
    return this.lastSpokenMessage;
  }

  /**
   * Get last spoken timestamp.
   */
  public getLastSpokenTimestamp(): number {
    return this.lastSpokenTimestamp;
  }
}

// Global singleton instance for app-wide use
export const coachSpeaker = new CoachSpeaker();
