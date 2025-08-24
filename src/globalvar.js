// src/globalvar.js

// NOTES AREA

/*

Current Status:
    - Need to ensure that there are no conflicts with the global variables and the existing code when calling using the API.
    - Callback for the edgeselection is available and can be used to update the selected edges and use it to recall the drawing loop.
*/

// Global variables and Default Data

// const canvas = document.getElementById("canvas"); // get canvas reference (by selecting the element with canvas tag in HTML)
const gl = canvas.getContext("webgl2", { 
    antialias: true,
    // antialias: false, // Disable antialiasing for now
    alpha: false,
    depth: true,
    stencil: false,
    premultipliedAlpha: false
});

console.log('Depth bits:', gl.getParameter(gl.DEPTH_BITS));

if (!gl) {
    console.error("WebGL2 not supported");
}

// Sphere and Pipe radius and segments
let sphereRadius = 0.025; // Default radius of the spheres
let pipeRadius = 0.005; // Default radius of the pipes

let pipeColor = [0.800, 0.800, 0.800]; // Color of the pipes

//Background color
let backgroundColor = [0.4, 0.4, 0.4, 1.0]; // Light grey background instead of black

// JS Object for point types (assgned each one a unique number)
const NODE_TYPES = {
    MINIMUM: 0,
    SADDLE: 1,
    MAXIMUM: 2,
    INTERMEDIATE: 3, // Not Nodes containing function values, just spheres for smooth L connections
    // SUPPRESSED_SADDLE: 4 // Special type for suppressed saddles (scrapped, was initially planning to hide the overlapping saddles instead of mapping them)
};

// Colors for each type
let NODE_COLORS = {
    [NODE_TYPES.MINIMUM]: [0.106, 0.239, 0.506],   // Blue
    [NODE_TYPES.SADDLE]: [0.216, 0.961, 0.922],    // Cyan
    [NODE_TYPES.MAXIMUM]: [0.702, 0.055, 0.086],    // Red
    [NODE_TYPES.INTERMEDIATE]: [0.8, 0.8, 0.8], // Default gray for intermediate points
};


let projectionMatrix, viewMatrix, modelMatrix, invViewMatrix;
projectionMatrix = mat4.create();
// mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.01, 1000);

// Temporarily use a tighter range to see if the issue persists
mat4.perspective(projectionMatrix, Math.PI/3, canvas.width / canvas.height, 0.1, 50);
viewMatrix = mat4.create();
modelMatrix = mat4.create();
mat4.identity(modelMatrix);

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL); // Already default, but explicitly set for clarity

// Buffer variables
let instanceBuffer, pipeInstanceBuffer, sphereVAO, pipeVAO;
let sphereIndexCount, pipeIndexCount;

// FPS Counter variables
let fpsCounter = {
    frameCount: 0,
    lastTime: 0,
    fps: 0,
    fpsUpdateInterval: 1000, // Update FPS display every 1000ms (1 second)
    lastFpsUpdate: 0
};
let isAnimating = false; // Track if we're in continuous rendering mode

// Multiple edge selection support
let selectedEdges = []; // Array to store multiple selected edge IDs
let edgeId = []; // Legacy compatibility array - mirrors selectedEdges for integration

// Universal spacing support (parser-independent)
let applySpacing = false; // Flag to apply node spacing for overlap removal
let prevSpacing = false; // Previous state of applySpacing for comparison

// Helper function to synchronize edgeId array with selectedEdges for integration compatibility
function syncEdgeIdArray() {
    window.edgeId = [...window.selectedEdges];
}

// Selection change listener for automatic UI updates
function onSelectionChange(selectedEdges) {
    console.log('Selection changed:', selectedEdges);
    
    // Update legacy selectedEdge variable for backwards compatibility
    if (typeof selectedEdge !== 'undefined') {
        selectedEdge = selectedEdges.length > 0 ? selectedEdges[selectedEdges.length - 1] : null;
    }
    
    // Trigger UI updates
    if (window.uiManager) {
        window.uiManager.updateUI();
    }
}

// Function to update viewport and projection matrix on canvas resize
function updateViewport() {
    if (gl && canvas) {
        // Update WebGL viewport
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // Update projection matrix
        mat4.perspective(projectionMatrix, Math.PI/3, canvas.width / canvas.height, 0.1, 50);
        
        console.log(`Viewport updated to ${canvas.width}x${canvas.height}`);
    }
}

// Function to handle canvas resize with proper WebGL context update
function handleCanvasResize() {
    if (canvas && gl) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        updateViewport();
        
        // Re-render the scene if render function is available
        if (typeof renderGraph === 'function') {
            renderGraph();
        }
    }
}

// Make sync function globally accessible
window.syncEdgeIdArray = syncEdgeIdArray;

// Make selectedEdges and edgeId globally accessible
window.selectedEdges = selectedEdges;
window.edgeId = edgeId;

// Make spacing variables globally accessible
window.applySpacing = applySpacing;
window.prevSpacing = prevSpacing;

// Make radius variables globally accessible
window.sphereRadius = sphereRadius;
window.pipeRadius = pipeRadius;

// Initialize edgeId array synchronization on page load
document.addEventListener('DOMContentLoaded', function() {
    // Ensure initial synchronization
    if (typeof window.syncEdgeIdArray === 'function') {
        window.syncEdgeIdArray();
    }
});







