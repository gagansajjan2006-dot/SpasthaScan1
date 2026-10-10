/**
 * test_e6_speaker.mjs
 * -------------------
 * Test suite for Task E6: Spoken Guidance Speaker Engine.
 *
 * Verifies:
 * 1. Initial coachMessage is spoken.
 * 2. Speaker NEVER repeats the same message within 2 seconds (or ever without state change).
 * 3. Speaker enforces 2-second minimum gap between different messages.
 * 4. Speaker speaks a new message after >= 2 seconds.
 * 5. Mute toggle defaults to off (unmuted) and suppresses speech when enabled.
 * 6. Mute state persists to localStorage.
 * 7. Voice selection matches UI language (en-IN, hi-IN, kn-IN).
 * 8. Falls back silently when Web Speech API is unsupported.
 */

import assert from 'node:assert';

// Mock Web Speech API components for Node environment
class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.lang = 'en-US';
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
  }
}
globalThis.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

class MockSpeechSynthesis {
  constructor() {
    this.spokenUtterances = [];
    this.canceled = false;
    this.voices = [
      { name: 'Kavya Indian English', lang: 'en-IN' },
      { name: 'Swara Hindi', lang: 'hi-IN' },
      { name: 'Gagan Kannada', lang: 'kn-IN' },
      { name: 'David US English', lang: 'en-US' },
    ];
  }

  getVoices() {
    return this.voices;
  }

  speak(utterance) {
    this.spokenUtterances.push(utterance);
    this.canceled = false;
  }

  cancel() {
    this.canceled = true;
  }
}

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Compile or import CoachSpeaker
// Since we have the TypeScript file, let's test the logic directly using the exact class definition
import { CoachSpeaker, COACH_TRANSLATIONS } from './src/services/coachSpeaker.ts';

console.log('\n=================================================================');
console.log('       TASK E6: CAMERA COACH SPOKEN GUIDANCE TEST SUITE');
console.log('=================================================================\n');

let currentTime = 10000;
const mockNow = () => currentTime;
const mockSynth = new MockSpeechSynthesis();
const mockStorage = new MockStorage();

const speaker = new CoachSpeaker({
  speechSynthesis: mockSynth,
  storage: mockStorage,
  minGapMs: 2000,
  nowFn: mockNow,
});

// Test 1: Supported check
assert.strictEqual(speaker.isSupported(), true, 'Speaker should report supported');
console.log('[PASS] Test 1: Web Speech API supported check');

// Test 2: Mute defaults to off (unmuted / audible)
assert.strictEqual(speaker.isMuted(), false, 'Mute should default to false (unmuted)');
console.log('[PASS] Test 2: Mute defaults to off (saved in localStorage)');

// Test 3: First message speaks successfully
const msg1 = 'Position document flat & centered';
const spoke1 = speaker.speak(msg1);
assert.strictEqual(spoke1, true, 'First message should be spoken');
assert.strictEqual(mockSynth.spokenUtterances.length, 1);
assert.strictEqual(speaker.getLastSpokenMessage(), msg1);
console.log('[PASS] Test 3: First coachMessage spoken once');

// Test 4: Speaker NEVER repeats the same message within 2 seconds
currentTime += 500; // +500ms (within 2s)
const spokeSameSoon = speaker.speak(msg1);
assert.strictEqual(spokeSameSoon, false, 'Same message within 500ms must be rejected');

currentTime += 1000; // +1500ms total (still within 2s)
const spokeSameSoon2 = speaker.speak(msg1);
assert.strictEqual(spokeSameSoon2, false, 'Same message within 1500ms must be rejected');

currentTime += 1000; // +2500ms total (> 2s)
const spokeSameAfter2s = speaker.speak(msg1);
assert.strictEqual(spokeSameAfter2s, false, 'Same message even after 2s must NOT repeat (speak each new state once)');
console.log('[PASS] Test 4: Speaker never repeats the same message within 2s (or without state change)');

// Test 5: Different message within 2 seconds must be rejected (2-second minimum gap)
const msg2 = 'Hold steady to capture';
currentTime = 10000 + 1200; // only 1.2s since last spoken at 10000
const spokeDiffSoon = speaker.speak(msg2);
assert.strictEqual(spokeDiffSoon, false, 'Different message within 2s gap must be rejected');
console.log('[PASS] Test 5: 2-second minimum gap enforced on different messages');

// Test 6: Different message after >= 2 seconds speaks successfully
currentTime = 10000 + 2050; // 2.05s since last spoken at 10000
const spokeDiffAfter2s = speaker.speak(msg2);
assert.strictEqual(spokeDiffAfter2s, true, 'New message after 2s must be spoken');
assert.strictEqual(mockSynth.spokenUtterances.length, 2);
assert.strictEqual(speaker.getLastSpokenMessage(), msg2);
console.log('[PASS] Test 6: New message spoken once after 2-second gap');

// Test 7: Mute toggle works and suppresses speech
speaker.setMuted(true);
assert.strictEqual(speaker.isMuted(), true);
assert.strictEqual(mockStorage.getItem('spasthascan_coach_muted'), 'true');
assert.strictEqual(mockSynth.canceled, true, 'Setting muted cancels any active utterance');

currentTime += 3000;
const msg3 = 'Move document closer to fill the frame';
const spokeWhileMuted = speaker.speak(msg3);
assert.strictEqual(spokeWhileMuted, false, 'Speech must be suppressed while muted');
assert.strictEqual(mockSynth.spokenUtterances.length, 2, 'No new utterance queued when muted');

// Unmute
speaker.toggleMute();
assert.strictEqual(speaker.isMuted(), false);
assert.strictEqual(mockStorage.getItem('spasthascan_coach_muted'), 'false');
console.log('[PASS] Test 7: Mute toggle works, cancels active speech, and persists in localStorage');

// Test 8: Voice selection and translation for UI languages (en-IN, hi-IN, kn-IN)
currentTime += 3000;
speaker.setLanguage('hi-IN');
assert.strictEqual(speaker.getLanguage(), 'hi-IN');
const spokeHindi = speaker.speak(msg3, 'hi-IN');
assert.strictEqual(spokeHindi, true, 'Spoken in Hindi');
const lastUtteranceHi = mockSynth.spokenUtterances[mockSynth.spokenUtterances.length - 1];
assert.strictEqual(lastUtteranceHi.lang, 'hi-IN');
assert.strictEqual(lastUtteranceHi.voice.name, 'Swara Hindi');
assert.strictEqual(lastUtteranceHi.text, COACH_TRANSLATIONS[msg3]['hi-IN']);
console.log(`[PASS] Test 8a: Hindi voice selected: "${lastUtteranceHi.voice.name}", translated: "${lastUtteranceHi.text}"`);

currentTime += 2500;
const msg4 = 'Hold the phone steady or use both hands';
speaker.setLanguage('kn-IN');
const spokeKannada = speaker.speak(msg4, 'kn-IN');
assert.strictEqual(spokeKannada, true, 'Spoken in Kannada');
const lastUtteranceKn = mockSynth.spokenUtterances[mockSynth.spokenUtterances.length - 1];
assert.strictEqual(lastUtteranceKn.lang, 'kn-IN');
assert.strictEqual(lastUtteranceKn.voice.name, 'Gagan Kannada');
assert.strictEqual(lastUtteranceKn.text, COACH_TRANSLATIONS[msg4]['kn-IN']);
console.log(`[PASS] Test 8b: Kannada voice selected: "${lastUtteranceKn.voice.name}", translated: "${lastUtteranceKn.text}"`);

currentTime += 2500;
speaker.setLanguage('en-IN');
const msg5 = 'Tap the text to focus and move slightly farther back';
const spokeEn = speaker.speak(msg5, 'en-IN');
assert.strictEqual(spokeEn, true, 'Spoken in Indian English');
const lastUtteranceEn = mockSynth.spokenUtterances[mockSynth.spokenUtterances.length - 1];
assert.strictEqual(lastUtteranceEn.lang, 'en-IN');
assert.strictEqual(lastUtteranceEn.voice.name, 'Kavya Indian English');
console.log(`[PASS] Test 8c: en-IN voice selected: "${lastUtteranceEn.voice.name}"`);

// Test 9: Silent fallback when unsupported
const unsupportedSpeaker = new CoachSpeaker({
  speechSynthesis: null,
  storage: mockStorage,
});
assert.strictEqual(unsupportedSpeaker.isSupported(), false);
assert.doesNotThrow(() => {
  const result = unsupportedSpeaker.speak('Position document flat & centered');
  assert.strictEqual(result, false);
}, 'Unsupported speaker must fail silently without errors');
console.log('[PASS] Test 9: Fall back silently when unsupported (no errors thrown)');

console.log('\n=================================================================');
console.log('       ALL TASK E6 SPEAKER UNIT TESTS PASSED (9/9)');
console.log('=================================================================\n');
