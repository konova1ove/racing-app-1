window.audio = {
    context: null,
    enabled: true,
    
    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio not supported');
            this.enabled = false;
        }
    },
    
    beep(frequency = 800, duration = 200) {
        if (!this.enabled || !this.context) return;
        
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration / 1000);
        
        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration / 1000);
    },
    
    segmentStart() { this.beep(800, 200); },
    segmentComplete() { this.beep(1200, 300); },
    speedWarning() { this.beep(1000, 150); }
};
