// src/globalvar.js

// NOTES AREA

/*

Issues with the code:
    1. The Overlapping of Spheres and Cylinders is still present.
    2. Issues with anti-aliasing on the cylinders (jagged edges).

New Functionality (to add)
    1. Add selection logic using mouse clicks to select edges and vertices.
    2. Use UBO instead of uniforms separately for each object.
    3. Add 

*/

// Global variables and Default Data

const canvas = document.getElementById("canvas"); // get canvas reference (by selecting the element with canvas tag in HTML)
const gl = canvas.getContext("webgl2", { 
    antialias: true,
    alpha: false,
    depth: true,
    stencil: false,
    premultipliedAlpha: false
});
if (!gl) {
    console.error("WebGL2 not supported");
}

// Sphere and Pipe radius and segments
let sphereRadius = 0.025; // Default radius of the spheres
let pipeRadius = 0.005; // Default radius of the pipes

const sphereColor = [0.8, 0.3, 0.3]; // Color of the spheres
const pipeColor = [0.800, 0.800, 0.800]; // Color of the pipes

//Background color
const backgroundColor = [0.9, 0.9, 0.9, 1.0]; // Dark gray background

// Light position
const lightPosition = [10, 10, 10]; // Position of the light source in the scene
const lightColor = [1.0, 1.0, 1.0]; // Color of the light source

// JS Object for point types (assgned each one a unique number)
const NODE_TYPES = {
    MINIMUM: 0,
    SADDLE: 1,
    MAXIMUM: 2,
    INTERMEDIATE: 3, // Not Nodes containing function values, just spheres for smooth L connections
    // SUPPRESSED_SADDLE: 4 // Special type for suppressed saddles (scrapped, was initially planning to hide the overlapping saddles instead of mapping them)
};

// Colors for each type
const NODE_COLORS = {
    [NODE_TYPES.MINIMUM]: [0.0, 0.4, 1.0],   // Blue
    [NODE_TYPES.SADDLE]: [0.0, 1.0, 1.0],    // Cyan
    [NODE_TYPES.MAXIMUM]: [1.0, 0.0, 0.0],    // Red
    [NODE_TYPES.INTERMEDIATE]: [pipeColor[0], pipeColor[1], pipeColor[2]], // Use sphere color for intermediate points
};


let projectionMatrix, viewMatrix, modelMatrix, invViewMatrix;
projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 10000);
viewMatrix = mat4.create();
modelMatrix = mat4.create();
mat4.identity(modelMatrix);

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL); // Already default, but explicitly set for clarity







