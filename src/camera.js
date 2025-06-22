// src/camera.js


// Camera controls
//Initial camera angles in spherical coordinates
let cameraPhi = Math.PI/4;    // Polar angle (0 to PI)
let cameraTheta = 0;            // Azimuthal angle (0 to 2*PI)
let cameraOffset = [0, 0, 0];  // Additional offset for panning (WASD, TG)
let cameraTarget = [0, 0, 0]; // Center point of the graph (calculated from bounding box (present in the offParser.js))

// set camera distance (initial)
let cameraDistance = 15;

// Calculate camera position using spherical coordinates
function calculateCameraPosition() {
    // Spherical to cartesian conversion
    const x = cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    const y = cameraDistance * Math.cos(cameraPhi);
    const z = cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    
    // Add target position and camera offset
    return [
        x + cameraTarget[0] + cameraOffset[0],
        y + cameraTarget[1] + cameraOffset[1], 
        z + cameraTarget[2] + cameraOffset[2]
    ];
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

function initializeCamera(vertices) {
    const bbox = calculateBoundingBox(vertices);
    
    // Set camera target to the center of the bounding box
    cameraTarget = [...bbox.center];
    
    // Set initial camera distance based on the largest dimension
    const maxDimension = Math.max(...bbox.size);
    cameraDistance = Math.max(maxDimension * 2, 5); // Ensure minimum distance
    
    // Reset camera angles and offset
    cameraTheta = 0;
    cameraPhi = Math.PI / 4; // 45 degrees elevation
    cameraOffset = [0, 0, 0];
    
    console.log(`Camera initialized: target=${cameraTarget}, distance=${cameraDistance}`);
}

function handleCameraMovement() {
    let moved = false;
    
    const right = [
        -Math.sin(cameraTheta),
        0,
        Math.cos(cameraTheta)
    ];
    
    // W/S - Move forward/backward (closer/farther from target)
    if (keyState['w']) {
        cameraDistance -= moveSpeed;
        cameraDistance = Math.max(0.1, cameraDistance);
        moved = true;
    }
    if (keyState['s']) {
        cameraDistance += moveSpeed;
        moved = true;
    }
    
    // A/D - Strafe left/right
    if (keyState['a']) {
        cameraOffset[0] -= right[0] * moveSpeed;
        cameraOffset[1] -= right[1] * moveSpeed;
        cameraOffset[2] -= right[2] * moveSpeed;
        moved = true;
    }
    if (keyState['d']) {
        cameraOffset[0] += right[0] * moveSpeed;
        cameraOffset[1] += right[1] * moveSpeed;
        cameraOffset[2] += right[2] * moveSpeed;
        moved = true;
    }
    
    // T/G - Move up/down
    if (keyState['t']) {
        cameraOffset[1] += moveSpeed;
        moved = true;
    }
    if (keyState['g']) {
        cameraOffset[1] -= moveSpeed;
        moved = true;
    }
    
    // R - Reset camera to initial position
    if (keyState['r']) {
        if (vertices && vertices.length > 0) {
            initializeCamera(vertices);
            moved = true;
        }
    }
    
    // P - Toggle spacing (your existing functionality)
    if (keyState['p']) {
        keyState['p'] = false; // Prevent continuous triggering
        applySpacing = !applySpacing;
        if (applySpacing) {
            showStatus('Spacing applied to edges', 'info');
            //reset the camera offset
            cameraOffset = [0, 0, 0]; // Reset camera offset when applying spacing        } else {
            showStatus('Spacing removed from edges', 'info');
            cameraOffset = [0, 0, 0]; // Reset camera offset when applying spacing
        }
        initializeGraph(offData);
        renderGraphWithFPS();
        return;
    }
    
    if (moved) {
        renderGraphWithFPS();
    }
}