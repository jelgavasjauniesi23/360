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


        // Photo ordering
        document.getElementById('save-order').addEventListener('click', () => {
            this.savePhotoOrder();
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
            await this.loadHotspots(folderName);
            
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
            }, 120000);
            
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
        this.createTestSphere(); // Add test sphere
        this.startTestSphereUpdate(); // Start updating position
    } else {
        devControls.classList.add('hidden');
        reticle.classList.add('hidden');
        btn.textContent = 'Dev Mode';
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-primary');
        this.removeDevModeClick();
        this.removeTestSphere(); // Remove test sphere
        this.stopTestSphereUpdate(); // Stop updating
    }
}

createTestSphere() {
    // Remove existing test sphere if any
    this.removeTestSphere();
    
    const scene = document.querySelector('#aframe-scene');
    if (!scene) return;
    
    // Create test sphere
    const testSphere = document.createElement('a-sphere');
    testSphere.setAttribute('id', 'test-sphere');
    testSphere.setAttribute('radius', '0.3');
    testSphere.setAttribute('color', '#ff0000');
    testSphere.setAttribute('opacity', '0.7');
    testSphere.setAttribute('position', '0 0 -3');
    
    scene.appendChild(testSphere);
    console.log('Test sphere created');
}

removeTestSphere() {
    const testSphere = document.querySelector('#test-sphere');
    if (testSphere) {
        testSphere.remove();
        console.log('Test sphere removed');
    }
}

startTestSphereUpdate() {
    // Update test sphere position every frame
    this.testSphereInterval = setInterval(() => {
        this.updateTestSpherePosition();
    }, 100); // Update every 100ms
}

stopTestSphereUpdate() {
    if (this.testSphereInterval) {
        clearInterval(this.testSphereInterval);
        this.testSphereInterval = null;
    }
}

updateTestSpherePosition() {
    const testSphere = document.querySelector('#test-sphere');
    const camera = document.querySelector('#main-camera');
    
    if (!testSphere || !camera) return;
    
    // Get camera's Three.js object
    const camera3D = camera.object3D;
    const cameraWorldPos = new THREE.Vector3();
    camera3D.getWorldPosition(cameraWorldPos);
    
    // Get forward direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera3D.quaternion);
    
    // Calculate position at fixed distance
    const distance = 3;
    const spherePos = cameraWorldPos.clone().add(direction.multiplyScalar(distance));
    
    // Update test sphere position
    testSphere.setAttribute('position', `${spherePos.x} ${spherePos.y} ${spherePos.z}`);
    
    // Log position
    console.log('Test sphere position:', {
        x: spherePos.x.toFixed(3),
        y: spherePos.y.toFixed(3),
        z: spherePos.z.toFixed(3)
    });
}

handleSceneClick(event) {
    console.log('handleSceneClick called, devMode:', this.devMode);
    if (!this.devMode) return;
   
    // Check if click was on a hotspot
    if (event.target.classList.contains('hotspot')) {
        return;
    }
   
    // Get camera's Three.js object
    const camera = document.querySelector('#main-camera');
    const camera3D = camera.object3D;
    const cameraWorldPos = new THREE.Vector3();
    camera3D.getWorldPosition(cameraWorldPos);
    
    // Get forward direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera3D.quaternion);
    
    // Calculate position at fixed distance (same as test sphere)
    const distance = 3;
    const hotspotPos = cameraWorldPos.clone().add(direction.multiplyScalar(distance));
    
    const hotspotPosition = {
        x: hotspotPos.x,
        y: hotspotPos.y,
        z: hotspotPos.z,
        aframe: `${hotspotPos.x} ${hotspotPos.y} ${hotspotPos.z}`
    };
   
    console.log('Creating hotspot at position:', hotspotPosition);
    console.log('Camera world position:', {
        x: cameraWorldPos.x.toFixed(3),
        y: cameraWorldPos.y.toFixed(3),
        z: cameraWorldPos.z.toFixed(3)
    });
    console.log('Camera direction:', {
        x: direction.x.toFixed(3),
        y: direction.y.toFixed(3),
        z: direction.z.toFixed(3)
    });
    
    this.createHotspotAtPosition(hotspotPosition);
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
        document.getElementById('hotspot-link-type').value = 'image';
        document.getElementById('hotspot-target-image-container').style.display = 'block';
        this.populateImagePreviewGrid();
    }

    saveHotspot() {
        console.log('saveHotspot called');
        const title = document.getElementById('hotspot-title').value;
        const description = document.getElementById('hotspot-description').value;
        
        console.log('Hotspot data:', { title, description, position: this.tempHotspotPosition });
        
        if (!title.trim()) {
            alert('Please enter a hotspot title');
            return;
        }
        
        if (this.selectedTargetImageIndex === undefined) {
            alert('Please select a target image for navigation');
            return;
        }
        
        const hotspot = {
            id: Date.now().toString(),
            title: title,
            description: description,
            position: this.tempHotspotPosition,
            imageIndex: this.currentImageIndex,
            linkType: 'image',
            targetImageIndex: this.selectedTargetImageIndex,
            createdAt: new Date().toISOString()
        };
        
        this.hotspots.push(hotspot);
        console.log('Added hotspot, total hotspots:', this.hotspots.length);
        console.log('Current image index:', this.currentImageIndex);
        
        // Small delay to ensure A-Frame is ready
        setTimeout(() => {
            this.renderHotspots();
        }, 100);
        
        // Hide dev controls after saving
        document.getElementById('dev-controls').style.display = 'none';
        
        // Clear form
        document.getElementById('hotspot-title').value = '';
        document.getElementById('hotspot-description').value = '';
        document.getElementById('hotspot-link-type').value = 'image';
        document.getElementById('hotspot-target-image-container').style.display = 'block';
        this.selectedTargetImageIndex = undefined;
        
        // Clear selection
        document.querySelectorAll('.image-preview-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Save to localStorage
        this.saveHotspotsToStorage();
        
        // Show success message
        this.showHotspotCreatedMessage(hotspot.title);
    }

    cancelHotspot() {
        document.getElementById('hotspot-title').value = '';
        document.getElementById('hotspot-description').value = '';
        document.getElementById('hotspot-link-type').value = 'image';
        document.getElementById('hotspot-target-image-container').style.display = 'block';
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
        console.log('Removing existing hotspots:', existingHotspots.length);
        existingHotspots.forEach(hotspot => {
            console.log('Removing hotspot element:', hotspot);
            hotspot.remove();
        });
        
        // Only show hotspots for current image
        const currentHotspots = this.hotspots.filter(h => h.imageIndex === this.currentImageIndex);
        console.log('Current image hotspots:', currentHotspots.length);
        console.log('All hotspots:', this.hotspots.map(h => ({ id: h.id, imageIndex: h.imageIndex, title: h.title })));
        
        currentHotspots.forEach(hotspot => {
            const hotspotElement = document.createElement('a-sphere');
            hotspotElement.setAttribute('position', hotspot.position.aframe);
            hotspotElement.setAttribute('radius', hotspot.radius || '0.5');
            hotspotElement.setAttribute('color', '#667eea');
            hotspotElement.setAttribute('opacity', '0.8');
            hotspotElement.setAttribute('cursor-listener', '');
            hotspotElement.setAttribute('data-hotspot-id', hotspot.id);
            hotspotElement.setAttribute('data-raycastable', '');
            hotspotElement.classList.add('hotspot');
            
            // Add click event - prevent navigation in dev mode
            hotspotElement.addEventListener('click', (event) => {
                event.stopPropagation();
                if (this.devMode) {
                    // In dev mode, show management menu instead of navigating
                    this.showHotspotManagementMenu(hotspot.id, event);
                } else {
                    // In normal mode, navigate to target
                    this.showHotspotInfo(hotspot.id);
                }
            });
            
            // Add hover effects and management menu in dev mode
            hotspotElement.addEventListener('mouseenter', () => {
                hotspotElement.setAttribute('scale', '1.2 1.2 1.2');
                hotspotElement.setAttribute('opacity', '1');
                
                // Show management menu in dev mode on hover
                if (this.devMode) {
                    this.showHotspotManagementMenu(hotspot.id, event);
                }
            });
            
            hotspotElement.addEventListener('mouseleave', () => {
                hotspotElement.setAttribute('scale', '1 1 1');
                hotspotElement.setAttribute('opacity', '0.8');
            });
            
            scene.appendChild(hotspotElement);
            console.log('Added hotspot element to scene:', hotspotElement);
        });
    }

    showHotspotInfo(hotspotId) {
        const hotspot = this.hotspots.find(h => h.id === hotspotId);
        if (!hotspot) return;
        
        // All hotspots now navigate to target image
        if (hotspot.targetImageIndex !== null) {
            this.currentImageIndex = hotspot.targetImageIndex;
            this.loadCurrentImage();
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
                
                // Create optimized thumbnail
                const thumbnail = this.createOptimizedThumbnail(image);
                
                previewItem.innerHTML = `
                    <img src="${thumbnail}" alt="${image.name}" loading="lazy" />
                    <div class="image-name">${image.name}</div>
                    <div class="image-loading">Loading...</div>
                `;
                
                // Handle image loading
                const img = previewItem.querySelector('img');
                const loadingDiv = previewItem.querySelector('.image-loading');
                
                img.onload = () => {
                    img.classList.add('loaded');
                    loadingDiv.style.display = 'none';
                };
                
                img.onerror = () => {
                    loadingDiv.textContent = 'Error';
                    loadingDiv.style.background = 'rgba(220, 53, 69, 0.8)';
                };
                
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

    createOptimizedThumbnail(imageData) {
        // Check if we have a cached thumbnail
        const cacheKey = `thumb_${imageData.name}`;
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }

        // Create canvas for thumbnail optimization
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set thumbnail dimensions
        const maxWidth = 80;
        const maxHeight = 60;
        
        // Calculate dimensions maintaining aspect ratio
        let { width, height } = imageData.element;
        const aspectRatio = width / height;
        
        if (width > height) {
            width = Math.min(maxWidth, width);
            height = width / aspectRatio;
        } else {
            height = Math.min(maxHeight, height);
            width = height * aspectRatio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw optimized image
        ctx.drawImage(imageData.element, 0, 0, width, height);
        
        // Convert to optimized data URL
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // Cache the thumbnail
        this.imageCache.set(cacheKey, thumbnailDataUrl);
        
        return thumbnailDataUrl;
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

    async loadHotspots(folderName) {
        try {
            const response = await fetch(`/api/hotspots/${folderName}`);
            if (response.ok) {
                const data = await response.json();
                this.hotspots = data.hotspots || [];
                console.log(`Loaded ${this.hotspots.length} hotspots from JSON file for ${folderName}`);
            } else {
                console.log('No JSON file found, trying localStorage fallback');
                // Fallback to localStorage
                const saved = localStorage.getItem(`hotspots_${folderName}`);
                if (saved) {
                    this.hotspots = JSON.parse(saved);
                }
            }
        } catch (error) {
            console.error('Error loading hotspots from JSON file:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem(`hotspots_${folderName}`);
            if (saved) {
                this.hotspots = JSON.parse(saved);
            }
        }
    }

    async saveHotspotsToStorage() {
        try {
            const response = await fetch(`/api/hotspots/${this.currentFolder}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hotspots: this.hotspots,
                    folder: this.currentFolder,
                    lastUpdated: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Hotspots saved to JSON file:', result.message);
            } else {
                console.error('Failed to save hotspots to JSON file');
                // Fallback to localStorage
                localStorage.setItem(`hotspots_${this.currentFolder}`, JSON.stringify(this.hotspots));
            }
        } catch (error) {
            console.error('Error saving hotspots to JSON file:', error);
            // Fallback to localStorage
            localStorage.setItem(`hotspots_${this.currentFolder}`, JSON.stringify(this.hotspots));
        }
    }

    showHotspotCreatedMessage(title) {
        // Create temporary success message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'hotspot-success-message';
        messageDiv.textContent = `Hotspot "${title}" created successfully!`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #28a745;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 1000;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    showHotspotManagementMenu(hotspotId, event) {
        const hotspot = this.hotspots.find(h => h.id === hotspotId);
        if (!hotspot) return;

        // Remove existing menu
        const existingMenu = document.getElementById('hotspot-management-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Get mouse position or use center of screen for A-Frame events
        let mouseX = event.clientX || window.innerWidth / 2;
        let mouseY = event.clientY || window.innerHeight / 2;
        
        // Adjust position to avoid menu going off-screen
        if (mouseX > window.innerWidth - 250) {
            mouseX = window.innerWidth - 250;
        }
        if (mouseY > window.innerHeight - 200) {
            mouseY = window.innerHeight - 200;
        }

        // Create management menu
        const menu = document.createElement('div');
        menu.id = 'hotspot-management-menu';
        menu.className = 'hotspot-management-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${mouseY}px;
            left: ${mouseX}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            min-width: 200px;
            padding: 8px 0;
        `;

        // Hotspot info
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            padding: 8px 16px;
            border-bottom: 1px solid #eee;
            font-size: 12px;
            color: #666;
        `;
        infoDiv.textContent = `"${hotspot.title}"`;
        menu.appendChild(infoDiv);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Hotspot';
        deleteBtn.style.cssText = `
            width: 100%;
            padding: 8px 16px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            color: #dc3545;
            font-size: 14px;
        `;
        deleteBtn.addEventListener('click', () => {
            this.deleteHotspot(hotspotId);
            menu.remove();
        });
        menu.appendChild(deleteBtn);

        // Size adjustment
        const sizeDiv = document.createElement('div');
        sizeDiv.style.cssText = `
            padding: 8px 16px;
            border-top: 1px solid #eee;
        `;
        
        const sizeLabel = document.createElement('div');
        sizeLabel.textContent = 'Size:';
        sizeLabel.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 4px;';
        sizeDiv.appendChild(sizeLabel);

        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = '0.2';
        sizeSlider.max = '2.0';
        sizeSlider.step = '0.1';
        sizeSlider.value = hotspot.radius || '0.5';
        sizeSlider.style.cssText = 'width: 100%;';
        sizeSlider.addEventListener('input', (e) => {
            this.updateHotspotSize(hotspotId, parseFloat(e.target.value));
        });
        sizeDiv.appendChild(sizeSlider);

        const sizeValue = document.createElement('div');
        sizeValue.textContent = `Current: ${hotspot.radius || '0.5'}`;
        sizeValue.style.cssText = 'font-size: 11px; color: #999; text-align: center; margin-top: 4px;';
        sizeDiv.appendChild(sizeValue);

        sizeSlider.addEventListener('input', (e) => {
            sizeValue.textContent = `Current: ${e.target.value}`;
        });

        menu.appendChild(sizeDiv);

        document.body.appendChild(menu);

        // Add mouse leave event to the menu itself
        menu.addEventListener('mouseleave', () => {
            this.hideHotspotManagementMenu();
        });
    }

    deleteHotspot(hotspotId) {
        console.log('Deleting hotspot:', hotspotId);
        if (confirm('Are you sure you want to delete this hotspot?')) {
            // Remove from hotspots array
            const initialLength = this.hotspots.length;
            this.hotspots = this.hotspots.filter(h => h.id !== hotspotId);
            console.log(`Deleted hotspot. Before: ${initialLength}, After: ${this.hotspots.length}`);
            
            // Re-render hotspots
            this.renderHotspots();
            
            // Save to storage
            this.saveHotspotsToStorage();
            
            // Show deletion message
            const messageDiv = document.createElement('div');
            messageDiv.textContent = 'Hotspot deleted successfully!';
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #dc3545;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                z-index: 1000;
                font-weight: 500;
                box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
            `;
            
            document.body.appendChild(messageDiv);
            
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 3000);
        }
    }

    updateHotspotSize(hotspotId, newSize) {
        console.log('Updating hotspot size:', hotspotId, newSize);
        const hotspot = this.hotspots.find(h => h.id === hotspotId);
        if (hotspot) {
            hotspot.radius = newSize.toString();
            console.log('Updated hotspot radius to:', hotspot.radius);
            
            // Re-render hotspots to show size change
            this.renderHotspots();
            
            // Save to storage
            this.saveHotspotsToStorage();
        } else {
            console.error('Hotspot not found for size update:', hotspotId);
        }
    }

    hideHotspotManagementMenu() {
        const existingMenu = document.getElementById('hotspot-management-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
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