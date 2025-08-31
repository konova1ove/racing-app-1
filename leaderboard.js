// leaderboard.js - GitHub-based leaderboard system
class LeaderboardManager {
    constructor() {
        // Updated URL for your repository
        this.baseUrl = 'https://raw.githubusercontent.com/konova1ove/racing-app-1/main/leaderboards/';
        this.webhookUrl = 'https://api.github.com/repos/konova1ove/racing-app-1/contents/leaderboards/';
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    // Fetch leaderboard data with caching
    async getLeaderboard(category = '10km') {
        const cacheKey = `leaderboard_${category}`;
        const cached = this.cache.get(cacheKey);
        
        // Return cached data if still valid
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const url = `${this.baseUrl}${category}.json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`Leaderboard ${category} not found, returning demo data`);
                return this.getDemoLeaderboard();
            }
            
            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
            
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            
            // Return cached data even if expired, or demo leaderboard
            if (cached) {
                return cached.data;
            }
            
            return this.getDemoLeaderboard();
        }
    }

    // Demo leaderboard data for testing
    getDemoLeaderboard() {
        return [
            {
                rank: 1,
                userId: 'demo1',
                username: 'SpeedDemon 🏎️',
                score: 2850,
                accuracy: 95,
                distance: 15.4,
                date: new Date().toISOString()
            },
            {
                rank: 2,
                userId: 'demo2',
                username: 'RoadRunner 🏃',
                score: 2720,
                accuracy: 92,
                distance: 12.8,
                date: new Date().toISOString()
            },
            {
                rank: 3,
                userId: 'demo3',
                username: 'FastLane 🏁',
                score: 2650,
                accuracy: 89,
                distance: 18.2,
                date: new Date().toISOString()
            },
            {
                rank: 4,
                userId: 'demo4',
                username: 'CruiseControl ⚡',
                score: 2400,
                accuracy: 87,
                distance: 10.5,
                date: new Date().toISOString()
            },
            {
                rank: 5,
                userId: 'demo5',
                username: 'SteadyDriver 🎯',
                score: 2200,
                accuracy: 85,
                distance: 8.9,
                date: new Date().toISOString()
            }
        ];
    }

    // Submit new score to leaderboard
    async submitScore(driveResult, user) {
        try {
            const category = this.getDistanceCategory(driveResult.distance);
            const entry = this.formatLeaderboardEntry(driveResult, user);
            
            // Get current leaderboard
            const currentLeaderboard = await this.getLeaderboard(category);
            
            // Check if this is a personal best
            const existingEntryIndex = currentLeaderboard.findIndex(e => e.userId === user.id);
            let isPersonalBest = false;
            
            if (existingEntryIndex >= 0) {
                // Update existing entry only if score is better
                if (entry.score > currentLeaderboard[existingEntryIndex].score) {
                    currentLeaderboard[existingEntryIndex] = entry;
                    isPersonalBest = true;
                }
            } else {
                // Add new entry
                currentLeaderboard.push(entry);
                isPersonalBest = true;
            }
            
            if (isPersonalBest) {
                // Sort and rank
                const updatedLeaderboard = this.processLeaderboard(currentLeaderboard);
                
                // Update cache immediately
                this.cache.set(`leaderboard_${category}`, {
                    data: updatedLeaderboard,
                    timestamp: Date.now()
                });
                
                // Send achievement notification
                const userRank = updatedLeaderboard.find(e => e.userId === user.id)?.rank || 0;
                this.sendAchievementNotification(user, entry, userRank);
                
                return { success: true, rank: userRank, isPersonalBest: true };
            }
            
            return { success: true, isPersonalBest: false };
            
        } catch (error) {
            console.error('Score submission failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Process leaderboard: sort, rank, and limit entries
    processLeaderboard(entries) {
        return entries
            .sort((a, b) => {
                // Sort by score (descending), then by accuracy (descending)
                if (b.score !== a.score) return b.score - a.score;
                return b.accuracy - a.accuracy;
            })
            .slice(0, 100) // Keep top 100
            .map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));
    }

    // Format drive result for leaderboard
    formatLeaderboardEntry(driveResult, user) {
        return {
            userId: user.id || 'anonymous',
            username: user.first_name || user.username || 'Anonymous Racer',
            score: driveResult.score || 0,
            accuracy: Math.round(driveResult.accuracy || 0),
            distance: parseFloat((driveResult.distance / 1000).toFixed(1)),
            segments: driveResult.segments || 0,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
    }

    // Get distance category for leaderboard
    getDistanceCategory(distance) {
        const distanceKm = distance / 1000;
        if (distanceKm < 10) return '10km';
        if (distanceKm < 50) return '50km';
        if (distanceKm < 100) return '100km';
        return '1000km';
    }

    // Send achievement notification
    async sendAchievementNotification(user, entry, rank) {
        try {
            const message = this.formatAchievementMessage(entry, rank);
            
            console.log('🏆 Achievement:', message);
            
            // Trigger haptic feedback
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
            }
            
            // Play achievement sound
            if (window.audio) {
                window.audio.beep(1000, 300);
                setTimeout(() => window.audio.beep(1200, 300), 200);
                setTimeout(() => window.audio.beep(1400, 500), 400);
            }
            
            // Show alert in Telegram
            if (window.Telegram?.WebApp?.showAlert) {
                window.Telegram.WebApp.showAlert(message);
            }
            
        } catch (error) {
            console.error('Notification failed:', error);
        }
    }

    // Format achievement message
    formatAchievementMessage(entry, rank) {
        const rankEmoji = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '🏆';
        
        return `${rankEmoji} New Personal Best!\n\n` +
               `Rank: #${rank}\n` +
               `Score: ${entry.score} points\n` +
               `Accuracy: ${entry.accuracy}%\n` +
               `Distance: ${entry.distance}km\n\n` +
               `Keep racing to climb higher! 🏁`;
    }

    // Get user's current rankings
    async getUserRankings(userId) {
        const categories = ['10km', '50km', '100km', '1000km'];
        const rankings = {};
        
        for (const category of categories) {
            try {
                const leaderboard = await this.getLeaderboard(category);
                const userEntry = leaderboard.find(entry => entry.userId === userId);
                
                if (userEntry) {
                    rankings[category] = {
                        rank: userEntry.rank,
                        score: userEntry.score,
                        accuracy: userEntry.accuracy,
                        total: leaderboard.length
                    };
                }
            } catch (error) {
                console.warn(`Failed to get ranking for ${category}:`, error);
            }
        }
        
        return rankings;
    }

    // Clear cache (useful for testing)
    clearCache() {
        this.cache.clear();
        console.log('Leaderboard cache cleared');
    }

    // Get leaderboard statistics
    async getLeaderboardStats(category = '10km') {
        try {
            const leaderboard = await this.getLeaderboard(category);
            
            if (leaderboard.length === 0) {
                return { totalPlayers: 0, averageScore: 0, topScore: 0 };
            }
            
            const scores = leaderboard.map(entry => entry.score);
            const accuracies = leaderboard.map(entry => entry.accuracy);
            
            return {
                totalPlayers: leaderboard.length,
                averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
                topScore: Math.max(...scores),
                averageAccuracy: Math.round(accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length),
                topAccuracy: Math.max(...accuracies)
            };
            
        } catch (error) {
            console.error('Failed to get leaderboard stats:', error);
            return { totalPlayers: 0, averageScore: 0, topScore: 0 };
        }
    }
}

// Create global leaderboard manager instance
const leaderboardManager = new LeaderboardManager();

// Export for global use
window.leaderboardManager = leaderboardManager;
window.LeaderboardManager = LeaderboardManager;

console.log('✅ Leaderboard system loaded');
