// app.js - Main application controller
class RacingApp {
    constructor() {
        this.currentScreen = 'loading';
        this.user = null;
        this.currentRoute = null;
        this.driveTracker = null;
        this.locationWatchId = null;
        
        // Initialize Telegram WebApp
        this.telegram = window.Telegram?.WebApp || {};
        if (this.telegram.ready) {
            this.telegram.ready();
            this.telegram.expand();
        }
    }

    async init() {
        console.log('🏁 Initializing Racing Navigation App...');
        
        try {
            // Get user info from Telegram
            this.user = this.telegram.initDataUnsafe?.user || {
                id: 'demo_' + Math.random().toString(36).substr(2, 9),
                first_name: 'Demo User'
            };

            console.log('👤 User:', this.user);

            // Load saved settings
            await this.loadUserSettings();

            // Initialize audio
            if (window.audio) {
                window.audio.init();
            }

            // Setup event listeners
            this.setupEventListeners();

            // Show main screen after loading
            setTimeout(() => {
                this.showScreen('main');
                this.updateUserInfo();
            }, 2000);

        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to initialize app');
        }
    }

    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Main screen actions
        const searchBtn = document.getElementById('search-btn');
        const leaderboardBtn = document.getElementById('leaderboard-btn');
        const historyBtn = document.getElementById('history-btn');
        const settingsBtn = document.getElementById('settings-btn');

        if (searchBtn) searchBtn.addEventListener('click', () => this.searchRoute());
        if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        if (historyBtn) historyBtn.addEventListener('click', () => this.showHistory());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettings());
        
        // Route screen actions
        const backToMain = document.getElementById('back-to-main');
        const startDriveBtn = document.getElementById('start-drive-btn');
        
        if (backToMain) backToMain.addEventListener('click', () => this.showScreen('main'));
        if (startDriveBtn) startDriveBtn.addEventListener('click', () => this.startDrive());
        
        // Drive screen actions
        const stopDriveBtn = document.getElementById('stop-drive-btn');
        if (stopDriveBtn) stopDriveBtn.addEventListener('click', () => this.stopDrive());
        
        // Results screen actions
        const shareResultsBtn = document.getElementById('share-results-btn');
        const raceAgainBtn = document.getElementById('race-again-btn');
        const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
        
        if (shareResultsBtn) shareResultsBtn.addEventListener('click', () => this.shareResults());
        if (raceAgainBtn) raceAgainBtn.addEventListener('click', () => this.showScreen('main'));
        if (viewLeaderboardBtn) viewLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        
        // Leaderboard screen
        const backFromLeaderboard = document.getElementById('back-from-leaderboard');
        if (backFromLeaderboard) backFromLeaderboard.addEventListener('click', () => this.showScreen('main'));
        
        // Enter key for search
        const destinationInput = document.getElementById('destination-input');
        if (destinationInput) {
            destinationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchRoute();
            });
        }

        // Leaderboard tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const category = e.target.dataset.category;
                if (category) {
                    this.switchLeaderboardCategory(category);
                }
            });
        });

        console.log('✅ Event listeners setup complete');
    }

    async searchRoute() {
        const destinationInput = document.getElementById('destination-input');
        if (!destinationInput) return;
        
        const destination = destinationInput.value.trim();
        if (!destination) {
            this.showError('Please enter a destination');
            return;
        }

        try {
            this.showLoading('Calculating route...');
            
            // Get current location
            const position = await this.getCurrentLocation();
            
            // Geocode destination
            const destCoords = await this.geocodeAddress(destination);
            
            // Calculate route
            const route = await this.calculateRoute(position, destCoords);
            
            if (route) {
                this.currentRoute = route;
                this.showRoutePreview(route);
            } else {
                this.showError('Could not find route to destination');
            }
            
        } catch (error) {
            console.error('❌ Route search error:', error);
            this.showError('Failed to calculate route: ' + error.message);
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by this device'));
                return;
            }

            // Check for permission first
            if (navigator.permissions) {
                navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                    if (result.state === 'denied') {
                        reject(new Error('Location permission denied. Please enable location access in your browser settings.'));
                        return;
                    }
                });
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000 // 1 minute cache
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('📍 GPS Position:', position.coords);
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        speed: position.coords.speed,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    console.error('❌ GPS Error:', error);
                    let errorMessage = 'Failed to get location: ';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Permission denied. Please enable location access.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Position unavailable. Check your GPS signal.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Request timeout. Try again.';
                            break;
                        default:
                            errorMessage += error.message;
                    }
                    reject(new Error(errorMessage));
                },
                options
            );
        });
    }

    // Start continuous location tracking for driving
    startLocationTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 1000 // 1 second cache max during driving
        };

        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const locationData = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    speed: position.coords.speed || 0,
                    heading: position.coords.heading,
                    timestamp: position.timestamp
                };

                // Update drive tracker if active
                if (this.driveTracker && this.driveTracker.isActive) {
                    this.driveTracker.updatePosition(locationData);
                }

                // Update UI
                this.updateLocationUI(locationData);
            },
            (error) => {
                console.error('❌ Location tracking error:', error);
                this.handleLocationError(error);
            },
            options
        );

        console.log('🔄 Location tracking started');
    }

    stopLocationTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
            console.log('🔄 Location tracking stopped');
        }
    }

    updateLocationUI(locationData) {
        // Update current speed display
        const speedEl = document.getElementById('current-speed');
        if (speedEl && locationData.speed !== null) {
            const speedKmh = Math.round((locationData.speed || 0) * 3.6); // m/s to km/h
            speedEl.textContent = speedKmh;
        }
    }

    handleLocationError(error) {
        if (error.code === error.PERMISSION_DENIED) {
            this.showError('Location access denied. Please enable GPS permissions.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            this.showError('GPS signal lost. Make sure you have a clear view of the sky.');
        }
    }

    async geocodeAddress(address) {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await response.json();
        
        if (data.length === 0) {
            throw new Error('Address not found');
        }
        
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
    }

    async calculateRoute(start, end) {
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&overview=full`
        );
        
        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            return null;
        }

        return this.processRoute(data.routes[0]);
    }

    processRoute(osrmRoute) {
        const segments = osrmRoute.legs[0].steps.map((step, index) => ({
            id: index,
            distance: Math.round(step.distance),
            duration: Math.round(step.duration),
            instruction: step.maneuver.instruction || `Continue for ${Math.round(step.distance)}m`,
            speedLimit: step.distance > 1000 ? 90 : 60, // Simple logic
            coordinates: step.geometry,
            completed: false,
            accuracy: 0
        }));

        return {
            id: Date.now().toString(),
            segments,
            totalDistance: Math.round(osrmRoute.distance),
            totalDuration: Math.round(osrmRoute.duration),
            geometry: osrmRoute.geometry
        };
    }

    showRoutePreview(route) {
        this.showScreen('route');
        
        // Update route info
        const distanceEl = document.getElementById('route-distance');
        const segmentsEl = document.getElementById('route-segments');
        const timeEl = document.getElementById('route-time');
        
        if (distanceEl) distanceEl.textContent = `${(route.totalDistance / 1000).toFixed(1)} km`;
        if (segmentsEl) segmentsEl.textContent = route.segments.length;
        if (timeEl) timeEl.textContent = this.formatTime(route.totalDuration);
        
        // Show route on map
        if (window.MapManager && !window.mapManager) {
            window.mapManager = new window.MapManager('map-container');
        }
        if (window.mapManager) {
            window.mapManager.showRoute(route);
        }
    }

    startDrive() {
        if (!this.currentRoute) return;
        
        console.log('🏁 Starting drive...');
        this.showScreen('drive');
        
        // Start GPS tracking
        this.startLocationTracking();
        
        if (window.DriveTracker) {
            this.driveTracker = new window.DriveTracker(this.currentRoute);
            this.driveTracker.start();
        }
        
        // Haptic feedback
        if (this.telegram.HapticFeedback) {
            this.telegram.HapticFeedback.impactOccurred('medium');
        }
        
        if (window.audio) {
            window.audio.driveStart();
        }
    }

    async stopDrive() {
        if (!this.driveTracker) return;
        
        const confirmed = confirm('Are you sure you want to stop the current race?');
        if (!confirmed) return;
        
        console.log('🛑 Stopping drive...');
        
        // Stop GPS tracking
        this.stopLocationTracking();
        
        const results = this.driveTracker.finish();
        await this.saveDriveResults(results);
        this.showResults(results);
        
        this.driveTracker = null;
    }

    async saveDriveResults(results) {
        try {
            console.log('💾 Saving drive results...', results);
            
            // Save to storage
            if (window.Storage) {
                await window.Storage.save('last_drive', results);
                
                // Add to history
                const history = await window.Storage.load('drive_history') || [];
                history.unshift(results);
                history.splice(10); // Keep last 10 drives
                await window.Storage.save('drive_history', history);
                
                // Update personal best
                await this.updatePersonalBest(results);
                
                // Update leaderboard
                if (window.leaderboardManager) {
                    await window.leaderboardManager.submitScore(results, this.user);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to save results:', error);
        }
    }

    async updatePersonalBest(results) {
        if (!window.getDistanceCategory || !window.Storage) return;
        
        const category = window.getDistanceCategory(results.distance);
        const personalBests = await window.Storage.load('personal_bests') || {};
        
        if (!personalBests[category] || results.score > personalBests[category].score) {
            personalBests[category] = results;
            await window.Storage.save('personal_bests', personalBests);
            
            // Achievement notification
            if (this.telegram.HapticFeedback) {
                this.telegram.HapticFeedback.impactOccurred('heavy');
            }
            
            if (window.audio) {
                window.audio.beep(1000, 300);
                setTimeout(() => window.audio.beep(1200, 300), 200);
                setTimeout(() => window.audio.beep(1400, 500), 400);
            }
            
            console.log('🏆 New personal best in', category);
        }
    }

    showResults(results) {
        this.showScreen('results');
        
        // Update basic stats
        const scoreEl = document.getElementById('final-score');
        const accuracyEl = document.getElementById('final-accuracy');
        const distanceEl = document.getElementById('final-distance');
        const segmentsEl = document.getElementById('final-segments');
        const timeEl = document.getElementById('final-time');
        
        if (scoreEl) scoreEl.textContent = window.formatScore ? window.formatScore(results.score || 0) : (results.score || 0);
        if (accuracyEl) {
            const accuracy = Math.round(results.accuracy || 0);
            accuracyEl.textContent = `${accuracy}%`;
            
            // Add grade if available
            if (window.getAccuracyGrade) {
                const grade = window.getAccuracyGrade(accuracy);
                accuracyEl.style.color = grade.color;
                
                // Add grade display
                const gradeEl = accuracyEl.parentElement.querySelector('.grade');
                if (gradeEl) {
                    gradeEl.textContent = grade.text;
                } else {
                    const newGradeEl = document.createElement('span');
                    newGradeEl.className = 'grade';
                    newGradeEl.textContent = grade.text;
                    accuracyEl.parentElement.appendChild(newGradeEl);
                }
            }
        }
        
        if (distanceEl) distanceEl.textContent = `${((results.distance || 0) / 1000).toFixed(1)} km`;
        if (segmentsEl) segmentsEl.textContent = `${results.segmentsCompleted || 0}/${results.totalSegments || this.currentRoute?.segments.length || 0}`;
        if (timeEl) timeEl.textContent = this.formatTime((results.duration || 0) / 1000);
        
        // Check for achievements
        if (window.checkAchievements && window.Storage) {
            window.Storage.load('personal_bests').then(personalBests => {
                const category = window.getDistanceCategory ? window.getDistanceCategory(results.distance) : '10km';
                const achievements = window.checkAchievements(results, personalBests?.[category]);
                
                if (achievements.length > 0) {
                    this.showAchievements(achievements);
                }
            });
        }
        
        // Play completion sound
        if (window.audio) {
            window.audio.driveComplete();
        }
    }

    async showLeaderboard() {
        console.log('🏆 Opening leaderboard...');
        this.showScreen('leaderboard');
        await this.loadLeaderboard('10km');
        
        // Trigger haptic feedback
        if (this.telegram.HapticFeedback) {
            this.telegram.HapticFeedback.impactOccurred('light');
        }
    }

    async loadLeaderboard(category) {
        const listElement = document.getElementById('leaderboard-list');
        if (!listElement) {
            console.error('❌ Leaderboard list element not found');
            return;
        }
        
        listElement.innerHTML = '<div class="loading">Loading rankings...</div>';
        
        try {
            console.log(`📊 Loading leaderboard for ${category}...`);
            
            let leaderboard = [];
            if (window.leaderboardManager) {
                leaderboard = await window.leaderboardManager.getLeaderboard(category);
            }
            
            this.displayLeaderboard(leaderboard);
            
        } catch (error) {
            console.error('❌ Leaderboard load failed:', error);
            listElement.innerHTML = '<div class="error">Failed to load leaderboard</div>';
        }
    }

    displayLeaderboard(leaderboard) {
        const listElement = document.getElementById('leaderboard-list');
        
        if (!leaderboard || leaderboard.length === 0) {
            listElement.innerHTML = '<div class="empty">No races yet in this category</div>';
            return;
        }
        
        console.log('📊 Displaying leaderboard:', leaderboard);
        
        listElement.innerHTML = leaderboard.map((entry, index) => `
            <div class="leaderboard-entry ${entry.userId === this.user?.id ? 'current-user' : ''}">
                <div class="rank">#${entry.rank || index + 1}</div>
                <div class="user-info">
                    <div class="username">${entry.username || 'Anonymous'}</div>
                    <div class="stats">${entry.accuracy || 0}% • ${entry.distance || 0}km</div>
                </div>
                <div class="score">${entry.score || 0}</div>
            </div>
        `).join('');
    }

    switchLeaderboardCategory(category) {
        console.log(`🏆 Switching to ${category} category`);
        
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeTab = document.querySelector(`[data-category="${category}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Load new category
        this.loadLeaderboard(category);
        
        // Haptic feedback
        if (this.telegram.HapticFeedback) {
            this.telegram.HapticFeedback.impactOccurred('light');
        }
    }

    showHistory() {
        console.log('📊 Opening history...');
        alert('📊 Drive history coming soon!\n\nThis will show your past races and improvements.');
    }

    showSettings() {
        console.log('⚙️ Opening settings...');
        alert('⚙️ Settings coming soon!\n\nYou will be able to adjust sound, units, and other preferences.');
    }

    showScreen(screenName) {
        console.log(`📱 Switching to ${screenName} screen`);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        this.currentScreen = screenName;
        
        // Initialize map if showing route screen
        if (screenName === 'route' && window.MapManager && !window.mapManager) {
            window.mapManager = new window.MapManager('map-container');
        }
    }

    showAchievements(achievements) {
        // Create achievement notification
        achievements.forEach((achievement, index) => {
            setTimeout(() => {
                const notification = document.createElement('div');
                notification.className = 'achievement-notification';
                notification.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-content">
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.description}</div>
                    </div>
                `;
                
                document.body.appendChild(notification);
                
                // Show animation
                setTimeout(() => notification.classList.add('show'), 100);
                
                // Remove after 4 seconds
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => document.body.removeChild(notification), 300);
                }, 4000);
                
                // Play achievement sound
                if (window.audio) {
                    window.audio.achievement();
                }
                
            }, index * 1000); // Stagger multiple achievements
        });
    }

    showLoading(message) {
        const loadingScreen = document.querySelector('#loading-screen p');
        if (loadingScreen) {
            loadingScreen.textContent = message;
        }
        this.showScreen('loading');
    }

    showError(message) {
        console.error('❌ Error:', message);
        alert('❌ ' + message);
    }

    updateUserInfo() {
        const usernameEl = document.getElementById('username');
        if (usernameEl && this.user) {
            usernameEl.textContent = this.user.first_name || 'User';
        }
    }

    async loadUserSettings() {
        if (!window.Storage) return;
        
        const settings = await window.Storage.load('user_settings') || {
            sound: true,
            haptic: true,
            units: 'metric'
        };
        
        // Apply settings
        if (window.audio) {
            window.audio.enabled = settings.sound;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    shareResults() {
        if (!this.currentRoute) return;
        
        const message = `🏁 Just completed a ${(this.currentRoute.totalDistance / 1000).toFixed(1)}km race!`;
        
        console.log('📤 Sharing results:', message);
        
        if (this.telegram.openTelegramLink) {
            this.telegram.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(message)}`);
        } else {
            alert('📤 Share: ' + message);
        }
    }
}

// Initialize app when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing app...');
    app = new RacingApp();
    app.init();
});

// Export for debugging
window.app = app;
