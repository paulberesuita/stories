// Sound effects using Web Audio API

let audioContext = null;

// Initialize audio context on first user interaction
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Play a pleasant swipe sound
export function playSwipeSound() {
    try {
        const ctx = getAudioContext();

        // Resume context if suspended (required for some browsers)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Create oscillator for a soft, pleasant tone
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Use a sine wave for a soft, pleasant sound
        oscillator.type = 'sine';

        // Start at a mid frequency and slide up slightly for a "whoosh" feel
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.12);

        // Quick fade in and out for a subtle "pop" sound
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Play the sound
        oscillator.start(now);
        oscillator.stop(now + 0.15);

        // Add a subtle second tone for richness
        const oscillator2 = ctx.createOscillator();
        const gainNode2 = ctx.createGain();

        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(800, now);
        oscillator2.frequency.exponentialRampToValueAtTime(1000, now + 0.06);

        gainNode2.gain.setValueAtTime(0, now);
        gainNode2.gain.linearRampToValueAtTime(0.03, now + 0.01);
        gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        oscillator2.connect(gainNode2);
        gainNode2.connect(ctx.destination);

        oscillator2.start(now);
        oscillator2.stop(now + 0.1);

    } catch (e) {
        // Silently fail if audio isn't available
        console.warn('Audio not available:', e);
    }
}
