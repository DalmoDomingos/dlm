// Generates a realistic door knock WAV file
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BIT_DEPTH = 16;
const DURATION = 1.5; // seconds
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

// Knock pattern: 3 knocks at these times (seconds)
const KNOCKS = [0.05, 0.35, 0.65];
const KNOCK_DURATION = 0.12; // seconds per knock

const samples = new Int16Array(NUM_SAMPLES);

function generateKnock(startSample) {
  const knockSamples = Math.floor(KNOCK_DURATION * SAMPLE_RATE);
  for (let i = 0; i < knockSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Exponential decay envelope
    const envelope = Math.exp(-t * 60);
    // Mix of noise + low frequency thud
    const noise = (Math.random() * 2 - 1);
    const thud = Math.sin(2 * Math.PI * 180 * t) * 0.6;
    const mid = Math.sin(2 * Math.PI * 350 * t) * 0.3;
    const val = (noise * 0.4 + thud + mid) * envelope;
    const idx = startSample + i;
    if (idx < NUM_SAMPLES) {
      samples[idx] = Math.max(-32767, Math.min(32767, Math.round(val * 28000)));
    }
  }
}

KNOCKS.forEach(t => generateKnock(Math.floor(t * SAMPLE_RATE)));

// Write WAV
function writeWav(filename, samples) {
  const dataBytes = samples.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);         // chunk size
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(CHANNELS, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * CHANNELS * BIT_DEPTH / 8, 28);
  buf.writeUInt16LE(CHANNELS * BIT_DEPTH / 8, 32);
  buf.writeUInt16LE(BIT_DEPTH, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(samples[i], 44 + i * 2);
  }
  fs.writeFileSync(filename, buf);
}

const outPath = path.join(__dirname, 'audio_knock.wav');
writeWav(outPath, samples);
console.log('Generated:', outPath);
