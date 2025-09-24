// scoring.js - Comprehensive scoring system for racing navigation

// Calculate accuracy for a single segment
window.calculateSegmentAccuracy = function(actualSpeed, targetSpeed, maxSpeed) {
    // Critical speed violation (>22 km/h over limit) = 0 points
    if (maxSpeed > targetSpeed + 22) return 0;
    
    const deviation = Math.abs(actualSpeed - targetSpeed);
    const tolerance = targetSpeed * 0.15; // 15% tolerance for perfect score
    
    if (deviation <= tolerance) {
        // Perfect zone: 90-100% accuracy
        return 100 - (deviation / tolerance) * 10;
    } else {
        // Declining accuracy zone
        const excessDeviation = deviation - tolerance;
        const maxAllowedDeviation = targetSpeed * 0.5; // 50% max before 0
        
        if (excessDeviation >= maxAllowedDeviation) return 0;
        
        return Math.max(0, 90 - (excessDeviation / maxAllowedDeviation) * 90);
    }
};

// Calculate total score from segment accuracies
window.calculateTotalScore = function(segmentAccuracies, totalDistance) {
    if (!segmentAccuracies || segmentAccuracies.length === 0) return 0;
    
    const avgAccuracy = segmentAccuracies.reduce((sum, acc) => sum + acc, 0) / segmentAccuracies.length;
    
    // Distance multiplier (logarithmic to prevent extreme scores)
    const distanceKm = Math.max(1, totalDistance / 1000);
    const distanceMultiplier = Math.log10(distanceKm + 1) + 1;
    
    // Consistency bonus (reward for consistent driving)
    const consistencyBonus = calculateConsistencyBonus(segmentAccuracies);
    
    const baseScore = avgAccuracy * distanceMultiplier;
    const finalScore = baseScore * (1 + consistencyBonus / 100);
    
    return Math.round(Math.min(9999, finalScore)); // Cap at 9999 points
};

// Calculate consistency bonus (0-20% bonus)
function calculateConsistencyBonus(accuracies) {
    if (accuracies.length < 2) return 0;
    
    const mean = accuracies.reduce((a, b) => a + b) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower deviation = higher bonus (max 20%)
    const maxDeviation = 30; // Adjust based on testing
    const consistency = Math.max(0, (maxDeviation - standardDeviation) / maxDeviation);
    
    return consistency * 20; // 0-20% bonus
}

// Determine distance category for leaderboards
window.getDistanceCategory = function(distance) {
    const km = distance / 1000;
    if (km < 10) return '10km';
    if (km < 50) return '50km';
    if (km < 100) return '100km';
    return '1000km';
};

// Check speed violation level
window.checkSpeedViolation = function(currentSpeed, speedLimit) {
    const excess = currentSpeed - speedLimit;
    
    if (excess <= 10) return 'none';
    if (excess <= 22) return 'warning';
    return 'critical';
};

// Calculate grade/rating based on accuracy
window.getAccuracyGrade = function(accuracy) {
    if (accuracy >= 95) return { grade: 'S', color: '#FFD700', text: 'Perfect!' };
    if (accuracy >= 90) return { grade: 'A+', color: '#00DD88', text: 'Excellent' };
    if (accuracy >= 85) return { grade: 'A', color: '#44CC44', text: 'Great' };
    if (accuracy >= 80) return { grade: 'B+', color: '#88BB00', text: 'Good' };
    if (accuracy >= 75) return { grade: 'B', color: '#CCAA00', text: 'Decent' };
    if (accuracy >= 70) return { grade: 'C+', color: '#DD8800', text: 'Fair' };
    if (accuracy >= 60) return { grade: 'C', color: '#FF6600', text: 'Poor' };
    return { grade: 'D', color: '#FF4444', text: 'Bad' };
};

// Format score for display
window.formatScore = function(score) {
    if (score >= 1000) {
        return (score / 1000).toFixed(1) + 'K';
    }
    return score.toString();
};

// Calculate achievement status
window.checkAchievements = function(results, personalBest) {
    const achievements = [];
    
    // First drive
    if (!personalBest) {
        achievements.push({
            title: 'First Drive',
            description: 'Completed your first racing drive!',
            icon: '🎉'
        });
    }
    
    // Personal best
    if (personalBest && results.score > personalBest.score) {
        achievements.push({
            title: 'New Personal Best!',
            description: `Beat previous best by ${results.score - personalBest.score} points`,
            icon: '🏆'
        });
    }
    
    // Perfect accuracy
    if (results.accuracy >= 95) {
        achievements.push({
            title: 'Precision Master',
            description: 'Achieved 95%+ accuracy!',
            icon: '🎯'
        });
    }
    
    // Long distance
    if (results.distance >= 50000) {
        achievements.push({
            title: 'Long Distance Driver',
            description: 'Completed 50+ km drive!',
            icon: '🛣️'
        });
    }
    
    // All segments completed
    if (results.segmentsCompleted === results.totalSegments) {
        achievements.push({
            title: 'Route Master',
            description: 'Completed all route segments!',
            icon: '✅'
        });
    }
    
    return achievements;
};

console.log('📊 Scoring system loaded');

