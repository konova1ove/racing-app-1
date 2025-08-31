window.calculateSegmentAccuracy = function(actualSpeed, targetSpeed, maxSpeed) {
    if (maxSpeed > targetSpeed + 22) return 0;
    const deviation = Math.abs(actualSpeed - targetSpeed);
    const tolerance = targetSpeed * 0.2;
    return Math.max(0, 100 - (deviation / tolerance) * 20);
};

window.calculateTotalScore = function(segmentAccuracies, totalDistance) {
    if (!segmentAccuracies || segmentAccuracies.length === 0) return 0;
    const avgAccuracy = segmentAccuracies.reduce((sum, acc) => sum + acc, 0) / segmentAccuracies.length;
    const distanceMultiplier = Math.log10(totalDistance / 1000 + 1);
    return Math.round(avgAccuracy * distanceMultiplier);
};
