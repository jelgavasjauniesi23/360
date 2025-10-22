# 360° Virtual Tour Application

A modern web-based virtual tour application with VR glasses support, hotspot functionality, and photo ordering capabilities.

## Features

- 🎥 **360° Image Viewer**: View panoramic images with smooth navigation
- 🥽 **VR Support**: Full WebXR support for VR glasses/headsets
- 📍 **Interactive Hotspots**: Add clickable information points to images
- 🛠️ **Dev Mode**: Easy hotspot creation by clicking on images
- 📸 **Photo Ordering**: Drag and drop to reorder photos in each tour
- 📁 **Multi-Folder Support**: Switch between different tour folders
- 💾 **Persistent Storage**: Hotspots and photo orders are saved locally

## Quick Start

### Option 1: Python Server (Recommended)
```bash
python server.py
```
Then navigate to http://127.0.0.1:5500/

### Option 2: Live Server (VS Code)
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"

### Option 3: Any HTTP Server
Serve the files using any HTTP server (Apache, Nginx, etc.)

## Usage

### Basic Navigation
1. **Select a Tour**: Use the folder buttons (Pakapiens, Pietura, Spaktele) to switch between different 360° tours
2. **Navigate**: Click and drag to look around, scroll to zoom
3. **VR Mode**: Click "Enter VR" to use with VR glasses/headsets

### Adding Hotspots (Dev Mode)
1. Click the "Dev Mode" button to enable developer mode
2. Click anywhere on the 360° image to add a hotspot
3. Fill in the title and description
4. Click "Save Hotspot" to create the interactive point
5. Click "Exit Dev Mode" when done

### Photo Ordering
1. Click on any hotspot to open the photo ordering panel
2. Drag and drop photos to reorder them
3. Click "Save Order" to persist the changes

### VR Experience
1. Ensure your VR headset is connected and WebXR is supported
2. Click "Enter VR" to start the VR experience
3. Use your VR controllers or head movement to navigate
4. Click hotspots in VR mode for interactive information

## File Structure

```
360_jc/
├── index.html          # Main application file
├── styles.css          # Application styles
├── app.js             # JavaScript application logic
├── server.py          # Python HTTP server
├── README.md          # This file
├── pakapiens/         # First tour folder
│   └── *.jpg         # 360° images
├── pietura/           # Second tour folder
│   └── *.jpg         # 360° images
└── spaktele/          # Third tour folder
    └── *.jpg         # 360° images
```

## Technical Details

### Technologies Used
- **Three.js**: 3D graphics and 360° image rendering
- **WebXR**: VR/AR support for modern browsers
- **HTML5 Canvas**: High-performance rendering
- **Local Storage**: Persistent data storage
- **CSS3**: Modern styling with gradients and animations

### Browser Requirements
- Modern browser with WebGL support
- WebXR support for VR functionality (Chrome, Edge, Firefox)
- JavaScript enabled

### VR Headset Compatibility
- Oculus Quest/Quest 2
- HTC Vive
- Windows Mixed Reality headsets
- Any WebXR-compatible device

## Customization

### Adding New Tours
1. Create a new folder in the project directory
2. Add your 360° images to the folder
3. Update the `getImageFilesForFolder()` method in `app.js` to include your new folder

### Styling
- Modify `styles.css` to change the appearance
- All colors and animations can be customized
- Responsive design works on mobile and desktop

### Hotspot Styling
- Hotspots can be customized in the CSS `.hotspot` class
- Change colors, sizes, and animations as needed

## Troubleshooting

### Images Not Loading
- Ensure images are in the correct folder structure
- Check that the server is running and accessible
- Verify image file names match the configuration

### VR Not Working
- Ensure your browser supports WebXR
- Check that your VR headset is properly connected
- Try using Chrome or Edge for best WebXR support

### Hotspots Not Saving
- Check browser console for JavaScript errors
- Ensure localStorage is enabled in your browser
- Try refreshing the page and adding hotspots again

## License

This project is open source and available under the MIT License.
