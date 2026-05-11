// leafletWrapper.js - Extended Leaflet wrapper for Blazor

// Initialize the map
let map; // Global map
let baseLayers = {};
let overlays = {};
let compareControls = {};
let layerControl = null;
let currentBaseLayer = 'osm';
let miniMapControl = null;

function createMap(elementId, lat, lng, zoom) {
    map = L.map(elementId).setView([lat, lng], zoom);

    // Create base layers
    baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    });

    // Add layer control (base + overlays)
    layerControl = L.control.layers(baseLayers, overlays).addTo(map);

    return map;
}

// Switch between map types
function setMapType(mapType) {
    if (baseLayers[currentBaseLayer]) {
        map.removeLayer(baseLayers[currentBaseLayer]);
    }

    if (baseLayers[mapType]) {
        map.addLayer(baseLayers[mapType]);
        currentBaseLayer = mapType;
    }
}

// Add a marker
function addMarker(lat, lng, popupText) {
    const marker = L.marker([lat, lng]).addTo(map); // Uses global `map`
    if (popupText) marker.bindPopup(popupText).openPopup();
    return marker;
}

// Add a circle (with customizable options)
function addCircle(lat, lng, radius, options = {}) {
    const circle = L.circle([lat, lng], {
        radius: radius,
        color: options.color || 'red',
        fillColor: options.fillColor || '#f03',
        fillOpacity: options.fillOpacity || 0.5,
        weight: options.weight || 2,
        ...options
    }).addTo(map);
    return circle;
}

// Add a polygon (accepts array of LatLng points)
function addPolygon(latLngs, options = {}) {
    const polygon = L.polygon(latLngs, {
        color: options.color || 'blue',
        fillColor: options.fillColor || options.color || 'blue',
        fillOpacity: options.fillOpacity || 0.5,
        weight: options.weight || 2,
        ...options
    }).addTo(map);
    return polygon;
}

// Add a polyline (accepts array of LatLng points)
function addPolyline(latLngs, options = {}) {
    const polyline = L.polyline(latLngs, {
        color: options.color || 'green',
        weight: options.weight || 3,
        ...options
    }).addTo(map);
    return polyline;
}

// Add a structure with customizable color and border width
function addStructure(latLngs, color = 'blue', borderWidth = 2, options = {}) {
    const structure = L.polygon(latLngs, {
        color: color,
        weight: borderWidth,
        fillColor: color,
        fillOpacity: options.fillOpacity || 0.5,
        opacity: options.opacity || 1.0,
        ...options
    }).addTo(map);

    return structure;
}

// Add a rectangle structure with customizable color and border width
function addRectangleStructure(bounds, color = 'blue', borderWidth = 2, options = {}) {
    const rectangle = L.rectangle(bounds, {
        color: color,
        weight: borderWidth,
        fillColor: color,
        fillOpacity: options.fillOpacity || 0.5,
        opacity: options.opacity || 1.0,
        ...options
    }).addTo(map);

    return rectangle;
}

// Render GeoJSON data
function addGeoJson(geoJsonData, options = {}) {
    //const geoJsonLayer = L.geoJSON(geoJsonData, {
    //    style: options.style || { color: 'purple' },
    //    onEachFeature: options.onEachFeature,
    //    ...options
    //}).addTo(map);
    //return geoJsonLayer;
    const geoJsonLayer = L.geoJSON(geoJsonData, {
        style: options.style || { color: 'purple' },
        onEachFeature: options.onEachFeature,
        ...(options.style ? {} : { style: { color: 'purple' } }) // Alternative approach
    }).addTo(map);
    return geoJsonLayer;
}

function addGeoJsonWithPopup(geoJsonData, popupTemplate) {
    return L.geoJSON(geoJsonData, {
        onEachFeature: function (feature, layer) {
            if (feature.properties && popupTemplate) {
                let popupContent = popupTemplate;
                for (const prop in feature.properties) {
                    popupContent = popupContent.replace(`{${prop}}`, feature.properties[prop]);
                }
                layer.bindPopup(popupContent);
            }
        }
    }).addTo(map);
}

// Remove a layer (marker, circle, polygon, etc.)
function removeLayer(layer) {
    map.removeLayer(layer);
}

// Clear all layers except base tiles
function clearMap() {
    map.eachLayer(layer => {
        if (!layer._url && !baseLayers.osm && !baseLayers.satellite) {
            map.removeLayer(layer);
        }
    });
}

// Drawing Tools with parameter support
let drawControl;
let drawEnabled;
let drawnItems = L.featureGroup();

function initDrawTools(lineColor = '#3388ff', fillColor = '#3388ff', lineWeight = 2) {
    // Clear existing drawn items if any
    if (drawnItems) {
        map.removeLayer(drawnItems);
    }

    drawnItems = L.featureGroup().addTo(map);

    // Remove existing draw control if any
    if (drawControl) {
        map.removeControl(drawControl);
    }

    drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polygon: {
                shapeOptions: {
                    color: lineColor,
                    fillColor: fillColor,
                    weight: lineWeight,
                    fillOpacity: 0.2
                }
            },
            polyline: {
                shapeOptions: {
                    color: lineColor,
                    weight: lineWeight
                }
            },
            rectangle: {
                shapeOptions: {
                    color: lineColor,
                    fillColor: fillColor,
                    weight: lineWeight,
                    fillOpacity: 0.2
                }
            },
            circle: {
                shapeOptions: {
                    color: lineColor,
                    fillColor: fillColor,
                    weight: lineWeight,
                    fillOpacity: 0.2
                }
            },
            marker: {
                icon: L.icon({
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }
        },
        edit: {
            featureGroup: drawnItems
        }
    }).addTo(map);

    drawEnabled = true;

    // Clear previous event listeners
    map.off(L.Draw.Event.CREATED);

    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
    });
}

// Advanced configuration function
function initDrawToolsAdvanced(options) {
    const defaultOptions = {
        lineColor: '#3388ff',
        fillColor: '#3388ff',
        lineWeight: 2,
        fillOpacity: 0.2,
        position: 'topright',
        enablePolygon: true,
        enablePolyline: true,
        enableRectangle: true,
        enableCircle: true,
        enableMarker: true
    };

    const config = { ...defaultOptions, ...options };

    // Clear existing
    if (drawnItems) {
        map.removeLayer(drawnItems);
    }
    drawnItems = L.featureGroup().addTo(map);

    if (drawControl) {
        map.removeControl(drawControl);
    }

    const drawConfig = {
        position: config.position,
        draw: {},
        edit: {
            featureGroup: drawnItems
        }
    };

    if (config.enablePolygon) {
        drawConfig.draw.polygon = {
            shapeOptions: {
                color: config.lineColor,
                fillColor: config.fillColor,
                weight: config.lineWeight,
                fillOpacity: config.fillOpacity
            }
        };
    }

    if (config.enablePolyline) {
        drawConfig.draw.polyline = {
            shapeOptions: {
                color: config.lineColor,
                weight: config.lineWeight
            }
        };
    }

    if (config.enableRectangle) {
        drawConfig.draw.rectangle = {
            shapeOptions: {
                color: config.lineColor,
                fillColor: config.fillColor,
                weight: config.lineWeight,
                fillOpacity: config.fillOpacity
            }
        };
    }

    if (config.enableCircle) {
        drawConfig.draw.circle = {
            shapeOptions: {
                color: config.lineColor,
                fillColor: config.fillColor,
                weight: config.lineWeight,
                fillOpacity: config.fillOpacity
            }
        };
    }

    if (config.enableMarker) {
        drawConfig.draw.marker = {
            icon: L.icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        };
    }

    drawControl = new L.Control.Draw(drawConfig).addTo(map);

    drawEnabled = true;

    map.off(L.Draw.Event.CREATED);
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
    });
}

function updateDrawToolsStyle(lineColor, fillColor, lineWeight, fillOpacity = 0.2) {
    // Reinitialize with new styles
    initDrawTools(lineColor, fillColor, lineWeight);
}

function enableDrawing() {
    if (!drawControl) return;
    if (!drawEnabled) {
        drawControl.addTo(map);
        drawEnabled = true;
    }
}

function disableDrawing() {
    if (!drawControl) return;
    if (drawEnabled) {
        drawControl.remove();
        drawEnabled = false;
    }
}

function clearAllDrawn() {
    drawnItems.clearLayers();
}

function getDrawnGeoJson() {
    return JSON.stringify(drawnItems.toGeoJSON());
}

// Tile overlay management (NDVI etc.)
function addTileLayer(key, urlTemplate, options = {}) {
    if (!overlays) overlays = {};
    if (overlays[key]) {
        if (map.hasLayer(overlays[key])) map.removeLayer(overlays[key]);
        delete overlays[key];
    }
    const tileLayer = L.tileLayer(urlTemplate, options).addTo(map);
    overlays[key] = tileLayer;
    if (layerControl) { layerControl.remove(); }
    layerControl = L.control.layers(baseLayers, overlays).addTo(map);
    return tileLayer;
}

function removeTileLayer(key) {
    if (overlays && overlays[key]) {
        if (map.hasLayer(overlays[key])) map.removeLayer(overlays[key]);
        delete overlays[key];
        if (layerControl) { layerControl.remove(); layerControl = L.control.layers(baseLayers, overlays).addTo(map); }
    }
}

function setTileLayerVisibility(key, visible) {
    if (!overlays || !overlays[key]) return;
    const layer = overlays[key];
    if (visible) {
        if (!map.hasLayer(layer)) map.addLayer(layer);
    } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
    }
}

// Compare layers: add two tile layers and provide an opacity slider to compare
function addCompareLayers(keyA, urlA, keyB, urlB, options = {}) {
    if (!overlays) overlays = {};

    // Remove existing layers with same keys
    if (overlays[keyA]) { if (map.hasLayer(overlays[keyA])) map.removeLayer(overlays[keyA]); delete overlays[keyA]; }
    if (overlays[keyB]) { if (map.hasLayer(overlays[keyB])) map.removeLayer(overlays[keyB]); delete overlays[keyB]; }

    const opts = options || {};
    const layerA = L.tileLayer(urlA, opts).addTo(map);
    const layerB = L.tileLayer(urlB, opts).addTo(map);
    if (layerB && typeof layerB.setZIndex === 'function') layerB.setZIndex(1000);
    layerB.setOpacity((opts && opts.opacity) ? opts.opacity : 0.5);

    overlays[keyA] = layerA;
    overlays[keyB] = layerB;

    if (layerControl) { layerControl.remove(); }
    layerControl = L.control.layers(baseLayers, overlays).addTo(map);

    const controlId = 'compare-control-' + keyA + '-' + keyB;
    // Remove existing control if any
    if (compareControls[controlId]) {
        map.removeControl(compareControls[controlId].control);
        delete compareControls[controlId];
    }

    const CompareControl = L.Control.extend({
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.background = 'rgba(255,255,255,0.95)';
            container.style.padding = '6px';
            container.style.borderRadius = '4px';
            container.style.minWidth = '220px';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '8px';

            const label = L.DomUtil.create('div', '', container);
            label.innerHTML = 'Compare:';

            const slider = L.DomUtil.create('input', '', container);
            slider.type = 'range';
            slider.min = 0;
            slider.max = 100;
            slider.value = Math.round((layerB.options && layerB.options.opacity) ? layerB.options.opacity * 100 : 50);
            slider.style.width = '120px';
            slider.oninput = function (e) {
                const v = e.target.value;
                layerB.setOpacity(v / 100);
            };
            // Prevent map interactions when using control
            L.DomEvent.disableClickPropagation(container);
            return container;
        },
        onRemove: function (map) {
        }
    });

    const compareControl = new CompareControl({ position: 'bottomleft' });
    map.addControl(compareControl);
    compareControls[controlId] = { control: compareControl, layerAKey: keyA, layerBKey: keyB };
    return compareControl;
}

function removeCompareLayers(keyA, keyB) {
    if (overlays && overlays[keyA]) {
        if (map.hasLayer(overlays[keyA])) map.removeLayer(overlays[keyA]);
        delete overlays[keyA];
    }
    if (overlays && overlays[keyB]) {
        if (map.hasLayer(overlays[keyB])) map.removeLayer(overlays[keyB]);
        delete overlays[keyB];
    }
    if (layerControl) { layerControl.remove(); layerControl = L.control.layers(baseLayers, overlays).addTo(map); }
    const controlId = 'compare-control-' + keyA + '-' + keyB;
    if (compareControls[controlId]) {
        map.removeControl(compareControls[controlId].control);
        delete compareControls[controlId];
    }
}

function setCompareOpacity(key, opacity) {
    if (overlays && overlays[key]) {
        overlays[key].setOpacity(opacity);
    }
}

function addDrawnFromGeoJson(geoJson) {
    L.geoJSON(geoJson, {
        onEachFeature: function (feature, layer) {
            drawnItems.addLayer(layer);
        }
    });
}
// Sample polygon mean NDVI from tile server (client-side sampling)
async function samplePolygonMeanNdvi(polygonCoords, tileTemplate, zoom, options = {}) {
    // options: { step: pixelStep, tileSize: 256, decode: 'redToNdvi'|'grayscale', date: 'yyyy-MM-dd', latLngOrder: 'latlng' }
    const tileSize = options.tileSize || 256;
    const step = options.step || 6;
    const decode = options.decode || 'redToNdvi';
    const latLngOrder = options.latLngOrder || 'latlng'; // 'latlng' (lat,lon) or 'lnglat' (lon,lat)

    if (!zoom && map && typeof map.getZoom === 'function') zoom = map.getZoom();
    if (zoom === undefined || zoom === null) zoom = options.zoom || 13;

    // normalize coordinates
    let coords = null;
    if (!polygonCoords) return null;
    if (polygonCoords.type === 'Feature') coords = polygonCoords.geometry.coordinates[0];
    else if (polygonCoords.type === 'Polygon') coords = polygonCoords.coordinates[0];
    else coords = polygonCoords;

    if (!coords || coords.length === 0) return null;

    // ensure coords are in [lat, lon] if latLngOrder == 'latlng'
    let polyLonLat = coords.map(p => {
        if (latLngOrder === 'latlng') {
            return [p[1], p[0]]; // [lon, lat]
        }
        return [p[0], p[1]]; // assume [lon, lat]
    });

    // compute bbox
    let lonMin = 180, lonMax = -180, latMin = 90, latMax = -90;
    polyLonLat.forEach(p => {
        const lon = p[0], lat = p[1];
        if (lon < lonMin) lonMin = lon;
        if (lon > lonMax) lonMax = lon;
        if (lat < latMin) latMin = lat;
        if (lat > latMax) latMax = lat;
    });

    function lon2tile(lon, z) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); }
    function lat2tile(lat, z) { const rad = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z)); }

    const xMin = lon2tile(lonMin, zoom);
    const xMax = lon2tile(lonMax, zoom);
    const yMin = lat2tile(latMax, zoom);
    const yMax = lat2tile(latMin, zoom);

    function buildTileUrl(tpl, x, y, z, date) {
        let url = tpl.replace(/{x}/gi, x).replace(/{y}/gi, y).replace(/{z}/gi, z);
        url = url.replace(/{tilecol}/gi, x).replace(/{tilerow}/gi, y).replace(/{tilematrix}/gi, z).replace(/{TILECOL}/g, x).replace(/{TILEROW}/g, y).replace(/{TILEMATRIX}/g, z);
        if (date) url = url.replace(/{date}/gi, date);
        return url;
    }

    function loadImage(url) {
        return new Promise((resolve) => {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = url;
            } catch (e) { resolve(null); }
        });
    }

    function pixelToLatLon(tileX, tileY, z, px, py, tSize) {
        const n = Math.pow(2, z);
        const lon = (tileX + px / tSize) / n * 360 - 180;
        const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tileY + py / tSize) / n)));
        const lat = latRad * 180 / Math.PI;
        return { lat, lon };
    }

    function pointInPolygon(lon, lat, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            const intersect = ((yi > lat) != (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi + 0.0) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function decodePixelToNdvi(data, decodeType) {
        if (!data || data.length < 3) return null;
        const r = data[0], g = data[1], b = data[2];
        switch (decodeType) {
            case 'redToNdvi':
                return (r / 255) * 2 - 1;
            case 'greenToNdvi':
                return (g / 255) * 2 - 1;
            case 'blueToNdvi':
                return (b / 255) * 2 - 1;
            case 'grayscale':
                const v = (r + g + b) / 3;
                return (v / 255) * 2 - 1;
            case 'raw':
                return r;
            default:
                // allow custom mapping via numeric scale
                return (r / 255) * 2 - 1;
        }
    }

    let sum = 0;
    let count = 0;

    for (let tx = xMin; tx <= xMax; tx++) {
        for (let ty = yMin; ty <= yMax; ty++) {
            const url = buildTileUrl(tileTemplate, tx, ty, zoom, options.date);
            const img = await loadImage(url);
            if (!img) continue;
            const canvas = document.createElement('canvas');
            canvas.width = tileSize;
            canvas.height = tileSize;
            const ctx = canvas.getContext('2d');
            try {
                ctx.drawImage(img, 0, 0);
            } catch (e) { continue; }

            for (let py = 0; py < tileSize; py += step) {
                for (let px = 0; px < tileSize; px += step) {
                    const { lat, lon } = pixelToLatLon(tx, ty, zoom, px, py, tileSize);
                    if (!pointInPolygon(lon, lat, polyLonLat)) continue;
                    let pixel;
                    try { pixel = ctx.getImageData(px, py, 1, 1).data; } catch (e) { pixel = null; }
                    const ndvi = decodePixelToNdvi(pixel, decode);
                    if (ndvi !== null && !isNaN(ndvi)) { sum += ndvi; count++; }
                }
            }
        }
    }

    if (count === 0) return null;
    return sum / count;
}

// Add MiniMap control
function addMiniMap(miniMapLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', options = {}) {
    // Remove existing miniMap if any
    if (miniMapControl) {
        map.removeControl(miniMapControl);
    }

    const defaultOptions = {
        toggleDisplay: true,
        position: 'bottomright',
        width: 150,
        height: 150,
        collapsedWidth: 19,
        collapsedHeight: 19,
        zoomLevelOffset: -5,
        zoomLevelFixed: false,
        centerFixed: false,
        zoomAnimation: true,
        autoToggleDisplay: false,
        minimized: false,
        strings: { hideText: 'Hide MiniMap', showText: 'Show MiniMap' }
    };

    const config = { ...defaultOptions, ...options };

    const mbAttr = '© OpenStreetMap contributors';
    const miniMapLayer = new L.TileLayer(miniMapLayerUrl, {
        minZoom: 0,
        maxZoom: 13,
        attribution: mbAttr
    });

    miniMapControl = new L.Control.MiniMap(miniMapLayer, config).addTo(map);
    return miniMapControl;
}

// Remove MiniMap control
function removeMiniMap() {
    if (miniMapControl) {
        map.removeControl(miniMapControl);
        miniMapControl = null;
    }
}

// Toggle MiniMap visibility
function toggleMiniMap() {
    if (miniMapControl) {
        miniMapControl._toggleDisplay();
    }
}
// Keep the setupMapClick function
function setupMapClick(dotNetReference) {
    map.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        dotNetReference.invokeMethodAsync('OnMapClick', lat, lng);
    });
}

// Export all functions for ES6 module usage
export {
    createMap,
    setMapType,
    addMarker,
    addCircle,
    addPolygon,
    addPolyline,
    addStructure,
    addRectangleStructure,
    addGeoJson,
    addGeoJsonWithPopup,
    removeLayer,
    clearMap,
    initDrawTools,
    initDrawToolsAdvanced,
    updateDrawToolsStyle,
    enableDrawing,
    disableDrawing,
    clearAllDrawn,
    getDrawnGeoJson,
    addDrawnFromGeoJson,
    addMiniMap,
    removeMiniMap,
    toggleMiniMap,
    setupMapClick
};

// Also expose to window for backward compatibility
window.createMap = createMap;
window.setMapType = setMapType;
window.addMarker = addMarker;
window.addCircle = addCircle;
window.addPolygon = addPolygon;
window.addPolyline = addPolyline;
window.addStructure = addStructure;
window.addRectangleStructure = addRectangleStructure;
window.addGeoJson = addGeoJson;
window.addGeoJsonWithPopup = addGeoJsonWithPopup;
window.removeLayer = removeLayer;
window.clearMap = clearMap;
window.initDrawTools = initDrawTools;
window.initDrawToolsAdvanced = initDrawToolsAdvanced;
window.updateDrawToolsStyle = updateDrawToolsStyle;
window.enableDrawing = enableDrawing;
window.disableDrawing = disableDrawing;
window.clearAllDrawn = clearAllDrawn;
window.getDrawnGeoJson = getDrawnGeoJson;
window.addDrawnFromGeoJson = addDrawnFromGeoJson;
window.addMiniMap = addMiniMap;
window.removeMiniMap = removeMiniMap;
window.toggleMiniMap = toggleMiniMap;
window.setupMapClick = setupMapClick;