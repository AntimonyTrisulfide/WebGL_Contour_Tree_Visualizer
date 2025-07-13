// src/camera.js


// Camera controls
//Initial camera angles in spherical coordinates
let cameraPhi = Math.PI/4;    // Polar angle (0 to PI)
let cameraTheta = 0;            // Azimuthal angle (0 to 2*PI)
let cameraOffset = [0, 0, 0];  // Additional offset for panning (WASD, TG)
let cameraTarget = [0, 0, 0]; // Center point of the graph (calculated from bounding box (present in the offParser.js))

// set camera distance (initial)
let cameraDistance = 15;

// Trackball camera implementation
let trackballRotation = [0, 0, 0]; // Rotation angles (x, y, z)
let isDragging = false;
let lastMousePosition = [0, 0];

// Better trackball implementation using accumulated rotation
let accumulatedRotation = mat4.create(); // Store accumulated rotation

// Calculate camera position - fixed position for trackball
function calculateCameraPosition() {
    // Camera stays at fixed position, model rotates instead
    return [
        cameraTarget[0] + cameraOffset[0],
        cameraTarget[1] + cameraOffset[1], 
        cameraTarget[2] + cameraOffset[2] + cameraDistance
    ];
}

// Calculate model matrix with trackball rotation
function calculateModelMatrix() {
    return accumulatedRotation;
}

// Calculate up vector for camera
function calculateUpVector() {
    // For most cases, we want the up vector to point generally upward
    // This prevents the camera from flipping when looking straight down/up
    if (Math.abs(cameraPhi) < 0.01 || Math.abs(cameraPhi - Math.PI) < 0.01) {
        // When looking straight up or down, use a fixed up vector
        return [0, 0, 1];
    }
    
    // Standard up vector calculation
    const upX = -Math.cos(cameraPhi) * Math.cos(cameraTheta);
    const upY = Math.sin(cameraPhi);
    const upZ = -Math.cos(cameraPhi) * Math.sin(cameraTheta);
    
    return [upX, upY, upZ];
}

// Camera initialization state
let cameraInitialized = false;

function initializeCamera(vertices) {
    const bbox = calculateBoundingBox(vertices);
    
    // Only initialize once unless explicitly reset
    if (cameraInitialized) {
        console.log('Camera already initialized, skipping re-initialization');
        return;
    }
    
    // Set camera target to the center of the bounding box
    cameraTarget = [
        (bbox.min[0] + bbox.max[0]) / 2,
        (bbox.min[1] + bbox.max[1]) / 2,
        (bbox.min[2] + bbox.max[2]) / 2
    ];
    
    // Set initial camera distance based on the largest dimension
    const maxDimension = Math.max(...bbox.size);
    cameraDistance = maxDimension * 3.0; // Move camera further back for better view
    
    // Reset trackball rotation and offset
    trackballRotation = [0, 0, 0];
    cameraOffset = [0, 0, 0];
    resetTrackball();
    
    cameraInitialized = true;
    
    console.log(`Camera initialized: target=${cameraTarget}, distance=${cameraDistance}`);
}

// Function to force re-initialization of camera
function resetCameraInitialization() {
    cameraInitialized = false;
}

function handleCameraMovement() {
    let moved = false;
    
    // Ensure keyState exists
    if (!window.keyState) {
        window.keyState = {};
    }
    
    // W/S - Move forward/backward (zoom in/out)
    if (window.keyState['w']) {
        cameraDistance *= 0.95; // Zoom in
        cameraDistance = Math.max(0.1, cameraDistance);
        moved = true;
    }
    if (window.keyState['s']) {
        cameraDistance *= 1.05; // Zoom out
        moved = true;
    }
    
    // A/D - Rotate around Y-axis (left/right)
    if (window.keyState['a']) {
        trackballRotation[1] -= 0.05; // Rotate left
        moved = true;
    }
    if (window.keyState['d']) {
        trackballRotation[1] += 0.05; // Rotate right
        moved = true;
    }
    
    // T/G - Pan camera target up/down (vertical movement)
    const panSpeed = 0.1;
    if (window.keyState['t']) {
        cameraTarget[1] += panSpeed; // Move target up
        moved = true;
    }
    if (window.keyState['g']) {
        cameraTarget[1] -= panSpeed; // Move target down
        moved = true;
    }
    
    // R - Reset camera to initial position
    if (window.keyState['r']) {
        if (vertices && vertices.length > 0) {
            resetTrackball(); // Use new reset function
            cameraOffset = [0, 0, 0]; // Reset camera panning offset
            // Reset camera target to original position
            const bbox = calculateBoundingBox(vertices);
            cameraTarget = [
                (bbox.min[0] + bbox.max[0]) / 2,
                (bbox.min[1] + bbox.max[1]) / 2,
                (bbox.min[2] + bbox.max[2]) / 2
            ];
            moved = true;
        }
    }
    
    // X - Reset only camera target (keep rotation)
    if (window.keyState['x']) {
        window.keyState['x'] = false; // Prevent continuous triggering
        if (vertices && vertices.length > 0) {
            const bbox = calculateBoundingBox(vertices);
            cameraTarget = [
                (bbox.min[0] + bbox.max[0]) / 2,
                (bbox.min[1] + bbox.max[1]) / 2,
                (bbox.min[2] + bbox.max[2]) / 2
            ];
            moved = true;
            console.log('[INFO] Camera target reset');
        }
    }
    
    // P - Toggle spacing (universal functionality)
    if (window.keyState['p']) {
        window.keyState['p'] = false; // Prevent continuous triggering
        // Toggle the spacing flag
        if (typeof window.applySpacing !== 'undefined') {
            window.applySpacing = !window.applySpacing;
            console.log(`[INFO] Spacing ${window.applySpacing ? 'enabled' : 'disabled'}`);
            // Re-initialize with current data
            if (window.currentTreeData) {
                console.log('[INFO] Re-initializing with current tree data (spacing toggled)');
                // Update the global treeData and re-initialize
                window.treeData = window.currentTreeData;
                initializeGraph(); // Always call without offData
            } else {
                console.log('[WARNING] No data available to re-initialize with spacing toggle');
            }
            renderGraphWithFPS();
        } else {
            console.log('[WARNING] applySpacing variable not available');
        }
        return;
    }
    
    if (moved) {
        renderGraphWithFPS();
    }
}

// Mouse handler functions for trackball camera
function handleMouseDown(event) {
    isDragging = true;
    lastMousePosition = [event.clientX, event.clientY];
}

function handleMouseMove(event) {
    if (!isDragging) return;

    const deltaX = event.clientX - lastMousePosition[0];
    const deltaY = event.clientY - lastMousePosition[1];

    // Sensitivity for trackball rotation
    const sensitivity = 0.01;
    
    // Calculate rotation increments
    const deltaYaw = deltaX * sensitivity;
    const deltaPitch = deltaY * sensitivity;
    
    // Create incremental rotation matrices
    const yawRotation = mat4.create();
    const pitchRotation = mat4.create();
    
    mat4.rotateY(yawRotation, yawRotation, deltaYaw);
    mat4.rotateX(pitchRotation, pitchRotation, deltaPitch);
    
    // Combine rotations: apply pitch first, then yaw
    const incrementalRotation = mat4.create();
    mat4.multiply(incrementalRotation, yawRotation, pitchRotation);
    
    // Apply incremental rotation to accumulated rotation
    mat4.multiply(accumulatedRotation, incrementalRotation, accumulatedRotation);

    lastMousePosition = [event.clientX, event.clientY];
    renderGraphWithFPS();
}

function handleMouseUp() {
    isDragging = false;
}

function handleMouseWheel(event) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? 1 : -1;
    
    cameraDistance += delta * zoomSpeed * cameraDistance * 0.1;
    cameraDistance = Math.max(0.1, cameraDistance);
    
    renderGraphWithFPS();
}

// Attach mouse event listeners
document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('wheel', handleMouseWheel);

// Reset function for accumulated rotation
function resetTrackball() {
    mat4.identity(accumulatedRotation);
    trackballRotation = [0, 0, 0];
}