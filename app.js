class VirtualTourApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.sky = null;
        this.currentFolder = 'pakapiens';
        this.currentImageIndex = 0;
        this.images = [];
        this.hotspots = [];
        this.devMode = false;
        this.photoOrder = [];
        this.imageCache = new Map();
        this.tempHotspotPosition = null;
        
        this.init();
    }

    async init() {
        console.log('Initializing Virtual Tour App...');
        this.setupEventListeners();
        console.log('Event listeners setup complete');
        await this.loadFolderImages('pakapiens');
        console.log('Folder images loaded');
        this.setupAFrame();
        console.log('A-Frame setup complete');
        this.hideLoading();
        console.log('Loading hidden');
    }

    setupEventListeners() {
        // Folder navigation
        document.querySelectorAll('.folder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const folder = e.target.dataset.folder;
                this.switchFolder(folder);
            });
        });

        // Dev mode toggle
        document.getElementById('devModeBtn').addEventListener('click', () => {
            this.toggleDevMode();
        });

        // Hotspot form
        document.getElementById('save-hotspot').addEventListener('click', () => {
            this.saveHotspot();
        });

        document.getElementById('cancel-hotspot').addEventListener('click', () => {
            this.cancelHotspot();
        });

        // Hotspot linking
        document.getElementById('hotspot-link-type').addEventListener('change', (e) => {
            this.updateHotspotLinkType(e.target.value);
        });

        // Photo ordering
        document.getElementById('save-order').addEventListener('click', () => {
            this.savePhotoOrder();
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Navigation controls
        document.getElementById('prev-image').addEventListener('click', () => {
            this.previousImage();
        });

        document.getElementById('next-image').addEventListener('click', () => {
            this.nextImage();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.previousImage();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextImage();
                        break;
                    case ' ':
                        e.preventDefault();
                        this.nextImage();
                        break;
                    case 'Escape':
                        this.closeModal();
                        break;
                    case 'h':
                    case 'H':
                        this.showControlsInfo();
                        break;
                }
            }
        });
    }

    async loadFolderImages(folderName) {
        this.showLoading();
        this.images = [];
        this.hotspots = [];
        
        try {
            const imageFiles = this.getImageFilesForFolder(folderName);
            this.updateLoadingText(`Loading ${imageFiles.length} images from ${folderName}...`);
            this.updateProgress(0, imageFiles.length);
            
            const loadedImages = await this.loadImagesWithProgress(imageFiles, folderName);
            
            this.images = loadedImages;
            this.photoOrder = [...this.images];
            this.currentImageIndex = 0;
            this.loadHotspots(folderName);
            
            this.updateLoadingText('Images loaded successfully!');
            this.updateProgress(imageFiles.length, imageFiles.length);
            
            setTimeout(() => {
                this.hideLoading();
            }, 500);
            
        } catch (error) {
            console.error('Error loading images:', error);
            this.updateLoadingText('Error loading images. Please check if the folder exists.');
            this.updateLoadingDetails('Make sure the images are in the correct folder and accessible.');
            setTimeout(() => {
                this.hideLoading();
                alert('Error loading images. Please check if the folder exists and contains images.');
            }, 2000);
        }
    }

    async loadImagesWithProgress(imageFiles, folderName) {
        const loadedImages = [];
        const totalImages = imageFiles.length;
        
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const imagePath = `./${folderName}/${file}`;
            
            try {
                this.updateLoadingText(`Loading ${file}...`);
                this.updateLoadingDetails(`${i + 1} of ${totalImages} images`);
                
                const img = await this.loadSingleImage(imagePath, file);
                loadedImages.push({
                    name: file,
                    element: img,
                    path: imagePath,
                    loaded: true
                });
                
                this.updateProgress(i + 1, totalImages);
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.warn(`Failed to load ${file}:`, error);
                loadedImages.push({
                    name: file,
                    element: null,
                    path: imagePath,
                    loaded: false,
                    error: error.message
                });
            }
        }
        
        return loadedImages;
    }

    loadSingleImage(imagePath, fileName) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout loading ${fileName}`));
            }, 10000);
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(img);
            };
            
            img.onerror = (error) => {
                clearTimeout(timeout);
                reject(new Error(`Failed to load ${fileName}`));
            };
            
            img.src = imagePath;
        });
    }

    getImageFilesForFolder(folderName) {
        const folderImages = {
            'pakapiens': [
                'IMG_20250915_165749_00_013.jpg',
                'IMG_20250915_171031_00_016.jpg',
                'IMG_20250915_171631_00_018.jpg',
                'IMG_20250915_173327_00_021.jpg',
                'IMG_20250915_174130_00_024.jpg',
                'IMG_20250916_163614_00_027.jpg',
                'IMG_20250916_165334_00_030.jpg',
                'IMG_20250916_165451_00_032.jpg',
                'IMG_20250916_172242_00_034.jpg',
                'IMG_20250916_172556_00_036.jpg',
                'IMG_20250916_172951_00_038.jpg',
                'IMG_20250916_173054_00_040.jpg',
                'IMG_20250916_190946_00_043.jpg',
                'IMG_20250916_191105_00_045.jpg'
            ],
            'pietura': [
                'IMG_20251016_145044_00_046.jpg',
                'IMG_20251016_145242_00_047.jpg',
                'IMG_20251016_145554_00_049.jpg',
                'IMG_20251016_150014_00_052.jpg',
                'IMG_20251016_150151_00_053.jpg',
                'IMG_20251016_150418_00_054.jpg',
                'IMG_20251016_150620_00_055.jpg',
                'IMG_20251016_150744_00_056.jpg',
                'IMG_20251016_151002_00_057.jpg'
            ],
            'spaktele': [
                'IMG_20251016_154859_00_059.jpg',
                'IMG_20251016_155043_00_060.jpg',
                'IMG_20251016_155310_00_061.jpg',
                'IMG_20251016_155427_00_062.jpg',
                'IMG_20251016_155941_00_063.jpg',
                'IMG_20251016_160025_00_064.jpg',
                'IMG_20251016_160156_00_065.jpg',
                'IMG_20251016_160247_00_066.jpg',
                'IMG_20251016_160321_00_067.jpg'
            ]
        };
        
        return folderImages[folderName] || [];
    }

    setupAFrame() {
        console.log('Setting up A-Frame...');
        this.scene = document.querySelector('#aframe-scene');
        this.camera = document.querySelector('#main-camera');
        this.sky = document.querySelector('#sky-sphere');
        
        console.log('A-Frame elements found:', {
            scene: !!this.scene,
            camera: !!this.camera,
            sky: !!this.sky,
            imagesCount: this.images.length
        });
        
        if (this.images.length > 0) {
            this.loadCurrentImage();
        } else {
            console.warn('No images loaded yet');
        }
    }

    loadCurrentImage() {
        console.log('Loading current image...', this.currentImageIndex);
        if (this.images.length === 0) {
            console.warn('No images available');
            return;
        }
        
        const currentImage = this.images[this.currentImageIndex];
        console.log('Current image:', currentImage);
        
        if (!currentImage.loaded) {
            console.warn(`Image ${currentImage.name} failed to load:`, currentImage.error);
            this.showImageError(currentImage);
            return;
        }
        
        // Update the sky sphere with the new image
        if (this.sky) {
            console.log('Setting sky source to:', currentImage.path);
            this.sky.setAttribute('src', currentImage.path);
        } else {
            console.error('Sky element not found!');
        }
        
        this.updatePhotoOrdering();
        this.renderHotspots();
        this.updateImageCounter();
    }

    nextImage() {
        if (this.images.length === 0) return;
        
        this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        this.loadCurrentImage();
    }

    previousImage() {
        if (this.images.length === 0) return;
        
        this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.loadCurrentImage();
    }

    updateImageCounter() {
        const currentNum = document.getElementById('current-image-num');
        const totalNum = document.getElementById('total-images');
        const prevBtn = document.getElementById('prev-image');
        const nextBtn = document.getElementById('next-image');
        
        if (currentNum) {
            currentNum.textContent = this.currentImageIndex + 1;
        }
        
        if (totalNum) {
            totalNum.textContent = this.images.length;
        }
        
        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.images.length <= 1;
            nextBtn.disabled = this.images.length <= 1;
        }
    }

    showImageError(imageData) {
        // Create error texture for failed images
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image Error', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '24px Arial';
        ctx.fillText(imageData.name, canvas.width / 2, canvas.height / 2);
        ctx.fillText('Failed to load', canvas.width / 2, canvas.height / 2 + 40);
        
        const dataURL = canvas.toDataURL();
        if (this.sky) {
            this.sky.setAttribute('src', dataURL);
        }
    }

    async switchFolder(folderName) {
        this.currentFolder = folderName;
        
        document.querySelectorAll('.folder-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folderName}"]`).classList.add('active');
        
        await this.loadFolderImages(folderName);
        this.setupAFrame();
    }

    toggleDevMode() {
        this.devMode = !this.devMode;
        const devControls = document.getElementById('dev-controls');
        const btn = document.getElementById('devModeBtn');
        const reticle = document.getElementById('reticle');
        
        if (this.devMode) {
            devControls.classList.remove('hidden');
            reticle.classList.remove('hidden');
            btn.textContent = 'Exit Dev Mode';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
            this.setupDevModeClick();
        } else {
            devControls.classList.add('hidden');
            reticle.classList.add('hidden');
            btn.textContent = 'Dev Mode';
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
            this.removeDevModeClick();
        }
    }

    setupDevModeClick() {
        const scene = document.querySelector('#aframe-scene');
        if (scene) {
            this.boundHandleSceneClick = this.handleSceneClick.bind(this);
            scene.addEventListener('click', this.boundHandleSceneClick);
        }
    }

    removeDevModeClick() {
        const scene = document.querySelector('#aframe-scene');
        if (scene && this.boundHandleSceneClick) {
            scene.removeEventListener('click', this.boundHandleSceneClick);
        }
    }

    handleSceneClick(event) {
        console.log('handleSceneClick called, devMode:', this.devMode);
        if (!this.devMode) return;
        
        // Check if click was on a hotspot
        if (event.target.classList.contains('hotspot')) {
            return;
        }
        
        // Get camera position and rotation
        const camera = document.querySelector('#main-camera');
        const cameraPosition = camera.getAttribute('position');
        const cameraRotation = camera.getAttribute('rotation');
        
        console.log('Camera position:', cameraPosition);
        console.log('Camera rotation:', cameraRotation);
        
        // Calculate position in front of camera based on reticle (center of screen)
        const distance = 5;
        const radians = {
            x: cameraRotation.x * Math.PI / 180,
            y: cameraRotation.y * Math.PI / 180
        };
        
        // Calculate 3D position in front of camera
        const x = cameraPosition.x + Math.sin(radians.y) * Math.cos(radians.x) * distance;
        const y = cameraPosition.y + Math.sin(-radians.x) * distance;
        const z = cameraPosition.z + Math.cos(radians.y) * Math.cos(radians.x) * distance;
        
        const hotspotPosition = {
            x: x,
            y: y,
            z: z,
            aframe: `${x} ${y} ${z}`
        };
        
        console.log('Calculated hotspot position:', hotspotPosition);
        
        this.createHotspotAtPosition(hotspotPosition);
    }

    createHotspotAtPosition(position) {
        console.log('createHotspotAtPosition called with position:', position);
        // Show hotspot form
        const form = document.getElementById('dev-controls');
        console.log('Form element:', form);
        form.style.display = 'block';
        
        // Store the position for saving
        this.tempHotspotPosition = position;
        
        // Reset form state
        this.selectedTargetImageIndex = undefined;
        document.getElementById('hotspot-link-type').value = 'info';
        document.getElementById('hotspot-target-image-container').style.display = 'none';
    }

    saveHotspot() {
        console.log('saveHotspot called');
        const title = document.getElementById('hotspot-title').value;
        const description = document.getElementById('hotspot-description').value;
        const linkType = document.getElementById('hotspot-link-type').value;
        
        console.log('Hotspot data:', { title, description, linkType, position: this.tempHotspotPosition });
        
        if (!title.trim()) {
            alert('Please enter a hotspot title');
            return;
        }
        
        if (linkType === 'image' && this.selectedTargetImageIndex === undefined) {
            alert('Please select a target image for navigation');
            return;
        }
        
        const hotspot = {
            id: Date.now().toString(),
            title: title,
            description: description,
            position: this.tempHotspotPosition,
            imageIndex: this.currentImageIndex,
            linkType: linkType,
            targetImageIndex: linkType === 'image' ? this.selectedTargetImageIndex : null
        };
        
        this.hotspots.push(hotspot);
        this.renderHotspots();
        
        // Clear form
        document.getElementById('hotspot-title').value = '';
        document.getElementById('hotspot-description').value = '';
        document.getElementById('hotspot-link-type').value = 'info';
        document.getElementById('hotspot-target-image-container').style.display = 'none';
        this.selectedTargetImageIndex = undefined;
        
        // Clear selection
        document.querySelectorAll('.image-preview-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Save to localStorage
        this.saveHotspotsToStorage();
    }

    cancelHotspot() {
        document.getElementById('hotspot-title').value = '';
        document.getElementById('hotspot-description').value = '';
        document.getElementById('hotspot-link-type').value = 'info';
        document.getElementById('hotspot-target-image-container').style.display = 'none';
        this.tempHotspotPosition = null;
        this.selectedTargetImageIndex = undefined;
        
        // Clear selection
        document.querySelectorAll('.image-preview-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    renderHotspots() {
        console.log('renderHotspots called, total hotspots:', this.hotspots.length);
        const scene = document.querySelector('#aframe-scene');
        if (!scene) return;
        
        // Remove existing hotspots
        const existingHotspots = scene.querySelectorAll('.hotspot');
        existingHotspots.forEach(hotspot => hotspot.remove());
        
        // Only show hotspots for current image
        const currentHotspots = this.hotspots.filter(h => h.imageIndex === this.currentImageIndex);
        console.log('Current image hotspots:', currentHotspots.length);
        
        currentHotspots.forEach(hotspot => {
            const hotspotElement = document.createElement('a-sphere');
            hotspotElement.setAttribute('position', hotspot.position.aframe);
            hotspotElement.setAttribute('radius', '0.5');
            hotspotElement.setAttribute('color', '#667eea');
            hotspotElement.setAttribute('opacity', '0.8');
            hotspotElement.setAttribute('cursor-listener', '');
            hotspotElement.setAttribute('data-hotspot-id', hotspot.id);
            hotspotElement.setAttribute('data-raycastable', '');
            hotspotElement.classList.add('hotspot');
            
            // Add click event using A-Frame's event system
            hotspotElement.addEventListener('click', (event) => {
                event.stopPropagation();
                this.showHotspotInfo(hotspot.id);
            });
            
            scene.appendChild(hotspotElement);
        });
    }

    showHotspotInfo(hotspotId) {
        const hotspot = this.hotspots.find(h => h.id === hotspotId);
        if (!hotspot) return;
        
        if (hotspot.linkType === 'image' && hotspot.targetImageIndex !== null) {
            this.currentImageIndex = hotspot.targetImageIndex;
            this.loadCurrentImage();
            return;
        }
        
        document.getElementById('hotspot-modal-title').textContent = hotspot.title;
        document.getElementById('hotspot-modal-description').textContent = hotspot.description;
        document.getElementById('hotspot-modal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('hotspot-modal').classList.add('hidden');
    }

    updateHotspotLinkType(linkType) {
        const targetImageContainer = document.getElementById('hotspot-target-image-container');
        if (linkType === 'image') {
            targetImageContainer.style.display = 'block';
            this.populateImagePreviewGrid();
        } else {
            targetImageContainer.style.display = 'none';
        }
    }

    populateImagePreviewGrid() {
        const previewGrid = document.getElementById('image-preview-grid');
        previewGrid.innerHTML = '';
        
        this.images.forEach((image, index) => {
            if (index !== this.currentImageIndex) { // Don't allow linking to current image
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.dataset.index = index;
                
                previewItem.innerHTML = `
                    <img src="${image.path}" alt="${image.name}" />
                    <div class="image-name">${image.name}</div>
                `;
                
                // Add click event
                previewItem.addEventListener('click', () => {
                    // Remove previous selection
                    previewGrid.querySelectorAll('.image-preview-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Select this item
                    previewItem.classList.add('selected');
                    this.selectedTargetImageIndex = index;
                });
                
                previewGrid.appendChild(previewItem);
            }
        });
    }

    updatePhotoOrdering() {
        const photoList = document.querySelector('.photo-list');
        if (!photoList) return;
        
        photoList.innerHTML = '';
        
        this.photoOrder.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'photo-item';
            item.draggable = true;
            item.dataset.index = index;
            
            item.innerHTML = `
                <div class="drag-handle">⋮⋮</div>
                <img src="${photo.path}" alt="${photo.name}" />
                <span>${photo.name}</span>
            `;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const targetIndex = parseInt(e.target.closest('.photo-item').dataset.index);
                
                if (draggedIndex !== targetIndex) {
                    this.reorderPhotos(draggedIndex, targetIndex);
                }
            });
            
            photoList.appendChild(item);
        });
    }

    reorderPhotos(fromIndex, toIndex) {
        const item = this.photoOrder.splice(fromIndex, 1)[0];
        this.photoOrder.splice(toIndex, 0, item);
        this.updatePhotoOrdering();
    }

    savePhotoOrder() {
        localStorage.setItem(`photoOrder_${this.currentFolder}`, JSON.stringify(this.photoOrder.map(p => p.name)));
        alert('Photo order saved!');
    }

    loadHotspots(folderName) {
        const saved = localStorage.getItem(`hotspots_${folderName}`);
        if (saved) {
            this.hotspots = JSON.parse(saved);
        }
    }

    saveHotspotsToStorage() {
        localStorage.setItem(`hotspots_${this.currentFolder}`, JSON.stringify(this.hotspots));
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    updateLoadingText(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    updateLoadingDetails(details) {
        const loadingDetails = document.getElementById('loading-details');
        if (loadingDetails) {
            loadingDetails.textContent = details;
        }
    }

    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VirtualTourApp();
});