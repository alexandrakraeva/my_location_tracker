const socket = io(); // Connection to server through WebSocket
let map; // Variable that holds map object
let marker; // Variable that holds map marker

function initMap() {
    const blackWhiteStyle = [
        { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
        { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
        {
            featureType: 'administrative.land_parcel',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#bdbdbd' }],
        },
        {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#eeeeee' }],
        },
        {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#757575' }],
        },
        {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#e5e5e5' }],
        },
        {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9e9e9e' }],
        },
        {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#ffffff' }],
        },
        {
            featureType: 'road.arterial',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#757575' }],
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#dadada' }],
        },
        {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#616161' }],
        },
        {
            featureType: 'road.local',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9e9e9e' }],
        },
        {
            featureType: 'transit.line',
            elementType: 'geometry',
            stylers: [{ color: '#e5e5e5' }],
        },
        {
            featureType: 'transit.station',
            elementType: 'geometry',
            stylers: [{ color: '#eeeeee' }],
        },
        {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#c9c9c9' }],
        },
        {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9e9e9e' }],
        },
    ];

    // initialize + apply style from above
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

document.getElementById('saveButton').addEventListener('click', () => {
    const thingSpeakChannelId = 2435543; // Replace with your actual ThingSpeak Channel ID
    const apiKey = 'RKJ773VUWA0MM5GF'; // Optional: Include only if your channel is private

    // Construct the URL for CSV download
    let downloadUrl = `https://api.thingspeak.com/channels/${thingSpeakChannelId}/feeds.csv?api_key=${apiKey}&results=8000`;

    // Create a temporary link to programmatically click for download
    const tempLink = document.createElement('a');
    tempLink.href = downloadUrl;
    tempLink.setAttribute('download', `channel_${thingSpeakChannelId}_data.csv`);
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
});

// Initialize map and set interval for location updates
initMap();
setInterval(updateLocation, 3000); // Update location every 3 seconds