class VirtualTourApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.controls = null;
        this.currentFolder = 'pakapiens';
        this.currentImageIndex = 0;
        this.images = [];
        this.hotspots = [];
        this.devMode = false;
        this.isVRActive = false;
        this.vrButton = null;
        this.photoOrder = [];
        this.imageCache = new Map(); // Cache for loaded images
        this.preloadQueue = []; // Queue for preloading next images
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadFolderImages('pakapiens');
        this.setupThreeJS();
        this.setupVR();
        this.hideLoading();
        this.showInstructions();
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

        // VR button
        document.getElementById('vrBtn').addEventListener('click', () => {
            this.toggleVR();
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

        // Instructions overlay
        document.getElementById('close-instructions').addEventListener('click', () => {
            this.closeInstructions();
        });

        // Canvas click for hotspot creation
        document.getElementById('viewer').addEventListener('click', (e) => {
            if (this.devMode) {
                this.handleCanvasClick(e);
            }
        });

        // Hotspot overlay clicks
        document.getElementById('hotspot-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('hotspot')) {
                this.showHotspotInfo(e.target.dataset.hotspotId);
            }
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
            // Prevent default behavior for arrow keys when not in input fields
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
                        this.showPCModeInfo();
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
            
            // Load images with progress tracking
            const loadedImages = await this.loadImagesWithProgress(imageFiles, folderName);
            
            this.images = loadedImages;
            this.photoOrder = [...this.images];
            this.currentImageIndex = 0;
            this.loadHotspots(folderName);
            
            this.updateLoadingText('Images loaded successfully!');
            this.updateProgress(imageFiles.length, imageFiles.length);
            
            // Small delay to show completion
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
                
                // Update progress
                this.updateProgress(i + 1, totalImages);
                
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.warn(`Failed to load ${file}:`, error);
                // Continue loading other images even if one fails
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
            
            // Set timeout for image loading
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout loading ${fileName}`));
            }, 10000); // 10 second timeout
            
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
        // This would normally be fetched from the server
        // For now, we'll use the known files from the project structure
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

    setupThreeJS() {
        const canvas = document.getElementById('viewer');
        const container = document.getElementById('viewer-container');
        
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Disable OrbitControls completely and use manual controls only
        this.controls = null;
        
        // Setup manual mouse controls as primary method
        this.setupManualMouseControls();
        
        // Create sphere for 360 image
        this.createSphere();
        
        // Load first image
        if (this.images.length > 0) {
            this.loadCurrentImage();
        }
        
        // Start render loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Setup canvas for mouse interactions
        this.setupCanvasInteractions();
    }

    setupManualMouseControls() {
        const canvas = this.renderer.domElement;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        canvas.addEventListener('mousedown', (event) => {
            isDragging = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
            canvas.style.cursor = 'grabbing';
        });
        
        canvas.addEventListener('mousemove', (event) => {
            if (isDragging) {
                const deltaX = event.clientX - previousMousePosition.x;
                const deltaY = event.clientY - previousMousePosition.y;
                
                // Rotate camera based on mouse movement
                this.camera.rotation.y -= deltaX * 0.01;
                this.camera.rotation.x += deltaY * 0.01; // Fixed: changed from -= to +=
                
                // Clamp vertical rotation
                this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
                
                previousMousePosition = { x: event.clientX, y: event.clientY };
                console.log('Manual rotation applied:', this.camera.rotation);
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });
        
        // Handle wheel zoom
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const zoomSpeed = 0.1;
            const zoom = event.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
            this.camera.fov *= zoom;
            this.camera.fov = Math.max(10, Math.min(120, this.camera.fov));
            this.camera.updateProjectionMatrix();
            console.log('Manual zoom applied:', this.camera.fov);
        });
    }

    setupCanvasInteractions() {
        // Ensure canvas can receive mouse events
        const canvas = this.renderer.domElement;
        canvas.style.cursor = 'grab';
        canvas.style.touchAction = 'none'; // Prevent default touch behavior
        
        console.log('Canvas interactions setup completed - using manual controls only');
    }

    createSphere() {
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // Invert the sphere
        
        const material = new THREE.MeshBasicMaterial({
            map: null,
            side: THREE.DoubleSide
        });
        
        this.sphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);
        
        // Position camera inside sphere
        this.camera.position.set(0, 0, 0);
    }

    loadCurrentImage() {
        if (this.images.length === 0) return;
        
        const currentImage = this.images[this.currentImageIndex];
        
        // Check if image failed to load
        if (!currentImage.loaded) {
            console.warn(`Image ${currentImage.name} failed to load:`, currentImage.error);
            this.showImageError(currentImage);
            return;
        }
        
        // Check cache first for better performance
        let texture;
        if (this.imageCache.has(currentImage.path)) {
            texture = this.imageCache.get(currentImage.path);
        } else {
            // Create texture from preloaded image element
            texture = new THREE.Texture(currentImage.element);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            
            // Cache the texture
            this.imageCache.set(currentImage.path, texture);
        }
        
        this.sphere.material.map = texture;
        this.sphere.material.needsUpdate = true;
        
        this.updatePhotoOrdering();
        this.renderHotspots();
        this.updateImageCounter();
        
        // Start preloading adjacent images for smoother navigation
        this.preloadAdjacentImages();
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
        
        // Update button states
        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.images.length <= 1;
            nextBtn.disabled = this.images.length <= 1;
        }
    }

    preloadAdjacentImages() {
        // Preload next and previous images for smoother navigation
        const preloadIndices = [
            (this.currentImageIndex + 1) % this.images.length,
            (this.currentImageIndex - 1 + this.images.length) % this.images.length
        ];
        
        preloadIndices.forEach(index => {
            const image = this.images[index];
            if (image && image.loaded && !this.imageCache.has(image.path)) {
                this.preloadImage(image);
            }
        });
    }

    preloadImage(imageData) {
        if (this.imageCache.has(imageData.path)) {
            return Promise.resolve(this.imageCache.get(imageData.path));
        }
        
        return new Promise((resolve) => {
            const texture = new THREE.Texture(imageData.element);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            
            this.imageCache.set(imageData.path, texture);
            resolve(texture);
        });
    }

    showImageError(imageData) {
        // Create a placeholder texture for failed images
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Create error background
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add error text
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image Error', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '24px Arial';
        ctx.fillText(imageData.name, canvas.width / 2, canvas.height / 2);
        ctx.fillText('Failed to load', canvas.width / 2, canvas.height / 2 + 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        this.sphere.material.map = texture;
        this.sphere.material.needsUpdate = true;
    }

    setupVR() {
        // Check if VRButton is available and WebXR is supported
        if (typeof VRButton !== 'undefined') {
            try {
                this.vrButton = VRButton.createButton(this.renderer);
                document.body.appendChild(this.vrButton);
                console.log('VR Button initialized successfully');
            } catch (error) {
                console.warn('VRButton failed to initialize:', error);
                this.setupVRFallback();
            }
        } else {
            console.warn('VRButton not available');
            this.setupVRFallback();
        }
        
        // Update VR button text based on availability
        this.updateVRButtonText();
    }

    setupVRFallback() {
        // Update VR button to show PC mode instead of hiding
        const vrBtn = document.getElementById('vrBtn');
        if (vrBtn) {
            vrBtn.textContent = 'PC Mode';
            vrBtn.disabled = false;
        }
    }
    
    updateVRButtonText() {
        const vrBtn = document.getElementById('vrBtn');
        if (!vrBtn) return;
        
        // Check if WebXR is supported
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                if (supported) {
                    vrBtn.textContent = 'VR Mode';
                    vrBtn.disabled = false;
                } else {
                    vrBtn.textContent = 'PC Mode';
                    vrBtn.disabled = false;
                }
            }).catch(() => {
                vrBtn.textContent = 'PC Mode';
                vrBtn.disabled = false;
            });
        } else {
            vrBtn.textContent = 'PC Mode';
            vrBtn.disabled = false;
        }
    }

    toggleVR() {
        // Check if VR is supported
        if (!this.renderer.xr || !('xr' in navigator)) {
            // In PC mode, just show a message about controls
            this.showPCModeInfo();
            return;
        }

        // Check if VR session is supported
        navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
            if (!supported) {
                this.showPCModeInfo();
                return;
            }

            if (this.renderer.xr.isPresenting) {
                this.renderer.xr.getSession().end();
            } else {
                navigator.xr.requestSession('immersive-vr').then((session) => {
                    this.renderer.xr.setSession(session);
                    this.isVRActive = true;
                }).catch((error) => {
                    console.error('Failed to start VR session:', error);
                    alert('Failed to start VR session. Please ensure your VR headset is connected and WebXR is supported.');
                });
            }
        }).catch(() => {
            this.showPCModeInfo();
        });
    }
    
    showPCModeInfo() {
        const message = `
PC Mode Active! 

Controls:
• Mouse: Drag to look around
• Scroll: Zoom in/out
• Arrow Keys: Navigate between images
• Spacebar: Next image
• H: Show this help
• Escape: Close modals
• Click hotspots: View information

The tour works perfectly on PC without VR equipment!
        `;
        alert(message);
    }

    switchFolder(folderName) {
        this.currentFolder = folderName;
        
        // Update active folder button
        document.querySelectorAll('.folder-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folderName}"]`).classList.add('active');
        
        this.loadFolderImages(folderName).then(() => {
            this.loadCurrentImage();
        });
    }

    toggleDevMode() {
        this.devMode = !this.devMode;
        const devControls = document.getElementById('dev-controls');
        const btn = document.getElementById('devModeBtn');
        
        if (this.devMode) {
            devControls.classList.remove('hidden');
            btn.textContent = 'Exit Dev Mode';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        } else {
            devControls.classList.add('hidden');
            btn.textContent = 'Dev Mode';
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
        }
    }

    handleCanvasClick(e) {
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Convert screen coordinates to 3D position on sphere
        const vector = new THREE.Vector2(x, y);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vector, this.camera);
        
        const intersects = raycaster.intersectObject(this.sphere);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.createHotspotAtPoint(point);
        }
    }

    createHotspotAtPoint(point) {
        // Convert 3D point to screen coordinates
        const vector = point.clone();
        vector.project(this.camera);
        
        const x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
        const y = (vector.y * -0.5 + 0.5) * this.renderer.domElement.clientHeight;
        
        // Show hotspot form
        const form = document.getElementById('dev-controls');
        form.style.display = 'block';
        
        // Populate target image dropdown
        this.populateTargetImageDropdown();
        
        // Store the position for saving
        this.tempHotspotPosition = { x, y, point };
    }

    saveHotspot() {
        const title = document.getElementById('hotspot-title').value;
        const description = document.getElementById('hotspot-description').value;
        const linkType = document.getElementById('hotspot-link-type').value;
        const targetImage = document.getElementById('hotspot-target-image').value;
        
        if (!title.trim()) {
            alert('Please enter a hotspot title');
            return;
        }
        
        if (linkType === 'image' && !targetImage) {
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
            targetImageIndex: linkType === 'image' ? parseInt(targetImage) : null
        };
        
        this.hotspots.push(hotspot);
        this.renderHotspots();
        
        // Clear form
        document.getElementById('hotspot-title').value = '';
        document.getElementById('hotspot-description').value = '';
        document.getElementById('hotspot-link-type').value = 'info';
        document.getElementById('hotspot-target-image').style.display = 'none';
        
        // Save to localStorage
        this.saveHotspotsToStorage();
    }

    cancelHotspot() {
        document.getElementById('hotspot-title').value = '';
        document.getElementById('hotspot-description').value = '';
        document.getElementById('hotspot-link-type').value = 'info';
        document.getElementById('hotspot-target-image').style.display = 'none';
        this.tempHotspotPosition = null;
    }

    renderHotspots() {
        const overlay = document.getElementById('hotspot-overlay');
        overlay.innerHTML = '';
        
        // Only show hotspots for current image
        const currentHotspots = this.hotspots.filter(h => h.imageIndex === this.currentImageIndex);
        
        currentHotspots.forEach(hotspot => {
            const element = document.createElement('div');
            element.className = 'hotspot';
            element.dataset.hotspotId = hotspot.id;
            element.style.left = hotspot.position.x + 'px';
            element.style.top = hotspot.position.y + 'px';
            overlay.appendChild(element);
        });
    }

    showHotspotInfo(hotspotId) {
        const hotspot = this.hotspots.find(h => h.id === hotspotId);
        if (!hotspot) return;
        
        // If hotspot is linked to an image, navigate to it
        if (hotspot.linkType === 'image' && hotspot.targetImageIndex !== null) {
            this.currentImageIndex = hotspot.targetImageIndex;
            this.loadCurrentImage();
            return;
        }
        
        // Otherwise, show the information modal
        document.getElementById('hotspot-modal-title').textContent = hotspot.title;
        document.getElementById('hotspot-modal-description').textContent = hotspot.description;
        document.getElementById('hotspot-modal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('hotspot-modal').classList.add('hidden');
    }

    updateHotspotLinkType(linkType) {
        const targetImageSelect = document.getElementById('hotspot-target-image');
        if (linkType === 'image') {
            targetImageSelect.style.display = 'block';
        } else {
            targetImageSelect.style.display = 'none';
        }
    }

    populateTargetImageDropdown() {
        const targetImageSelect = document.getElementById('hotspot-target-image');
        targetImageSelect.innerHTML = '<option value="">Select target image...</option>';
        
        this.images.forEach((image, index) => {
            if (index !== this.currentImageIndex) { // Don't allow linking to current image
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `Image ${index + 1}: ${image.name}`;
                targetImageSelect.appendChild(option);
            }
        });
    }

    closeInstructions() {
        document.getElementById('instructions-overlay').classList.add('hidden');
    }

    showInstructions() {
        // Check if user has seen instructions before
        const hasSeenInstructions = localStorage.getItem('hasSeenInstructions');
        if (!hasSeenInstructions) {
            document.getElementById('instructions-overlay').classList.remove('hidden');
            localStorage.setItem('hasSeenInstructions', 'true');
        }
    }

    updatePhotoOrdering() {
        const photoList = document.querySelector('.photo-list');
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
            
            // Add drag and drop functionality
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
        // Save photo order to localStorage
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

    onWindowResize() {
        const container = document.getElementById('viewer-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Only update controls if they exist
        if (this.controls) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VirtualTourApp();
});
