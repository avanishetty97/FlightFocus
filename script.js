const locations = {
    "Abu Dhabi": [24.4539, 54.3773], "Addis Ababa": [8.9806, 38.7578], "Amsterdam": [52.3676, 4.9041],
    "Auckland": [-36.8485, 174.7633], "Bangkok": [13.7563, 100.5018], "Barcelona": [41.3851, 2.1734],
    "Beijing": [39.9042, 116.4074], "Bengaluru": [12.9716, 77.5946], "Berlin": [52.5200, 13.4050],
    "Bogota": [4.7110, -74.0721], "Boston": [42.3601, -71.0589], "Brussels": [50.8503, 4.3517],
    "Buenos Aires": [-34.6037, -58.3816], "Cairo": [30.0444, 31.2357], "Cape Town": [-33.9249, 18.4241],
    "Casablanca": [33.5731, -7.5898], "Chennai": [13.0827, 80.2707], "Chicago": [41.8781, -87.6298],
    "Colombo": [6.9271, 79.8612], "Copenhagen": [55.6761, 12.5683], "Doha": [25.2854, 51.5310],
    "Dubai": [25.2048, 55.2708], "Dublin": [53.3498, -6.2603], "Frankfurt": [50.1109, 8.6821],
    "Hanoi": [21.0285, 105.8542], "Helsinki": [60.1699, 24.9384], "Hong Kong": [22.3193, 114.1694],
    "Honolulu": [21.3069, -157.8583], "Istanbul": [41.0082, 28.9784], "Jakarta": [-6.2088, 106.8456],
    "Johannesburg": [-26.2041, 28.0473], "Kathmandu": [27.7172, 85.3240], "Kolkata": [22.5726, 88.3639],
    "Kuala Lumpur": [3.1390, 101.6869], "Kuwait City": [29.3759, 47.9774], "Lagos": [6.5244, 3.3792],
    "Lima": [-12.0464, -77.0428], "Lisbon": [38.7223, -9.1393], "London": [51.5074, -0.1278],
    "Los Angeles": [34.0522, -118.2437], "Madrid": [40.4168, -3.7038], "Maldives": [4.1755, 73.5093],
    "Mangaluru": [12.9141, 74.8560], "Manila": [14.5995, 120.9842], "Mauritius": [-20.3484, 57.5522],
    "Melbourne": [-37.8136, 144.9631], "Mexico City": [19.4326, -99.1332], "Miami": [25.7617, -80.1918],
    "Moscow": [55.7558, 37.6173], "Mumbai": [19.0760, 72.8777], "Nairobi": [-1.2921, 36.8219],
    "New Delhi": [28.6139, 77.2090], "New York": [40.7128, -74.0060], "Oslo": [59.9139, 10.7522],
    "Panaji": [15.4909, 73.8278], "Paris": [48.8566, 2.3522], "Prague": [50.0755, 14.4378],
    "Rio de Janeiro": [-22.9068, -43.1729], "Rome": [41.9028, 12.4964], "San Francisco": [37.7749, -122.4194],
    "Santiago": [-33.4489, -70.6693], "Sao Paulo": [-23.5505, -46.6333], "Seoul": [37.5665, 126.9780],
    "Singapore": [1.3521, 103.8198], "Stockholm": [59.3293, 18.0686], "Sydney": [-33.8688, 151.2093],
    "Taipei": [25.0330, 121.5654], "Tel Aviv": [32.0853, 34.7818], "Tokyo": [35.6895, 139.6917],
    "Toronto": [43.6532, -79.3832], "Vancouver": [49.2827, -123.1207], "Vienna": [48.2082, 16.3738],
    "Warsaw": [52.2297, 21.0122], "Zurich": [47.3769, 8.5417]
};

let map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 0], 3);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

let planeMarker, timerInterval, flightPath, isPaused = false;
let secondsLeft = 0, totalSeconds = 0, totalDist = 0;

// Manifest Logic
const taskList = document.getElementById('taskList');
const newTaskInput = document.getElementById('newTask');
const addTaskBtn = document.getElementById('addTaskBtn');

addTaskBtn.addEventListener('click', () => {
    const taskText = newTaskInput.value.trim();
    if (taskText) {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox">
                <span>${taskText}</span>
            </div>
            <button class="delete-task-btn" title="Remove Task">&times;</button>
        `;
        li.querySelector('.delete-task-btn').addEventListener('click', () => li.remove());
        taskList.appendChild(li);
        newTaskInput.value = '';
    }
});
newTaskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTaskBtn.click(); });

// Utils
function getBearing(c1, c2) {
    const lat1 = c1[0] * Math.PI / 180;
    const lat2 = c2[0] * Math.PI / 180;
    const dLon = (c2[1] - c1[1]) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function getDistKM(c1, c2) {
    const R = 6371; 
    const dLat = (c2[0]-c1[0])*Math.PI/180;
    const dLon = (c2[1]-c1[1])*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(c1[0]*Math.PI/180)*Math.cos(c2[0]*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function updateUI() {
    const hours = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const secs = secondsLeft % 60;
    
    let timeText = hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
    document.getElementById('timeRemaining').innerText = timeText;
    
    const distLeft = Math.round(totalDist * (secondsLeft / totalSeconds));
    document.getElementById('distRemaining').innerText = `${distLeft} km`;
    
    const now = new Date();
    document.getElementById('currentTime').innerText = now.getHours().toString().padStart(2,'0')+":"+now.getMinutes().toString().padStart(2,'0');
}

// Start
document.getElementById('startBtn').addEventListener('click', () => {
    const startName = document.getElementById('startCity').value;
    const endName = document.getElementById('endCity').value;
    const start = locations[startName];
    const end = locations[endName];
    if (!start || !end) return alert("Select valid cities!");

    document.getElementById('setupPanel').classList.add('hidden');
    document.getElementById('ifeBar').classList.remove('hidden');

    totalDist = getDistKM(start, end);
    const rotation = getBearing(start, end);
    secondsLeft = Math.round((totalDist/880)*3600);
    totalSeconds = secondsLeft;

    if (flightPath) map.removeLayer(flightPath);
    flightPath = L.polyline([start, end], {color: '#00ffff', weight: 2, dashArray: '10, 10', opacity: 0.5}).addTo(map);

    if (planeMarker) map.removeLayer(planeMarker);
    const planeSVG = `
        <div class="plane-icon" style="transform: rotate(${rotation - 90}deg);">
            <svg viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"></path>
            </svg>
        </div>`;

    planeMarker = L.marker(start, { icon: L.divIcon({ className:'p', html: planeSVG, iconSize:[45,45], iconAnchor:[22,22] })}).addTo(map);

    map.flyTo(start, 7);

    timerInterval = setInterval(() => {
        if (!isPaused) {
            secondsLeft--;
            const progress = 1 - (secondsLeft/totalSeconds);
            const lat = start[0] + (end[0]-start[0])*progress;
            const lng = start[1] + (end[1]-start[1])*progress;
            planeMarker.setLatLng([lat, lng]);
            map.panTo([lat, lng]);
            updateUI();
            if (secondsLeft <= 0) { clearInterval(timerInterval); alert("Arrival."); location.reload(); }
        }
    }, 1000);
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').innerText = isPaused ? "▶" : "⏸";
});
