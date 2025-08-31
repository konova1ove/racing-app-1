// drive.js - Drive tracking and monitoring
class DriveTracker {
    constructor(route) {
        this.route = route;
        this.isActive = false;
        this.startTime = null;
        this.currentSegment = 0;
        this.segmentAccuracies = [];
        this.lastPosition = null;
        this.totalDistance = 0;
        this.driveTimer = null;
        
        console.log('📋 Drive tracker initialized with', route.segments.length, 'segments');
    }

    start() {
        this.isActive = true;
        this.startTime = Date.now();
        this.currentSegment = 0;
        this.segmentAccuracies = [];
        this.lastPosition = null;
        this.totalDistance = 0;
        
        // Start drive timer UI update
        this.startDriveTimer();
        
        // Initialize first segment
        this.updateSegmentUI();
        
        console.log('🏁 Drive tracking started');
    }

    startDriveTimer() {
        this.driveTimer = setInterval(() => {
            if (this.isActive && this.startTime) {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                const timeEl = document.getElementById('drive-time');
                if (timeEl) {
                    timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 1000);
    }

    updatePosition(locationData) {
        if (!this.isActive) return;
        
        const currentSegment = this.route.segments[this.currentSegment];
        if (!currentSegment) {
            this.finish();
            return;
        }

        // Calculate speed in km/h
        const speedKmh = (locationData.speed || 0) * 3.6;
        
        // Check speed accuracy against segment limit
        const accuracy = this.calculateSpeedAccuracy(speedKmh, currentSegment.speedLimit);
        
        // Update current segment accuracy
        currentSegment.currentAccuracy = accuracy;
        
        // Check for speed violations
        const violation = this.checkSpeedViolation(speedKmh, currentSegment.speedLimit);
        this.handleSpeedViolation(violation);
        
        // Update UI
        this.updateDriveUI(speedKmh, accuracy, violation);
        
        // Check if segment is complete (simplified - using time for now)
        if (this.shouldAdvanceSegment()) {
            this.completeCurrentSegment(accuracy);
            this.currentSegment++;
            this.updateSegmentUI();
        }
        
        this.lastPosition = locationData;
    }

    calculateSpeedAccuracy(actualSpeed, targetSpeed) {
        const difference = Math.abs(actualSpeed - targetSpeed);
        const tolerance = targetSpeed * 0.1; // 10% tolerance
        
        if (difference <= tolerance) {
            return 100 - (difference / tolerance) * 20; // 80-100% accuracy
        } else {
            const excessRatio = (difference - tolerance) / targetSpeed;
            return Math.max(0, 80 - (excessRatio * 80)); // 0-80% accuracy
        }
    }

    checkSpeedViolation(currentSpeed, speedLimit) {
        const excess = currentSpeed - speedLimit;
        
        if (excess <= 10) return 'none';
        if (excess <= 22) return 'warning';
        return 'critical';
    }

    handleSpeedViolation(violation) {
        if (violation === 'warning' && window.audio) {
            window.audio.speedWarning();
        } else if (violation === 'critical' && window.audio) {
            window.audio.beep(1200, 500);
        }
    }

    shouldAdvanceSegment() {
        // Simplified: advance every 10 seconds for demo
        const segmentDuration = 10000; // 10 seconds per segment
        const segmentStartTime = this.startTime + (this.currentSegment * segmentDuration);
        return Date.now() - segmentStartTime > segmentDuration;
    }

    completeCurrentSegment(finalAccuracy) {
        const segment = this.route.segments[this.currentSegment];
        if (segment) {
            segment.completed = true;
            segment.accuracy = Math.round(finalAccuracy);
            this.segmentAccuracies.push(finalAccuracy);
            
            // Play completion sound
            if (window.audio) {
                window.audio.segmentComplete();
            }
            
            console.log(`✅ Segment ${this.currentSegment + 1} completed with ${Math.round(finalAccuracy)}% accuracy`);
        }
    }

    updateSegmentUI() {
        const segment = this.route.segments[this.currentSegment];
        if (!segment) return;
        
        // Update current segment info
        const instructionEl = document.getElementById('current-instruction');
        const speedLimitEl = document.getElementById('current-speed-limit');
        const distanceEl = document.getElementById('current-distance');
        const segmentNumEl = document.getElementById('current-segment-num');
        
        if (instructionEl) instructionEl.textContent = segment.instruction;
        if (speedLimitEl) speedLimitEl.textContent = segment.speedLimit;
        if (distanceEl) distanceEl.textContent = `${segment.distance}m`;
        if (segmentNumEl) segmentNumEl.textContent = this.currentSegment + 1;
        
        // Update completed segments counter
        const completedEl = document.getElementById('segments-completed');
        if (completedEl) completedEl.textContent = this.segmentAccuracies.length;
    }

    updateDriveUI(speed, accuracy, violation) {
        // Update overall accuracy
        const overallAccuracy = this.segmentAccuracies.length > 0 
            ? this.segmentAccuracies.reduce((a, b) => a + b) / this.segmentAccuracies.length 
            : accuracy;
        
        const accuracyEl = document.getElementById('overall-accuracy');
        if (accuracyEl) {
            accuracyEl.textContent = `${Math.round(overallAccuracy)}%`;
        }
        
        // Update segment accuracy bar
        const accuracyFill = document.getElementById('segment-accuracy-fill');
        const accuracyText = document.getElementById('segment-accuracy-text');
        
        if (accuracyFill) {
            accuracyFill.style.width = `${Math.max(0, accuracy)}%`;
            
            // Change color based on violation
            if (violation === 'critical') {
                accuracyFill.style.backgroundColor = '#ff4444';
            } else if (violation === 'warning') {
                accuracyFill.style.backgroundColor = '#ffaa00';
            } else {
                accuracyFill.style.backgroundColor = '#00dd88';
            }
        }
        
        if (accuracyText) {
            if (violation === 'critical') {
                accuracyText.textContent = 'TOO FAST!';
            } else if (violation === 'warning') {
                accuracyText.textContent = 'Slow down';
            } else {
                accuracyText.textContent = `${Math.round(accuracy)}%`;
            }
        }
    }

    finish() {
        if (!this.isActive) return null;
        
        this.isActive = false;
        
        if (this.driveTimer) {
            clearInterval(this.driveTimer);
            this.driveTimer = null;
        }
        
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        // Calculate final results
        const avgAccuracy = this.segmentAccuracies.length > 0 
            ? this.segmentAccuracies.reduce((a, b) => a + b) / this.segmentAccuracies.length 
            : 0;
        
        const score = this.calculateFinalScore(avgAccuracy, this.route.totalDistance);
        
        const results = {
            id: Date.now().toString(),
            userId: window.app?.user?.id || 'demo',
            date: new Date().toISOString(),
            distance: this.route.totalDistance,
            duration: duration,
            segmentsCompleted: this.segmentAccuracies.length,
            totalSegments: this.route.segments.length,
            accuracy: Math.round(avgAccuracy),
            score: score,
            segmentAccuracies: [...this.segmentAccuracies]
        };
        
        console.log('🏆 Drive completed:', results);
        
        // Play completion sound
        if (window.audio) {
            window.audio.driveComplete();
        }
        
        return results;
    }

    calculateFinalScore(avgAccuracy, distance) {
        if (avgAccuracy <= 0) return 0;
        
        // Base score from accuracy
        let score = avgAccuracy * 10;
        
        // Distance multiplier (logarithmic)
        const distanceKm = distance / 1000;
        const distanceMultiplier = Math.log10(distanceKm + 1) + 1;
        
        score *= distanceMultiplier;
        
        return Math.round(score);
    }
}

// Make DriveTracker globally available
window.DriveTracker = DriveTracker;