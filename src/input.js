// src/input.js


// Variables
let selectedEdge = null; // Track the selected edge number (1-based index) // Used by Renderer.js for highlighting
let currentFileName = null; // Track the currently loaded file name

// Flags and variables for storing mouse state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSensitivity = 0.005; // Sensitivity for mouse movement (will be updated by parameter system)


// File input handler
document.getElementById('fileInput').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) {
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.off')) {
        showStatus('Please select a .off file', 'error');
        return;
    }    const reader = new FileReader();
    reader.onload = function (e) {
        offData = e.target.result;
        currentFileName = file.name; // Store the file name
        showStatus(`Loaded file: ${file.name}`, 'success');
        // change color of the button
        document.getElementById('fileInputWrapper').style.backgroundColor = '#F0FF0F'; // Green color for success
        
        // Update file name in sidebar if menu system is available
        if (typeof menuSystem !== 'undefined' && menuSystem.updateCurrentFileName) {
            menuSystem.updateCurrentFileName(file.name);
        }
        
        initializeGraph(offData);
    };reader.readAsText(file);
});

// Mouse controls
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        // Horizontal mouse movement rotates around Y-axis (theta)
        cameraTheta -= deltaX * mouseSensitivity;
        
        // Vertical mouse movement changes elevation (phi)
        cameraPhi += deltaY * mouseSensitivity;
        
        // Clamp phi to prevent flipping
        if (cameraPhi >= Math.PI - 0.1) {
            cameraPhi = Math.PI - 0.1; // Prevent flipping over the top
        }
        if (cameraPhi <= 0.1) {
            cameraPhi = 0.1; // Prevent flipping under the bottom
        }
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        renderGraph();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1 + (e.deltaY * 0.001);
    cameraDistance *= zoomFactor;
    cameraDistance = Math.max(0.1, cameraDistance); // Prevent going through the target
    renderGraph();
});

window.addEventListener('resize', () => {
    // Supersampling for better anti-aliasing - render at device pixel ratio
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    
    // Set CSS size to actual display size
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    renderGraph();
});

// Trigger initial resize to set up canvas properly
window.dispatchEvent(new Event('resize'));

// Keyboard controls - Blender style navigation
const keyState = {};
const moveSpeed = 0.1;

window.addEventListener('keydown', (e) => {
    keyState[e.key.toLowerCase()] = true;
    handleCameraMovement();
});

window.addEventListener('keyup', (e) => {
    keyState[e.key.toLowerCase()] = false;
});

document.getElementById('edgeSelect').addEventListener('input', function () {
    const edgeNum = parseInt(this.value);
    if (edgeNum >= 1 && edgeNum <= edges.length) {
        selectedEdge = edgeNum;
        showStatus(`Edge ${edgeNum} highlighted`, 'info');
        initializeGraph(offData);
        renderGraph();
    } else {
        selectedEdge = null;
        showStatus(`Invalid edge number. Please enter a number between 1 and ${edges.length}`, 'error');
        initializeGraph(offData);
        renderGraph();
    }
});

// FPS Toggle Button Handler
document.getElementById('fpsToggleButton').addEventListener('click', function () {
    const button = this;
    
    if (isAnimating) {
        // Stop continuous rendering
        stopContinuousRendering();
        button.textContent = 'Start FPS Counter';
        button.classList.remove('active');
        
        // Clear FPS display
        const fpsElement = document.getElementById('fpsDisplay');
        if (fpsElement) {
            fpsElement.textContent = 'FPS: --';
        }
          // Render one final frame
        renderGraphWithFPS();
        showStatus('FPS counter stopped', 'info');
    } else {
        // Start continuous rendering
        startContinuousRendering();
        button.textContent = 'Stop FPS Counter';
        button.classList.add('active');
        showStatus('FPS counter started', 'success');
    }
});

window.onload = () => {
    //Load default OFF file if available
    if(offData !== "") {
        initializeGraph(offData);
    }
    else{
        showStatus('Please select a .off file', 'error');
    }
}