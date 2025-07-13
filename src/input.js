// src/input.js


// Variables
let selectedEdge = null; // Track the selected edge number (1-based index) // Used by Renderer.js for highlighting (deprecated - use selectedEdges)
let currentFileName = null; // Track the currently loaded file name

// Use a single parser-independent data object
window.treeData = undefined;

// Flags and variables for storing mouse state
let isDraggingInput = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSensitivity = 0.005; // Sensitivity for mouse movement (will be updated by parameter system)
let mouseDownX = 0;
let mouseDownY = 0;
let hasMoved = false;


// File input handler (parser-independent)
const fileInputElement = document.getElementById('fileInput');
if (fileInputElement) {
    fileInputElement.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) {
            return;
        }
        if (!file.name.toLowerCase().endsWith('.off')) {
            console.log('[ERROR] Please select a .off file');
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            // Use universalParser to parse the file
            try {
                const parsed = parseFile(file.name, e.target.result);
                window.treeData = parsed;
                currentFileName = file.name;
                console.log(`[SUCCESS] Loaded and parsed file: ${file.name}`);
                document.getElementById('fileInputWrapper').style.backgroundColor = '#F0FF0F';
                if (typeof menuSystem !== 'undefined' && menuSystem.updateCurrentFileName) {
                    menuSystem.updateCurrentFileName(file.name);
                }
                // Call parser-independent initializer
                if (typeof initializeGraph === 'function') {
                    initializeGraph(window.treeData);
                }
            } catch (err) {
                console.error('[ERROR] Failed to parse file:', err);
            }
        };
        reader.readAsText(file);
    });
}

// Mouse controls
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left mouse button only
        isDraggingInput = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        hasMoved = false;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDraggingInput) {
        // Left mouse button rotation - handled by camera.js
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - mouseDownX, 2) + 
            Math.pow(e.clientY - mouseDownY, 2)
        );
        if (moveDistance > 5) { // 5 pixel threshold
            hasMoved = true;
        }
        
        // Note: Trackball rotation is now handled in camera.js
        // This just tracks movement for click detection
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) { // Left mouse button
        if (isDraggingInput && !hasMoved) {
            // This was a click, not a drag - handle edge selection
            if (typeof handleMousePick !== 'undefined') {
                handleMousePick(e.clientX, e.clientY, e);
            }
        }
        isDraggingInput = false;
        hasMoved = false;
    }
});

// Prevent context menu on right-click
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1 + (e.deltaY * 0.001);
    cameraDistance *= zoomFactor;
    cameraDistance = Math.max(0.1, cameraDistance); // Prevent going through the target
    
    // Only render if uniforms are properly initialized
    if (pipeUniforms && sphereUniforms) {
        renderGraph();
    }
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
    mat4.perspective(projectionMatrix, Math.PI/3, canvas.width / canvas.height, 0.1, 100);
    
    // Resize picking framebuffer
    if (typeof resizePickingFramebuffer !== 'undefined') {
        resizePickingFramebuffer(canvas.width, canvas.height);
    }
    
    // Only render if uniforms are properly initialized
    if (pipeUniforms && sphereUniforms) {
        renderGraph();
    }
});

// Trigger initial resize to set up canvas properly
window.dispatchEvent(new Event('resize'));

// Keyboard controls - Blender style navigation
window.keyState = {}; // Make it global so camera.js can access it
const moveSpeed = 0.1;

window.addEventListener('keydown', (e) => {
    window.keyState[e.key.toLowerCase()] = true;
    handleCameraMovement();
});

window.addEventListener('keyup', (e) => {
    window.keyState[e.key.toLowerCase()] = false;
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
        console.log('[INFO] FPS counter stopped');
    } else {
        // Start continuous rendering
        startContinuousRendering();
        button.textContent = 'Stop FPS Counter';
        button.classList.add('active');
        console.log('[SUCCESS] FPS counter started');
    }
});

window.onload = () => {
    // Initialize edge info panel
    if (typeof initializeEdgeInfoPanel !== 'undefined') {
        initializeEdgeInfoPanel();
    }
    // If treeData is available (e.g., set by another loader), initialize
    if (window.treeData) {
        if (typeof initializeGraph === 'function') {
            initializeGraph(window.treeData);
        }
    } else {
        console.log('[ERROR] Please select a file to load tree data');
    }
}
// ...existing code...