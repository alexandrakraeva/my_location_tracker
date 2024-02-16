const socket = io(); // connection to server through WebSocketing
let map; // variable that holds map obj
let marker; // variable that holds map marker



function initMap() {
    // the style of the map (Google Maps API)
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
        center: { lat: 41.390205, lng: 2.154007 },
        zoom: 18,
        styles: blackWhiteStyle,
    });

    // hide Google Maps controllers for cleaner view of the map
    map.setOptions({
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
    });

    // target HTML to display "Loading..." first
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Loading...</div>';
}


function updateLocation() {
    if (navigator.geolocation) { // check if browser supports geolocation
        navigator.geolocation.getCurrentPosition((position) => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: new Date().toISOString() // Add timestamp
            };

            // define style of Location Marker
            const blackCircleIcon = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#000000",
                fillOpacity: 1.0,
                strokeWeight: 1,
                strokeColor: "#FFFFFF",
            };

            // check if marker exists -> update the pos
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

            // fades out initial "Loading..." when the first coordinates are recieved
            const overlay = document.getElementById('overlay');
            overlay.style.opacity = '0';

            overlay.addEventListener('transitionend', function () {
                overlay.style.display = 'none';
            }, { once: true });

            map.setCenter(pos);

            fetch('/api/location-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pos),
            })
                .then(response => response.json())
                .then(data => console.log('Location update successful:', data))
                .catch((error) => console.error('Error updating location:', error));
        }, (error) => {
            console.error('Error getting location:', error);
        });
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
}

// to the save button to save .csv
document.getElementById('saveButton').addEventListener('click', () => {
    // Logic to trigger CSV download, potentially by redirecting to the '/download-csv' endpoint
    window.location.href = '/download-csv'; // This might need parameters or session handling
});


///////
initMap();
setInterval(updateLocation, 3000); // updates location each 10 sec