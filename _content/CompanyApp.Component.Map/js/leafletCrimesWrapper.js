/// <reference path="leafletwrapper.js" />
// Crime Investigation Functions

// Store investigation markers and arrows
let investigationMarkers = L.featureGroup();
let directionArrows = L.featureGroup();

// Add investigation location with custom icon and metadata
export function addInvestigationLocation(lat, lng, title, description, type = 'crime-scene', options = {}) {
    // Custom icons for different investigation types
    const iconTypes = {
        'crime-scene': L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        'evidence': L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        'witness': L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        'suspect': L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    };

    const icon = iconTypes[type] || iconTypes['crime-scene'];

    const marker = L.marker([lat, lng], {
        icon: icon,
        ...options
    }).addTo(investigationMarkers);

    const popupContent = `
        <div class="investigation-popup">
            <h4>${title}</h4>
            <p>${description}</p>
            <small>Type: ${type}</small>
        </div>
    `;

    marker.bindPopup(popupContent);
    investigationMarkers.addTo(map);

    // Store metadata
    marker._investigationData = {
        title,
        description,
        type,
        timestamp: new Date().toISOString()
    };

    return marker;
}

// Create directional arrow between two points
export function addDirectionArrow(fromLat, fromLng, toLat, toLng, label = '', color = '#ff0000', options = {}) {
    const fromPoint = L.latLng(fromLat, fromLng);
    const toPoint = L.latLng(toLat, toLng);

    // Calculate bearing (direction)
    const bearing = calculateBearing(fromLat, fromLng, toLat, toLng);

    // Create arrow using polyline with arrowhead
    const arrow = L.polyline([fromPoint, toPoint], {
        color: color,
        weight: options.weight || 3,
        opacity: options.opacity || 0.8,
        dashArray: options.dashArray || '5,10',
        ...options
    }).addTo(directionArrows);

    // Add arrowhead at the end
    const arrowhead = createArrowhead(toPoint, bearing, color, options.arrowSize || 15);
    arrowhead.addTo(directionArrows);

    // Add midpoint for label
    const midPoint = calculateMidpoint(fromPoint, toPoint);
    if (label) {
        const labelMarker = L.marker(midPoint, {
            icon: L.divIcon({
                className: 'direction-label',
                html: `<div style="background: white; padding: 2px 5px; border: 1px solid ${color}; border-radius: 3px; font-size: 12px;">${label}</div>`,
                iconSize: [null, null],
                iconAnchor: [0, 0]
            })
        }).addTo(directionArrows);
    }

    directionArrows.addTo(map);

    return { arrow, arrowhead, bearing };
}

// Calculate bearing between two points
function calculateBearing(fromLat, fromLng, toLat, toLng) {
    const ?1 = fromLat * Math.PI / 180;
    const ?2 = toLat * Math.PI / 180;
    const ?? = (toLng - fromLng) * Math.PI / 180;

    const y = Math.sin(??) * Math.cos(?2);
    const x = Math.cos(?1) * Math.sin(?2) - Math.sin(?1) * Math.cos(?2) * Math.cos(??);
    const ? = Math.atan2(y, x);

    return (? * 180 / Math.PI + 360) % 360;
}

// Create arrowhead marker
function createArrowhead(point, bearing, color, size) {
    return L.marker(point, {
        icon: L.divIcon({
            className: 'arrowhead',
            html: `
                <div style="
                    width: 0; 
                    height: 0; 
                    border-left: ${size / 2}px solid transparent;
                    border-right: ${size / 2}px solid transparent;
                    border-bottom: ${size}px solid ${color};
                    transform: rotate(${bearing}deg);
                    transform-origin: 50% 50%;
                "></div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        })
    });
}

// Calculate midpoint between two points
function calculateMidpoint(point1, point2) {
    return L.latLng(
        (point1.lat + point2.lat) / 2,
        (point1.lng + point2.lng) / 2
    );
}

// Add multiple directional arrows (for paths/routes)
export function addInvestigationPath(points, label = 'Investigation Path', color = '#ff6b00', options = {}) {
    const path = L.polyline(points, {
        color: color,
        weight: options.weight || 4,
        opacity: options.opacity || 0.7,
        ...options
    }).addTo(directionArrows);

    // Add arrows along the path
    for (let i = 0; i < points.length - 1; i++) {
        addDirectionArrow(
            points[i].lat, points[i].lng,
            points[i + 1].lat, points[i + 1].lng,
            i === 0 ? label : '',
            color,
            { weight: 2, opacity: 0.6, arrowSize: 10, ...options }
        );
    }

    directionArrows.addTo(map);
    return path;
}

// Create investigation zone (radius around point)
export function addInvestigationZone(lat, lng, radius, label = 'Investigation Zone', color = '#ff0000', options = {}) {
    const zone = L.circle([lat, lng], {
        radius: radius,
        color: color,
        fillColor: color,
        fillOpacity: options.fillOpacity || 0.1,
        weight: options.weight || 2,
        ...options
    }).addTo(map);

    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'zone-marker',
            html: `<div style="background: ${color}; color: white; padding: 5px; border-radius: 3px; font-size: 12px;">${label}</div>`,
            iconSize: [null, null],
            iconAnchor: [0, 0]
        })
    }).addTo(investigationMarkers);

    investigationMarkers.addTo(map);
    return { zone, marker };
}

// Clear all investigation markers and arrows
export function clearInvestigationData() {
    map.removeLayer(investigationMarkers);
    map.removeLayer(directionArrows);
    investigationMarkers = L.featureGroup();
    directionArrows = L.featureGroup();
}

// Get investigation data as GeoJSON
export function getInvestigationGeoJson() {
    return {
        markers: investigationMarkers.toGeoJSON(),
        arrows: directionArrows.toGeoJSON()
    };
}

// Load investigation data from GeoJSON
export function loadInvestigationGeoJson(geoJsonData) {
    if (geoJsonData.markers) {
        L.geoJSON(geoJsonData.markers, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: feature.properties.iconUrl,
                        iconSize: feature.properties.iconSize,
                        iconAnchor: feature.properties.iconAnchor
                    })
                });
            },
            onEachFeature: function (feature, layer) {
                if (feature.properties.popup) {
                    layer.bindPopup(feature.properties.popup);
                }
            }
        }).addTo(investigationMarkers);
    }

    if (geoJsonData.arrows) {
        L.geoJSON(geoJsonData.arrows).addTo(directionArrows);
    }

    investigationMarkers.addTo(map);
    directionArrows.addTo(map);
}

// Add time-based animation for investigation sequence
export function addTimelineAnimation(points, interval = 2000) {
    let currentIndex = 0;
    const timelineMarkers = [];

    points.forEach((point, index) => {
        const marker = addInvestigationLocation(
            point.lat, point.lng,
            `Timeline Point ${index + 1}`,
            point.description || `Event at ${new Date(point.timestamp).toLocaleString()}`,
            point.type || 'evidence',
            { opacity: 0.3 }
        );
        timelineMarkers.push(marker);
    });

    function animateNext() {
        if (currentIndex > 0) {
            timelineMarkers[currentIndex - 1].setOpacity(0.3);
        }

        if (currentIndex < timelineMarkers.length) {
            timelineMarkers[currentIndex].setOpacity(1);
            timelineMarkers[currentIndex].openPopup();
            currentIndex++;
            setTimeout(animateNext, interval);
        }
    }

    return {
        start: () => animateNext(),
        stop: () => currentIndex = timelineMarkers.length,
        reset: () => {
            currentIndex = 0;
            timelineMarkers.forEach(marker => marker.setOpacity(0.3));
        }
    };
}