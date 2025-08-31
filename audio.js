// audio.js - Enhanced audio feedback system
window.audio = {
    context: null,
    enabled: true,
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🔊 Audio system initialized');
        } catch (error) {
            console.warn('⚠️ Audio not supported:', error);
            this.enabled = false;
        }
    },
    
    // Resume audio context (required by some browsers)
    resumeContext() {
        if (this.context && this.context.state === 'suspended') {
            return this.context.resume();
        }
        return Promise.resolve();
    },
    
    // Basic beep sound generator
    beep(frequency = 800, duration = 200, volume = 0.1) {
        if (!this.enabled || !this.context) return;
        
        this.resumeContext().then(() => {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(volume, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration / 1000);
            
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration / 1000);
        }).catch(err => console.warn('Audio play error:', err));
    },
    
    // Multi-tone sequence
    playSequence(frequencies, durations, gap = 100) {
        if (!this.enabled) return;
        
        frequencies.forEach((freq, index) => {
            const delay = index * (durations[index] + gap);
            setTimeout(() => {
                this.beep(freq, durations[index] || 200);
            }, delay);
        });
    },
    
    // Specific sound events
    segmentStart() {
        this.beep(800, 200, 0.12);
        this.haptic('light');
    },
    
    segmentComplete() {
        this.playSequence([1000, 1200], [150, 200]);
        this.haptic('medium');
    },
    
    speedWarning() {
        this.playSequence([1000, 1000], [120, 120], 80);
        this.haptic('warning');
    },
    
    speedCritical() {
        this.playSequence([1400, 1400, 1400], [100, 100, 100], 50);
        this.haptic('error');
    },
    
    driveStart() {
        this.playSequence([600, 800, 1000], [200, 200, 300]);
        this.haptic('heavy');
    },
    
    driveComplete() {
        // Victory fanfare
        const victoryNotes = [523, 587, 659, 698, 784]; // C, D, E, F, G
        const durations = [200, 200, 200, 200, 400];
        this.playSequence(victoryNotes, durations, 100);
        this.haptic('heavy');
    },
    
    achievement() {
        this.playSequence([800, 1000, 1200, 1600], [150, 150, 200, 400]);
        this.haptic('heavy');
    },
    
    error() {
        this.beep(400, 500, 0.15);
        this.haptic('error');
    },
    
    // Telegram haptic feedback integration
    haptic(type) {
        const tg = window.Telegram?.WebApp;
        if (!tg?.HapticFeedback) return;
        
        try {
            switch (type) {
                case 'light':
                case 'medium':
                case 'heavy':
                    tg.HapticFeedback.impactOccurred(type);
                    break;
                case 'warning':
                case 'error':
                case 'success':
                    tg.HapticFeedback.notificationOccurred(type);
                    break;
                default:
                    tg.HapticFeedback.impactOccurred('light');
            }
        } catch (error) {
            console.warn('Haptic feedback error:', error);
        }
    },
    
    // Toggle audio on/off
    toggle() {
        this.enabled = !this.enabled;
        
        if (this.enabled) {
            this.beep(800, 100);
        }
        
        return this.enabled;
    },
    
    // Set volume (for future use)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
};

// Auto-initialize on user interaction
const initAudioOnInteraction = () => {
    window.audio.init();
    document.removeEventListener('touchstart', initAudioOnInteraction);
    document.removeEventListener('click', initAudioOnInteraction);
};

document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
document.addEventListener('click', initAudioOnInteraction, { once: true });

console.log('🎵 Audio system ready');

