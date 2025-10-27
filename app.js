class VirtualTourApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.sky = null;
        this.currentFolder = 'pakapiens';
        this.currentImageIndex = 0;
        this.currentImageName = '';
        this.images = [];
        this.hotspots = [];
        this.devMode = false;
        this.photoOrder = [];
        this.imageCache = new Map();
        this.tempHotspotPosition = null;
        this.vrNavigationPanel = null;
        this.isXRMode = false;
        this.cameraRotationCheckInterval = null;
        
        this.init();
    }

    async init() {
        await this.loadDataFromJson();
        this.setupEventListeners();
        await this.loadFolderImages('pakapiens');
        this.setupAFrame();
        this.hideLoading();
    }
    
    setupControllerEvents() {
        if (typeof AFRAME === 'undefined') {
            console.warn('A-Frame not loaded yet, controller events not set up');
            return;
        }
        
        const leftController = document.querySelector('#left-controller');
        const rightController = document.querySelector('#right-controller');
        
        if (!leftController || !rightController) {
            console.warn('Controller elements not found');
            return;
        }
        
        this.scene.addEventListener('enter-vr', () => {
            if ("xr" in window.navigator) {
                this.onViewModeChange(true);
            }
        });

        this.scene.addEventListener('exit-vr', () => {
            this.onViewModeChange(false);
        });
        
        leftController.addEventListener('raycaster-intersection', (e) => {
            this.handleControllerIntersection(e, 'left');
        });
        
        leftController.addEventListener('raycaster-intersection-cleared', (e) => {
            this.handleControllerIntersectionCleared(e, 'left');
        });
        
        rightController.addEventListener('raycaster-intersection', (e) => {
            this.handleControllerIntersection(e, 'right');
        });
        
        rightController.addEventListener('raycaster-intersection-cleared', (e) => {
            this.handleControllerIntersectionCleared(e, 'right');
        });
        
        console.log('Controller events set up successfully');
    }

    handleControllerIntersection(event, controllerType) {
        const intersectedEls = event.detail.els;
        
        for (let i = 0; i < intersectedEls.length; i++) {
            const el = intersectedEls[i];
            
            if (el.classList && el.classList.contains('hotspot')) {
                el.setAttribute('scale', '1.2 1.2 1.2');
                el.setAttribute('color', '#ff9500');
                console.log(`${controllerType} controller intersecting with hotspot:`, el.id);
            }
        }
    }
    
    handleControllerIntersectionCleared(event, controllerType) {
        const clearedEls = event.detail.clearedEls;
        
        for (let i = 0; i < clearedEls.length; i++) {
            const el = clearedEls[i];
            
            if (el.classList && el.classList.contains('hotspot')) {
                el.setAttribute('scale', '1 1 1');
                el.setAttribute('color', '#667eea');
                console.log(`${controllerType} controller no longer intersecting with hotspot:`, el.id);
            }
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.folder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const folder = e.target.dataset.folder;
                this.switchFolder(folder);
            });
        });

        document.getElementById('devModeBtn').addEventListener('click', () => {
            this.toggleDevMode();
        });

        document.getElementById('save-hotspot').addEventListener('click', () => {
            this.saveHotspot();
        });

        document.getElementById('cancel-hotspot').addEventListener('click', () => {
            this.cancelHotspot();
        });

        document.getElementById('save-order').addEventListener('click', () => {
            this.savePhotoOrder();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('prev-image').addEventListener('click', () => {
            this.previousImage();
        });

        document.getElementById('next-image').addEventListener('click', () => {
            this.nextImage();
        });

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

        this.loadHotspotsFromStorage(folderName);

        try {
            const imageFiles = this.getImageFilesForFolder(folderName);
            this.updateLoadingText(`Ielādējas ${imageFiles.length} attēli no ${folderName}...`);
            this.updateProgress(0, imageFiles.length);

            const loadedImages = await this.loadImagesInBatches(imageFiles, folderName, 3);
            this.images = loadedImages;

            const savedOrder = this.loadPhotoOrderFromStorage(folderName);
            if (savedOrder?.length) {
                const orderedImages = [];
                savedOrder.forEach(imageName => {
                    const foundImage = this.images.find(img => img.name === imageName);
                    if (foundImage) orderedImages.push(foundImage);
                });
                this.images.forEach(img => {
                    if (!savedOrder.includes(img.name)) orderedImages.push(img);
                });
                this.images = orderedImages;
            }

            this.photoOrder = [...this.images];
            this.currentImageIndex = 0;
            this.updateLoadingText('Attēli ielādēti!');
            this.updateProgress(imageFiles.length, imageFiles.length);

            this.preloadOtherFolders(folderName);

            setTimeout(() => this.hideLoading(), 500);
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

    async loadImagesInBatches(imageFiles, folderName, batchSize = 3) {
        const loadedImages = [];
        const totalImages = imageFiles.length;

        for (let i = 0; i < totalImages; i += batchSize) {
            const batch = imageFiles.slice(i, i + batchSize);
            this.updateLoadingText(`Loading ${batch.join(', ')}...`);
            this.updateLoadingDetails(`${Math.min(i + batchSize, totalImages)} no ${totalImages} attēliem`);

            const results = await Promise.allSettled(
                batch.map(file => this.loadSingleImageWithCache(`./${folderName}/${file}`, file))
            );

            results.forEach((res, idx) => {
                const file = batch[idx];
                if (res.status === 'fulfilled') {
                    loadedImages.push({
                        name: file,
                        element: res.value,
                        path: `./${folderName}/${file}`,
                        loaded: true
                    });
                } else {
                    console.warn(`Failed to load ${file}:`, res.reason);
                    loadedImages.push({
                        name: file,
                        element: null,
                        path: `./${folderName}/${file}`,
                        loaded: false,
                        error: res.reason?.message || 'Load failed'
                    });
                }
            });

            this.updateProgress(Math.min(i + batchSize, totalImages), totalImages);
            await new Promise(r => setTimeout(r, 100));
        }

        return loadedImages;
    }

    async loadSingleImageWithCache(imagePath, fileName) {
        if (this.imageCache.has(imagePath)) {
            return this.imageCache.get(imagePath);
        }

        const img = await this.loadSingleImage(imagePath, fileName);
        this.imageCache.set(imagePath, img);
        return img;
    }

    async preloadOtherFolders(currentFolder) {
        const folders = ['pakapiens', 'pietura', 'spaktele'];
        const otherFolders = folders.filter(f => f !== currentFolder);

        for (const folder of otherFolders) {
            if (this.imageCache.has(`folder:${folder}`)) {
                console.log(`Skipping already preloaded folder ${folder}`);
                continue;
            }

            console.log(`Preloading folder ${folder} in background...`);
            const imageFiles = this.getImageFilesForFolder(folder);
            await Promise.allSettled(
                imageFiles.map(file =>
                    this.loadSingleImageWithCache(`./${folder}/${file}`, file)
                )
            );
            this.imageCache.set(`folder:${folder}`, true);
            console.log(`Finished preloading folder ${folder}`);
        }
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
        
        if (this.scene) {
            this.setupControllerEvents();
            this.createVRNavigationPanel();
        }
        
        if (this.images.length > 0) {
            this.loadCurrentImage();
        } else {
            console.warn('No images loaded yet');
        }
    }
    
    startCameraRotationCheck() {
        if (this.cameraRotationCheckInterval) {
            clearInterval(this.cameraRotationCheckInterval);
        }
        
        this.cameraRotationCheckInterval = setInterval(() => {
            if (!this.camera || !this.camera.object3D) return;
            
            const cameraRotation = this.camera.object3D.rotation;
            const pitchInDegrees = THREE.MathUtils.radToDeg(cameraRotation.x);
            
            if (this.vrNavigationPanel) {
                // Show panel when looking down (pitch < -30°)
                if (pitchInDegrees < -30) {
                    this.vrNavigationPanel.setAttribute('visible', 'true');
                } 
                // Hide panel when looking back up (pitch > -20°)
                else if (pitchInDegrees > -20) {
                    this.vrNavigationPanel.setAttribute('visible', 'false');
                }
            }
        }, 100); // Check every 100ms
    }

    // New method to stop checking camera rotation
    stopCameraRotationCheck() {
        if (this.cameraRotationCheckInterval) {
            clearInterval(this.cameraRotationCheckInterval);
            this.cameraRotationCheckInterval = null;
        }
    }

    createVRNavigationPanel() {
        const existingPanel = document.querySelector('#vr-navigation-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('a-entity');
        panel.setAttribute('id', 'vr-navigation-panel');
        panel.setAttribute('position', '0 -1.5 -2');
        panel.setAttribute('visible', 'false');
        
        const background = document.createElement('a-plane');
        background.setAttribute('width', '2.5');
        background.setAttribute('height', '0.6');
        background.setAttribute('color', '#1a1a2e');
        background.setAttribute('opacity', '0.9');
        background.setAttribute('shader', 'flat');
        panel.appendChild(background);

        const title = document.createElement('a-text');
        title.setAttribute('value', 'SELECT TOUR');
        title.setAttribute('align', 'center');
        title.setAttribute('position', '0 0.2 0.01');
        title.setAttribute('width', '2');
        title.setAttribute('color', '#ffffff');
        panel.appendChild(title);

        const tours = [
            { folder: 'pakapiens', label: 'Pakāpiens', position: '-0.8 -0.05 0.01' },
            { folder: 'pietura', label: 'Pietura', position: '0 -0.05 0.01' },
            { folder: 'spaktele', label: 'Špaktele', position: '0.8 -0.05 0.01' }
        ];

        tours.forEach(tour => {
            const buttonGroup = document.createElement('a-entity');
            buttonGroup.setAttribute('position', tour.position);
            
            // Get first image from folder for preview
            const imageFiles = this.getImageFilesForFolder(tour.folder);
            const previewImagePath = `./${tour.folder}/${imageFiles[0]}`;
            
            // Preview image plane
            const previewPlane = document.createElement('a-plane');
            previewPlane.setAttribute('width', '0.6');
            previewPlane.setAttribute('height', '0.3');
            previewPlane.setAttribute('position', '0 0.2 0.01');
            previewPlane.setAttribute('src', previewImagePath);
            previewPlane.setAttribute('shader', 'flat');
            buttonGroup.appendChild(previewPlane);
            
            // Preview border
            const previewBorder = document.createElement('a-plane');
            previewBorder.setAttribute('width', '0.64');
            previewBorder.setAttribute('height', '0.34');
            previewBorder.setAttribute('position', '0 0.2 0.005');
            previewBorder.setAttribute('color', this.currentFolder === tour.folder ? '#667eea' : '#444');
            previewBorder.setAttribute('shader', 'flat');
            buttonGroup.appendChild(previewBorder);
            
            const button = document.createElement('a-box');
            button.setAttribute('width', '0.65');
            button.setAttribute('height', '0.25');
            button.setAttribute('depth', '0.05');
            button.setAttribute('color', this.currentFolder === tour.folder ? '#667eea' : '#16213e');
            button.setAttribute('class', 'vr-tour-button');
            button.setAttribute('data-folder', tour.folder);
            button.setAttribute('data-raycastable', '');
            
            const buttonText = document.createElement('a-text');
            buttonText.setAttribute('value', tour.label);
            buttonText.setAttribute('align', 'center');
            buttonText.setAttribute('position', '0 0 0.03');
            buttonText.setAttribute('width', '0.6');
            buttonText.setAttribute('color', '#ffffff');
            
            button.addEventListener('mouseenter', () => {
                if (this.currentFolder !== tour.folder) {
                    button.setAttribute('color', '#4a5fc1');
                    button.setAttribute('depth', '0.08');
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (this.currentFolder !== tour.folder) {
                    button.setAttribute('color', '#16213e');
                    button.setAttribute('depth', '0.05');
                }
            });
            
            button.addEventListener('click', async () => {
                console.log('VR Tour button clicked:', tour.folder);
                await this.switchFolder(tour.folder);
                this.updateVRNavigationPanel();
            });
            
            buttonGroup.appendChild(button);
            buttonGroup.appendChild(buttonText);
            panel.appendChild(buttonGroup);
        });

        this.scene.appendChild(panel);
        this.vrNavigationPanel = panel;
        
        console.log('VR Navigation Panel created');
    }

    updateVRNavigationPanel() {
        if (!this.vrNavigationPanel) return;
        
        const buttons = this.vrNavigationPanel.querySelectorAll('.vr-tour-button');
        buttons.forEach(button => {
            const folder = button.getAttribute('data-folder');
            const buttonGroup = button.parentElement;
            const border = buttonGroup.querySelector('a-plane[height="0.34"]');
            
            if (folder === this.currentFolder) {
                button.setAttribute('color', '#667eea');
                if (border) {
                    border.setAttribute('color', '#667eea'); // Update border color
                }
            } else {
                button.setAttribute('color', '#16213e');
                if (border) {
                    border.setAttribute('color', '#444'); // Update border color
                }
            }
        });
    }

    onViewModeChange(isActive) {
        const leftController = document.querySelector('#left-controller');
        const rightController = document.querySelector('#right-controller');
        if (leftController && rightController) {
            leftController.setAttribute('visible', isActive ? 'true' : 'false');
            rightController.setAttribute('visible', isActive ? 'true' : 'false');
        }
        
        this.isXRMode = isActive;
        
        if (isActive) {
            this.startCameraRotationCheck(); // Start monitoring
        } else {
            this.stopCameraRotationCheck(); // Stop monitoring
            if (this.vrNavigationPanel) {
                this.vrNavigationPanel.setAttribute('visible', 'false');
            }
        }
        
        this.renderHotspots();
    }

    loadCurrentImage() {
        console.log('Loading current image...', this.currentImageIndex);
        if (this.images.length === 0) {
            console.warn('No images available');
            return;
        }
        
        const currentImage = this.images[this.currentImageIndex];
        console.log('Current image:', currentImage);
        
        this.currentImageName = currentImage.name;
        
        if (!currentImage.loaded) {
            console.warn(`Image ${currentImage.name} failed to load:`, currentImage.error);
            this.showImageError(currentImage);
            return;
        }
        
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

    navigateToImageByName(imageName) {
        const imageIndex = this.images.findIndex(img => img.name === imageName);
        if (imageIndex !== -1) {
            this.currentImageIndex = imageIndex;
            this.currentImageName = imageName;
            this.loadCurrentImage();
            return true;
        }
        return false;
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
        const folderBtn = document.querySelector(`[data-folder="${folderName}"]`);
        if (folderBtn) {
            folderBtn.classList.add('active');
        }
        
        await this.loadFolderImages(folderName);
        this.setupAFrame();
        this.updateVRNavigationPanel();
    }

    toggleDevMode() {
        this.devMode = !this.devMode;
        const devControls = document.getElementById('dev-controls');
        const btn = document.getElementById('devModeBtn');
        const reticle = document.getElementById('reticle');
        const photoOrdering = document.getElementById('photo-ordering');
        
        if (this.devMode) {
            devControls.classList.remove('hidden');
            reticle.classList.remove('hidden');
            photoOrdering.classList.remove('hidden');
            btn.textContent = 'Exit Dev Mode';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
            this.createHotspotAtPosition();

            this.selectedTargetImageIndex = undefined;
            const targetImageContainer = document.getElementById('hotspot-target-image-container');
            if (targetImageContainer) {
                targetImageContainer.style.display = 'block';
            }  
            this.populateImagePreviewGrid();
            const form = document.getElementById('dev-controls');
            console.log('Form element:', form);
            form.style.display = 'block';
        } else {
            devControls.classList.add('hidden');
            reticle.classList.add('hidden');
            photoOrdering.classList.add('hidden');
            btn.textContent = 'Dev Mode';
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
        }
    }

    createHotspotAtPosition() {
        const camera = document.querySelector('#main-camera');
        
        if (!camera) return;
        
        const camera3D = camera.object3D;
        const cameraWorldPos = new THREE.Vector3();
        camera3D.getWorldPosition(cameraWorldPos);
        
        const direction = new THREE.Vector3(0, 0.65, -5);
        direction.applyQuaternion(camera3D.quaternion);
        
        let distance = parseFloat(this.tempHotspotDistance || 1.0);
        
        const spherePos = cameraWorldPos.clone().add(direction.multiplyScalar(distance));
        
        this.tempHotspotPosition = {
            x: spherePos.x,
            y: spherePos.y,
            z: spherePos.z,
            aframe: `${spherePos.x} ${spherePos.y} ${spherePos.z}`
        } 
    }

    saveHotspot() {
        this.createHotspotAtPosition();
        console.log('saveHotspot called');
        
        console.log('Hotspot data:', { position: this.tempHotspotPosition });
        
        if (this.selectedTargetImageIndex === undefined) {
            alert('Please select a target image for navigation');
            return;
        }
        
        const currentImageName = this.images[this.currentImageIndex].name;
        const targetImageName = this.images[this.selectedTargetImageIndex].name;
        
        const hotspot = {
            id: Date.now().toString(),
            position: this.tempHotspotPosition,
            imageIndex: this.currentImageIndex,
            imageName: currentImageName,
            linkType: 'image',
            targetImageIndex: this.selectedTargetImageIndex,
            targetImageName: targetImageName,
            createdAt: new Date().toISOString(),
            distance: "1.0"
        };
        
        this.hotspots.push(hotspot);
        console.log('Added hotspot, total hotspots:', this.hotspots.length);
        console.log('Current image index:', this.currentImageIndex);
        console.log('Current image name:', currentImageName);
        
        setTimeout(() => {
            this.renderHotspots();
        }, 100);
        
        document.getElementById('hotspot-target-image-container').style.display = 'block';
        this.selectedTargetImageIndex = undefined;
        
        document.querySelectorAll('.image-preview-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.saveHotspotsToStorage();
        
        this.showHotspotCreatedMessage();
    }

    cancelHotspot() {
        document.getElementById('hotspot-target-image-container').style.display = 'block';
        this.tempHotspotPosition = null;
        this.selectedTargetImageIndex = undefined;
        
        document.querySelectorAll('.image-preview-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    renderHotspots() {
        console.log('renderHotspots called, total hotspots:', this.hotspots.length);
        const scene = document.querySelector('#aframe-scene');
        if (!scene) return;

        const existingHotspots = scene.querySelectorAll('.hotspot');
        console.log('Removing existing hotspots:', existingHotspots.length);
        existingHotspots.forEach(hotspot => hotspot.remove());

        const currentImageName = this.currentImageName;

        const currentHotspots = this.hotspots.filter(h =>
            h.imageName === currentImageName ||
            (!h.imageName && h.imageIndex === this.currentImageIndex)
        );

        console.log('Current image hotspots:', currentHotspots.length);

        currentHotspots.forEach(hotspot => {
            if (!hotspot.position || !hotspot.position.aframe) {
                console.warn('Skipping hotspot with invalid position:', hotspot);
                return;
            }

            const hotspotElement = document.createElement('a-sphere');
            hotspotElement.setAttribute('position', hotspot.position.aframe);

            if (this.isXRMode && this.camera && this.camera.object3D) {
                const camPos = new THREE.Vector3();
                this.camera.object3D.getWorldPosition(camPos);
                const basePos = new THREE.Vector3(
                    parseFloat(hotspot.position.x),
                    parseFloat(hotspot.position.y),
                    parseFloat(hotspot.position.z)
                );
                const vec = basePos.clone().sub(camPos).multiplyScalar(4);
                const newPos = camPos.clone().add(vec);
                hotspotElement.setAttribute('position', `${newPos.x} ${newPos.y - 2} ${newPos.z}`);
                hotspotElement.setAttribute('radius', '0.75');
            } else {
                hotspotElement.setAttribute('radius', '0.25');
            }

            hotspotElement.setAttribute('color', '#667eea');
            hotspotElement.setAttribute('opacity', '0.8');
            hotspotElement.setAttribute('cursor-listener', '');
            hotspotElement.setAttribute('data-hotspot-id', hotspot.id);
            hotspotElement.setAttribute('data-raycastable', '');
            hotspotElement.classList.add('hotspot');

            hotspotElement.addEventListener('click', (event) => {
                event.stopPropagation();
                if (this.devMode) {
                    this.showHotspotManagementMenu(hotspot.id, event);
                } else {
                    this.showHotspotInfo(hotspot.id);
                }
            });

            hotspotElement.addEventListener('mouseenter', (event) => {
                hotspotElement.setAttribute('scale', '1.2 1.2 1.2');
                hotspotElement.setAttribute('opacity', '1');
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
        
        if (hotspot.targetImageName) {
            if (this.navigateToImageByName(hotspot.targetImageName)) {
                return;
            }
        }
        
        if (hotspot.targetImageIndex !== null && hotspot.targetImageIndex < this.images.length) {
            this.currentImageIndex = hotspot.targetImageIndex;
            this.loadCurrentImage();
        }
    }

    populateImagePreviewGrid() {
        const previewGrid = document.getElementById('image-preview-grid');
        previewGrid.innerHTML = '';
        
        this.images.forEach((image, index) => {
            if (index !== this.currentImageIndex) {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.dataset.index = index;
                
                const thumbnail = this.createOptimizedThumbnail(image);
                
                previewItem.innerHTML = `
                    <img src="${thumbnail}" alt="${image.name}" loading="lazy" />
                    <div class="image-name">${image.name}</div>
                    <div class="image-loading">Loading...</div>
                `;
                
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
                
                previewItem.addEventListener('click', () => {
                    previewGrid.querySelectorAll('.image-preview-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    previewItem.classList.add('selected');
                    this.selectedTargetImageIndex = index;
                });
                
                previewGrid.appendChild(previewItem);
            }
        });
    }

    createOptimizedThumbnail(imageData) {
        const cacheKey = `thumb_${imageData.name}`;
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxWidth = 80;
        const maxHeight = 60;
        
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
        
        ctx.drawImage(imageData.element, 0, 0, width, height);
        
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
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

    async savePhotoOrder() {
        try {
            const orderData = this.photoOrder.map(p => p.name);
            const key = `photoOrder:${this.currentFolder}`;
            localStorage.setItem(key, JSON.stringify(orderData));
            alert('Photo order saved!');
            console.log(orderData);
        } catch (error) {
            console.error('Error saving photo order:', error);
            alert('Error saving photo order: ' + error.message);
        }
    }

    async loadDataFromJson() {
        try {
            const response = await fetch('./data.json');
            if (!response.ok) {
                console.log('No data.json found, using localStorage');
                return;
            }
            
            const data = await response.json();
            console.log('Loading data from data.json:', data);
            
            if (data.hotspots) {
                Object.keys(data.hotspots).forEach(folder => {
                    const key = `hotspots:${folder}`;
                    const hotspotsData = data.hotspots[folder].hotspots || data.hotspots[folder];
                    localStorage.setItem(key, JSON.stringify(hotspotsData));
                });
                console.log('Imported hotspots from data.json');
            }
            
            if (data.photoOrders) {
                Object.keys(data.photoOrders).forEach(folder => {
                    const key = `photoOrder:${folder}`;
                    localStorage.setItem(key, JSON.stringify(data.photoOrders[folder]));
                });
                console.log('Imported photo orders from data.json');
            }
            
            console.log('Successfully loaded all data from data.json');
        } catch (error) {
            console.log('No data.json found or error reading it (this is normal):', error.message);
        }
    }

    exportData() {
        try {
            const exportData = {
                hotspots: {},
                photoOrders: {},
                exportedAt: new Date().toISOString()
            };
            
            const folders = ['pakapiens', 'pietura', 'spaktele'];
            folders.forEach(folder => {
                const hotspotsKey = `hotspots:${folder}`;
                const hotspotsData = localStorage.getItem(hotspotsKey);
                if (hotspotsData) {
                    const parsedData = JSON.parse(hotspotsData);
                    if (Array.isArray(parsedData)) {
                        exportData.hotspots[folder] = parsedData;
                    } else if (parsedData.hotspots) {
                        exportData.hotspots[folder] = parsedData.hotspots;
                    }
                }
                
                const photoOrderKey = `photoOrder:${folder}`;
                const photoOrderData = localStorage.getItem(photoOrderKey);
                if (photoOrderData) {
                    exportData.photoOrders[folder] = JSON.parse(photoOrderData);
                }
            });
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `data.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            const messageDiv = document.createElement('div');
            messageDiv.textContent = 'Data exported successfully!';
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
            
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 3000);
            
            console.log('Data exported successfully:', exportData);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data: ' + error.message);
        }
    }

    async saveHotspotsToStorage() {
        try {
            const key = `hotspots:${this.currentFolder}`;
            localStorage.setItem(key, JSON.stringify(this.hotspots));
            console.log('Hotspots saved to storage successfully');
            console.log(this.hotspots);
        } catch (error) {
            console.error('Error saving hotspots to storage:', error);
            alert('Error saving hotspots: ' + error.message);
        }
    }

    loadPhotoOrderFromStorage(folderName) {
        try {
            const key = `photoOrder:${folderName}`;
            const storedData = localStorage.getItem(key);
            
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                console.log(`Loaded photo order for ${folderName}:`, parsedData);
                return parsedData;
            } else {
                console.log(`No photo order found for ${folderName}`);
                return [];
            }
        } catch (error) {
            console.error('Error loading photo order from storage:', error);
            return [];
        }
    }

    loadHotspotsFromStorage(folderName) {
        try {
            const key = `hotspots:${folderName}`;
            const storedData = localStorage.getItem(key);
            
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (Array.isArray(parsedData)) {
                    this.hotspots = parsedData;
                } else if (parsedData.hotspots) {
                    this.hotspots = parsedData.hotspots;
                } else {
                    this.hotspots = [];
                }
                console.log(`Loaded ${this.hotspots.length} hotspots for ${folderName}`);
            } else {
                console.log(`No hotspots found for ${folderName}`);
                this.hotspots = [];
            }
        } catch (error) {
            console.error('Error loading hotspots from storage:', error);
            this.hotspots = [];
        }
    }

    showHotspotCreatedMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'hotspot-success-message';
        messageDiv.textContent = `Hotspot created successfully!`;
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
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    showHotspotManagementMenu(hotspotId, event) {
        const hotspot = this.hotspots.find(h => h.id === hotspotId);
        if (!hotspot) return;

        const existingMenu = document.getElementById('hotspot-management-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        let mouseX = event.clientX || window.innerWidth / 2;
        let mouseY = event.clientY || window.innerHeight / 2;
        
        if (mouseX > window.innerWidth - 250) {
            mouseX = window.innerWidth - 250;
        }
        if (mouseY > window.innerHeight - 200) {
            mouseY = window.innerHeight - 200;
        }

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

        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            padding: 8px 16px;
            border-bottom: 1px solid #eee;
            font-size: 12px;
            color: #666;
        `;

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

        const distanceDiv = document.createElement('div');
        distanceDiv.style.cssText = `
            padding: 8px 16px;
            border-top: 1px solid #eee;
        `;
        
        const distanceLabel = document.createElement('div');
        distanceLabel.textContent = 'Distance:';
        distanceLabel.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 4px;';
        distanceDiv.appendChild(distanceLabel);

        const distanceSlider = document.createElement('input');
        distanceSlider.type = 'range';
        distanceSlider.min = '0.5';
        distanceSlider.max = '2.0';
        distanceSlider.step = '0.1';
        distanceSlider.value = hotspot.distance || '1.0';
        distanceSlider.style.cssText = 'width: 100%;';
        distanceSlider.addEventListener('input', (e) => {
            this.updateHotspotDistance(hotspotId, parseFloat(e.target.value));
        });
        distanceDiv.appendChild(distanceSlider);

        const distanceValue = document.createElement('div');
        distanceValue.textContent = `Current: ${hotspot.distance || '1.0'}`;
        distanceValue.style.cssText = 'font-size: 11px; color: #999; text-align: center; margin-top: 4px;';
        distanceDiv.appendChild(distanceValue);

        distanceSlider.addEventListener('input', (e) => {
            distanceValue.textContent = `Current: ${e.target.value}`;
        });

        menu.appendChild(distanceDiv);

        document.body.appendChild(menu);

        menu.addEventListener('mouseleave', () => {
            this.hideHotspotManagementMenu();
        });
    }

    deleteHotspot(hotspotId) {
        console.log('Deleting hotspot:', hotspotId);
        if (confirm('Are you sure you want to delete this hotspot?')) {
            const initialLength = this.hotspots.length;
            this.hotspots = this.hotspots.filter(h => h.id !== hotspotId);
            console.log(`Deleted hotspot. Before: ${initialLength}, After: ${this.hotspots.length}`);
            
            this.renderHotspots();
            
            this.saveHotspotsToStorage();
            
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

    updateHotspotDistance(hotspotId, newDistance) {
        console.log('Updating hotspot distance:', hotspotId, newDistance);
        const hotspot = this.hotspots.find(h => h.id === hotspotId);
        if (hotspot) {
            hotspot.distance = newDistance.toString();
            console.log('Updated hotspot distance to:', hotspot.distance);
            
            this.tempHotspotDistance = newDistance;
            this.tempHotspotPosition = hotspot.position;
            this.createHotspotAtPosition();
            hotspot.position = this.tempHotspotPosition;
            
            this.renderHotspots();
            
            this.saveHotspotsToStorage();
        } else {
            console.error('Hotspot not found for distance update:', hotspotId);
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

document.addEventListener('DOMContentLoaded', () => {
    window.app = new VirtualTourApp();
});