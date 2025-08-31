// map.js - Map management with Leaflet
class MapManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.route = null;
        this.routeLayer = null;
        this.markersLayer = null;
        
        this.initializeMap();
    }

    initializeMap() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Map container '${this.containerId}' not found`);
            return;
        }

        // Initialize Leaflet map
        this.map = L.map(this.containerId, {
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true,
            doubleClickZoom: false
        }).setView([55.7558, 37.6176], 13); // Default to Moscow

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Create layers for route and markers
        this.routeLayer = L.layerGroup().addTo(this.map);
        this.markersLayer = L.layerGroup().addTo(this.map);

        console.log('🗺️ Map initialized');
    }

    showRoute(route) {
        if (!this.map || !route) return;
        
        // Clear existing route
        this.clearRoute();
        
        this.route = route;
        
        try {
            // Decode OSRM geometry (polyline)
            const coordinates = this.decodePolyline(route.geometry);
            
            if (coordinates && coordinates.length > 0) {
                // Create route polyline
                const routeLine = L.polyline(coordinates, {
                    color: '#2196F3',
                    weight: 6,
                    opacity: 0.8,
                    lineJoin: 'round'
                });
                
                this.routeLayer.addLayer(routeLine);
                
                // Add start marker
                const startIcon = L.divIcon({
                    className: 'route-marker start-marker',
                    html: '🏁',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                const startMarker = L.marker(coordinates[0], { icon: startIcon });
                this.markersLayer.addLayer(startMarker);
                
                // Add end marker
                const endIcon = L.divIcon({
                    className: 'route-marker end-marker',
                    html: '🏆',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                const endMarker = L.marker(coordinates[coordinates.length - 1], { icon: endIcon });
                this.markersLayer.addLayer(endMarker);
                
                // Fit map to route
                this.map.fitBounds(routeLine.getBounds(), {
                    padding: [20, 20]
                });
                
                console.log('🗺️ Route displayed on map');
            }
        } catch (error) {
            console.error('❌ Error displaying route:', error);
            // Fallback: show start and end points only
            this.showRoutePoints(route);
        }
    }
    
    showRoutePoints(route) {
        // Fallback method - just show start and end points
        if (!route.segments || route.segments.length === 0) return;
        
        // Get approximate start/end from first/last segments
        // This is a simplified implementation
        const startIcon = L.divIcon({
            className: 'route-marker start-marker',
            html: '🏁',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const endIcon = L.divIcon({
            className: 'route-marker end-marker', 
            html: '🏆',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        // For demo purposes, use Moscow coordinates
        const startMarker = L.marker([55.7558, 37.6176], { icon: startIcon });
        const endMarker = L.marker([55.7658, 37.6276], { icon: endIcon });
        
        this.markersLayer.addLayer(startMarker);
        this.markersLayer.addLayer(endMarker);
        
        // Center map
        this.map.setView([55.7608, 37.6226], 14);
    }

    decodePolyline(encoded) {
        if (!encoded) return [];
        
        try {
            // Simple polyline decoder for OSRM format
            let index = 0;
            const len = encoded.length;
            let lat = 0;
            let lng = 0;
            const coordinates = [];

            while (index < len) {
                let b, shift = 0, result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lat += deltaLat;

                shift = 0;
                result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lng += deltaLng;

                coordinates.push([lat / 1e5, lng / 1e5]);
            }

            return coordinates;
        } catch (error) {
            console.error('❌ Polyline decode error:', error);
            return [];
        }
    }

    clearRoute() {
        if (this.routeLayer) {
            this.routeLayer.clearLayers();
        }
        if (this.markersLayer) {
            this.markersLayer.clearLayers();
        }
        this.route = null;
    }

    updateUserLocation(lat, lng) {
        if (!this.map) return;
        
        // Remove existing user marker
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }
        
        // Add new user marker
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '🔵',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
    }

    centerOnUser(lat, lng) {
        if (this.map) {
            this.map.setView([lat, lng], 16);
        }
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}

// Make MapManager globally available
window.MapManager = MapManager;