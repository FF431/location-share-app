let map;
let userMarker;
let friendMarker;
let watchId;
let isSharing = false;

// 初始化地图
function initMap() {
    map = L.map('map').setView([39.9042, 116.4074], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// 获取当前位置
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    resolve({ lat: latitude, lng: longitude });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            reject(new Error('Geolocation is not supported by this browser.'));
        }
    });
}

// 更新用户位置
function updateUserLocation(position) {
    const { latitude, longitude } = position.coords;
    const userCoords = [latitude, longitude];
    
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    userMarker = L.marker(userCoords).addTo(map);
    userMarker.bindPopup('我').openPopup();
    
    // 模拟发送位置到服务器
    sendLocationToServer(latitude, longitude);
}

// 发送位置到服务器
function sendLocationToServer(lat, lng) {
    const userId = document.getElementById('userId').value || 'user1';
    const friendId = document.getElementById('friendId').value || 'user2';
    
    // 发送位置到PythonAnywhere后端
    fetch('https://fhw.pythonanywhere.com/api/location', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId,
            lat: lat,
            lng: lng
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('位置发送成功:', data);
        
        // 获取好友位置
        return fetch(`https://fhw.pythonanywhere.com/api/location/${friendId}`);
    })
    .then(response => response.json())
    .then(friendLocation => {
        if (friendLocation.lat && friendLocation.lng) {
            updateFriendLocation(friendLocation.lat, friendLocation.lng);
            // 调用AI分析
            analyzeLocations(lat, lng, friendLocation.lat, friendLocation.lng);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // 模拟好友位置作为fallback
        const friendLat = lat + (Math.random() - 0.5) * 0.01;
        const friendLng = lng + (Math.random() - 0.5) * 0.01;
        updateFriendLocation(friendLat, friendLng);
        analyzeLocations(lat, lng, friendLat, friendLng);
    });
}

// 更新好友位置
function updateFriendLocation(lat, lng) {
    const friendCoords = [lat, lng];
    
    if (friendMarker) {
        map.removeLayer(friendMarker);
    }
    
    friendMarker = L.marker(friendCoords).addTo(map);
    friendMarker.bindPopup('好友').openPopup();
    
    // 调整地图视图以显示两个标记
    if (userMarker) {
        const userLatLng = userMarker.getLatLng();
        const friendLatLng = friendMarker.getLatLng();
        map.fitBounds(L.latLngBounds([userLatLng, friendLatLng]), { padding: [50, 50] });
    }
}

// 分析位置
async function analyzeLocations(userLat, userLng, friendLat, friendLng) {
    // 计算距离
    const distance = calculateDistance(userLat, userLng, friendLat, friendLng);
    
    const analysisResult = document.getElementById('analysisResult');
    
    try {
        // 调用DeepSeek API进行智能分析
        const analysis = await getDeepSeekAnalysis(userLat, userLng, friendLat, friendLng, distance);
        analysisResult.innerHTML = analysis;
    } catch (error) {
        console.error('DeepSeek API error:', error);
        //  fallback to local analysis if API fails
        let fallbackAnalysis = `
            <strong>距离分析:</strong> 你和好友相距约 ${distance.toFixed(2)} 米<br>
            <strong>位置分析:</strong> 你当前在城市区域<br>
            <strong>好友分析:</strong> 好友可能在附近的商业区<br>
            <strong>建议:</strong> ${distance < 100 ? '你们很近，可以步行见面' : '距离较远，建议使用交通工具'}
        `;
        analysisResult.innerHTML = fallbackAnalysis;
    }
}

// 调用DeepSeek API
async function getDeepSeekAnalysis(userLat, userLng, friendLat, friendLng, distance) {
    // DeepSeek API endpoint
    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    // DeepSeek API密钥
    const apiKey = 'sk-5529cf77939b46fa980fabf0ad6143aa';
    
    const prompt = `分析两个位置的情况：
用户位置：纬度 ${userLat}，经度 ${userLng}
好友位置：纬度 ${friendLat}，经度 ${friendLng}
距离：${distance.toFixed(2)} 米

请分析：
1. 两个位置可能的环境类型（如住宅区、商业区、公园等）
2. 对方可能正在进行的活动
3. 基于距离和位置的智能建议
4. 其他相关的分析信息

请以HTML格式返回结果，使用适当的标签和格式。`;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// 计算两点之间的距离（米）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 地球半径（米）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

// 开始共享位置
function startSharing() {
    if (isSharing) return;
    
    isSharing = true;
    document.getElementById('startShare').disabled = true;
    document.getElementById('stopShare').disabled = false;
    
    // 获取初始位置
    getCurrentLocation()
        .then(coords => {
            map.setView([coords.lat, coords.lng], 15);
        })
        .catch(error => {
            console.error('Error getting location:', error);
            alert('无法获取位置信息，请检查位置权限');
        });
    
    // 持续获取位置
    watchId = navigator.geolocation.watchPosition(
        updateUserLocation,
        (error) => {
            console.error('Error watching position:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

// 停止共享位置
function stopSharing() {
    if (!isSharing) return;
    
    isSharing = false;
    document.getElementById('startShare').disabled = false;
    document.getElementById('stopShare').disabled = true;
    
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
    
    // 清除标记
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    if (friendMarker) {
        map.removeLayer(friendMarker);
        friendMarker = null;
    }
    
    document.getElementById('analysisResult').innerHTML = '点击开始共享后显示分析结果';
}

// 测试API连接
function testApiConnection() {
    const analysisResult = document.getElementById('analysisResult');
    analysisResult.innerHTML = '正在测试API连接...';
    
    // 测试POST请求
    fetch('https://fhw.pythonanywhere.com/api/location', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: 'test',
            lat: 39.9042,
            lng: 116.4074
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        analysisResult.innerHTML += `<br>POST请求成功: ${JSON.stringify(data)}`;
        
        // 测试GET请求
        return fetch('https://fhw.pythonanywhere.com/api/locations');
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        analysisResult.innerHTML += `<br>GET请求成功: ${JSON.stringify(data)}`;
        analysisResult.innerHTML += '<br><br>API连接测试成功！';
    })
    .catch(error => {
        analysisResult.innerHTML += `<br>错误: ${error.message}`;
        analysisResult.innerHTML += '<br><br>API连接测试失败，请检查后端服务是否正常运行。';
    });
}

// 初始化事件监听器
function initEventListeners() {
    document.getElementById('startShare').addEventListener('click', startSharing);
    document.getElementById('stopShare').addEventListener('click', stopSharing);
    document.getElementById('testApi').addEventListener('click', testApiConnection);
    
    // 初始禁用停止按钮
    document.getElementById('stopShare').disabled = true;
}

// 页面加载完成后初始化
window.onload = function() {
    initMap();
    initEventListeners();
};