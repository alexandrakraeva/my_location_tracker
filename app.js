const socket = io();

socket.on('lux', function (data) {
    document.getElementById('luxValue').textContent = `Lux: ${data.value}`;
});