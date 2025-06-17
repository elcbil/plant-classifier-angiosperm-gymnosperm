// Global Variables
let model;
let webcamStream;
let cameraStream;
let currentTheme = 'light';
let isModelLoaded = false;
let isRealtimePredicting = false;

// DOM Elements
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    uploadOption: document.getElementById('uploadOption'),
    cameraOption: document.getElementById('cameraOption'),
    webcamOption: document.getElementById('webcamOption'),
    imageInput: document.getElementById('imageInput'),
    webcamSection: document.getElementById('webcamSection'),
    webcam: document.getElementById('webcam'),
    stopWebcam: document.getElementById('stopWebcam'),
    cameraSection: document.getElementById('cameraSection'),
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    captureBtn: document.getElementById('captureBtn'),
    stopCamera: document.getElementById('stopCamera'),
    previewSection: document.getElementById('previewSection'),
    imagePreview: document.getElementById('imagePreview'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    clearBtn: document.getElementById('clearBtn'),
    loading: document.getElementById('loading'),
    resultsSection: document.getElementById('resultsSection'),
    results: document.getElementById('results'),
    realtimeResult: document.getElementById('realtimeResult'),
    predictionText: document.getElementById('predictionText'),
    confidenceDisplay: document.getElementById('confidenceDisplay')
};

// Initialize when page loads
window.addEventListener('load', async () => {
    await loadModel();
    initializeTheme();
    setupEventListeners();
    setupDragAndDrop();
});

// Model Loading
async function loadModel() {
    try {
        console.log('Loading model...');
        showLoading('Memuat model...');
        
        // Load model - sesuaikan path dengan lokasi model Anda
        model = await tf.loadGraphModel('./tfjs_model/model.json');
        
        console.log('Model loaded successfully');
        isModelLoaded = true;
        hideLoading();
        
        // Show success message briefly
        showNotification('Model berhasil dimuat!', 'success');
    } catch (error) {
        console.error('Error loading model:', error);
        hideLoading();
        showNotification('Gagal memuat model. Pastikan model tersedia di path yang benar.', 'error');
    }
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    elements.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    localStorage.setItem('theme', theme);
}

// Event Listeners Setup
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Upload options
    elements.uploadOption.addEventListener('click', triggerFileUpload);
    elements.cameraOption.addEventListener('click', toggleCamera);
    elements.webcamOption.addEventListener('click', toggleWebcam);
    
    // File input
    elements.imageInput.addEventListener('change', handleImageUpload);
    
    // Camera controls
    elements.captureBtn.addEventListener('click', captureImage);
    elements.stopCamera.addEventListener('click', stopCamera);
    elements.stopWebcam.addEventListener('click', stopWebcam);
    
    // Analysis controls
    elements.analyzeBtn.addEventListener('click', analyzeImage);
    elements.clearBtn.addEventListener('click', clearImage);
}

// Drag and Drop Setup
function setupDragAndDrop() {
    const uploadOptions = document.querySelectorAll('.upload-option');
    
    uploadOptions.forEach(option => {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            option.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            option.addEventListener(eventName, () => option.classList.add('drag-over'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            option.addEventListener(eventName, () => option.classList.remove('drag-over'), false);
        });
        
        option.addEventListener('drop', handleDrop, false);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => displayImage(e.target.result);
        reader.readAsDataURL(files[0]);
    }
}

// File Upload Handling
function triggerFileUpload() {
    elements.imageInput.click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => displayImage(e.target.result);
        reader.readAsDataURL(file);
    }
}

// Camera Handling
async function toggleCamera() {
    if (elements.cameraSection.style.display === 'none' || !elements.cameraSection.style.display) {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            elements.video.srcObject = cameraStream;
            elements.cameraSection.style.display = 'block';
            elements.cameraSection.classList.add('fade-in');
            
            // Hide other sections
            hideAllSections();
            elements.cameraSection.style.display = 'block';
        } catch (error) {
            console.error('Error accessing camera:', error);
            showNotification('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.', 'error');
        }
    } else {
        stopCamera();
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    elements.cameraSection.style.display = 'none';
}

function captureImage() {
    const ctx = elements.canvas.getContext('2d');
    elements.canvas.width = elements.video.videoWidth;
    elements.canvas.height = elements.video.videoHeight;
    ctx.drawImage(elements.video, 0, 0);
    
    const imageDataUrl = elements.canvas.toDataURL('image/jpeg');
    displayImage(imageDataUrl);
    stopCamera();
}

// Webcam Real-time Prediction
async function toggleWebcam() {
    if (elements.webcamSection.style.display === 'none' || !elements.webcamSection.style.display) {
        if (!isModelLoaded) {
            showNotification('Model belum selesai dimuat. Silakan tunggu sebentar.', 'error');
            return;
        }
        
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 224, height: 224 }
            });
            elements.webcam.srcObject = webcamStream;
            
            // Hide other sections and show webcam
            hideAllSections();
            elements.webcamSection.style.display = 'block';
            elements.realtimeResult.style.display = 'block';
            elements.webcamSection.classList.add('fade-in');
            
            // Start real-time prediction
            elements.webcam.addEventListener('loadeddata', startRealtimePrediction);
        } catch (error) {
            console.error('Error accessing webcam:', error);
            showNotification('Tidak dapat mengakses webcam. Pastikan izin kamera telah diberikan.', 'error');
        }
    } else {
        stopWebcam();
    }
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    isRealtimePredicting = false;
    elements.webcamSection.style.display = 'none';
    elements.realtimeResult.style.display = 'none';
}

async function startRealtimePrediction() {
    isRealtimePredicting = true;
    
    while (isRealtimePredicting && elements.webcam.srcObject) {
        try {
            const tensor = tf.browser.fromPixels(elements.webcam)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .div(255.0)
                .expandDims();

            const prediction = await model.predict(tensor).data();
            const classNames = ['Angiospermae', 'Gymnospermae'];
            
            // Update real-time display
            updateRealtimeDisplay(prediction, classNames);
            
            // Cleanup tensor
            tensor.dispose();
            
            // Wait for next frame
            await tf.nextFrame();
        } catch (error) {
            console.error('Error in real-time prediction:', error);
            break;
        }
    }
}

function updateRealtimeDisplay(prediction, classNames) {
    const maxIndex = prediction[0] > prediction[1] ? 0 : 1;
    const confidence = (prediction[maxIndex] * 100).toFixed(1);
    
    elements.predictionText.textContent = `${classNames[maxIndex]} (${confidence}%)`;
    
    // Update confidence display
    elements.confidenceDisplay.innerHTML = `
        <div class="confidence-item">
            <div class="confidence-label">Angiospermae</div>
            <div class="confidence-percentage">${(prediction[0] * 100).toFixed(1)}%</div>
        </div>
        <div class="confidence-item">
            <div class="confidence-label">Gymnospermae</div>
            <div class="confidence-percentage">${(prediction[1] * 100).toFixed(1)}%</div>
        </div>
    `;
}

// Image Display and Analysis
function displayImage(imageSrc) {
    hideAllSections();
    elements.imagePreview.src = imageSrc;
    elements.previewSection.style.display = 'block';
    elements.previewSection.classList.add('fade-in');
}

function clearImage() {
    hideAllSections();
    elements.imageInput.value = '';
}

function hideAllSections() {
    elements.previewSection.style.display = 'none';
    elements.cameraSection.style.display = 'none';
    elements.webcamSection.style.display = 'none';
    elements.realtimeResult.style.display = 'none';
    elements.resultsSection.style.display = 'none';
}

async function analyzeImage() {
    if (!isModelLoaded) {
        showNotification('Model belum selesai dimuat. Silakan tunggu sebentar.', 'error');
        return;
    }

    showLoading('Menganalisis gambar...');
    
    try {
        // Create tensor from image
        const tensor = tf.browser.fromPixels(elements.imagePreview)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .div(255.0)
            .expandDims();

        // Make prediction
        const prediction = await model.predict(tensor).data();
        const classNames = ['Angiospermae', 'Gymnospermae'];
        
        // Get prediction results
        const results = classNames.map((className, index) => ({
            class: className,
            probability: prediction[index],
            percentage: (prediction[index] * 100).toFixed(2)
        }));
        
        // Sort by probability (highest first)
        results.sort((a, b) => b.probability - a.probability);
        
        // Display results
        displayResults(results);
        
        // Cleanup tensor
        tensor.dispose();
        
        hideLoading();
        
    } catch (error) {
        console.error('Error analyzing image:', error);
        hideLoading();
        showNotification('Terjadi kesalahan saat menganalisis gambar.', 'error');
    }
}

function displayResults(results) {
    const topResult = results[0];
    const confidence = parseFloat(topResult.percentage);
    
    // Determine confidence level
    let confidenceLevel = 'Rendah';
    let confidenceClass = 'low';
    
    if (confidence >= 80) {
        confidenceLevel = 'Tinggi';
        confidenceClass = 'high';
    } else if (confidence >= 60) {
        confidenceLevel = 'Sedang';
        confidenceClass = 'medium';
    }
    
    // Generate detailed explanation
    const explanation = generateExplanation(topResult.class, confidence);
    
    elements.results.innerHTML = `
        <div class="result-card">
            <div class="result-header">                
                <div class="confidence-badge ${confidenceClass}">
                    Kepercayaan: ${confidenceLevel} (${topResult.percentage}%)
                </div>
            </div>
            
            <div class="prediction-result">
                <div class="predicted-class">
                    <span class="class-label">Klasifikasi:</span>
                    <span class="class-name">${topResult.class}</span>
                </div>
            </div>
            
            <div class="confidence-breakdown">
                <h4>Detail Probabilitas:</h4>
                ${results.map(result => `
                    <div class="confidence-bar-container">
                        <div class="confidence-bar-label">
                            <span>${result.class}</span>
                            <span>${result.percentage}%</span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${result.percentage}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="explanation">
                <h4>Penjelasan:</h4>
                <p>${explanation}</p>
            </div>
            
            <div class="plant-info">
                ${getPlantInfo(topResult.class)}
            </div>
        </div>
    `;
    
    elements.resultsSection.style.display = 'block';
    elements.resultsSection.classList.add('fade-in');
}

function generateExplanation(predictedClass, confidence) {
    const explanations = {
        'Angiospermae': `Gambar ini diklasifikasikan sebagai tumbuhan Angiospermae (tumbuhan berbunga) dengan tingkat kepercayaan ${confidence}%. Angiospermae adalah kelompok tumbuhan yang memiliki bunga sejati dan biji yang terlindung dalam buah. Mereka merupakan kelompok tumbuhan terbesar dan paling beragam di dunia.`,
        'Gymnospermae': `Gambar ini diklasifikasikan sebagai tumbuhan Gymnospermae (tumbuhan berbiji terbuka) dengan tingkat kepercayaan ${confidence}%. Gymnospermae adalah kelompok tumbuhan yang memiliki biji terbuka, tidak terlindung dalam buah. Contoh umum termasuk pohon pinus, cemara, dan pohon konifer lainnya.`
    };
    
    return explanations[predictedClass] || 'Klasifikasi tidak dapat dijelaskan.';
}

function getPlantInfo(className) {
    const plantInfo = {
        'Angiospermae': `
            <h5>🌸 Karakteristik Angiospermae:</h5>
            <ul>
                <li>Memiliki bunga sejati sebagai organ reproduksi</li>
                <li>Biji terlindung dalam buah (ovarium)</li>
                <li>Memiliki sistem pembuluh yang kompleks</li>
                <li>Daun umumnya lebar dengan tulang daun bercabang</li>
                <li>Contoh: mawar, mangga, padi, jagung</li>
            </ul>
        `,
        'Gymnospermae': `
            <h5>🌲 Karakteristik Gymnospermae:</h5>
            <ul>
                <li>Biji terbuka, tidak terlindung buah</li>
                <li>Tidak memiliki bunga sejati</li>
                <li>Umumnya berupa pohon dengan daun seperti jarum</li>
                <li>Reproduksi melalui strobilus (kerucut)</li>
                <li>Contoh: pinus, cemara, pakis haji</li>
            </ul>
        `
    };
    
    return plantInfo[className] || '';
}

// Utility Functions
function showLoading(message = 'Memuat...') {
    if (elements.loading) {
        elements.loading.style.display = 'flex';
        const loadingText = elements.loading.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
}

function hideLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content and type
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    // Auto hide notification after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Cleanup function for when page is closed
window.addEventListener('beforeunload', () => {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC key to clear/close
    if (e.key === 'Escape') {
        clearImage();
        stopCamera();
        stopWebcam();
    }
    
    // Spacebar to capture when camera is active
    if (e.key === ' ' && elements.cameraSection.style.display === 'block') {
        e.preventDefault();
        captureImage();
    }
    
    // Enter key to analyze when image is displayed
    if (e.key === 'Enter' && elements.previewSection.style.display === 'block') {
        e.preventDefault();
        analyzeImage();
    }
});

// Error handling for model loading failures
window.addEventListener('error', (e) => {
    if (e.message.includes('Failed to fetch') && e.filename.includes('model.json')) {
        showNotification('Model tidak dapat dimuat. Periksa koneksi internet dan path model.', 'error');
    }
});