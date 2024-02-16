const socket = io(); // Connection to server through WebSocket
let map; // Variable that holds map object
let marker; // Variable that holds map marker

function initMap() {
    const blackWhiteStyle = [/* Your map style array */];

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 41.390205, lng: 2.154007 }, // Default center
        zoom: 18,
        styles: blackWhiteStyle,
    });

    map.setOptions({
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
    });

    // Initial loading overlay
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Loading...</div>';
}

function updateLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            // Marker style
            const blackCircleIcon = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#000000",
                fillOpacity: 1.0,
                strokeWeight: 1,
                strokeColor: "#FFFFFF",
            };

            if (!marker) {
                marker = new google.maps.Marker({
                    position: pos,
                    map: map,
                    icon: blackCircleIcon,
                });
            } else {
                marker.setPosition(pos);
                marker.setIcon(blackCircleIcon);
            }

            // Remove loading overlay
            const overlay = document.getElementById('overlay');
            overlay.style.opacity = '0';
            overlay.addEventListener('transitionend', () => overlay.style.display = 'none', { once: true });

            map.setCenter(pos);

            // Emit location update to server
            socket.emit('locationUpdate', { latitude: pos.lat, longitude: pos.lng });
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
}

// Initialize map and set interval for location updates
initMap();
setInterval(updateLocation, 10000); // Update location every 10 seconds
