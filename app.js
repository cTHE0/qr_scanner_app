class QRScannerApp {
    constructor() {
        this.codeReader = null;
        this.videoElement = document.getElementById('video');
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.uploadBtn = document.getElementById('upload-btn');
        this.fileInput = document.getElementById('file-input');
        this.resultContainer = document.getElementById('result-container');
        this.resultUrl = document.getElementById('result-url');
        this.errorContainer = document.getElementById('error-container');
        this.openBtn = document.getElementById('open-btn');
        this.copyBtn = document.getElementById('copy-btn');
        
        this.detectedUrl = null;
        this.isScanning = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.registerServiceWorker();
        this.requestNotificationPermission();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startScanner());
        this.stopBtn.addEventListener('click', () => this.stopScanner());
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.openBtn.addEventListener('click', () => this.openUrl());
        this.copyBtn.addEventListener('click', () => this.copyUrl());
        
        // Gestion du scan continu
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isScanning) {
                this.stopScanner();
            }
        });
    }

    async startScanner() {
        try {
            this.showError(null);
            this.showResult(null);
            
            this.codeReader = new ZXing.BrowserQRCodeReader();
            
            await this.codeReader.decodeFromVideoDevice(
                undefined,
                this.videoElement,
                (result, err) => this.handleScanResult(result, err)
            );
            
            this.isScanning = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            
            this.showNotification('Caméra démarrée', 'Scannez un QR code');
            
        } catch (error) {
            console.error('Erreur démarrage caméra:', error);
            this.showError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        }
    }

    stopScanner() {
        if (this.codeReader) {
            this.codeReader.reset();
            this.codeReader = null;
        }
        
        this.isScanning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        this.videoElement.srcObject = null;
        this.showNotification('Caméra arrêtée');
    }

    handleScanResult(result, err) {
        if (result) {
            const url = result.getText().trim();
            
            if (this.validateUrl(url)) {
                this.detectedUrl = url;
                this.showResult(url);
                this.stopScanner();
                
                this.showNotification('QR Code détecté !', url);
            } else {
                this.showError('❌ QR code invalide. Seuls les sites theocourbe.com sont autorisés.');
            }
        }
        
        if (err && !(err instanceof ZXing.NotFoundException)) {
            console.error('Erreur scan:', err);
        }
    }

    validateUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname.toLowerCase();
            
            // Vérifier que c'est bien theocourbe.com ou un sous-domaine
            return hostname === 'theocourbe.com' || 
                   hostname.endsWith('.theocourbe.com');
        } catch (e) {
            return false;
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.showError(null);
            this.showResult(null);
            
            const imageUrl = URL.createObjectURL(file);
            const image = await this.loadImage(imageUrl);
            
            // Utiliser ZXing pour decoder l'image
            const codeReader = new ZXing.BrowserQRCodeReader();
            const result = await codeReader.decodeFromImageElement(image);
            
            if (result) {
                const url = result.getText().trim();
                
                if (this.validateUrl(url)) {
                    this.detectedUrl = url;
                    this.showResult(url);
                    this.showNotification('QR Code détecté !', url);
                } else {
                    this.showError('❌ QR code invalide. Seuls les sites theocourbe.com sont autorisés.');
                }
            } else {
                this.showError('❌ Aucun QR code détecté dans l\'image.');
            }
            
            URL.revokeObjectURL(imageUrl);
            
        } catch (error) {
            console.error('Erreur upload:', error);
            this.showError('Erreur lors de la lecture de l\'image.');
        }
        
        // Reset input
        event.target.value = '';
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    showResult(url) {
        if (url) {
            this.resultUrl.textContent = url;
            this.resultContainer.classList.remove('hidden');
        } else {
            this.resultContainer.classList.add('hidden');
        }
    }

    showError(message) {
        if (message) {
            this.errorContainer.textContent = message;
            this.errorContainer.classList.remove('hidden');
        } else {
            this.errorContainer.classList.add('hidden');
        }
    }

    openUrl() {
        if (this.detectedUrl) {
            window.open(this.detectedUrl, '_blank', 'noopener,noreferrer');
        }
    }

    async copyUrl() {
        if (this.detectedUrl) {
            try {
                await navigator.clipboard.writeText(this.detectedUrl);
                this.showNotification('✅ URL copiée !');
            } catch (error) {
                console.error('Erreur copie:', error);
                this.showError('Impossible de copier l\'URL.');
            }
        }
    }

    showNotification(title, body = '') {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'icon-192.png' });
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                console.log('Permission notifications:', permission);
            } catch (error) {
                console.error('Erreur permission notifications:', error);
            }
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                console.log('Service Worker enregistré');
            } catch (error) {
                console.error('Erreur enregistrement Service Worker:', error);
            }
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    new QRScannerApp();
});