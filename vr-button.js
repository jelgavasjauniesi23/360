/**
 * Simple VRButton implementation for Three.js WebXR
 * Fallback when the official VRButton is not available
 */

class SimpleVRButton {
    static createButton(renderer) {
        if ('xr' in navigator === false) {
            const button = document.createElement('button');
            button.style.display = 'none';
            return button;
        }

        const button = document.createElement('button');
        button.style.display = 'none';
        button.style.position = 'absolute';
        button.style.bottom = '20px';
        button.style.right = '20px';
        button.style.width = '80px';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.background = '#000';
        button.style.color = '#fff';
        button.style.font = 'normal 13px sans-serif';
        button.style.textAlign = 'center';
        button.style.cursor = 'pointer';
        button.style.padding = '12px 6px';
        button.style.zIndex = '999';
        button.textContent = 'ENTER VR';

        function showEnterVR() {
            button.style.display = '';
            button.style.left = 'calc(50% - 50px)';
            button.style.bottom = '20px';
            button.style.right = 'auto';
            button.textContent = 'ENTER VR';
        }

        function showExitVR() {
            button.style.display = '';
            button.style.left = 'calc(50% - 50px)';
            button.style.bottom = '20px';
            button.style.right = 'auto';
            button.textContent = 'EXIT VR';
        }

        function disableButton() {
            button.style.display = '';
            button.style.left = 'calc(50% - 75px)';
            button.style.bottom = '20px';
            button.style.right = 'auto';
            button.textContent = 'VR NOT SUPPORTED';
            button.disabled = true;
        }

        function showWebXRNotFound() {
            disableButton();
            button.textContent = 'VR NOT FOUND';
        }

        function showVRNotAllowed() {
            disableButton();
            button.textContent = 'VR NOT ALLOWED';
        }

        function showVRNotAvailable() {
            disableButton();
            button.textContent = 'VR NOT AVAILABLE';
        }

        if (renderer.xr === undefined) {
            showWebXRNotFound();
            return button;
        }

        const sessionInit = {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
        };

        let currentSession = null;

        async function onSessionStarted(session) {
            session.addEventListener('end', onSessionEnded);
            await renderer.xr.setSession(session);
            button.textContent = 'EXIT VR';
            currentSession = session;
        }

        function onSessionEnded() {
            currentSession.removeEventListener('end', onSessionEnded);
            button.textContent = 'ENTER VR';
            currentSession = null;
        }

        //

        button.onclick = function () {
            if (currentSession === null) {
                navigator.xr.requestSession('immersive-vr', sessionInit).then(onSessionStarted).catch(function (reason) {
                    console.warn('XR session request failed:', reason);
                    if (reason.name === 'NotAllowedError') {
                        showVRNotAllowed();
                    } else if (reason.name === 'NotSupportedError') {
                        showVRNotAvailable();
                    }
                });
            } else {
                currentSession.end();
            }
        };

        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-vr').then(function (supported) {
                supported ? showEnterVR() : showVRNotAvailable();
            }).catch(showVRNotAvailable);
        } else {
            showWebXRNotFound();
        }

        return button;
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.VRButton = SimpleVRButton;
}
