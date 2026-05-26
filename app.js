/* app.js - Simplified Decompression Engine & Living Ocean Audio Synthesizer */

// --- SAFE STORAGE WRAPPER (Prevents SecurityError when localStorage is blocked on file://) ---
const safeStorage = {
  memoryStore: {},
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Anor Storage Diagnostic: localStorage access blocked. Using in-memory fallback for ${key}.`);
      return this.memoryStore[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Anor Storage Diagnostic: localStorage write blocked. Using in-memory fallback for ${key}.`);
      this.memoryStore[key] = String(value);
    }
  }
};

// --- STATE MANAGER ---
const states = {
  DUMP: 'state-dump',
  THINKING: 'state-thinking',
  INTERVENTION: 'state-intervention',
  DECOMPRESSION: 'state-decompression'
};

let currentState = states.DUMP;

function transitionTo(stateId, callback) {
  const activeElement = document.querySelector('.page-state.state-active');
  const targetElement = document.getElementById(stateId);
  
  if (activeElement) {
    activeElement.classList.remove('state-active');
    activeElement.classList.add('state-hidden');
  }
  
  setTimeout(() => {
    if (activeElement) activeElement.style.display = 'none';
    targetElement.style.display = 'flex';
    
    // Trigger paint
    targetElement.offsetHeight; 
    
    targetElement.classList.remove('state-hidden');
    targetElement.classList.add('state-active');
    currentState = stateId;
    if (callback) callback();
  }, 800);
}

// Dynamic Gradient Background Transitioner (Seamless Opacity Cross-Fader)
function switchBackgroundState(state) {
  const welcomeBg = document.getElementById('anor-bg-welcome');
  const retreatBg = document.getElementById('anor-bg-retreat');
  if (!welcomeBg || !retreatBg) return;
  
  if (state === 'welcome') {
    retreatBg.classList.remove('active-bg');
    welcomeBg.classList.add('active-bg');
  } else if (state === 'retreat') {
    welcomeBg.classList.remove('active-bg');
    retreatBg.classList.add('active-bg');
  }
}

// Initial state configurations
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('state-thinking').style.display = 'none';
  document.getElementById('state-intervention').style.display = 'none';
  

  
  // Theme check
  const savedTheme = safeStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark-mode');
    document.getElementById('theme-icon').className = 'fa-solid fa-sun text-xs';
  }
  
  setupThemeToggle();
  setupTextStats();
  setupOffloadTrigger();
  setupResetTrigger();
  setBreatheMode('box'); // Set default breathing cycle
  
  // Load retention features
  initStreakDisplay();
  displayDailyReflection();
  

});

// --- THEME SWITCHER ---
function setupThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  toggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    safeStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    const icon = document.getElementById('theme-icon');
    icon.className = isDark ? 'fa-solid fa-sun text-xs' : 'fa-solid fa-moon text-xs';
  });
}

// --- CHARACTER & WORD STATS ---
function setupTextStats() {
  const input = document.getElementById('mind-input');
  const charCount = document.getElementById('char-count');
  const wordCount = document.getElementById('word-count');
  const motivationalHint = document.getElementById('motivational-hint');
  
  const hints = [
    "Let it flow.",
    "Emptying counts as doing.",
    "Breathe as you write.",
    "Letting go is productive."
  ];

  input.addEventListener('input', () => {
    const text = input.value;
    charCount.textContent = text.length;
    
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount.textContent = words.length;
    
    const hintIdx = Math.min(Math.floor(words.length / 18), hints.length - 1);
    motivationalHint.textContent = hints[hintIdx];
  });
}


// --- WEB AUDIO SYNTHESIZERS ---
let audioCtx = null;
let rainSynth = null;
let oceanSynth = null;
let droneSynth = null;
let chimeSynth = null;
let horizonSynth = null; // 528Hz panning sound bath
let birdsSynth = null;   // 4b. Procedural forest birds generator
let sandboxSynth = null; // Interactive Zen Nebula pentatonic chime synthesizer
let activeSound = 'mute'; // 'mute', 'rain', 'ocean', 'forest'

// 1. Synthesized Rain Engine (Soft background whisper)
class RainSynthesizer {
  constructor(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    this.output.connect(ctx.destination);
    this.initRain();
  }
  
  initRain() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const outputData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      outputData[i] = Math.random() * 2 - 1;
    }
    
    this.source = this.ctx.createBufferSource();
    this.source.buffer = noiseBuffer;
    this.source.loop = true;
    
    // Low cutoff removes harsh waterfall hiss; high highpass filters low mud
    this.lowpass = this.ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.setValueAtTime(820, this.ctx.currentTime);
    
    this.highpass = this.ctx.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.setValueAtTime(420, this.ctx.currentTime);
    
    // Slow LFO modulates amplitude slightly so it feels like blowing wind/shifting rain
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(0.025, this.ctx.currentTime);
    
    this.rainVolume = this.ctx.createGain();
    this.rainVolume.gain.setValueAtTime(0.05, this.ctx.currentTime); // quiet baseline
    
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.rainVolume.gain);
    
    this.source.connect(this.lowpass);
    this.lowpass.connect(this.highpass);
    this.highpass.connect(this.rainVolume);
    this.rainVolume.connect(this.output);
    
    this.source.start(0);
    this.lfo.start(0);
  }
  
  start() {
    this.output.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 1.8);
  }
  
  stop() {
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
  }
}

// 2. Synthesized Ocean Waves Engine (Syncs with Breathing LFO swells)
class OceanWavesSynthesizer {
  constructor(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    this.output.connect(ctx.destination);
    this.initWaves();
  }
  
  initWaves() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    this.source = this.ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    
    this.lowpass = this.ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.setValueAtTime(450, this.ctx.currentTime);
    
    this.highpass = this.ctx.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.setValueAtTime(90, this.ctx.currentTime);
    
    // Modulating volume swells (LFO)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // Initial 10s Box Breathe frequency (1/10)
    
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(0.07, this.ctx.currentTime); // subtle swell depth
    
    this.wavesVolume = this.ctx.createGain();
    this.wavesVolume.gain.setValueAtTime(0.08, this.ctx.currentTime); // quiet baseline waves
    
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.wavesVolume.gain);
    
    this.source.connect(this.lowpass);
    this.lowpass.connect(this.highpass);
    this.highpass.connect(this.wavesVolume);
    this.wavesVolume.connect(this.output);
    
    this.source.start(0);
    this.lfo.start(0);
  }
  
  updatePacingSpeed(seconds) {
    const hz = 1 / seconds;
    this.lfo.frequency.linearRampToValueAtTime(hz, this.ctx.currentTime + 0.8);
  }
  
  start() {
    this.output.gain.linearRampToValueAtTime(0.14, this.ctx.currentTime + 1.8);
  }
  
  stop() {
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
  }
}

// 3. Low-frequency drone for Mental Pause holding focus orb (Procedural Respiration sweeps)
class FocusDrone {
  constructor(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    
    // Add lowpass filter for dynamic breathing sweeps
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(140, ctx.currentTime); // subby baseline
    this.filter.Q.setValueAtTime(1.5, ctx.currentTime); // gentle resonance peak
    
    this.filter.connect(this.output);
    this.output.connect(ctx.destination);
    
    this.oscillators = [];
    this.initDrone();
  }
  
  initDrone() {
    const frequencies = [82, 164]; // Sub F harmonic chords
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      const volume = this.ctx.createGain();
      volume.gain.setValueAtTime(0.05 / (idx + 1), this.ctx.currentTime);
      
      osc.connect(volume);
      volume.connect(this.filter); // Connect oscillators to the filter!
      
      osc.start(0);
      this.oscillators.push(osc);
    });
  }
  
  start() {
    this.output.gain.linearRampToValueAtTime(0.38, this.ctx.currentTime + 0.8);
  }
  
  updateFilter(frequency) {
    this.filter.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.25);
  }
  
  stop() {
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.6);
  }
}

// 4. Soft haptic bamboo switch click (Whisper-soft, ultra-short organic tap)
class ChimeSynth {
  constructor(ctx) {
    this.ctx = ctx;
  }
  
  trigger() {
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    // Very warm, low-to-mid bamboo resonant frequency
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    
    // Whisper-soft envelope: 3ms clickless attack, 42ms rapid exponential decay
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.015, now + 0.003); // extremely quiet
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    
    // Filter out any high-frequency digital pops
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now); // low cutoff makes it extremely soft and deep
    
    osc.connect(gain);
    gain.connect(filter);
    filter.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

// 4b. Procedural forest birdsong synthesizer (Dynamic chirping patterns)
class BirdSongGenerator {
  constructor(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    this.output.connect(ctx.destination);
    this.active = false;
    this.timer = null;
  }
  
  start() {
    this.active = true;
    this.output.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 1.5);
    this.scheduleNextChirp();
  }
  
  stop() {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
  }
  
  scheduleNextChirp() {
    if (!this.active) return;
    
    // Spaced out natural intervals: random delay between 5.5s and 12s
    const delay = 5500 + Math.random() * 6500;
    this.timer = setTimeout(() => {
      if (this.active) {
        this.triggerChirp();
        this.scheduleNextChirp();
      }
    }, delay);
  }
  
  triggerChirp() {
    const now = this.ctx.currentTime;
    const type = Math.floor(Math.random() * 3); // 3 procedural bird calls
    
    const birdGain = this.ctx.createGain();
    birdGain.gain.setValueAtTime(0.0, now);
    
    // Low pass filter to make birds sound like they are far away in a forest canopy
    const distanceFilter = this.ctx.createBiquadFilter();
    distanceFilter.type = 'lowpass';
    distanceFilter.frequency.setValueAtTime(4500, now);
    
    birdGain.connect(distanceFilter);
    distanceFilter.connect(this.output);
    
    if (type === 0) {
      // Gentle double peep: "peep... peep"
      this.chirp(2800, 3100, 0.08, now, birdGain, 0.045);
      this.chirp(2850, 3150, 0.08, now + 0.14, birdGain, 0.045);
    } else if (type === 1) {
      // Soft, rapid, rolling micro-trill: "trrr-tweet"
      const startTime = now;
      for (let i = 0; i < 4; i++) {
        this.chirp(3400, 3700, 0.03, startTime + (i * 0.045), birdGain, 0.032);
      }
      this.chirp(3000, 4000, 0.14, startTime + 0.22, birdGain, 0.045);
    } else {
      // Distant, long, comforting whistle sliding slightly downwards
      this.chirp(2300, 2050, 0.38, now, birdGain, 0.040);
    }
  }
  
  chirp(startFreq, endFreq, duration, startTime, destinationGain, maxVol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
    
    gain.gain.setValueAtTime(0.0, startTime);
    gain.gain.linearRampToValueAtTime(maxVol, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    
    osc.connect(gain);
    gain.connect(destinationGain);
    
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    rainSynth = new RainSynthesizer(audioCtx);
    oceanSynth = new OceanWavesSynthesizer(audioCtx);
    droneSynth = new FocusDrone(audioCtx);
    chimeSynth = new ChimeSynth(audioCtx);
    horizonSynth = new AudioHorizonSynth(audioCtx);
    birdsSynth = new BirdSongGenerator(audioCtx); // Initialize Birds Generator
    sandboxSynth = new ResonantChimeSynthesizer(audioCtx); // Initialize Sandbox synth
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Global checkmark chime
function playChime() {
  if (audioCtx) chimeSynth.trigger();
}


// --- DOCK CONTROL TRIGGERS (PERMANENT INTERFACES) ---

function switchSound(type) {
  initAudioContext();
  
  // Highlight selected sound active class
  ['mute', 'rain', 'ocean', 'forest'].forEach(m => {
    const btn = document.getElementById(`sound-${m}`);
    if (btn) {
      if (m === type) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  
  if (activeSound === type) return;
  
  // Stop current active synths
  if (activeSound === 'rain') rainSynth.stop();
  if (activeSound === 'ocean') oceanSynth.stop();
  if (activeSound === 'forest') {
    rainSynth.stop();
    birdsSynth.stop();
  }
  
  // Launch selected synths
  if (type === 'rain') rainSynth.start();
  if (type === 'ocean') oceanSynth.start();
  if (type === 'forest') {
    rainSynth.start();
    birdsSynth.start();
  }
  
  activeSound = type;
  playChime();
}

const breatheCycles = {
  box: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, total: 16, label: 'Box' },
  calm: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, total: 19, label: 'Calm' },
  slow: { inhale: 5, holdIn: 0, exhale: 5, holdOut: 0, total: 10, label: 'Slow' }
};

let currentBreatheCycle = 'box';

function setBreatheMode(mode) {
  initAudioContext();
  
  // Highlight selected breathe active class
  ['box', 'calm', 'slow'].forEach(m => {
    const btn = document.getElementById(`breathe-${m}`);
    if (btn) {
      if (m === mode) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  
  currentBreatheCycle = mode;
  const cycle = breatheCycles[mode];
  
  // Inject breathing cycle timing variables into CSS sheets
  document.documentElement.style.setProperty('--breathe-duration', `${cycle.total}s`);
  
  // Modulate waves sound swells speed dynamically
  if (oceanSynth) {
    oceanSynth.updatePacingSpeed(cycle.total);
  }
  
  playChime();
}


// --- MIND OFFLOADING STATE LOGICS ---

function setupOffloadTrigger() {
  const submitBtn = document.getElementById('submit-dump');
  const input = document.getElementById('mind-input');
  
  submitBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (text.length < 5) {
      input.parentElement.classList.add('ring-2', 'ring-red-400');
      setTimeout(() => input.parentElement.classList.remove('ring-2', 'ring-red-400'), 1200);
      return;
    }
    
    initAudioContext();
    
    // Cross-fade background to calming rain retreat forest!
    switchBackgroundState('retreat');
    
    // Animate beautiful mist dissolution (blur + rising watercolor particles)
    runMistDissolve(input, () => {
      // Increment Sanctuary Streak!
      incrementStreak();
      
      // Shift to Securing Mind state
      transitionTo(states.THINKING, () => {
        runThinkingSubtitles(() => {
          // Parse Mind text details & transition to dashboard slate
          parseMindDump(text);
          transitionTo(states.INTERVENTION);
        });
      });
    });
  });
}

function runMistDissolve(textarea, doneCallback) {
  // 1. Lock the input and trigger the CSS evaporation blur
  textarea.disabled = true;
  textarea.style.pointerEvents = 'none';
  textarea.classList.add('evaporating-text');
  
  // 2. Create the particle field overlay container inside parent
  const parent = textarea.parentElement;
  const particleField = document.createElement('div');
  particleField.className = 'mist-particle-field';
  parent.appendChild(particleField);
  
  const rect = textarea.getBoundingClientRect();
  
  // 3. Generate 60 rising sand & sage mist particles
  const particleCount = 60;
  const colors = ['#b5c7b1', '#7b9474', '#f5eedc', '#e2e8e0', '#526275'];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'mist-particle';
    
    // Randomize dimensions (4px to 10px) and soft hues
    const size = Math.floor(Math.random() * 7) + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = color;
    
    // Spawn randomly inside the textarea boundaries
    const posX = Math.random() * rect.width;
    const posY = Math.random() * rect.height;
    particle.style.left = `${posX}px`;
    particle.style.top = `${posY}px`;
    
    // Setup keyframe variables for organic drift physics
    const duration = 1.2 + Math.random() * 0.7; // 1.2s to 1.9s
    const delay = Math.random() * 0.4;         // 0s to 0.4s
    const rise = -(95 + Math.random() * 105);   // rises 95px to 200px
    const drift = Math.random() * 130 - 65;     // sways left/right +/- 65px
    const maxOpacity = 0.45 + Math.random() * 0.45;
    
    particle.style.setProperty('--duration', `${duration}s`);
    particle.style.setProperty('--delay', `${delay}s`);
    particle.style.setProperty('--rise-distance', `${rise}px`);
    particle.style.setProperty('--drift-x', `${drift}px`);
    particle.style.setProperty('--max-opacity', maxOpacity);
    
    particleField.appendChild(particle);
  }
  
  // 4. Run the flying words in parallel for extra visual satisfaction
  runTextVaultParticles(textarea, () => {});
  
  // 5. Clean up field and transition to state 2 after animations play
  setTimeout(() => {
    particleField.remove();
    doneCallback();
  }, 1650);
}

function runThinkingSubtitles(completionCallback) {
  const title = document.getElementById('thinking-title');
  const subtitle = document.getElementById('thinking-subtitle');
  
  const phases = [
    { t: "Securing your thoughts...", s: "Creating a quiet space..." },
    { t: "Separating the noise...", s: "Locking away details safely..." }
  ];
  
  let idx = 0;
  title.textContent = phases[0].t;
  subtitle.textContent = phases[0].s;
  
  const timer = setInterval(() => {
    idx++;
    if (idx < phases.length) {
      title.textContent = phases[idx].t;
      subtitle.textContent = phases[idx].s;
    } else {
      clearInterval(timer);
      completionCallback();
    }
  }, 1000);
}

function setupResetTrigger() {
  const resetBtn = document.getElementById('reset-button');
  resetBtn.addEventListener('click', () => {
    const input = document.getElementById('mind-input');
    
    // Clear and restore original textarea interactive attributes
    input.value = '';
    input.disabled = false;
    input.style.pointerEvents = 'auto';
    input.classList.remove('evaporating-text');
    
    // Wipe any leftover particles
    const residualFields = input.parentElement.querySelectorAll('.mist-particle-field');
    residualFields.forEach(f => f.remove());

    document.getElementById('char-count').textContent = '0';
    document.getElementById('word-count').textContent = '0';
    
    // Cross-fade background back to golden sun welcome forest!
    switchBackgroundState('welcome');
    
    transitionTo(states.DUMP);
  });
}


// --- WORD PARTICLES TRANSFERS ---
function runTextVaultParticles(textarea, doneCallback) {
  const text = textarea.value;
  const words = text.split(/\s+/).filter(w => w.length > 2).slice(0, 10);
  
  if (words.length === 0) {
    doneCallback();
    return;
  }
  
  const rect = textarea.getBoundingClientRect();
  const target = document.getElementById('sound-dock'); // Flow towards Sound selectors pill in header
  const targetRect = target.getBoundingClientRect();
  
  words.forEach((word, idx) => {
    setTimeout(() => {
      const flyEl = document.createElement('div');
      flyEl.className = 'vault-flying-word';
      flyEl.textContent = word.replace(/[^a-zA-Z]/g, '');
      
      const startX = rect.left + Math.random() * (rect.width - 80);
      const startY = rect.top + Math.random() * (rect.height - 40);
      
      flyEl.style.setProperty('--start-x', `${startX}px`);
      flyEl.style.setProperty('--start-y', `${startY}px`);
      
      const endX = targetRect.left + (targetRect.width / 2);
      const endY = targetRect.top + (targetRect.height / 2);
      
      flyEl.style.setProperty('--end-x', `${endX}px`);
      flyEl.style.setProperty('--end-y', `${endY}px`);
      
      flyEl.style.left = '0';
      flyEl.style.top = '0';
      flyEl.style.position = 'fixed';
      
      document.body.appendChild(flyEl);
      
      setTimeout(() => flyEl.remove(), 1100);
    }, idx * 55);
  });
  
  setTimeout(doneCallback, words.length * 55 + 200);
}


// --- PARSING PIPELINE ---
function parseMindDump(text) {
  const sentences = text.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 4);
  
  const essentials = [];
  const vaultItems = [];
  const priorityTerms = ['must', 'need', 'have to', 'email', 'urgent', 'today', 'fix', 'call'];
  
  sentences.forEach(s => {
    const isPriority = priorityTerms.some(t => s.toLowerCase().includes(t));
    if (isPriority && essentials.length < 2) {
      essentials.push(s);
    } else if (essentials.length < 2 && sentences.indexOf(s) < 2) {
      essentials.push(s);
    } else {
      vaultItems.push(s);
    }
  });
  
  // Make sure we have a clean focus text
  if (essentials.length === 0) {
    essentials.push("Focus on breathing smoothly right now.");
    essentials.push("Acknowledge your thoughts, then let them settle.");
  } else if (essentials.length === 1) {
    essentials.push("Slow down and take it one step at a time.");
  }
  
  if (vaultItems.length === 0) {
    vaultItems.push("The minor drafts and routine chores");
    vaultItems.push("Reviewing slide detailed layouts");
    vaultItems.push("Refining detailed schedule lists");
  }
  
  // 1. Inject Feature A: Single core focus item to lower cognitive strain
  const focusBox = document.getElementById('focus-item-text');
  focusBox.textContent = essentials[0];
  
  // 2. Secured percentage in Tomorrow Chest
  const vaultCount = vaultItems.length;
  const lockedPerc = Math.min(Math.round((vaultCount / (vaultCount + essentials.length)) * 100), 90);
  document.getElementById('locked-percentage').textContent = `${lockedPerc || 80}%`;
  
  // 3. Render Vault popups lists
  const vaultItemsList = document.getElementById('vault-items-list');
  vaultItemsList.innerHTML = '';
  vaultItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-light';
    li.innerHTML = `
      <i class="fa-solid fa-lock text-[9px] text-sage-500 mt-1 shrink-0"></i>
      <span>${item}</span>
    `;
    vaultItemsList.appendChild(li);
  });
  
  // Tactile rumble in chest box
  const chest = document.getElementById('chest-icon');
  chest.classList.add('rumble');
  setTimeout(() => chest.classList.remove('rumble'), 600);
  
  // 4. Render Feature B: 3 Somatic Micro-steps Checklist
  const stepsContainer = document.getElementById('micro-steps-container');
  stepsContainer.innerHTML = '';
  
  const steps = [
    "Drop your shoulders and unclench your jaw.",
    "Pour a fresh glass of water and take 3 slow sips.",
    "Rest your eyes and look away from all screens."
  ];
  
  steps.forEach((step, idx) => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100/30 dark:hover:bg-slate-800/10 transition-colors select-none';
    div.innerHTML = `
      <input type="checkbox" id="micro-step-${idx}" class="w-3.5 h-3.5 rounded text-sage-500 border-slate-300 dark:border-white/10 focus:ring-sage-500/20" onchange="handleStepCheck(this)">
      <label for="micro-step-${idx}" class="text-xs text-slate-600 dark:text-slate-300 font-light cursor-pointer leading-normal">${step}</label>
    `;
    stepsContainer.appendChild(div);
  });
  
  // 5. Dynamic Copiable boundaries template
  const boundaryBox = document.getElementById('boundary-message');
  const templates = [
    "\"I am feeling a bit overwhelmed today, let's catch up on this tomorrow morning instead.\"",
    "\"I want to make sure I give this my best focus. Can I send you an update tomorrow afternoon instead?\"",
    "\"I've received this and am on it. I need to clear a few priority items first, I'll get back to you tomorrow.\""
  ];
  boundaryBox.textContent = templates[Math.floor(Math.random() * templates.length)];
}

function handleStepCheck(checkbox) {
  const label = checkbox.nextElementSibling;
  if (checkbox.checked) {
    label.classList.add('line-through', 'text-slate-400', 'dark:text-slate-600');
    playChime();
  } else {
    label.classList.remove('line-through', 'text-slate-400', 'dark:text-slate-600');
  }
}

function copyBoundaryMessage() {
  const text = document.getElementById('boundary-message').textContent.replace(/"/g, '');
  const icon = document.getElementById('copy-icon');
  
  navigator.clipboard.writeText(text).then(() => {
    playChime();
    
    icon.className = 'fa-solid fa-check text-emerald-500';
    setTimeout(() => {
      icon.className = 'fa-regular fa-copy text-sm';
    }, 1500);
  });
}

function toggleVaultModal(show) {
  const modal = document.getElementById('vault-modal');
  const card = document.getElementById('vault-modal-card');
  
  if (show) {
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      card.classList.remove('scale-95');
    }, 50);
    playChime();
  } else {
    modal.classList.add('opacity-0');
    card.classList.add('scale-95');
    setTimeout(() => {
      modal.style.display = 'none';
      modal.classList.add('hidden');
    }, 300);
  }
}


// --- IMMERSIVE FULL-SCREEN OVERLAYS AND PAUSES ---
let focusInterval = null;
let holdActive = false;
let holdTimeRemaining = 30; // demo accelerated timer for fast feedback loop
let holdProgress = 0;

let somaticTimer = null;
let somaticBreathCount = 0;

function triggerFullScreenPause(type) {
  initAudioContext();
  
  if (type === 'mental') {
    const screen = document.getElementById('immersive-mental-screen');
    screen.style.display = 'flex';
    screen.classList.remove('hidden');
    screen.offsetHeight;
    screen.classList.remove('opacity-0');
    
    setupMentalHoldingEvents();
  } else if (type === 'somatic') {
    const screen = document.getElementById('immersive-somatic-screen');
    screen.style.display = 'flex';
    screen.classList.remove('hidden');
    screen.offsetHeight;
    screen.classList.remove('opacity-0');
    
    startSomaticBreathingRoutine();
  } else if (type === 'audio') {
    const screen = document.getElementById('immersive-audio-screen');
    screen.style.display = 'flex';
    screen.classList.remove('hidden');
    screen.offsetHeight;
    screen.classList.remove('opacity-0');
    
    startAudioHorizonRoutine();
  } else if (type === 'sandbox') {
    const screen = document.getElementById('immersive-sandbox-screen');
    screen.style.display = 'flex';
    screen.classList.remove('hidden');
    screen.offsetHeight;
    screen.classList.remove('opacity-0');
    
    startSandboxRoutine();
  } else if (type === 'vip') {
    const screen = document.getElementById('immersive-vip-screen');
    screen.style.display = 'flex';
    screen.classList.remove('hidden');
    screen.offsetHeight;
    screen.classList.remove('opacity-0');
    
    startVipLoungeRoutine();
  } else if (type === 'aura') {
    const screen = document.getElementById('immersive-aura-screen');
    screen.style.display = 'flex';
    screen.classList.remove('hidden');
    screen.offsetHeight;
    screen.classList.remove('opacity-0');
    
    startAuraTunerRoutine();
  }
}

let focusFrameId = null;
let focusActive = false;
let focusStars = [];
let focusGasClouds = [];
let focusParallaxMouse = { x: 0, y: 0 };
let focusCleanupCallback = null;

function exitFullScreenPause() {
  clearInterval(focusInterval);
  clearInterval(somaticTimer);
  clearInterval(audioHorizonTimer);
  cancelAnimationFrame(audioHorizonFrameId);
  
  // Clean up sandbox routine
  sandboxActive = false;
  cancelAnimationFrame(sandboxFrameId);
  if (chimeTriggerTimeout) clearTimeout(chimeTriggerTimeout);
  if (sandboxSynth) sandboxSynth.stop();
  
  // Clean up focus starfield loop
  if (focusCleanupCallback) {
    focusCleanupCallback();
    focusCleanupCallback = null;
  }
  
  if (droneSynth) droneSynth.stop();
  if (horizonSynth) horizonSynth.stop();
  
  // Clean up VIP lounge
  stopVipLoungeRoutine();
  
  // Clean up Aura Tuner
  stopAuraTunerRoutine();
  
  const mScreen = document.getElementById('immersive-mental-screen');
  const sScreen = document.getElementById('immersive-somatic-screen');
  const aScreen = document.getElementById('immersive-audio-screen');
  const sandScreen = document.getElementById('immersive-sandbox-screen');
  const vipScreen = document.getElementById('immersive-vip-screen');
  const auraScreen = document.getElementById('immersive-aura-screen');
  
  mScreen.classList.add('opacity-0');
  sScreen.classList.add('opacity-0');
  if (aScreen) aScreen.classList.add('opacity-0');
  if (sandScreen) sandScreen.classList.add('opacity-0');
  if (vipScreen) vipScreen.classList.add('opacity-0');
  if (auraScreen) auraScreen.classList.add('opacity-0');
  
  setTimeout(() => {
    mScreen.style.display = 'none';
    mScreen.classList.add('hidden');
    sScreen.style.display = 'none';
    sScreen.classList.add('hidden');
    if (aScreen) { aScreen.style.display = 'none'; aScreen.classList.add('hidden'); }
    if (sandScreen) { sandScreen.style.display = 'none'; sandScreen.classList.add('hidden'); }
    if (vipScreen) { vipScreen.style.display = 'none'; vipScreen.classList.add('hidden'); }
    if (auraScreen) { auraScreen.style.display = 'none'; auraScreen.classList.add('hidden'); }
  }, 1000);
}

// Robustly resolves the active breathing phase across interactive overlays
function getActiveBreathingPhase() {
  const innerCircle = document.getElementById('somatic-breathing-inner');
  if (innerCircle) {
    const className = innerCircle.className;
    if (className.includes('inhale')) return 'inhale';
    if (className.includes('hold')) return 'hold';
    if (className.includes('exhale')) return 'exhale';
  }
  
  // Dynamic time-based fallback when somatic routine is not actively pacing the DOM elements
  const cycle = breatheCycles[currentBreatheCycle] || breatheCycles.box;
  const progressSec = (Date.now() % (cycle.total * 1000)) / 1000;
  
  let elapsed = 0;
  if (progressSec < (elapsed += cycle.inhale)) return 'inhale';
  if (cycle.holdIn > 0 && progressSec < (elapsed += cycle.holdIn)) return 'hold';
  if (progressSec < (elapsed += cycle.exhale)) return 'exhale';
  return 'rest';
}

// 1. MENTAL: DELUXE ZEN COSMIC MUSIC BOX FOCUS MODULE
function setupMentalHoldingEvents() {
  const orb = document.getElementById('interactive-glow-orb');
  const bar = document.getElementById('focus-progress-bar');
  const display = document.getElementById('focus-time-display');
  const label = document.getElementById('hold-instruction-label');
  const canvas = document.getElementById('focus-canvas');
  
  holdActive = false;
  holdTimeRemaining = 30;
  holdProgress = 0;
  bar.style.width = '0%';
  display.textContent = '0:30';
  label.textContent = "Click and hold your pointer down on the golden orb to lock focus.";
  
  const somaticFocusDirectives = [
    "Drop your shoulders, let neck tension dissolve...",
    "Separate your teeth, relax your jaw...",
    "Soften your gaze, look deep into the gold...",
    "Feel the weight of your body anchoring down...",
    "Almost clear. Let go of the final detail..."
  ];
  
  // Setup HTML5 Canvas for the Cosmic Nebula & Starfield
  const ctx = canvas.getContext('2d');
  focusActive = true;
  focusParallaxMouse = { x: 0, y: 0 };
  
  function resizeFocusCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeFocusCanvas);
  resizeFocusCanvas();
  
  // Create 150 stardust particles with fixed angles and radial distances (Zero rotation)
  focusStars = [];
  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * Math.max(window.innerWidth, window.innerHeight) * 0.65 + 10;
    focusStars.push({
      angle: angle,
      baseDistance: distance,
      currentDistance: distance,
      radius: Math.random() * 1.5 + 0.4,
      driftSpeed: 0.1 + Math.random() * 0.15, // whisper-soft slow drift
      color: `hsla(${Math.random() * 60 + 200}, 80%, 90%, ${Math.random() * 0.45 + 0.35})`,
      chimed: false
    });
  }
  
  // Initialize slow breathing time constant (Zero floating color dots!)
  holdBreathingTime = 0;
  
  const handleParallaxMove = (e) => {
    if (!focusActive) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    focusParallaxMouse.x = (clientX - window.innerWidth / 2) * 0.04;
    focusParallaxMouse.y = (clientY - window.innerHeight / 2) * 0.04;
  };
  window.addEventListener('mousemove', handleParallaxMove);
  window.addEventListener('touchmove', handleParallaxMove, { passive: true });
  
  // Render and update stardust, swirling anchors, and gas pulses
  function renderFocusFrame() {
    if (!focusActive) return;
    
    // Clear trail to create celestial light flows
    ctx.fillStyle = 'rgba(4, 5, 7, 0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const activeBreathingClass = getActiveBreathingPhase();
    
    // 1. DRAW PROCEDURAL CENTRAL BREATHING HALO GLOW (NO ODD FLOATING DOTS!)
    let breathingFactor = 1.0;
    let targetHue = 210; // serene indigo/blue baseline
    let saturation = 45;
    let lightness = 35;
    let opacity = 0.08;
    
    if (activeBreathingClass.includes('inhale')) {
      breathingFactor = 1.25;
      targetHue = 18; // Inhale: soft warm rose/amber gas flare
      saturation = 60;
      lightness = 42;
      opacity = 0.14;
    } else if (activeBreathingClass.includes('hold')) {
      breathingFactor = 1.35;
      targetHue = 42; // Hold: golden gas flare
      saturation = 65;
      lightness = 45;
      opacity = 0.16;
    } else if (activeBreathingClass.includes('exhale')) {
      breathingFactor = 0.95;
      targetHue = 108; // Exhale: calm sage green aura
      saturation = 35;
      lightness = 38;
      opacity = 0.10;
    }
    
    // Slow breathing oscillation angle
    holdBreathingTime += 0.004;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.35;
    const sizePulse = baseRadius * (1.0 + Math.sin(holdBreathingTime) * 0.1) * breathingFactor;
    
    const grad = ctx.createRadialGradient(
      centerX + focusParallaxMouse.x * 0.4, centerY + focusParallaxMouse.y * 0.4, 0,
      centerX + focusParallaxMouse.x * 0.4, centerY + focusParallaxMouse.y * 0.4, sizePulse
    );
    
    grad.addColorStop(0, `hsla(${targetHue}, ${saturation}%, ${lightness}%, ${opacity})`);
    grad.addColorStop(0.5, `hsla(${targetHue}, ${saturation}%, ${lightness - 8}%, ${opacity * 0.35})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // 2. DRAW & UPDATE DUST PARTICLES (Radial Breathing Expansion - NO ROTATION / SPINNING)
    const orbRadiusThreshold = 95; // outer ring zone boundary
    
    focusStars.forEach(star => {
      if (holdActive) {
        // Expand/contract radial distance in perfect sync with the breathing swell!
        let targetDistanceOffset = 0;
        
        if (activeBreathingClass.includes('inhale')) {
          targetDistanceOffset = 40; // expand slowly outward
        } else if (activeBreathingClass.includes('hold')) {
          targetDistanceOffset = 45;
        } else if (activeBreathingClass.includes('exhale')) {
          targetDistanceOffset = -15; // contract slowly inward
        }
        
        // Easing interpolation for linear drift (completely dizziness-free!)
        const targetDist = star.baseDistance + targetDistanceOffset;
        star.currentDistance += (targetDist - star.currentDistance) * 0.035;
        
        star.x = centerX + Math.cos(star.angle) * star.currentDistance;
        star.y = centerY + Math.sin(star.angle) * star.currentDistance;
        
        // Play sweet chime crossings when crossing the focus ring zone slowly
        if (star.currentDistance <= orbRadiusThreshold + 8 && star.currentDistance >= orbRadiusThreshold - 8) {
          if (!star.chimed && Math.random() < 0.06) {
            star.chimed = true;
            const freq = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
            if (sandboxSynth) {
              sandboxSynth.trigger(freq, 0.20); // extremely quiet chime notes
            }
          }
        } else {
          star.chimed = false;
        }
        
      } else {
        // Very slow, peaceful outward cosmic drift when not holding
        star.currentDistance += star.driftSpeed;
        
        // Wrap distance
        if (star.currentDistance > Math.max(canvas.width, canvas.height) * 0.7) {
          star.currentDistance = 10;
        }
        
        // Account for mouse parallax
        star.x = centerX + Math.cos(star.angle) * star.currentDistance + focusParallaxMouse.x * 0.6;
        star.y = centerY + Math.sin(star.angle) * star.currentDistance + focusParallaxMouse.y * 0.6;
      }
      
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.fill();
    });
    
    // 3. BREATHING-LOCKED FOCUS ORB SWELL
    let orbScale = 1.0;
    let orbShadow = "0 0 25px rgba(235, 182, 60, 0.3)";
    
    if (holdActive) {
      if (activeBreathingClass.includes('inhale')) {
        orbScale = 1.15;
        orbShadow = "0 0 45px 12px rgba(251, 191, 36, 0.6)";
        if (droneSynth) droneSynth.updateFilter(420);
      } else if (activeBreathingClass.includes('hold')) {
        orbScale = 1.18;
        orbShadow = "0 0 55px 18px rgba(251, 191, 36, 0.7)";
        if (droneSynth) droneSynth.updateFilter(450);
      } else if (activeBreathingClass.includes('exhale')) {
        orbScale = 0.92;
        orbShadow = "0 0 35px 6px rgba(123, 148, 116, 0.45)"; // calming sage green exhale glow
        if (droneSynth) droneSynth.updateFilter(85);
      } else {
        orbScale = 0.95;
        orbShadow = "0 0 30px 4px rgba(235, 182, 60, 0.35)";
        if (droneSynth) droneSynth.updateFilter(140);
      }
      orb.style.transform = `scale(${orbScale})`;
      orb.style.boxShadow = orbShadow;
    } else {
      orb.style.transform = "scale(1.0)";
      orb.style.boxShadow = "0 0 25px rgba(235, 182, 60, 0.3)";
    }
    
    focusFrameId = requestAnimationFrame(renderFocusFrame);
  }
  
  renderFocusFrame();
  
  // Set cleanup routine hook
  focusCleanupCallback = () => {
    focusActive = false;
    cancelAnimationFrame(focusFrameId);
    window.removeEventListener('mousemove', handleParallaxMove);
    window.removeEventListener('touchmove', handleParallaxMove);
    window.removeEventListener('resize', resizeFocusCanvas);
  };
  
  const startHolding = (e) => {
    e.preventDefault();
    if (holdActive) return;
    holdActive = true;
    orb.classList.add('is-holding');
    
    if (droneSynth) droneSynth.start();
    
    label.textContent = somaticFocusDirectives[0];
    label.className = "text-xs text-amber-400 font-light leading-relaxed animate-pulse";
    
    focusInterval = setInterval(() => {
      holdTimeRemaining--;
      holdProgress = ((30 - holdTimeRemaining) / 30) * 100;
      
      bar.style.width = `${holdProgress}%`;
      display.textContent = `0:${holdTimeRemaining < 10 ? '0' + holdTimeRemaining : holdTimeRemaining}`;
      
      // Cycle guided somatic focus cues dynamically based on time markers
      const directiveIdx = Math.min(Math.floor((30 - holdTimeRemaining) / 6), somaticFocusDirectives.length - 1);
      label.textContent = somaticFocusDirectives[directiveIdx];
      
      if (holdTimeRemaining <= 0) {
        clearInterval(focusInterval);
        triggerDecompressionSuccess();
      }
    }, 1000);
  };
  
  const stopHolding = () => {
    if (!holdActive) return;
    holdActive = false;
    orb.classList.remove('is-holding');
    
    if (droneSynth) droneSynth.stop();
    clearInterval(focusInterval);
    
    label.textContent = "Interrupted. Re-hold orb to continue focus.";
    label.className = "text-xs text-red-300 font-light leading-relaxed";
  };
  
  orb.onmousedown = startHolding;
  orb.onmouseup = stopHolding;
  orb.onmouseleave = stopHolding;
  
  orb.ontouchstart = startHolding;
  orb.ontouchend = stopHolding;
}

function triggerDecompressionSuccess() {
  if (droneSynth) droneSynth.stop();
  playChime();
  
  incrementStreak();
  
  const label = document.getElementById('hold-instruction-label');
  label.textContent = "Clear Mind Achieved.";
  label.className = "text-sm text-emerald-400 font-serif font-medium leading-relaxed";
  
  setTimeout(() => {
    exitFullScreenPause();
  }, 1800);
}

// 2. SOMATIC: POSTURE BOX BREATHING WIDGET
// 2. SOMATIC: POSTURE paced BREATHING WIDGET (Dynamic)
function startSomaticBreathingRoutine() {
  const innerCircle = document.getElementById('somatic-breathing-inner');
  const phaseLabel = document.getElementById('somatic-phase-label');
  const timer = document.getElementById('somatic-breath-timer');
  const title = document.getElementById('somatic-prompt-title');
  const desc = document.getElementById('somatic-prompt-description');
  
  const somaticSteps = [
    { title: "Drop your shoulders", desc: "Let go of neck tightness. Shake out your wrists slowly." },
    { title: "Unclench your jaw", desc: "Separate your teeth and place your tongue away from the roof." },
    { title: "Ground your feet", desc: "Feel the support of the floor underneath. You are safe." },
    { title: "Rest your eyes", desc: "Softly close your eyes and let go of screen glare." }
  ];
  
  somaticBreathCount = 0;
  
  function executeBreathingPhase(phase, duration, nextPhaseCallback) {
    phaseLabel.textContent = phase;
    timer.textContent = `${duration}s`;
    
    // Smooth circle breathing scaling perfectly in sync with custom durations
    innerCircle.style.transition = `all ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
    
    if (phase === 'Inhale') {
      innerCircle.className = 'somatic-circle-inner inhale';
      if (audioCtx) chimeSynth.trigger();
    } else if (phase === 'Hold' || phase === 'Hold In') {
      innerCircle.className = 'somatic-circle-inner hold';
    } else if (phase === 'Exhale') {
      innerCircle.className = 'somatic-circle-inner exhale';
    } else {
      innerCircle.className = 'somatic-circle-inner exhale';
    }
    
    let rem = duration;
    somaticTimer = setInterval(() => {
      rem--;
      timer.textContent = `${rem}s`;
      if (rem <= 0) {
        clearInterval(somaticTimer);
        nextPhaseCallback();
      }
    }, 1000);
  }
  
  function loopBreathingCycle() {
    if (somaticBreathCount >= 4) {
      phaseLabel.textContent = "Peace Achieved";
      timer.textContent = "";
      title.textContent = "Grounded";
      desc.textContent = "Take this somatic relaxation back into your day.";
      playChime();
      
      // Increment Sanctuary Streak!
      incrementStreak();
      
      setTimeout(exitFullScreenPause, 2200);
      return;
    }
    
    const currentStep = somaticSteps[somaticBreathCount];
    title.textContent = currentStep.title;
    desc.textContent = currentStep.desc;
    
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`step-dot-${i}`);
      if (i <= somaticBreathCount + 1) {
        dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400';
      } else {
        dot.className = 'w-1.5 h-1.5 rounded-full bg-white/20';
      }
    }
    
    // Construct dynamic phases from current selection, skipping any 0s phases
    const cycle = breatheCycles[currentBreatheCycle];
    const activePhases = [];
    if (cycle.inhale > 0) activePhases.push({ name: 'Inhale', duration: cycle.inhale });
    if (cycle.holdIn > 0) activePhases.push({ name: 'Hold', duration: cycle.holdIn });
    if (cycle.exhale > 0) activePhases.push({ name: 'Exhale', duration: cycle.exhale });
    if (cycle.holdOut > 0) activePhases.push({ name: 'Rest', duration: cycle.holdOut });
    
    function executePhaseIndex(index) {
      if (index >= activePhases.length) {
        somaticBreathCount++;
        loopBreathingCycle();
        return;
      }
      
      const phase = activePhases[index];
      executeBreathingPhase(phase.name, phase.duration, () => {
        executePhaseIndex(index + 1);
      });
    }
    
    executePhaseIndex(0);
  }
  
  loopBreathingCycle();
}


// --- SANCTUARY DAILY STREAK MANAGEMENT ---

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initStreakDisplay() {
  const streak = parseInt(safeStorage.getItem('anor_streak_count') || '0', 10);
  const lastActive = safeStorage.getItem('anor_last_active');
  const today = getTodayString();
  const yesterday = getYesterdayString();
  
  const display = document.getElementById('streak-count');
  if (!display) return;
  
  if (lastActive && lastActive !== today && lastActive !== yesterday) {
    safeStorage.setItem('anor_streak_count', '0');
    display.textContent = '0';
  } else {
    display.textContent = streak;
  }
}

function incrementStreak() {
  initAudioContext();
  
  const streak = parseInt(safeStorage.getItem('anor_streak_count') || '0', 10);
  const lastActive = safeStorage.getItem('anor_last_active');
  const today = getTodayString();
  const yesterday = getYesterdayString();
  
  let newStreak = streak;
  
  if (lastActive === today) {
    // Already active today, preserve streak
    return;
  } else if (lastActive === yesterday || !lastActive) {
    newStreak = streak + 1;
  } else {
    newStreak = 1;
  }
  
  safeStorage.setItem('anor_streak_count', String(newStreak));
  safeStorage.setItem('anor_last_active', today);
  
  const countEl = document.getElementById('streak-count');
  const badge = document.getElementById('streak-badge');
  
  if (countEl) countEl.textContent = newStreak;
  if (badge) {
    badge.classList.remove('celebrate-glow');
    void badge.offsetWidth; // trigger reflow
    badge.classList.add('celebrate-glow');
  }
  
  if (chimeSynth) {
    setTimeout(() => chimeSynth.trigger(), 80);
  }
}


// --- POETIC REFLECTION OF THE DAY ---

const calmReflections = [
  "\"The ocean waves do not struggle to break, they simply swell and release.\"",
  "\"Silence is not empty; it is full of quiet answers.\"",
  "\"Trees do not rush to grow, yet everything is completed in its season.\"",
  "\"You do not have to carry the whole world today. Focus on this single breath.\"",
  "\"Let go of the shore. The ocean water is holding you safe.\"",
  "\"Your mind is like water; when it is quiet, it reflects the light clearly.\"",
  "\"Breathe in calm like fresh morning air; exhale the weight of yesterday.\"",
  "\"Peace is not the absence of storm, but finding stillness within it.\"",
  "\"Like the autumn leaves, sometimes letting go is the most beautiful action.\"",
  "\"Allow your mind to be soft. No friction is required to exist in this moment.\"",
  "\"Deep roots do not fear the wind. Anchor your weight into the ground.\"",
  "\"Your focus is a sacred lens; protect it from the dust of details.\"",
  "\"A quiet heart senses the rhythm of the tide. Inhale. Hold. Exhale. Rest.\"",
  "\"You have done enough today. Let the tomorrow vault hold the rest.\"",
  "\"Allow your thoughts to pass like white clouds across a spacious sky.\""
];

function displayDailyReflection() {
  const reflectionEl = document.getElementById('daily-reflection');
  if (!reflectionEl) return;
  
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const quoteIdx = dayOfYear % calmReflections.length;
  reflectionEl.textContent = calmReflections[quoteIdx];
  
  setTimeout(() => {
    reflectionEl.classList.remove('opacity-0');
    reflectionEl.classList.add('opacity-100');
  }, 200);
}


// --- 3. AUDITORY HORIZON SENSORY MODULE ---

class AudioHorizonSynth {
  constructor(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    this.output.connect(ctx.destination);
    
    // Master stereo panner node
    this.panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    this.initSynth();
  }
  
  initSynth() {
    const now = this.ctx.currentTime;
    
    // We split into Left and Right channels to generate Binaural Beats:
    // Left Channel: 528Hz Sine + 110Hz Triangle (Root F)
    // Right Channel: 534Hz Sine + 112Hz Triangle -> Creates a 6Hz Theta Beat and a 2Hz Delta Beat for deep brainwave relaxation
    
    // 1. LEFT CHANNEL NODES
    this.oscL = this.ctx.createOscillator();
    this.oscL.type = 'sine';
    this.oscL.frequency.setValueAtTime(528, now);
    
    this.baseL = this.ctx.createOscillator();
    this.baseL.type = 'triangle';
    this.baseL.frequency.setValueAtTime(110, now);
    
    this.gainL = this.ctx.createGain();
    this.gainL.gain.setValueAtTime(0.04, now); // quiet, safe levels
    
    this.baseGainL = this.ctx.createGain();
    this.baseGainL.gain.setValueAtTime(0.08, now);
    
    // 2. RIGHT CHANNEL NODES
    this.oscR = this.ctx.createOscillator();
    this.oscR.type = 'sine';
    this.oscR.frequency.setValueAtTime(534, now); // Detuned by 6Hz
    
    this.baseR = this.ctx.createOscillator();
    this.baseR.type = 'triangle';
    this.baseR.frequency.setValueAtTime(112, now); // Detuned by 2Hz
    
    this.gainR = this.ctx.createGain();
    this.gainR.gain.setValueAtTime(0.04, now);
    
    this.baseGainR = this.ctx.createGain();
    this.baseGainR.gain.setValueAtTime(0.08, now);
    
    // 3. CRYSTAL SINGING BOWL VIBRATO LFO
    // Subtly drifts the frequency to keep the sound natural and rich rather than digital
    this.vibratoLfo = this.ctx.createOscillator();
    this.vibratoLfo.type = 'sine';
    this.vibratoLfo.frequency.setValueAtTime(0.2, now); // slow wave
    
    this.vibratoGain = this.ctx.createGain();
    this.vibratoGain.gain.setValueAtTime(1.5, now); // drift depth (+/- 1.5Hz)
    
    // 4. SHIFTING OCEAN MIST TEXTURE (Filtered White Noise)
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    this.mistSource = this.ctx.createBufferSource();
    this.mistSource.buffer = noiseBuffer;
    this.mistSource.loop = true;
    
    this.mistFilter = this.ctx.createBiquadFilter();
    this.mistFilter.type = 'bandpass';
    this.mistFilter.frequency.setValueAtTime(320, now);
    this.mistFilter.Q.setValueAtTime(0.7, now);
    
    this.mistVolume = this.ctx.createGain();
    this.mistVolume.gain.setValueAtTime(0.03, now); // very soft atmospheric layer
    
    // 5. CHANNEL MERGER & DUAL STEREO ROUTING
    this.merger = this.ctx.createChannelMerger(2);
    
    // Connect left components to merger Left (channel 0)
    this.oscL.connect(this.gainL);
    this.baseL.connect(this.baseGainL);
    this.gainL.connect(this.merger, 0, 0);
    this.baseGainL.connect(this.merger, 0, 0);
    
    // Connect right components to merger Right (channel 1)
    this.oscR.connect(this.gainR);
    this.baseR.connect(this.baseGainR);
    this.gainR.connect(this.merger, 0, 1);
    this.baseGainR.connect(this.merger, 0, 1);
    
    // Connect LFO to carriers
    this.vibratoLfo.connect(this.vibratoGain);
    this.vibratoGain.connect(this.oscL.frequency);
    this.vibratoGain.connect(this.oscR.frequency);
    
    // Connect ocean mist to both channels (creates stereo space)
    this.mistSource.connect(this.mistFilter);
    this.mistFilter.connect(this.mistVolume);
    this.mistVolume.connect(this.merger, 0, 0);
    this.mistVolume.connect(this.merger, 0, 1);
    
    // Route merger to panner
    if (this.panner) {
      this.merger.connect(this.panner);
      this.panner.connect(this.output);
      this.panner.pan.setValueAtTime(0.0, now);
    } else {
      this.merger.connect(this.output);
    }
    
    // Start nodes
    this.oscL.start(0);
    this.baseL.start(0);
    this.oscR.start(0);
    this.baseR.start(0);
    this.vibratoLfo.start(0);
    this.mistSource.start(0);
  }
  
  setPan(val) {
    if (this.panner) {
      this.panner.pan.setValueAtTime(val, this.ctx.currentTime);
    }
  }
  
  start() {
    this.output.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 2.0);
  }
  
  stop() {
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
  }
}

let audioHorizonTimer = null;
let audioHorizonFrameId = null;
let audioHorizonActive = false;

function startAudioHorizonRoutine() {
  const line = document.getElementById('audio-horizon-line');
  const label = document.getElementById('audio-horizon-direction');
  const timeDisplay = document.getElementById('audio-time-display');
  const progressBar = document.getElementById('audio-progress-bar');
  
  if (!line || !label) return;
  
  // Start the Solfeggio sound bath synth
  if (horizonSynth) horizonSynth.start();
  
  audioHorizonActive = true;
  let timeRemaining = 60; // 60 seconds of sound bath
  let panTime = 0.0;
  
  line.style.transform = "translateX(0px) scaleX(1) skewX(0deg)";
  progressBar.style.width = '0%';
  timeDisplay.textContent = '1:00';
  label.textContent = 'Centered';
  
  // Animation loop linking the physical line to Web Audio panning coordinates
  function animateHorizon() {
    if (!audioHorizonActive) return;
    
    // Slow swing cycle (sine sweeps between -1.0 and 1.0)
    panTime += 0.012; 
    const panVal = Math.sin(panTime);
    
    // Update audio pan in real time
    if (horizonSynth) horizonSynth.setPan(panVal);
    
    // Animate visual anchor
    const skew = panVal * -12; // slants line towards active sound direction
    const shift = panVal * 32; // moves line left and right
    const scale = 1.0 + Math.abs(panVal) * 0.22; // stretches slightly at limits
    
    line.style.transform = `translateX(${shift}px) scaleX(${scale}) skewX(${skew}deg)`;
    
    // Adjust glowing shadows based on panning intensity
    const alpha = 0.3 + Math.abs(panVal) * 0.3;
    line.style.boxShadow = `0 0 16px 2px #f5eedc, 0 0 35px 6px rgba(245, 238, 220, ${alpha})`;
    
    // Label direction indicator
    if (panVal < -0.15) {
      label.textContent = "Flowing Left";
    } else if (panVal > 0.15) {
      label.textContent = "Flowing Right";
    } else {
      label.textContent = "Centered";
    }
    
    audioHorizonFrameId = requestAnimationFrame(animateHorizon);
  }
  
  // Start the audio-visual sync animation loop
  animateHorizon();
  
  // 1-second countdown interval
  audioHorizonTimer = setInterval(() => {
    timeRemaining--;
    const progress = ((60 - timeRemaining) / 60) * 100;
    
    progressBar.style.width = `${progress}%`;
    timeDisplay.textContent = `0:${timeRemaining < 10 ? '0' + timeRemaining : timeRemaining}`;
    
    if (timeRemaining <= 0) {
      clearInterval(audioHorizonTimer);
      audioHorizonActive = false;
      cancelAnimationFrame(audioHorizonFrameId);
      
      // Complete Decompression Celebration!
      if (horizonSynth) horizonSynth.stop();
      playChime();
      incrementStreak();
      
      label.textContent = "Sanctuary Completed";
      label.className = "text-[10px] text-emerald-400 uppercase tracking-widest mt-6 h-4 font-semibold animate-pulse";
      
      setTimeout(exitFullScreenPause, 1800);
    }
  }, 1000);
}


// --- 4. FULL-SCREEN RETREAT ROUTERS (OPTION 3) ---

function transitionToDecompression() {
  initAudioContext();
  playChime();
  
  // Slide out Today's Slate and sweep fade in Decompression retreat room
  transitionTo(states.DECOMPRESSION);
}

function transitionToSlate() {
  initAudioContext();
  playChime();
  
  // Fade back to primary daily task cockpit slate
  transitionTo(states.INTERVENTION);
}

// Background visual system fully initialized and optimized.


// --- 6. RESONANT PENTATONIC CHIME SYNTHESIZER WITH PING-PONG ECHOES ---

class ResonantChimeSynthesizer {
  constructor(ctx) {
    this.ctx = ctx;
    
    // Master volume of sandbox synthesizer
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    this.output.connect(ctx.destination);
    
    // Build spatial delay path (Ping-Pong Echo)
    // Left delay channel and Right delay channel with cross-feedback gains
    this.delayL = ctx.createDelay(1.0);
    this.delayR = ctx.createDelay(1.0);
    
    // Delay times: Left echoes at 280ms, Right at 420ms (creates beautiful spatial syncopation!)
    this.delayL.delayTime.setValueAtTime(0.28, ctx.currentTime);
    this.delayR.delayTime.setValueAtTime(0.42, ctx.currentTime);
    
    // Feedback gains
    this.feedbackL = ctx.createGain();
    this.feedbackR = ctx.createGain();
    
    this.feedbackL.gain.setValueAtTime(0.4, ctx.currentTime);
    this.feedbackR.gain.setValueAtTime(0.4, ctx.currentTime);
    
    // Cross-feed left delay output to right delay input, and vice versa (Ping-Pong!)
    this.delayL.connect(this.feedbackL);
    this.feedbackL.connect(this.delayR);
    
    this.delayR.connect(this.feedbackR);
    this.feedbackR.connect(this.delayL);
    
    // Create stereo panners to throw delay left and right
    this.panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    this.panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    
    if (this.panL && this.panR) {
      this.panL.pan.setValueAtTime(-0.8, ctx.currentTime);
      this.panR.pan.setValueAtTime(0.8, ctx.currentTime);
      
      this.delayL.connect(this.panL);
      this.panL.connect(this.output);
      
      this.delayR.connect(this.panR);
      this.panR.connect(this.output);
    } else {
      this.delayL.connect(this.output);
      this.delayR.connect(this.output);
    }
  }
  
  start() {
    this.output.gain.linearRampToValueAtTime(0.65, this.ctx.currentTime + 0.8);
  }
  
  stop() {
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.6);
  }
  
  trigger(freq, velocity = 0.5) {
    const now = this.ctx.currentTime;
    
    // Oscillator 1: High-resonance sine carrier for bell chime
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    // Oscillator 2: Soft harmonic sine tuned 2x (octave higher)
    const overtone = this.ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2, now);
    
    // Dynamic amplitude envelope
    const gainNode = this.ctx.createGain();
    const vol = 0.05 * velocity;
    
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    
    osc.connect(gainNode);
    overtone.connect(gainNode);
    gainNode.connect(this.output);
    
    // Send 30% of signal to delay lines
    const sendL = this.ctx.createGain();
    const sendR = this.ctx.createGain();
    sendL.gain.setValueAtTime(0.15, now);
    sendR.gain.setValueAtTime(0.15, now);
    
    gainNode.connect(sendL);
    sendL.connect(this.delayL);
    
    gainNode.connect(sendR);
    sendR.connect(this.delayR);
    
    osc.start(now);
    overtone.start(now);
    
    osc.stop(now + 1.9);
    overtone.stop(now + 1.9);
  }
}


// --- 7. ZEN NEBULA SANDBOX PARTICLE ENGINE & AFFIRMATIONS CONTROLLER ---

let sandboxCanvas = null;
let sandboxCtx = null;
let sandboxActive = false;
let sandboxParticles = [];
let sandboxAffirmations = [];
let lastMousePos = { x: 0, y: 0 };
let isMouseDown = false;
let mouseVelocity = 0;
let sandboxFrameId = null;
let chimeTriggerTimeout = null;

// Harmonic Pentatonic Scale
const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

const mindfulnessAffirmations = [
  "Stillness", "Let it drift", "You are safe", "Only this breath", 
  "Drop your weight", "Soft heart", "No struggle", "Let go", 
  "Space to breathe", "Quiet mind", "Anchor yourself", "Flow"
];

class NebulaParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() * 2 - 1) * 0.8;
    this.vy = (Math.random() * 2 - 1) * 0.8 - 0.5; // drift upward
    this.size = Math.random() * 12 + 6;
    this.maxLife = 120 + Math.random() * 80;
    this.life = this.maxLife;
    this.color = color;
  }
  
  update() {
    // If mouse is down, apply a swirling vortex gravitational pull towards anchor
    if (isMouseDown) {
      const dx = lastMousePos.x - this.x;
      const dy = lastMousePos.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 5) {
        const force = Math.min(2.5 / dist, 0.4);
        
        // Swirl angular velocity vector perpendicular to pull
        const angle = Math.atan2(dy, dx);
        const swirlX = Math.cos(angle + Math.PI / 2) * 1.5;
        const swirlY = Math.sin(angle + Math.PI / 2) * 1.5;
        
        this.vx += (dx / dist) * force + swirlX * 0.08;
        this.vy += (dy / dist) * force + swirlY * 0.08;
      }
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    this.vx *= 0.985;
    this.vy *= 0.985;
    
    this.life--;
  }
  
  draw(ctx) {
    const alpha = (this.life / this.maxLife) * 0.35;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace('ALPHA', alpha);
    
    ctx.shadowBlur = this.size * 1.5;
    ctx.shadowColor = this.color.replace('ALPHA', alpha * 0.5);
    ctx.fill();
    ctx.restore();
  }
}

class EvaporatingAffirmation {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.vx = (Math.random() * 0.4 - 0.2);
    this.vy = -0.45 - Math.random() * 0.4; // float upward slowly
    this.maxLife = 340; // stays visible for ~5.6 seconds
    this.life = this.maxLife;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Deluxe Stardust Dissolution: fragment into real golden particles on death!
    if (this.life === 1 && sandboxActive && sandboxParticles) {
      const particleColor = "hsla(42, 95%, 72%, ALPHA)";
      for (let i = 0; i < 18; i++) {
        const p = new NebulaParticle(this.x + (Math.random() * 60 - 30), this.y + (Math.random() * 16 - 8), particleColor);
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.4 + Math.random() * 1.6;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 0.4; // float upward
        p.size = Math.random() * 6 + 3; // small sparkling gold flecks
        sandboxParticles.push(p);
      }
    }
    
    this.life--;
  }
  
  draw(ctx) {
    const lifeRatio = this.life / this.maxLife;
    
    // Alpha envelope: fade in quickly (first 10% of life), stay solid, fade out slowly at the end
    let alpha = 0.85;
    if (lifeRatio > 0.9) {
      alpha = ((1.0 - lifeRatio) / 0.1) * 0.85;
    } else if (lifeRatio < 0.3) {
      alpha = (lifeRatio / 0.3) * 0.85;
    }
    
    // Blur envelope: completely sharp for the main body of life, only blurring slightly at the end
    let blur = 0;
    if (lifeRatio < 0.3) {
      blur = (1.0 - (lifeRatio / 0.3)) * 4.5;
    } else if (lifeRatio > 0.9) {
      blur = ((lifeRatio - 0.9) / 0.1) * 2.0;
    }
    
    ctx.save();
    // Soft, warm gold typography with Outfit styling
    ctx.font = "italic 400 1.35rem 'Outfit', var(--font-sans), sans-serif";
    ctx.fillStyle = `hsla(42, 95%, 78%, ${alpha})`;
    ctx.textAlign = "center";
    
    if (blur > 0.1) {
      ctx.filter = `blur(${blur}px)`;
    } else {
      ctx.filter = "none";
    }
    
    // Smooth drop shadow to guarantee visual contrast on any colored stardust backdrop
    ctx.shadowColor = "rgba(0, 0, 0, 0.82)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

function startSandboxRoutine() {
  sandboxCanvas = document.getElementById('sandbox-canvas');
  if (!sandboxCanvas) return;
  
  sandboxCtx = sandboxCanvas.getContext('2d');
  sandboxActive = true;
  sandboxParticles = [];
  sandboxAffirmations = [];
  isMouseDown = false;
  
  function resizeCanvas() {
    sandboxCanvas.width = window.innerWidth;
    sandboxCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  if (sandboxSynth) sandboxSynth.start();
  
  const handlePointerMove = (e) => {
    if (!sandboxActive) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - lastMousePos.x;
    const dy = clientY - lastMousePos.y;
    mouseVelocity = Math.sqrt(dx * dx + dy * dy);
    
    // Choose stardust color linked dynamically to active breathing phase Class
    let stardustColor = "hsla(45, 60%, 85%, ALPHA)";
    
    const activeBreathingClass = getActiveBreathingPhase();
    
    if (activeBreathingClass.includes('inhale')) {
      stardustColor = "hsla(18, 90%, 75%, ALPHA)"; // Rose/Amber Inhale
    } else if (activeBreathingClass.includes('hold')) {
      stardustColor = "hsla(42, 95%, 72%, ALPHA)"; // Sunbeam Gold Hold
    } else if (activeBreathingClass.includes('exhale')) {
      stardustColor = "hsla(108, 25%, 68%, ALPHA)"; // Sage/Forest Exhale
    } else {
      stardustColor = "hsla(210, 45%, 70%, ALPHA)"; // Cosmic Blue Rest
    }
    
    const spawnCount = isMouseDown ? 4 : 2;
    for (let i = 0; i < spawnCount; i++) {
      sandboxParticles.push(new NebulaParticle(clientX, clientY, stardustColor));
    }
    
    if (mouseVelocity > 6 && !chimeTriggerTimeout) {
      const normY = 1.0 - (clientY / window.innerHeight);
      const noteIdx = Math.min(Math.floor(normY * pentatonicScale.length), pentatonicScale.length - 1);
      const noteFreq = pentatonicScale[noteIdx];
      
      const intensity = Math.min(mouseVelocity / 45, 1.0);
      
      if (sandboxSynth) {
        sandboxSynth.trigger(noteFreq, intensity);
      }
      
      chimeTriggerTimeout = setTimeout(() => {
        chimeTriggerTimeout = null;
      }, 180);
    }
    
    if (Math.random() < 0.0075) {
      const randomText = mindfulnessAffirmations[Math.floor(Math.random() * mindfulnessAffirmations.length)];
      sandboxAffirmations.push(new EvaporatingAffirmation(clientX, clientY - 15, randomText));
    }
    
    lastMousePos = { x: clientX, y: clientY };
    
    const tip = document.getElementById('sandbox-tip-label');
    if (tip && tip.textContent.includes('Drag')) {
      tip.textContent = isMouseDown ? "Swirling Nebula Vortex Mode Active" : "Stardust drawing initialized";
      tip.className = "text-center text-[10px] text-emerald-400/50 tracking-widest uppercase mb-4 pointer-events-none z-10 select-none animate-pulse";
    }
  };
  
  const handlePointerDown = (e) => {
    isMouseDown = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastMousePos = { x: clientX, y: clientY };
    
    const tip = document.getElementById('sandbox-tip-label');
    if (tip) {
      tip.textContent = "Swirling Nebula Vortex Mode Active";
      tip.className = "text-center text-[10px] text-amber-400/70 tracking-widest uppercase mb-4 pointer-events-none z-10 select-none animate-pulse";
    }
    
    if (sandboxSynth) {
      sandboxSynth.trigger(pentatonicScale[0], 0.8);
      setTimeout(() => sandboxSynth.trigger(pentatonicScale[2], 0.6), 80);
      setTimeout(() => sandboxSynth.trigger(pentatonicScale[4], 0.5), 160);
    }
  };
  
  const handlePointerUp = () => {
    if (!isMouseDown) return;
    isMouseDown = false;
    
    const tip = document.getElementById('sandbox-tip-label');
    if (tip) {
      tip.textContent = "Stardust drawing initialized";
      tip.className = "text-center text-[10px] text-emerald-400/50 tracking-widest uppercase mb-4 pointer-events-none z-10 select-none";
    }
    
    if (sandboxSynth) {
      sandboxSynth.trigger(pentatonicScale[3], 0.45);
      setTimeout(() => sandboxSynth.trigger(pentatonicScale[1], 0.45), 60);
      setTimeout(() => sandboxSynth.trigger(pentatonicScale[5], 0.55), 120);
    }
  };
  
  sandboxCanvas.addEventListener('mousemove', handlePointerMove);
  sandboxCanvas.addEventListener('touchmove', handlePointerMove, { passive: true });
  
  sandboxCanvas.addEventListener('mousedown', handlePointerDown);
  sandboxCanvas.addEventListener('touchstart', handlePointerDown, { passive: true });
  
  window.addEventListener('mouseup', handlePointerUp);
  window.addEventListener('touchend', handlePointerUp);
  
  function renderFrame() {
    if (!sandboxActive) return;
    
    sandboxCtx.fillStyle = 'rgba(5, 6, 8, 0.12)';
    sandboxCtx.fillRect(0, 0, sandboxCanvas.width, sandboxCanvas.height);
    
    sandboxParticles = sandboxParticles.filter(p => p.life > 0);
    sandboxParticles.forEach(p => {
      p.update();
      p.draw(sandboxCtx);
    });
    
    sandboxAffirmations = sandboxAffirmations.filter(w => w.life > 0);
    sandboxAffirmations.forEach(w => {
      w.update();
      w.draw(sandboxCtx);
    });
    
    sandboxFrameId = requestAnimationFrame(renderFrame);
  }
  
  renderFrame();
}

// ==================== VIP SANCTUARY ELITE EXCLUSIVE ENGINE ====================

let currentVipTab = 'fireplace';
let fireplaceActive = false;
let fireplaceFrameId = null;
let fireplaceParticles = [];
let stressEmbers = [];
let stressWordObj = null;

let auroraActive = false;
let auroraFrameId = null;
let auroraLines = [];
let auroraSynth = null;

let rainmakerActive = false;
let rainmakerSources = {};

// 1. DYNAMIC LIFECYCLE CONTROLLERS
function startVipLoungeRoutine() {
  initAudioContext();
  switchVipTab('fireplace'); // Default to fireplace Hearth tab!
  
  // Listen for Escape key to exit seamlessly
  window.addEventListener('keydown', handleVipEscapeKey);
}

function handleVipEscapeKey(e) {
  if (e.key === 'Escape') {
    exitFullScreenPause();
  }
}

function stopVipLoungeRoutine() {
  window.removeEventListener('keydown', handleVipEscapeKey);
  
  fireplaceActive = false;
  cancelAnimationFrame(fireplaceFrameId);
  
  auroraActive = false;
  cancelAnimationFrame(auroraFrameId);
  if (auroraSynth) {
    auroraSynth.stop();
    auroraSynth = null;
  }
  
  rainmakerActive = false;
  stopRainmakerSynth();
}

function switchVipTab(tab) {
  // Stop previous tab components
  if (currentVipTab === 'fireplace') {
    fireplaceActive = false;
    cancelAnimationFrame(fireplaceFrameId);
  } else if (currentVipTab === 'aurora') {
    auroraActive = false;
    cancelAnimationFrame(auroraFrameId);
    if (auroraSynth) auroraSynth.stop();
  } else if (currentVipTab === 'rainmaker') {
    rainmakerActive = false;
    stopRainmakerSynth();
  }
  
  // Clear tabs highlighting
  ['fireplace', 'aurora', 'rainmaker'].forEach(t => {
    const btn = document.getElementById(`vip-tab-${t}`);
    const mod = document.getElementById(`vip-module-${t}`);
    if (btn) btn.classList.remove('vip-tab-active');
    if (mod) mod.style.display = 'none';
  });
  
  // Launch selected tab
  currentVipTab = tab;
  const activeBtn = document.getElementById(`vip-tab-${tab}`);
  const activeMod = document.getElementById(`vip-module-${tab}`);
  if (activeBtn) activeBtn.classList.add('vip-tab-active');
  if (activeMod) activeMod.style.display = 'flex';
  
  initAudioContext();
  playChime();
  
  if (tab === 'fireplace') {
    startVipFireplace();
  } else if (tab === 'aurora') {
    startVipAurora();
  } else if (tab === 'rainmaker') {
    rainmakerActive = true;
    startRainmakerSynth();
    setupRainmakerDragEvents();
  }
}

// 2. 🔥 RESONANCE HEARTH ENGINE (FIREPLACE PARTICLES)
class FireplaceParticle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }
  
  reset() {
    this.x = this.canvas.width / 2 + (Math.random() * 90 - 45);
    this.y = this.canvas.height * 0.8 + (Math.random() * 20 - 10);
    this.size = Math.random() * 32 + 12;
    this.life = 1.0;
    this.decay = 0.010 + Math.random() * 0.014;
    this.vx = (Math.random() * 1.8 - 0.9);
    this.vy = -1.8 - Math.random() * 2.8;
    
    const rand = Math.random();
    if (rand < 0.4) {
      this.color = 'rgba(245, 158, 11, ALPHA)';  // Glow Amber
    } else if (rand < 0.75) {
      this.color = 'rgba(251, 191, 36, ALPHA)';  // Glow Gold
    } else {
      this.color = 'rgba(239, 68, 68, ALPHA)';    // Warm Red
    }
  }
  
  update(breathingPhase) {
    let speedMult = 1.0;
    let sizeMult = 1.0;
    
    if (breathingPhase.includes('inhale')) {
      speedMult = 1.4;
      sizeMult = 1.3;
    } else if (breathingPhase.includes('hold')) {
      speedMult = 1.2;
      sizeMult = 1.35;
    } else if (breathingPhase.includes('exhale')) {
      speedMult = 0.75;
      sizeMult = 0.85;
    }
    
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;
    this.size *= 0.975;
    this.life -= this.decay;
    
    if (this.life <= 0 || this.size < 1) {
      this.reset();
    }
  }
  
  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace('ALPHA', this.life * 0.3);
    ctx.filter = "blur(6px)";
    ctx.fill();
    ctx.restore();
  }
}

class StressEmber {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() * 5 - 2.5);
    this.vy = -2.5 - Math.random() * 5.5;
    this.size = Math.random() * 5 + 2;
    this.life = 1.0;
    this.decay = 0.007 + Math.random() * 0.010;
    this.color = `hsla(${Math.random() * 30 + 35}, 95%, 72%, ALPHA)`; // glowing gold/amber sparks
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.06; // subtle ash gravity
    this.vx *= 0.985;
    this.size *= 0.985;
    this.life -= this.decay;
  }
  
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace('ALPHA', this.life);
    ctx.fill();
  }
}

class StressWord {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.life = 1.0;
    this.burning = false;
    this.burnDelay = 60; // 1 second shake before combusting
    this.shake = 0;
  }
  
  update() {
    if (!this.burning) {
      this.burnDelay--;
      this.shake = Math.sin(Date.now() * 0.1) * 3.5;
      if (this.burnDelay <= 0) {
        this.burning = true;
        // Trigger combustion synth sweep
        if (chimeSynth) chimeSynth.trigger();
        if (sandboxSynth) {
          sandboxSynth.trigger(130.81, 0.9); // Deep ground C3 chord
          setTimeout(() => sandboxSynth.trigger(196.00, 0.7), 80);
        }
      }
    } else {
      this.shake = 0;
      this.y -= 1.4;
      this.life -= 0.012; // burn slowly
    }
  }
  
  draw(ctx) {
    const alpha = this.life;
    ctx.save();
    ctx.font = "italic 500 1.95rem 'Outfit', var(--font-sans), sans-serif";
    ctx.textAlign = 'center';
    
    if (!this.burning) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(this.text, this.x + this.shake, this.y);
    } else {
      ctx.fillStyle = `hsla(35, 95%, 60%, ${alpha})`;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
      ctx.shadowBlur = 20;
      ctx.filter = `blur(${(1.0 - alpha) * 15}px)`;
      ctx.fillText(this.text, this.x, this.y);
    }
    ctx.restore();
  }
}

function startVipFireplace() {
  const canvas = document.getElementById('fireplace-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  fireplaceActive = true;
  fireplaceParticles = [];
  stressEmbers = [];
  stressWordObj = null;
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  
  // Seed particles
  for (let i = 0; i < 45; i++) {
    fireplaceParticles.push(new FireplaceParticle(canvas));
  }
  
  function loop() {
    if (!fireplaceActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const breathingPhase = getActiveBreathingPhase();
    
    // Draw fire
    fireplaceParticles.forEach(p => {
      p.update(breathingPhase);
      p.draw(ctx);
    });
    
    // Draw combusting stressor word
    if (stressWordObj) {
      stressWordObj.update();
      stressWordObj.draw(ctx);
      
      if (stressWordObj.burning && Math.random() < 0.35) {
        for (let j = 0; j < 5; j++) {
          stressEmbers.push(new StressEmber(stressWordObj.x + (Math.random() * 100 - 50), stressWordObj.y));
        }
      }
      
      if (stressWordObj.life <= 0) {
        stressWordObj = null;
      }
    }
    
    // Draw embers
    stressEmbers = stressEmbers.filter(e => e.life > 0);
    stressEmbers.forEach(e => {
      e.update();
      e.draw(ctx);
    });
    
    fireplaceFrameId = requestAnimationFrame(loop);
  }
  
  loop();
}

function burnStressWord() {
  const input = document.getElementById('stress-input');
  if (!input) return;
  
  const text = input.value.trim();
  if (text.length < 2) return;
  
  const canvas = document.getElementById('fireplace-canvas');
  if (!canvas) return;
  
  stressWordObj = new StressWord(canvas.width / 2, canvas.height * 0.5, text);
  input.value = '';
  
  // Spawn ash shower
  for (let i = 0; i < 20; i++) {
    stressEmbers.push(new StressEmber(canvas.width / 2 + (Math.random() * 80 - 40), canvas.height * 0.5));
  }
}

// 3. 🌊 LIQUID AURORA ORGAN ENGINE
class AuroraLine {
  constructor(x, y, color) {
    this.points = [{ x, y }];
    this.color = color;
    this.maxPoints = 40;
    this.life = 1.0;
    this.decay = 0.005;
  }
  
  addPoint(x, y) {
    this.points.push({ x, y });
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }
  
  update() {
    this.life -= this.decay;
    this.points.forEach(p => {
      p.x += Math.sin(Date.now() * 0.001 + p.y * 0.01) * 0.28;
      p.y -= 0.2; // float slowly upward
    });
  }
  
  draw(ctx) {
    if (this.points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      const xc = (this.points[i].x + this.points[i-1].x) / 2;
      const yc = (this.points[i].y + this.points[i-1].y) / 2;
      ctx.quadraticCurveTo(this.points[i-1].x, this.points[i-1].y, xc, yc);
    }
    
    ctx.strokeStyle = this.color.replace('ALPHA', this.life * 0.22);
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.filter = 'blur(15px)';
    ctx.stroke();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.filter = 'blur(1px)';
    ctx.stroke();
    
    ctx.restore();
  }
}

class LiquidAuroraSynth {
  constructor(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    this.output.connect(ctx.destination);
    
    this.active = false;
    this.oscillators = [];
    this.filters = [];
    this.gainNodes = [];
    this.panners = [];
    
    this.chords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [164.81, 196.00, 246.94, 293.66], // Em7
      [174.61, 220.00, 261.63, 329.63]  // Fmaj7
    ];
    this.currentChordIdx = 0;
  }
  
  start() {
    this.active = true;
    this.output.gain.linearRampToValueAtTime(0.48, this.ctx.currentTime + 1.5);
    this.initSynth();
    this.chordInterval = setInterval(() => this.evolveChord(), 6000);
  }
  
  initSynth() {
    const now = this.ctx.currentTime;
    const chord = this.chords[this.currentChordIdx];
    
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(chord[i], now);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);
      filter.Q.setValueAtTime(2.2, now);
      
      gain.gain.setValueAtTime(0.05, now);
      
      osc.connect(filter);
      filter.connect(gain);
      
      if (panner) {
        panner.pan.setValueAtTime((i % 2 === 0 ? -0.55 : 0.55), now);
        gain.connect(panner);
        panner.connect(this.output);
        this.panners.push(panner);
      } else {
        gain.connect(this.output);
      }
      
      osc.start(now);
      this.oscillators.push(osc);
      this.filters.push(filter);
      this.gainNodes.push(gain);
    }
  }
  
  evolveChord() {
    if (!this.active) return;
    this.currentChordIdx = (this.currentChordIdx + 1) % this.chords.length;
    const chord = this.chords[this.currentChordIdx];
    const now = this.ctx.currentTime;
    
    this.oscillators.forEach((osc, i) => {
      osc.frequency.exponentialRampToValueAtTime(chord[i], now + 2.8); // beautiful slides
    });
  }
  
  updateParams(xRatio, yRatio, velocity) {
    const now = this.ctx.currentTime;
    
    const pan = (xRatio * 2) - 1.0;
    this.panners.forEach(p => {
      p.pan.linearRampToValueAtTime(pan, now + 0.15);
    });
    
    const filterCutoff = 180 + (1.0 - yRatio) * 1750;
    this.filters.forEach(f => {
      f.frequency.setTargetAtTime(filterCutoff, now, 0.15);
    });
    
    const vol = Math.min(0.04 + velocity * 0.005, 0.12);
    this.gainNodes.forEach(g => {
      g.gain.linearRampToValueAtTime(vol, now + 0.15);
    });
  }
  
  stop() {
    this.active = false;
    clearInterval(this.chordInterval);
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.2);
    
    setTimeout(() => {
      this.oscillators.forEach(osc => osc.stop());
      this.oscillators = [];
      this.filters = [];
      this.gainNodes = [];
      this.panners = [];
    }, 1500);
  }
}

function startVipAurora() {
  const canvas = document.getElementById('aurora-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  auroraActive = true;
  auroraLines = [];
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  
  if (!auroraSynth) {
    auroraSynth = new LiquidAuroraSynth(audioCtx);
  }
  auroraSynth.start();
  
  let drawing = false;
  let activeLine = null;
  let localLastMouse = { x: canvas.width / 2, y: canvas.height / 2 };
  
  const handlePointerDown = (e) => {
    drawing = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const phase = getActiveBreathingPhase();
    let col = 'rgba(52, 211, 153, ALPHA)';
    
    if (phase.includes('inhale')) {
      col = 'rgba(248, 113, 113, ALPHA)';
    } else if (phase.includes('hold')) {
      col = 'rgba(251, 191, 36, ALPHA)';
    } else if (phase.includes('exhale')) {
      col = 'rgba(96, 165, 250, ALPHA)';
    }
    
    activeLine = new AuroraLine(clientX, clientY, col);
    auroraLines.push(activeLine);
    localLastMouse = { x: clientX, y: clientY };
  };
  
  const handlePointerMove = (e) => {
    if (!drawing || !activeLine) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    activeLine.addPoint(clientX, clientY);
    
    const xRatio = clientX / window.innerWidth;
    const yRatio = clientY / window.innerHeight;
    
    const dx = clientX - localLastMouse.x;
    const dy = clientY - localLastMouse.y;
    const vel = Math.sqrt(dx * dx + dy * dy);
    
    if (auroraSynth) {
      auroraSynth.updateParams(xRatio, yRatio, vel);
    }
    
    localLastMouse = { x: clientX, y: clientY };
  };
  
  const handlePointerUp = () => {
    drawing = false;
    activeLine = null;
  };
  
  canvas.onmousedown = handlePointerDown;
  canvas.onmousemove = handlePointerMove;
  window.addEventListener('mouseup', handlePointerUp);
  
  canvas.ontouchstart = handlePointerDown;
  canvas.ontouchmove = handlePointerMove;
  window.addEventListener('touchend', handlePointerUp);
  
  function loop() {
    if (!auroraActive) return;
    
    ctx.fillStyle = 'rgba(2, 3, 5, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    auroraLines = auroraLines.filter(l => l.life > 0);
    auroraLines.forEach(l => {
      l.update();
      l.draw(ctx);
    });
    
    auroraFrameId = requestAnimationFrame(loop);
  }
  
  loop();
}

// 4. 🌧️ BINAURAL RAINMAKER SANCTUARY ENGINE
class RainmakerSoundSource {
  constructor(ctx, type) {
    this.ctx = ctx;
    this.type = type;
    
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    
    this.filter = ctx.createBiquadFilter();
    this.panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    
    this.filter.connect(this.output);
    
    if (this.panner) {
      this.output.connect(this.panner);
      this.panner.connect(ctx.destination);
    } else {
      this.output.connect(ctx.destination);
    }
    
    this.initSound();
  }
  
  initSound() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (this.type === 'leaves') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      } else {
        data[i] = white;
      }
    }
    
    this.source = this.ctx.createBufferSource();
    this.source.buffer = noiseBuffer;
    this.source.loop = true;
    
    if (this.type === 'rain') {
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(1100, this.ctx.currentTime);
      this.volumeBase = 0.18;
    } else if (this.type === 'waves') {
      this.filter.type = 'bandpass';
      this.filter.frequency.setValueAtTime(250, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.0, this.ctx.currentTime);
      this.volumeBase = 0.22;
      
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
      
      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.output.gain);
      this.lfo.start(0);
    } else if (this.type === 'leaves') {
      this.filter.type = 'bandpass';
      this.filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(0.6, this.ctx.currentTime);
      this.volumeBase = 0.12;
      
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
      
      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(400, this.ctx.currentTime);
      
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.filter.frequency);
      this.lfo.start(0);
    }
    
    this.source.connect(this.filter);
    this.source.start(0);
  }
  
  updateParams(xRatio, yRatio) {
    const now = this.ctx.currentTime;
    
    const pan = (xRatio * 2) - 1.0;
    if (this.panner) {
      this.panner.pan.linearRampToValueAtTime(pan, now + 0.1);
    }
    
    const vol = (1.0 - yRatio) * this.volumeBase;
    if (this.type === 'waves') {
      this.lfoGain.gain.linearRampToValueAtTime(vol * 0.8, now + 0.1);
    } else {
      this.output.gain.linearRampToValueAtTime(vol, now + 0.1);
    }
    
    const cutoff = 250 + (1.0 - yRatio) * 2200;
    if (this.type !== 'waves') {
      this.filter.frequency.linearRampToValueAtTime(cutoff, now + 0.1);
    }
    
    // React waveforms & thunder
    const soundType = this.type === 'leaves' ? 'leaves' : this.type;
    updateNodeWaveform(soundType, 1.0 - yRatio);
    
    if (this.type === 'rain') {
      if (yRatio < 0.25) {
        manageThunderstormLoop(true);
      } else {
        manageThunderstormLoop(false);
      }
    }
  }
  
  stop() {
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
    setTimeout(() => {
      try { this.source.stop(); } catch(e){}
      if (this.lfo) {
        try { this.lfo.stop(); } catch(e){}
      }
    }, 1100);
  }
}

class ChimesSoundSource {
  constructor(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(0.0, ctx.currentTime);
    
    this.panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (this.panner) {
      this.output.connect(this.panner);
      this.panner.connect(ctx.destination);
    } else {
      this.output.connect(ctx.destination);
    }
    
    this.active = false;
    this.timer = null;
    this.volumeBase = 0.35;
  }
  
  start() {
    this.active = true;
    this.output.gain.linearRampToValueAtTime(this.volumeBase, this.ctx.currentTime + 1.0);
    this.scheduleNextChime();
  }
  
  scheduleNextChime() {
    if (!this.active) return;
    const delay = 1500 + Math.random() * 3500;
    this.timer = setTimeout(() => {
      if (this.active) {
        this.triggerChime();
        this.scheduleNextChime();
      }
    }, delay);
  }
  
  triggerChime() {
    const now = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    
    osc.connect(gain);
    gain.connect(this.output);
    
    osc.start(now);
    osc.stop(now + 2.3);
    
    // Trigger chimes visual ripples!
    if (rainmakerActive) {
      spawnNodeRipple('chimes');
    }
  }
  
  updateParams(xRatio, yRatio) {
    const now = this.ctx.currentTime;
    const pan = (xRatio * 2) - 1.0;
    if (this.panner) {
      this.panner.pan.linearRampToValueAtTime(pan, now + 0.1);
    }
    
    const vol = (1.0 - yRatio) * this.volumeBase;
    this.output.gain.linearRampToValueAtTime(vol, now + 0.1);
    
    updateNodeWaveform('chimes', 1.0 - yRatio);
  }
  
  stop() {
    this.active = false;
    clearTimeout(this.timer);
    this.output.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
  }
}

function startRainmakerSynth() {
  initAudioContext();
  rainmakerSources.rain = new RainmakerSoundSource(audioCtx, 'rain');
  rainmakerSources.waves = new RainmakerSoundSource(audioCtx, 'waves');
  rainmakerSources.leaves = new RainmakerSoundSource(audioCtx, 'leaves');
  rainmakerSources.chimes = new ChimesSoundSource(audioCtx);
  
  rainmakerSources.rain.output.gain.setValueAtTime(0.05, audioCtx.currentTime);
  rainmakerSources.waves.output.gain.setValueAtTime(0.08, audioCtx.currentTime);
  rainmakerSources.leaves.output.gain.setValueAtTime(0.03, audioCtx.currentTime);
  rainmakerSources.chimes.start();
  
  // Update node waveform scales initially
  updateRainmakerSourceParam('rain');
  updateRainmakerSourceParam('waves');
  updateRainmakerSourceParam('leaves');
  updateRainmakerSourceParam('chimes');
  
  // Highlight active preset button as custom initially
  triggerRainmakerPreset('custom');
  
  // Launch periodic volume ripples
  startRainmakerRipples();
}

function stopRainmakerSynth() {
  // Clear any slide easing
  clearInterval(presetEasingInterval);
  
  // Stop ripples & thunder loops
  stopRainmakerRipples();
  manageThunderstormLoop(false);
  
  if (rainmakerSources.rain) rainmakerSources.rain.stop();
  if (rainmakerSources.waves) rainmakerSources.waves.stop();
  if (rainmakerSources.leaves) rainmakerSources.leaves.stop();
  if (rainmakerSources.chimes) rainmakerSources.chimes.stop();
  rainmakerSources = {};
}

function setupRainmakerDragEvents() {
  const nodes = document.querySelectorAll('.rainmaker-node');
  const grid = document.getElementById('rainmaker-grid');
  
  nodes.forEach(node => {
    let activeDrag = false;
    let initialX, initialY;
    let currentX, currentY;
    let xOffset = 0;
    let yOffset = 0;
    
    // Get start positions
    const getPositions = () => {
      const rect = grid.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      xOffset = nodeRect.left + nodeRect.width / 2 - rect.left;
      yOffset = nodeRect.top + nodeRect.height / 2 - rect.top;
    };
    
    getPositions();
    window.addEventListener('resize', getPositions);
    
    const dragStart = (e) => {
      e.preventDefault();
      clearInterval(presetEasingInterval);
      triggerRainmakerPreset('custom');
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      getPositions();
      initialX = clientX - xOffset;
      initialY = clientY - yOffset;
      
      if (e.target === node || node.contains(e.target)) {
        activeDrag = true;
      }
    };
    
    const dragEnd = () => {
      activeDrag = false;
    };
    
    const dragMove = (e) => {
      if (!activeDrag) return;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      currentX = clientX - initialX;
      currentY = clientY - initialY;
      
      const boundRect = grid.getBoundingClientRect();
      
      xOffset = Math.max(15, Math.min(currentX, boundRect.width - 15));
      yOffset = Math.max(15, Math.min(currentY, boundRect.height - 15));
      
      node.style.left = `${xOffset}px`;
      node.style.top = `${yOffset}px`;
      
      const soundType = node.getAttribute('data-sound');
      updateRainmakerSourceParam(soundType);
    };
    
    node.onmousedown = dragStart;
    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('mousemove', dragMove);
    
    node.ontouchstart = dragStart;
    window.addEventListener('touchend', dragEnd);
    window.addEventListener('touchmove', dragMove, { passive: false });
  });
}

function updateRainmakerSourceParam(soundType) {
  const elementId = soundType === 'leaves' ? 'node-leaves' : soundType === 'waves' ? 'node-waves' : soundType === 'chimes' ? 'node-chimes' : 'node-rain';
  const node = document.getElementById(elementId);
  const grid = document.getElementById('rainmaker-grid');
  if (!node || !grid || !rainmakerSources[soundType]) return;
  
  const nodeRect = node.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  
  const relX = (nodeRect.left + nodeRect.width / 2 - gridRect.left) / gridRect.width;
  const relY = (nodeRect.top + nodeRect.height / 2 - gridRect.top) / gridRect.height;
  
  const clampedX = Math.max(0.0, Math.min(relX, 1.0));
  const clampedY = Math.max(0.0, Math.min(relY, 1.0));
  
  rainmakerSources[soundType].updateParams(clampedX, clampedY);
}

// 5. AUTO Presets slider autopilot (horizon moods)
function triggerRainmakerPreset(presetType) {
  ['storm', 'forest', 'shore', 'custom'].forEach(p => {
    const btn = document.getElementById(`preset-${p}`);
    if (btn) {
      if (p === presetType) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  
  if (presetType === 'custom') {
    return;
  }
  
  const targets = {
    storm: {
      rain: { x: 0.25, y: 0.1 },
      waves: { x: 0.75, y: 0.8 },
      leaves: { x: 0.65, y: 0.2 },
      chimes: { x: 0.35, y: 0.85 }
    },
    forest: {
      rain: { x: 0.15, y: 0.85 },
      waves: { x: 0.85, y: 0.85 },
      leaves: { x: 0.45, y: 0.12 },
      chimes: { x: 0.3, y: 0.25 }
    },
    shore: {
      rain: { x: 0.15, y: 0.85 },
      waves: { x: 0.5, y: 0.2 },
      leaves: { x: 0.75, y: 0.35 },
      chimes: { x: 0.65, y: 0.8 }
    }
  };
  
  const preset = targets[presetType];
  const grid = document.getElementById('rainmaker-grid');
  if (!grid) return;
  const gridRect = grid.getBoundingClientRect();
  
  const starts = {};
  const soundTypes = ['rain', 'waves', 'leaves', 'chimes'];
  
  soundTypes.forEach(type => {
    const elementId = type === 'leaves' ? 'node-leaves' : type === 'waves' ? 'node-waves' : type === 'chimes' ? 'node-chimes' : 'node-rain';
    const node = document.getElementById(elementId);
    starts[type] = {
      x: node.offsetLeft || (gridRect.width / 2),
      y: node.offsetTop || (gridRect.height / 2)
    };
  });
  
  let frame = 0;
  const totalFrames = 120; // 2 seconds easing
  
  clearInterval(presetEasingInterval);
  
  presetEasingInterval = setInterval(() => {
    frame++;
    const ratio = frame / totalFrames;
    const ease = 1 - Math.pow(1 - ratio, 3); // ease out cubic
    
    soundTypes.forEach(type => {
      const elementId = type === 'leaves' ? 'node-leaves' : type === 'waves' ? 'node-waves' : type === 'chimes' ? 'node-chimes' : 'node-rain';
      const node = document.getElementById(elementId);
      if (!node) return;
      
      const targetX = preset[type].x * gridRect.width;
      const targetY = preset[type].y * gridRect.height;
      
      const curX = starts[type].x + (targetX - starts[type].x) * ease;
      const curY = starts[type].y + (targetY - starts[type].y) * ease;
      
      node.style.left = `${curX}px`;
      node.style.top = `${curY}px`;
      
      updateRainmakerSourceParam(type);
    });
    
    if (frame >= totalFrames) {
      clearInterval(presetEasingInterval);
    }
  }, 16);
}

// ==================== BINAURAL RAINMAKER SENSORY UPGRADES ====================
let rippleTimers = [];
let thunderTimer = null;
let thunderActive = false;
let presetEasingInterval = null;

// Visual pulsing concentric sound rings
function spawnNodeRipple(soundType) {
  const grid = document.getElementById('rainmaker-grid');
  const elementId = soundType === 'leaves' ? 'node-leaves' : soundType === 'waves' ? 'node-waves' : soundType === 'chimes' ? 'node-chimes' : 'node-rain';
  const node = document.getElementById(elementId);
  if (!grid || !node || !rainmakerActive) return;
  
  const nodeRect = node.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  
  const x = nodeRect.left + nodeRect.width / 2 - gridRect.left;
  const y = nodeRect.top + nodeRect.height / 2 - gridRect.top;
  
  const relY = y / gridRect.height;
  const volumeScale = 1.0 - relY;
  
  if (volumeScale < 0.05) return; // silent, no ripple
  
  const ripple = document.createElement('div');
  ripple.className = 'sound-ripple-ring';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  
  const colors = {
    rain: 'rgba(34, 211, 238, 0.3)',
    waves: 'rgba(52, 211, 153, 0.3)',
    leaves: 'rgba(251, 191, 36, 0.3)',
    chimes: 'rgba(244, 114, 182, 0.3)'
  };
  
  ripple.style.setProperty('--ripple-glow', colors[soundType]);
  
  const maxSizes = {
    rain: 80 + volumeScale * 140,
    waves: 90 + volumeScale * 160,
    leaves: 70 + volumeScale * 110,
    chimes: 100 + volumeScale * 150
  };
  ripple.style.setProperty('--max-ripple-size', `${maxSizes[soundType]}px`);
  
  grid.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 2500);
}

function startRainmakerRipples() {
  stopRainmakerRipples();
  rippleTimers.push(setInterval(() => spawnNodeRipple('rain'), 1500));
  rippleTimers.push(setInterval(() => spawnNodeRipple('leaves'), 1800));
  rippleTimers.push(setInterval(() => spawnNodeRipple('waves'), 2200));
}

function stopRainmakerRipples() {
  rippleTimers.forEach(clearInterval);
  rippleTimers = [];
}

// Procedural Storm Lightning overlay & Thunder rumble
function triggerProceduralThunder() {
  if (!rainmakerActive || !thunderActive || !audioCtx) return;
  
  const now = audioCtx.currentTime;
  const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
  const gainNode = audioCtx.createGain();
  const filterNode = audioCtx.createBiquadFilter();
  
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(32 + Math.random() * 12, now);
  
  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(65, now);
  filterNode.Q.setValueAtTime(3.0, now);
  
  gainNode.gain.setValueAtTime(0.0, now);
  gainNode.gain.linearRampToValueAtTime(0.08, now + 0.8);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
  
  osc.frequency.linearRampToValueAtTime(20 + Math.random() * 8, now + 3.0);
  
  osc.connect(filterNode);
  filterNode.connect(gainNode);
  
  if (panner) {
    panner.pan.setValueAtTime(Math.random() * 2 - 1.0, now);
    gainNode.connect(panner);
    panner.connect(audioCtx.destination);
  } else {
    gainNode.connect(audioCtx.destination);
  }
  
  osc.start(now);
  osc.stop(now + 4.5);
  
  triggerVisualLightning();
}

function triggerVisualLightning() {
  const flashEl = document.getElementById('lightning-flash');
  if (!flashEl) return;
  
  flashEl.classList.add('flash');
  setTimeout(() => {
    flashEl.classList.remove('flash');
    setTimeout(() => {
      if (Math.random() < 0.7) {
        flashEl.classList.add('flash');
        setTimeout(() => {
          flashEl.classList.remove('flash');
        }, 60);
      }
    }, 80);
  }, 90);
}

function manageThunderstormLoop(enable) {
  if (enable) {
    if (thunderActive) return;
    thunderActive = true;
    
    const scheduleThunder = () => {
      if (!thunderActive) return;
      const delay = 14000 + Math.random() * 16000;
      thunderTimer = setTimeout(() => {
        if (thunderActive) {
          triggerProceduralThunder();
          scheduleThunder();
        }
      }, delay);
    };
    
    // Initial delay
    setTimeout(() => {
      if (thunderActive) {
        triggerProceduralThunder();
        scheduleThunder();
      }
    }, 3000);
  } else {
    thunderActive = false;
    clearTimeout(thunderTimer);
  }
}

// Active waveform updates inside node divs
function updateNodeWaveform(soundType, volumeScale) {
  for (let i = 1; i <= 3; i++) {
    const bar = document.getElementById(`bar-${soundType}-${i}`);
    if (bar) {
      bar.style.setProperty('--wave-height', `${Math.max(0.1, volumeScale * 1.35)}`);
      if (volumeScale < 0.05) {
        bar.style.animation = 'none';
        bar.style.transform = 'scaleY(0.1)';
      } else {
        bar.style.animation = '';
      }
    }
  }
}

// ==================== DIGITAL AURA TUNER ENGINE ====================

let auraActive = false;
let auraCanvas = null;
let auraCtx = null;
let auraAnimFrameId = null;
let auraParticles = [];
let auraStardust = [];
let auraEnergy = 0;
let lastKeystrokeTime = 0;
let auraTheme = 'cosmic'; // 'cosmic', 'solar', 'forest', 'abyssal'
let auraScale = 'zen';    // 'zen', 'cosmic', 'solfeggio', 'abyssal'
let auraShockwaves = [];

// Audio variables
let auraSynths = {};
let auraPanners = {};
let auraMasterPanner = null;
let auraFilter = null;
let auraDelay = null;
let auraReverb = null;
let auraAudioActive = false;

// Webcam video variables
let cameraActive = false;
let auraStream = null;
let auraPixelInterval = null;
let auraPrevPixels = null;

// Microphone voice variables
let micActive = false;
let auraMicStream = null;
let auraAudioAnalyser = null;
let auraMicSource = null;
let auraSpeechLevel = 0;

// Biometrics state
let auraExpression = 'neutral'; // 'neutral' or 'smile'
let auraAutoPhase = 0;
let auraAutoInterval = null;
let auraActiveKeys = {};

// Color interpolation variables (for particles HSL)
let currentHueStart = 180; // Cyan
let currentHueEnd = 280;   // Magenta
let targetHueStart = 180;
let targetHueEnd = 280;

// Dynamic scaling variables
let currentFilterFreq = 750;
let targetFilterFreq = 750;
let currentDelayWet = 0.15;
let targetDelayWet = 0.15;

const auraScaleChords = {
  zen: {
    'KeyA': ['C3', 'E3', 'G3', 'B3', 'D4'], // Cmaj7
    'KeyS': ['A2', 'C3', 'E3', 'G3', 'B3'], // Am9
    'KeyD': ['F2', 'A3', 'C3', 'E3', 'G3'], // Fmaj7
    'KeyF': ['G2', 'B2', 'D3', 'A3', 'B3']  // Gadd9
  },
  cosmic: {
    'KeyA': ['C3', 'E3', 'G3', 'B3', 'D4', 'F#4'], // Cmaj7#11
    'KeyS': ['D3', 'F#3', 'A3', 'C4', 'E4'],       // D/C or D7
    'KeyD': ['F#2', 'C3', 'E3', 'A3', 'B3'],       // F#min7b5
    'KeyF': ['G2', 'B2', 'D3', 'F#3', 'A3']        // Gmaj7
  },
  solfeggio: {
    'KeyA': ['Ab2', 'Eb3', 'G3', 'C4', 'Eb4'], // Abmaj7 (A=444Hz / Solfeggio vibe)
    'KeyS': ['F2', 'C3', 'Eb3', 'Ab3', 'C4'],  // Fm7
    'KeyD': ['Bb2', 'D3', 'F3', 'Ab3', 'C4'],  // Bb7
    'KeyF': ['Eb2', 'Bb2', 'D3', 'G3', 'Bb3']  // Ebmaj7
  },
  abyssal: {
    'KeyA': ['C2', 'G2', 'Bb2', 'Eb3', 'D4'],  // Cmin9
    'KeyS': ['Ab2', 'Eb3', 'G3', 'C4', 'Eb4'], // Abmaj7
    'KeyD': ['F2', 'C3', 'Eb3', 'Ab3', 'D4'],  // Fm9
    'KeyF': ['Bb2', 'F3', 'Ab3', 'D4', 'Eb4']  // Bb11
  }
};

function startAuraTunerRoutine() {
  auraActive = true;
  auraShockwaves = [];
  setAuraTheme('cosmic');
  setAuraScale('zen');
  
  auraCanvas = document.getElementById('aura-canvas');
  if (auraCanvas) {
    auraCtx = auraCanvas.getContext('2d');
    resizeAuraCanvas();
    window.addEventListener('resize', resizeAuraCanvas);
    initAuraParticles();
    initAuraStardust();
    
    // Start Canvas render loop
    renderAuraFrame();
  }
  
  // Set default button highlighting
  setAuraExpression('neutral');
  
  // Start automatic breathing cycle loop (in case camera is OFF)
  if (auraAutoInterval) clearInterval(auraAutoInterval);
  auraAutoInterval = setInterval(runAutoBreathingSweep, 50);
}

function stopAuraTunerRoutine() {
  auraActive = false;
  window.removeEventListener('resize', resizeAuraCanvas);
  
  // Clear anim frames
  if (auraAnimFrameId) {
    cancelAnimationFrame(auraAnimFrameId);
    auraAnimFrameId = null;
  }
  
  // Clear interval timers
  if (auraAutoInterval) {
    clearInterval(auraAutoInterval);
    auraAutoInterval = null;
  }
  
  // Stop WebRTC camera and scanning
  stopAuraCameraInternal();
  
  // Stop WebRTC microphone voice analyzer
  stopAuraMicInternal();
  
  // Clean up Audio synthesizers
  stopAuraAudioInternal();
  
  auraParticles = [];
  auraStardust = [];
  auraShockwaves = [];
  auraActiveKeys = {};
  auraEnergy = 0;
}

function resizeAuraCanvas() {
  if (auraCanvas) {
    auraCanvas.width = window.innerWidth;
    auraCanvas.height = window.innerHeight;
  }
}

function initAuraParticles() {
  auraParticles = [];
  const numParticles = 180;
  
  for (let i = 0; i < numParticles; i++) {
    auraParticles.push({
      angle: Math.random() * Math.PI * 2,
      baseRadius: 100 + Math.random() * 160,
      orbitSpeed: 0.004 + Math.random() * 0.008,
      wobbleSpeed: 0.01 + Math.random() * 0.02,
      wobbleAmplitude: 15 + Math.random() * 25,
      size: 1.5 + Math.random() * 3.5,
      alpha: 0.25 + Math.random() * 0.55,
      colorOffset: Math.random() // for interpolating start/end hue
    });
  }
}

function initAuraStardust() {
  auraStardust = [];
  const numStars = 100;
  for (let i = 0; i < numStars; i++) {
    auraStardust.push({
      x: Math.random() * (auraCanvas ? auraCanvas.width : window.innerWidth),
      y: Math.random() * (auraCanvas ? auraCanvas.height : window.innerHeight),
      baseSpeedX: (Math.random() * 0.3 - 0.15),
      baseSpeedY: (Math.random() * 0.3 - 0.15),
      speedX: 0,
      speedY: 0,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.12 + Math.random() * 0.28,
      colorOffset: Math.random()
    });
  }
}

function renderAuraFrame() {
  if (!auraCtx || !auraCanvas) return;
  
  // 1. Transparent clear to create smooth particle movement trails
  auraCtx.fillStyle = 'rgba(2, 6, 23, 0.15)'; // Deep Slate 950 overlay
  auraCtx.fillRect(0, 0, auraCanvas.width, auraCanvas.height);
  
  // 2. Slow decay of typing energy
  auraEnergy *= 0.96;
  if (auraEnergy < 0.01) auraEnergy = 0;
  
  // 3. Smooth color and filter sliding
  currentHueStart += (targetHueStart - currentHueStart) * 0.05;
  currentHueEnd += (targetHueEnd - currentHueEnd) * 0.05;
  currentFilterFreq += (targetFilterFreq - currentFilterFreq) * 0.06;
  currentDelayWet += (targetDelayWet - currentDelayWet) * 0.06;
  
  // Apply modulated values to Tone.js nodes on the fly
  if (auraAudioActive && typeof Tone !== 'undefined') {
    try {
      const now = Tone.now();
      if (auraFilter) auraFilter.frequency.setValueAtTime(currentFilterFreq, now);
      if (auraDelay) auraDelay.wet.setValueAtTime(currentDelayWet, now);
      if (auraMasterPanner) {
        if (auraEnergy > 1.5) {
          // Circular panning auto LFO triggered by energy spikes
          const panSweep = Math.sin(Date.now() * 0.0018) * 0.72;
          auraMasterPanner.pan.setValueAtTime(panSweep, now);
        } else {
          auraMasterPanner.pan.setValueAtTime(0, now);
        }
      }
    } catch (e) {
      // Catch fast state release crashes
    }
  }
  
  const cx = auraCanvas.width / 2;
  const cy = auraCanvas.height / 2;
  
  // 3b. Draw and update Background Cosmic Dust (Stardust Nebula)
  const gravityVortex = auraEnergy * 0.016;
  auraStardust.forEach(s => {
    // If typing tempo is high, pull stars into a central gravity swirl vortex
    if (auraEnergy > 1.0) {
      const dx = cx - s.x;
      const dy = cy - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 12) {
        s.speedX += (dx / dist) * gravityVortex;
        s.speedY += (dy / dist) * gravityVortex;
        // Add rotational swirl orbit component to vortex
        s.speedX += (-dy / dist) * gravityVortex * 0.6;
        s.speedY += (dx / dist) * gravityVortex * 0.6;
      }
    }
    
    // Apply speed decay and update coordinate trails
    s.x += s.baseSpeedX + s.speedX;
    s.y += s.baseSpeedY + s.speedY;
    s.speedX *= 0.94;
    s.speedY *= 0.94;
    
    // Wrap around screen borders cleanly
    if (s.x < 0) s.x = auraCanvas.width;
    if (s.x > auraCanvas.width) s.x = 0;
    if (s.y < 0) s.y = auraCanvas.height;
    if (s.y > auraCanvas.height) s.y = 0;
    
    // Draw stardust star
    auraCtx.beginPath();
    auraCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    const dustHue = (currentHueStart + currentHueEnd) / 2;
    auraCtx.fillStyle = `hsla(${dustHue}, 70%, 80%, ${s.alpha * (1.0 + auraEnergy * 0.12)})`;
    auraCtx.fill();
  });
  
  // 4. Update and draw particles
  auraParticles.forEach(p => {
    // Rotation speed boosts with user key-typing energy
    p.angle += p.orbitSpeed * (1.0 + auraEnergy * 0.85);
    
    // Slow breathing motion (sine wave over time)
    const breathingFactor = Math.sin(Date.now() * 0.0012 + p.angle) * p.wobbleAmplitude;
    // Radial expansion surges outwards in typing energy spikes
    const currentRadius = p.baseRadius + (auraEnergy * 14.0) + breathingFactor;
    
    // Convert polar coordinates to Cartesian layout
    const x = cx + Math.cos(p.angle) * currentRadius;
    const y = cy + Math.sin(p.angle) * currentRadius;
    
    // Interpolate individual HSL color based on particle index and active aura hue
    const particleHue = currentHueStart + (currentHueEnd - currentHueStart) * p.colorOffset;
    
    // Pulsing outer neon glow
    auraCtx.beginPath();
    auraCtx.arc(x, y, p.size * (1.0 + auraEnergy * 0.25), 0, Math.PI * 2);
    auraCtx.fillStyle = `hsla(${particleHue}, 90%, 65%, ${p.alpha})`;
    
    // Glow shadow blur layer (heavy on neon highlight particles)
    if (p.colorOffset > 0.7 || auraEnergy > 6.0) {
      auraCtx.shadowColor = `hsl(${particleHue}, 90%, 65%)`;
      auraCtx.shadowBlur = p.size * (4.0 + auraEnergy * 0.5);
    } else {
      auraCtx.shadowBlur = 0;
    }
    
    auraCtx.fill();
  });
  
  // Reset shadow effects
  auraCtx.shadowBlur = 0;
  
  // 4b. Update and draw keystroke shockwave rings
  auraShockwaves = auraShockwaves.filter(s => {
    s.radius += s.speed;
    s.opacity -= 0.018; // decay opacity
    
    if (s.opacity <= 0 || s.radius >= s.maxRadius) return false;
    
    auraCtx.beginPath();
    auraCtx.arc(cx, cy, s.radius, 0, Math.PI * 2);
    auraCtx.strokeStyle = s.color.replace('0.85', s.opacity.toFixed(3));
    auraCtx.lineWidth = 2.8 * s.opacity;
    
    // Add neon glow to shockwaves
    auraCtx.shadowColor = s.color.split(',')[0] + `, 95%, 65%, ${s.opacity})`;
    auraCtx.shadowBlur = 12 * s.opacity;
    
    auraCtx.stroke();
    return true;
  });
  auraCtx.shadowBlur = 0; // reset shadow effects
  
  // 4c. Draw Somatic Breathing Pacing Circle
  const breathScale = 0.5 + Math.sin(Date.now() * 0.0012) * 0.45; // slow pacing sinus wave
  const pacingRadius = 80 + breathScale * 85;
  
  auraCtx.beginPath();
  auraCtx.arc(cx, cy, pacingRadius, 0, Math.PI * 2);
  const pacingHue = (currentHueStart + currentHueEnd) / 2;
  auraCtx.strokeStyle = `hsla(${pacingHue}, 80%, 75%, 0.18)`;
  auraCtx.lineWidth = 1.6;
  auraCtx.setLineDash([5, 12]); // elegant cosmic dotted circle
  
  auraCtx.shadowColor = `hsl(${pacingHue}, 80%, 75%)`;
  auraCtx.shadowBlur = 6;
  auraCtx.stroke();
  
  auraCtx.setLineDash([]); // reset line dash
  auraCtx.shadowBlur = 0; // reset shadow blur
  
  // 5. Draw center ambient glowing orb (representing the core aura anchor)
  const pulseSize = 90 + Math.sin(Date.now() * 0.002) * 12 + (auraEnergy * 3.5);
  const coreGrad = auraCtx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize);
  
  const coreHue = (currentHueStart + currentHueEnd) / 2;
  coreGrad.addColorStop(0, `hsla(${coreHue}, 95%, 60%, 0.45)`);
  coreGrad.addColorStop(0.3, `hsla(${coreHue}, 95%, 60%, 0.18)`);
  coreGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  
  auraCtx.beginPath();
  auraCtx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
  auraCtx.fillStyle = coreGrad;
  auraCtx.fill();
  
  auraAnimFrameId = requestAnimationFrame(renderAuraFrame);
}

// --- AUDIO PIPELINE ACTIVATION ---

function toggleAuraAudio() {
  initAudioContext();
  
  if (typeof Tone === 'undefined') {
    console.error("Tone.js failed to load. Sound engine deactivated.");
    return;
  }
  
  if (typeof Tone !== 'undefined' && Tone.context && Tone.context.state !== 'running') {
    Tone.start();
  }
  
  const btn = document.getElementById('aura-audio-btn');
  if (auraAudioActive) {
    stopAuraAudioInternal();
    btn.innerHTML = `<i class="fa-solid fa-play"></i> <span>Starta ljudet</span>`;
    btn.classList.remove('active-audio');
  } else {
    initAuraAudioPipeline();
    btn.innerHTML = `<i class="fa-solid fa-pause"></i> <span>Stoppa ljudet</span>`;
    btn.classList.add('active-audio');
  }
}

function initAuraAudioPipeline() {
  if (Object.keys(auraSynths).length > 0) return;
  
  // 1. Filter, Delay and Reverb chain mapping
  auraFilter = new Tone.BiquadFilter({
    type: 'lowpass',
    frequency: currentFilterFreq,
    Q: 1.2
  });
  
  auraDelay = new Tone.FeedbackDelay({
    delayTime: "4n",
    feedback: 0.32,
    wet: currentDelayWet
  });
  
  // JCReverb is 100% synchronous, reliable, and immediately available
  auraReverb = new Tone.JCReverb(0.82);
  auraReverb.wet.value = 0.40;
  
  // Master panning spatial node
  auraMasterPanner = new Tone.Panner(0);
  
  // 2. Initialize spacey Analog-style PolySynths for each Key channel
  const panCoordinates = {
    'KeyA': -0.75, // Far Left
    'KeyS': -0.25, // Mid Left
    'KeyD': 0.25,  // Mid Right
    'KeyF': 0.75   // Far Right
  };
  
  const now = typeof Tone !== 'undefined' ? Tone.now() : 0;
  
  ['KeyA', 'KeyS', 'KeyD', 'KeyF'].forEach(k => {
    auraSynths[k] = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 1.6,
        decay: 1.2,
        sustain: 0.82,
        release: 2.6
      }
    });
    
    // Set comfortable volume
    auraSynths[k].volume.setValueAtTime(-18, now);
    
    // Create dedicated static panner channel
    auraPanners[k] = new Tone.Panner(panCoordinates[k]);
    
    // Connect Voice Synth -> Dedicated Panner -> Common Effects Chain
    auraSynths[k].connect(auraPanners[k]);
    auraPanners[k].connect(auraFilter);
  });
  
  // Connect effects chain pipeline: Filter -> Delay -> Reverb -> Master Panner -> Destination
  auraFilter.connect(auraDelay);
  auraDelay.connect(auraReverb);
  auraReverb.connect(auraMasterPanner);
  auraMasterPanner.toDestination();
  
  auraAudioActive = true;
}

function stopAuraAudioInternal() {
  auraAudioActive = false;
  
  // Fade out and dispose all synths & panners
  Object.keys(auraSynths).forEach(k => {
    if (auraSynths[k]) {
      try {
        auraSynths[k].releaseAll();
        auraSynths[k].disconnect();
        auraSynths[k].dispose();
      } catch (e) {
        console.warn("Synth voice dispose mismatch:", e);
      }
    }
  });
  auraSynths = {};
  
  Object.keys(auraPanners).forEach(k => {
    if (auraPanners[k]) {
      try {
        auraPanners[k].disconnect();
        auraPanners[k].dispose();
      } catch (e) {
        console.warn("Panner dispose mismatch:", e);
      }
    }
  });
  auraPanners = {};
  
  if (auraMasterPanner) {
    try {
      auraMasterPanner.disconnect();
      auraMasterPanner.dispose();
    } catch(e) {}
    auraMasterPanner = null;
  }
  
  if (auraFilter) { auraFilter.disconnect(); auraFilter.dispose(); auraFilter = null; }
  if (auraDelay) { auraDelay.disconnect(); auraDelay.dispose(); auraDelay = null; }
  if (auraReverb) { auraReverb.disconnect(); auraReverb.dispose(); auraReverb = null; }
}

// --- WEBCAM VIDEO MANAGEMENT ---

function toggleAuraCamera() {
  const btn = document.getElementById('aura-camera-btn');
  
  if (cameraActive) {
    stopAuraCameraInternal();
    btn.innerHTML = `<i class="fa-solid fa-video-slash"></i> <span>Kamera: AV</span>`;
    btn.classList.remove('active-cam');
  } else {
    startAuraCameraInternal();
    btn.innerHTML = `<i class="fa-solid fa-video"></i> <span>Kamera: PÅ</span>`;
    btn.classList.add('active-cam');
  }
}

async function startAuraCameraInternal() {
  try {
    auraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' }
    });
    
    const video = document.getElementById('aura-video');
    const container = document.getElementById('aura-video-container');
    const placeholder = document.getElementById('aura-video-placeholder');
    
    if (video) {
      video.srcObject = auraStream;
      video.classList.remove('hidden');
      video.style.display = 'block';
      video.play();
    }
    
    if (container) container.classList.add('active-camera');
    if (placeholder) placeholder.style.display = 'none';
    
    cameraActive = true;
    
    // Boot biometrics real-time pixel scanner
    auraPrevPixels = null;
    if (auraPixelInterval) clearInterval(auraPixelInterval);
    auraPixelInterval = setInterval(scanWebRTCFrame, 320);
  } catch (err) {
    console.error("Sensory camera access was blocked or failed:", err);
    // Silent fail fallback - notify and force AV
    cameraActive = false;
    const btn = document.getElementById('aura-camera-btn');
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-video-slash"></i> <span>Kamera: Blockad</span>`;
      btn.classList.remove('active-cam');
    }
  }
}

function stopAuraCameraInternal() {
  cameraActive = false;
  
  if (auraPixelInterval) {
    clearInterval(auraPixelInterval);
    auraPixelInterval = null;
  }
  
  if (auraStream) {
    auraStream.getTracks().forEach(track => track.stop());
    auraStream = null;
  }
  
  const video = document.getElementById('aura-video');
  const container = document.getElementById('aura-video-container');
  const placeholder = document.getElementById('aura-video-placeholder');
  
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add('hidden');
    video.style.display = 'none';
  }
  
  if (container) container.classList.remove('active-camera');
  if (placeholder) placeholder.style.display = 'flex';
}

// --- BIOMETRICS SCANNER AND MODULATION ---

function setAuraExpression(state, isAuto = false) {
  auraExpression = state;
  
  const neutralBtn = document.getElementById('aura-state-neutral');
  const smileBtn = document.getElementById('aura-state-smile');
  const statusBadge = document.getElementById('aura-status-badge');
  const pulsingDot = document.getElementById('aura-pulsing-dot');
  const pulseText = document.getElementById('aura-pulse-text');
  
  if (state === 'smile') {
    if (neutralBtn) { neutralBtn.className = "px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all bg-white/5 border border-white/10 text-white/60 hover:text-white"; }
    if (smileBtn) { smileBtn.className = "px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all aura-btn-active-rose"; }
    if (statusBadge) {
      statusBadge.textContent = "Leende / Hög Glädje-Energi";
      statusBadge.className = "text-[9px] text-rose-400 font-semibold tracking-wider uppercase animate-pulse";
    }
    if (pulsingDot) pulsingDot.className = "w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping";
  } else {
    if (neutralBtn) { neutralBtn.className = "px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all aura-btn-active-cyan"; }
    if (smileBtn) { smileBtn.className = "px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all bg-white/5 border border-white/10 text-white/60 hover:text-white"; }
    if (statusBadge) {
      statusBadge.textContent = "Neutral / Avslappnad";
      statusBadge.className = "text-[9px] text-cyan-400 font-semibold tracking-wider uppercase";
    }
    if (pulsingDot) pulsingDot.className = "w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping";
  }
  
  if (isAuto) {
    if (pulseText) pulseText.textContent = cameraActive ? "Webbkamera-biometri aktiv" : "Automatisk Andningscykel Aktiv";
  } else {
    // If user clicked manually, override automatic scan tracking notifications
    if (pulseText) pulseText.textContent = "Manuell Biometrisk Styrning";
  }
  
  interpolateAuraParams(state);
}

function setAuraTheme(theme) {
  auraTheme = theme;
  
  // Update theme button highlights
  ['cosmic', 'solar', 'forest', 'abyssal'].forEach(t => {
    const btn = document.getElementById(`aura-theme-${t}`);
    if (btn) {
      if (t === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
  
  // Re-modulate color mapping
  interpolateAuraParams(auraExpression);
}

function setAuraScale(scale) {
  auraScale = scale;
  
  // Update scale button highlights
  ['zen', 'cosmic', 'solfeggio', 'abyssal'].forEach(s => {
    const btn = document.getElementById(`aura-scale-${s}`);
    if (btn) {
      if (s === scale) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
}

async function toggleAuraMic() {
  const btn = document.getElementById('aura-mic-btn');
  if (!btn) return;
  
  if (micActive) {
    stopAuraMicInternal();
    btn.innerHTML = `<i class="fa-solid fa-microphone-slash"></i> <span>Mikrofon: AV</span>`;
    btn.classList.remove('active-mic');
  } else {
    try {
      initAudioContext();
      
      // Request audio recording streams cleanly
      auraMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (audioCtx) {
        // Setup microphone analyzer node
        auraAudioAnalyser = audioCtx.createAnalyser();
        auraAudioAnalyser.fftSize = 256;
        auraMicSource = audioCtx.createMediaStreamSource(auraMicStream);
        auraMicSource.connect(auraAudioAnalyser);
        
        micActive = true;
        btn.innerHTML = `<i class="fa-solid fa-microphone"></i> <span>Mikrofon: PÅ</span>`;
        btn.classList.add('active-mic');
        
        // Boot voice scanning loop
        trackMicrophoneSpeech();
      }
    } catch (err) {
      console.error("Sensory microphone access failed or was denied:", err);
      micActive = false;
      btn.innerHTML = `<i class="fa-solid fa-microphone-slash"></i> <span>Mikrofon: Blockad</span>`;
      btn.classList.remove('active-mic');
    }
  }
}

function stopAuraMicInternal() {
  micActive = false;
  
  if (auraMicStream) {
    auraMicStream.getTracks().forEach(track => track.stop());
    auraMicStream = null;
  }
  
  if (auraMicSource) {
    try {
      auraMicSource.disconnect();
    } catch(e) {}
    auraMicSource = null;
  }
  
  auraAudioAnalyser = null;
  auraSpeechLevel = 0;
}

function trackMicrophoneSpeech() {
  if (!micActive || !auraAudioAnalyser) return;
  
  const freqBuffer = new Uint8Array(auraAudioAnalyser.frequencyBinCount);
  auraAudioAnalyser.getByteFrequencyData(freqBuffer);
  
  let frequencySum = 0;
  for (let i = 0; i < freqBuffer.length; i++) {
    frequencySum += freqBuffer[i];
  }
  
  // Calculate average voice intensity percentage
  const averageVolume = frequencySum / freqBuffer.length;
  auraSpeechLevel = averageVolume / 255;
  
  // Trigger glowing voice sparkles expanding from somatic ring on humming
  if (auraSpeechLevel > 0.12) {
    spawnMicrophoneSparkles();
  }
  
  requestAnimationFrame(trackMicrophoneSpeech);
}

function spawnMicrophoneSparkles() {
  if (!auraCanvas) return;
  
  const cx = auraCanvas.width / 2;
  const cy = auraCanvas.height / 2;
  
  // Sparks emit from the dynamic bounds of somatic breathing circle
  const breathScale = 0.5 + Math.sin(Date.now() * 0.0012) * 0.45;
  const pacingRadius = 80 + breathScale * 85;
  
  const sparkDensity = Math.min(6, Math.floor(auraSpeechLevel * 8));
  for (let i = 0; i < sparkDensity; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Radial boundary coords
    const px = cx + Math.cos(angle) * pacingRadius;
    const py = cy + Math.sin(angle) * pacingRadius;
    
    // Inject voice sparks directly into shockwaves array as expanding mini-glows
    const randomSparkHue = currentHueStart + Math.random() * (currentHueEnd - currentHueStart);
    
    auraShockwaves.push({
      radius: pacingRadius, // initial radius offset matching pacing circle
      maxRadius: pacingRadius + 30 + Math.random() * 60,
      speed: 1.8 + Math.random() * 2.2,
      opacity: 0.9,
      // Custom HSL voice spark color profile
      color: `hsla(${randomSparkHue}, 95%, 72%, 0.85)`
    });
  }
}

function interpolateAuraParams(state) {
  if (state === 'smile') {
    targetFilterFreq = 2250;
    targetDelayWet = 0.38;
  } else {
    targetFilterFreq = 680;
    targetDelayWet = 0.08;
  }
  
  // Color configuration sweeps based on selected theme & biometrics state
  if (auraTheme === 'cosmic') {
    if (state === 'smile') {
      targetHueStart = 330; // Rose Pink
      targetHueEnd = 130;   // Emerald Green
    } else {
      targetHueStart = 175; // Cyan
      targetHueEnd = 275;   // Deep Indigo/Purple
    }
  } else if (auraTheme === 'solar') {
    if (state === 'smile') {
      targetHueStart = 45;  // Amber Gold
      targetHueEnd = 15;    // Radiant Orange
    } else {
      targetHueStart = 335; // Crimson-Rose
      targetHueEnd = 20;    // Soft Amber
    }
  } else if (auraTheme === 'forest') {
    if (state === 'smile') {
      targetHueStart = 40;  // Golden Sand
      targetHueEnd = 95;    // Sunlit Sage
    } else {
      targetHueStart = 115; // Deep Moss Green
      targetHueEnd = 60;    // Soft Olive
    }
  } else if (auraTheme === 'abyssal') {
    if (state === 'smile') {
      targetHueStart = 180; // Bright Arctic Cyan
      targetHueEnd = 210;   // Sky Blue
    } else {
      targetHueStart = 240; // Deep Ocean Blue
      targetHueEnd = 195;   // Tranquil Ocean Teal
    }
  }
}

// Automatic slow breathing cycle fallback
function runAutoBreathingSweep() {
  if (cameraActive) return; // Webcam pixel tracking takes priority if active
  
  auraAutoPhase += 0.005; // Slow incremental cycle
  const sinSweep = Math.sin(auraAutoPhase);
  
  // Transition back and forth gently on a slow 10-second sinus breathing loop
  if (sinSweep > 0.45) {
    setAuraExpression('smile', true);
  } else if (sinSweep < -0.45) {
    setAuraExpression('neutral', true);
  }
}

// Live Camera Pixel Analyzer
function scanWebRTCFrame() {
  if (!cameraActive) return;
  
  const video = document.getElementById('aura-video');
  if (!video || video.paused || video.ended) return;
  
  // Draw current camera frame down into a tiny offscreen grid for speedy matrix analysis
  const capCanvas = document.createElement('canvas');
  capCanvas.width = 40;
  capCanvas.height = 30;
  const capCtx = capCanvas.getContext('2d');
  
  try {
    capCtx.drawImage(video, 0, 0, 40, 30);
    const frameData = capCtx.getImageData(0, 0, 40, 30);
    const pixels = frameData.data;
    
    let totalFrameDiff = 0;
    let warmFleshPixels = 0;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i+1];
      const b = pixels[i+2];
      
      // Track warm, bright pixel ratios (smiles, facial movement highlights, skin tones)
      if (r > 115 && g > 75 && r > g && g > b) {
        warmFleshPixels++;
      }
      
      if (auraPrevPixels) {
        const pixelDiff = Math.abs(r - auraPrevPixels[i]) + 
                          Math.abs(g - auraPrevPixels[i+1]) + 
                          Math.abs(b - auraPrevPixels[i+2]);
        totalFrameDiff += pixelDiff;
      }
    }
    
    auraPrevPixels = pixels;
    
    const motionIndex = totalFrameDiff / (40 * 30 * 3);
    const warmRatio = warmFleshPixels / (40 * 30);
    
    // If movement rises (a laughing nod / smile shape shifts) or skin color warmness increases, 
    // trigger high-joy warm colors. Otherwise, stay relaxed.
    if (motionIndex > 14.5 || warmRatio > 0.48) {
      setAuraExpression('smile', true);
    } else {
      setAuraExpression('neutral', true);
    }
  } catch (e) {
    // CORS or canvas cross-domain block safeguard
  }
}

function registerKeystroke() {
  const now = Date.now();
  if (lastKeystrokeTime > 0) {
    const diff = now - lastKeystrokeTime;
    
    // Tap-tempo energy calculations
    if (diff < 1000) {
      auraEnergy += (1000 - diff) / 250; // Dynamic acceleration speed boost
      if (auraEnergy > 16.0) auraEnergy = 16.0;
    }
  }
  
  lastKeystrokeTime = now;
  auraEnergy += 1.0;
  if (auraEnergy > 16.0) auraEnergy = 16.0;
}

function spawnAuraShockwave(code) {
  let color = 'hsla(180, 95%, 65%, 0.85)';
  if (code === 'KeyA') color = 'hsla(190, 95%, 65%, 0.85)';       // Sky Blue shockwave
  else if (code === 'KeyS') color = 'hsla(280, 95%, 65%, 0.85)';  // Purple shockwave
  else if (code === 'KeyD') color = 'hsla(120, 95%, 65%, 0.85)';  // Emerald Green shockwave
  else if (code === 'KeyF') color = 'hsla(45, 95%, 65%, 0.85)';    // Gold shockwave
  
  auraShockwaves.push({
    radius: 12,
    maxRadius: 280 + Math.random() * 90,
    speed: 4.8 + Math.random() * 2.2,
    opacity: 0.85,
    color: color
  });
}

// Global key down listener hooks for aura typing surges
window.addEventListener('keydown', (e) => {
  if (!auraActive) return;
  
  if (['KeyA', 'KeyS', 'KeyD', 'KeyF'].includes(e.code)) {
    registerKeystroke();
    spawnAuraShockwave(e.code);
    
    if (auraActiveKeys[e.code]) return; // Stop repeating triggers
    auraActiveKeys[e.code] = true;
    
    if (auraAudioActive && auraSynths[e.code] && auraScaleChords[auraScale]) {
      try {
        auraSynths[e.code].triggerAttack(auraScaleChords[auraScale][e.code]);
      } catch (err) {
        console.warn("Attack voice trigger mismatch:", err);
      }
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (!auraActive) return;
  
  if (['KeyA', 'KeyS', 'KeyD', 'KeyF'].includes(e.code)) {
    if (!auraActiveKeys[e.code]) return;
    auraActiveKeys[e.code] = false;
    
    if (auraAudioActive && auraSynths[e.code] && auraScaleChords[auraScale]) {
      try {
        auraSynths[e.code].triggerRelease(auraScaleChords[auraScale][e.code]);
      } catch (err) {
        console.warn("Release voice trigger mismatch:", err);
      }
    }
  }
});
