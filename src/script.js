// TO DO
// Know more about Billboard for sphere and cylinder


// Give Alert to the user when a Minima is getting overlapped
// Give an option to change the position of the minima

// Give Alert when saddles are getting overlapped
// Give an option to change the position of the saddle such that it is not overlapped with any other saddle

const canvas = document.getElementById("canvas"); // get canvas reference (by selecting the element with canvas tag in HTML)
const gl = canvas.getContext("webgl"); // get WebGL context of that canvas so that we can start drawing on it
if (!gl) {
    console.error("WebGL not supported");
}

const instRenExt = gl.getExtension("ANGLE_instanced_arrays"); // WebGL Extension for instanced rendering (many copies of objects with single draw call)
if (!instRenExt) {
    console.error("ANGLE_instanced_arrays not supported");
}

const vertArrObjExt = gl.getExtension("OES_vertex_array_object"); // WebGL Extension for Vertex Array Objects (VAOs) to store vertex attribute state
if (!vertArrObjExt) {
    console.error("OES_vertex_array_object not supported");
} 

// Global variables and Default Data
//Default Data (Hand Altered for Better Geometry)
let offData = ``; 

let prevOffData;
// Variable to store the OFF file data
let selectedEdge = null; // Track the selected edge number (1-based index)


// Camera controls
//Initial camera angles in spherical coordinates
let cameraPhi = Math.PI/4;    // Polar angle (0 to PI)
let cameraTheta = 0;            // Azimuthal angle (0 to 2*PI)
let cameraOffset = [0, 0, 0];  // Additional offset for panning (WASD, TG)
let cameraTarget = [0, 0, 0]; // Center point of the graph (calculated from bounding box)
// set camera distance (initial)
let cameraDistance = 15;
// flag and data for storing mouse state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
const mouseSensitivity = 0.005;
let applySpacing = false; // Flag to apply node spacing
let prevSpacing = false; // Previous state of applySpacing

// Sphere and Pipe radius and segments
// get radius of the sphere from the user using the slider

let sphereRadius = 0.025; // Default radius of the spheres
let pipeRadius = 0.005; // Default radius of the pipes


// const sphereLatitudeBands = 16; // Number of latitude bands for sphere
// const sphereLongitudeBands = 16; // Number of longitude bands for sphere
// const pipeSegments = 12; // Number of segments for the pipe (cylinder)

const sphereColor = [0.8, 0.3, 0.3]; // Color of the spheres
const pipeColor = [0.800, 0.800, 0.800]; // Color of the pipes

//Background color
const backgroundColor = [0.1, 0.1, 0.1, 1.0]; // Dark gray background
// Light position
const lightPosition = [10, 10, 10]; // Position of the light source in the scene
const lightColor = [1.0, 1.0, 1.0]; // Color of the light source
const ambientStrength = 0.3; // Ambient light strength
const specularStrength = 0.5; // Specular light strength
const shininess = 32.0; // Shininess factor for specular highlights

// JS Object for point types
const NODE_TYPES = {
    MINIMUM: 0,
    SADDLE: 1,
    MAXIMUM: 2,
    INTERMEDIATE: 3,
    // SUPPRESSED_SADDLE: 4 // Uncomment if you want to use a special type for suppressed saddles
};

// Colors for each type
const NODE_COLORS = {
    [NODE_TYPES.MINIMUM]: [0.0, 0.4, 1.0],   // Blue
    [NODE_TYPES.SADDLE]: [0.0, 1.0, 1.0],    // Cyan
    [NODE_TYPES.MAXIMUM]: [1.0, 0.0, 0.0],    // Red
    [NODE_TYPES.INTERMEDIATE]: [sphereColor[0], sphereColor[1], sphereColor[2]], // Use sphere color for intermediate points
};

let vertices, edges, vertexValues, vertexTypes;
let sphereVAO, pipeVAO;
let sphereProgram, pipeProgram;
let sphereUniforms, pipeUniforms;
let verticesCount, edgesCount;
let sphereVerticesCount
let sphereIndexCount, pipeIndexCount;
let projectionMatrix, viewMatrix, modelMatrix, invViewMatrix;
// let cameraPosition = [0,0,0]; // Test point for camera calculations
const DISTANCE_THRESHOLD = 0.0; // Adjust this value as needed
let intermediatePoints = []; // Store intermediate points for L-shaped connections

let validVertices = []; // Filtered vertices for rendering
let validTypes = []; // Filtered vertex types for rendering

// Initialize matrices
projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

viewMatrix = mat4.create();
modelMatrix = mat4.create();
mat4.identity(modelMatrix);

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL); // Already default, but explicitly set for clarity

function calculateBoundingBox(vertices) {
    if(!vertices || vertices.length === 0){
        return {
            min: [-1, -1, -1],
            max: [1, 1, 1],
            center: [0, 0, 0],
            size: [2, 2, 2]
        };
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    vertices.forEach(vertex => {
        for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i], vertex[i]);
            max[i] = Math.max(max[i], vertex[i]);
        }
    });

    const center = [
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2
    ];

    const size = [
        max[0] - min[0],
        max[1] - min[1],
        max[2] - min[2]
    ];

    return {
        min,
        max,
        center,
        size
    };
}

// Old Logic
// function applyNodeSpacing(vertices, sphereRadius, vertexValues) {
//     console.log(sphereRadius);
//     const minDistance = sphereRadius * 4;      // Normal minimum spacing
//     const overlapDistance = sphereRadius * 2;  // When XYZ coordinates overlap (smaller spacing)
//     const EPSILON = 1e-5;  // For floating point comparison
    
//     // Create array with original indices - keep original Y values during analysis
//     const workingVertices = vertices.map((vertex, originalIndex) => ({
//         vertex: [...vertex], // Copy the vertex
//         originalIndex: originalIndex,
//         functionValue: vertexValues[originalIndex], // Include function value
//         originalY: vertex[1], // Store original Y for reference
//         wasOverlapping: false // Track if this vertex was originally overlapping
//     }));
    
//     console.log("=== Original vertices ===");
//     workingVertices.forEach((item, i) => {
//         console.log(`Vertex ${item.originalIndex}: [${item.vertex[0]}, ${item.vertex[1]}, ${item.vertex[2]}], Value: ${item.functionValue}`);
//     });
    
//     // Group vertices by X,Z coordinates (find vertical stacks)
//     const stacks = new Map();
    
//     workingVertices.forEach((item, index) => {
//         const key = `${item.vertex[0].toFixed(6)}_${item.vertex[2].toFixed(6)}`;
//         if (!stacks.has(key)) {
//             stacks.set(key, []);
//         }
//         stacks.get(key).push({
//             ...item,
//             workingIndex: index
//         });
//     });
    
//     console.log(`\n=== Found ${stacks.size} unique X,Z positions ===`);
    
//     // Process each stack
//     stacks.forEach((stack, key) => {
//         if (stack.length <= 1) {
//             console.log(`Stack at ${key}: Only 1 vertex, no spacing needed`);
//             return; // No conflicts possible with single vertex
//         }
        
//         console.log(`\nProcessing stack at ${key} with ${stack.length} vertices:`);
//         stack.forEach(item => {
//             console.log(`  Vertex ${item.originalIndex}: Y=${item.vertex[1]}, Value=${item.functionValue}`);
//         });
        
//         // Assign each stack a unique Radial Distance from the main trunk (z=0, x=0) for each stack only and not for each vertex
//         // This will help in determining the order of processing (first mapping child and then parent)
//         const radialDistance = Math.sqrt(Math.pow(stack[0].vertex[0], 2) + Math.pow(stack[0].vertex[2], 2));
//         console.log(`  Radial distance for stack at ${key}: ${radialDistance.toFixed(6)}`);


        
//         // Sort stack by Y coordinate
//         stack.sort((a, b) => a.vertex[1] - b.vertex[1]);

//         // First pass: Identify and mark overlapping vertices
//         for (let i = 0; i < stack.length; i++) {
//             for (let j = i + 1; j < stack.length; j++) {
//                 const distance = Math.abs(stack[i].originalY - stack[j].originalY);
//                 if (distance < EPSILON) {
//                     console.log(`  Marking vertices ${stack[i].originalIndex} and ${stack[j].originalIndex} as originally overlapping`);
//                     stack[i].wasOverlapping = true;
//                     stack[j].wasOverlapping = true;
//                 }
//             }
//         }
//         console.log(stack);

//         //Second pass: Apply spacing rules (original)
//         for (let i = 1; i < stack.length; i++) {
//             const current = stack[i];
//             const previous = stack[i - 1];
//             const distance = current.vertex[1] - previous.vertex[1];
            
//             // Determine the required spacing based on overlap status
//             let requiredSpacing;
//             let spacingType;
            
//             if (current.wasOverlapping && previous.wasOverlapping) {
//                 requiredSpacing = overlapDistance;
//                 spacingType = "overlap";
//             } 
//             else if (current.wasOverlapping || previous.wasOverlapping) {
//                 // If only one was overlapping, use overlap spacing to maintain consistency
//                 requiredSpacing = minDistance;
//                 spacingType = "overlap-adjacent";
//             } 
//             else {
//                 requiredSpacing = minDistance;
//                 spacingType = "normal";
//             }
            
//             if (distance < requiredSpacing) {
//                 // Determine who should move based on function values
//                 if (current.functionValue > previous.functionValue) {
//                     // Current has higher function value, move it up
//                     const newY = previous.vertex[1] + requiredSpacing;
//                     console.log(`  Moving vertex ${current.originalIndex} UP from Y=${current.vertex[1]} to Y=${newY} (${spacingType} spacing, higher function value)`);
//                     current.vertex[1] = newY;
//                 } else if (current.functionValue < previous.functionValue) {
//                     // Previous has higher function value, move previous up
//                     const newY = current.vertex[1] + requiredSpacing;
//                     console.log(`  Moving vertex ${previous.originalIndex} UP from Y=${previous.vertex[1]} to Y=${newY} (${spacingType} spacing, higher function value)`);
//                     previous.vertex[1] = newY;
//                     // Re-sort after moving previous vertex
//                     stack.sort((a, b) => a.vertex[1] - b.vertex[1]);
//                     i = 0; // Restart checking from beginning
//                 } else {
//                     // Same function value just move current vertex up
//                     const newY = previous.vertex[1] + requiredSpacing;
//                     console.log(`Moving vertex ${current.originalIndex} UP from Y=${current.vertex[1]} to Y=${newY} (${spacingType} spacing, same function value, later in sorted order)`);
//                     current.vertex[1] = newY;
//                 }
//             } else {
//                 console.log(`  Good spacing: Vertices ${previous.originalIndex} and ${current.originalIndex} are ${distance.toFixed(6)} apart (>= ${requiredSpacing} for ${spacingType}) - no adjustment needed`);
//             }
//         }


//         // // Second pass: Apply spacing rules (Alternate method of fixing highest point first and then going down)
//         // for (let i = stack.length-1; i > 0; i--) {
//         //     const current = stack[i];
//         //     const next = stack[i - 1];
//         //     const distance = current.vertex[1] - next.vertex[1];
            
//         //     // Determine the required spacing based on overlap status
//         //     let requiredSpacing;
//         //     let spacingType;
            
//         //     if (current.wasOverlapping && next.wasOverlapping) {
//         //         requiredSpacing = overlapDistance;
//         //         spacingType = "overlap";
//         //     } 
//         //     else if (current.wasOverlapping || next.wasOverlapping) {
//         //         // If only one was overlapping, use overlap spacing to maintain consistency
//         //         requiredSpacing = minDistance;
//         //         spacingType = "overlap-adjacent";
//         //     } 
//         //     else {
//         //         requiredSpacing = minDistance;
//         //         spacingType = "normal";
//         //     }
            
//         //     if (distance < requiredSpacing) {
//         //         // Determine who should move based on function values
//         //         if (current.functionValue > next.functionValue) {
//         //             // Current has higher function value, move it up
//         //             const newY = current.vertex[1] - requiredSpacing;
//         //             console.log(`  Moving vertex ${next.originalIndex} UP from Y=${current.vertex[1]} to Y=${newY} (${spacingType} spacing, higher function value)`);
//         //             next.vertex[1] = newY;
//         //         } else if (current.functionValue < next.functionValue) {
//         //             // Previous has higher function value, move previous up
//         //             const newY = next.vertex[1] - requiredSpacing;
//         //             console.log(`  Moving vertex ${next.originalIndex} UP from Y=${next.vertex[1]} to Y=${newY} (${spacingType} spacing, higher function value)`);
//         //             current.vertex[1] = newY;
//         //             // Re-sort after moving previous vertex
//         //             stack.sort((a, b) => a.vertex[1] - b.vertex[1]);
//         //             i = 0; // Restart checking from beginning
//         //         } else {
//         //             // Same function value just move current vertex up
//         //             const newY = current.vertex[1] - requiredSpacing;
//         //             console.log(`Moving vertex ${current.originalIndex} UP from Y=${current.vertex[1]} to Y=${newY} (${spacingType} spacing, same function value, later in sorted order)`);
//         //             next.vertex[1] = newY;
//         //         }
//         //     } else {
//         //         console.log(`  Good spacing: Vertices ${next.originalIndex} and ${current.originalIndex} are ${distance.toFixed(6)} apart (>= ${requiredSpacing} for ${spacingType}) - no adjustment needed`);
//         //     }
//         // }

//     });
    
//     // Create result array in original vertex order
//     const result = new Array(vertices.length);
//     workingVertices.forEach(item => {
//         result[item.originalIndex] = item.vertex;
//     });
    
//     console.log("\n=== Final vertices ===");
//     result.forEach((vertex, i) => {
//         console.log(`Vertex ${i}: [${vertex[0]}, ${vertex[1]}, ${vertex[2]}]`);
//     });

//     console.log(workingVertices);
    
//     return result;
// }


// function applyNodeSpacing(vertices, sphereRadius, vertexValues, vertexTypes) {
//     const minDistance = sphereRadius * 4;      // Normal minimum spacing
//     const overlapDistance = sphereRadius * 2;  // Spacing for overlapping vertices
//     const EPSILON = 1e-5;  // For floating point comparison
//     let overlappingMinima = [];
//     let overlappingSaddles = [];

//     // Create array with original indices and metadata
//     const workingVertices = vertices.map((vertex, originalIndex) => ({
//         vertex: [...vertex],
//         originalIndex,
//         functionValue: vertexValues[originalIndex],
//         type: vertexTypes[originalIndex],
//         originalY: vertex[1],
//         wasOverlapping: false,
//         stackKey: `${vertex[0].toFixed(6)}_${vertex[2].toFixed(6)}`
//     }));

//     console.log("=== Original vertices ===");
//     workingVertices.forEach(item => {
//         console.log(`Vertex ${item.originalIndex}: [${item.vertex.join(', ')}], Value: ${item.functionValue}, Type: ${item.type}`);
//     });

//     // Group vertices by X,Z coordinates (stacks)
//     const stacks = new Map();
//     workingVertices.forEach(item => {
//         if (!stacks.has(item.stackKey)) stacks.set(item.stackKey, []);
//         stacks.get(item.stackKey).push(item);
//     });

//     console.log(`\n=== Found ${stacks.size} unique X,Z positions ===`);

//     // Step 1: Detect overlaps and collect alerts
//     stacks.forEach((stack, key) => {
//         if (stack.length <= 1) return;

//         // Sort by original Y for initial overlap detection
//         stack.sort((a, b) => a.originalY - b.originalY);

//         for (let i = 0; i < stack.length - 1; i++) {
//             const distance = Math.abs(stack[i].originalY - stack[i + 1].originalY);
//             if (distance < EPSILON) {
//                 if (stack[i].type === NODE_TYPES.MINIMUM && stack[i + 1].type === NODE_TYPES.MINIMUM) {
//                     overlappingMinima.push([stack[i].originalIndex, stack[i + 1].originalIndex]);
//                 } else if (stack[i].type === NODE_TYPES.SADDLE && stack[i + 1].type === NODE_TYPES.SADDLE) {
//                     overlappingSaddles.push([stack[i].originalIndex, stack[i + 1].originalIndex]);
//                 }
//                 stack[i].wasOverlapping = true;
//                 stack[i + 1].wasOverlapping = true;
//             }
//         }
//     });

//     // Step 2: Show alerts for overlapping minima and saddles
//     if (overlappingMinima.length > 0) {
//         overlappingMinima.forEach(([v1, v2]) => {
//             showStatus(`Warning: Minima vertices ${v1} and ${v2} are overlapping!`, 'warning');
//             promptAdjustPosition(v1, v2, workingVertices, minDistance, 'minima');
//         });
//     }
//     if (overlappingSaddles.length > 0) {
//         overlappingSaddles.forEach(([v1, v2]) => {
//             showStatus(`Warning: Saddle vertices ${v1} and ${v2} are overlapping!`, 'warning');
//             promptAdjustPosition(v1, v2, workingVertices, minDistance, 'saddle');
//         });
//     }

//     // Step 3: Apply global Y-order preserving spacing
//     // Sort all vertices by function value to maintain global order
//     const sortedVertices = workingVertices.slice().sort((a, b) => a.functionValue - b.functionValue);

//     // Assign new Y coordinates while preserving order
//     let currentY = Math.min(...workingVertices.map(v => v.originalY));
//     sortedVertices.forEach((vertex, index) => {
//         const prevVertex = index > 0 ? sortedVertices[index - 1] : null;
//         const requiredSpacing = vertex.wasOverlapping ? overlapDistance : minDistance;

//         if (prevVertex) {
//             const proposedY = prevVertex.vertex[1] + requiredSpacing;
//             if (vertex.vertex[1] < proposedY) {
//                 vertex.vertex[1] = proposedY;
//                 console.log(`Moving vertex ${vertex.originalIndex} to Y=${proposedY} to maintain spacing`);
//             }
//         } else {
//             vertex.vertex[1] = currentY;
//         }
//     });

//     // Step 4: Ensure stack-local ordering is consistent with global ordering
//     stacks.forEach((stack, key) => {
//         if (stack.length <= 1) return;

//         // Sort stack by function value (consistent with global order)
//         stack.sort((a, b) => a.functionValue - b.functionValue);

//         // Adjust Y within stack to ensure spacing
//         for (let i = 1; i < stack.length; i++) {
//             const current = stack[i];
//             const previous = stack[i - 1];
//             const requiredSpacing = current.wasOverlapping && previous.wasOverlapping ? overlapDistance : minDistance;

//             if (current.vertex[1] - previous.vertex[1] < requiredSpacing) {
//                 current.vertex[1] = previous.vertex[1] + requiredSpacing;
//                 console.log(`Adjusting vertex ${current.originalIndex} to Y=${current.vertex[1]} in stack ${key}`);
//             }
//         }
//     });

//     // Step 5: Create result array in original order
//     const result = new Array(vertices.length);
//     workingVertices.forEach(item => {
//         result[item.originalIndex] = item.vertex;
//     });

//     console.log("\n=== Final vertices ===");
//     result.forEach((vertex, i) => {
//         console.log(`Vertex ${i}: [${vertex.join(', ')}]`);
//     });

//     return result;
// }

// // Helper function to prompt user for position adjustment
// function promptAdjustPosition(v1Index, v2Index, workingVertices, minDistance, type) {
//     const v1 = workingVertices[v1Index];
//     const v2 = workingVertices[v2Index];
//     const promptMessage = `Overlapping ${type} detected at vertices ${v1Index} and ${v2Index}. Move vertex ${v2Index} up by ${minDistance} units? (Yes/No)`;
    
//     // Simulate user input (replace with actual UI prompt in practice)
//     const userResponse = confirm(promptMessage); // Using browser's confirm for simplicity
//     if (userResponse) {
//         v2.vertex[1] += minDistance;
//         showStatus(`Moved vertex ${v2Index} to Y=${v2.vertex[1]}`, 'info');
//     } else {
//         // Keep original position but mark for overlap handling
//         v2.wasOverlapping = true;
//     }
// }

function applyNodeSpacing(vertices, sphereRadius, vertexValues, vertexTypes) {
    const minDistance = sphereRadius * 4;      // Normal minimum spacing
    const overlapDistance = sphereRadius * 2;  // Spacing for overlapping vertices
    const EPSILON = 1e-5;  // For floating point comparison
    let overlappingMinima = [];
    let overlappingSaddles = [];

    // Create array with original indices and metadata
    const workingVertices = vertices.map((vertex, originalIndex) => ({
        vertex: [...vertex],
        originalIndex,
        functionValue: vertexValues[originalIndex],
        type: vertexTypes[originalIndex],
        originalY: vertex[1],
        wasOverlapping: false,
        stackKey: `${vertex[0].toFixed(6)}_${vertex[2].toFixed(6)}`
    }));

    console.log("=== Original vertices ===");
    workingVertices.forEach(item => {
        console.log(`Vertex ${item.originalIndex}: [${item.vertex.join(', ')}], Value: ${item.functionValue}, Type: ${item.type}, Original Y: ${item.originalY}`);
    });

    // Group vertices by X,Z coordinates (stacks)
    const stacks = new Map();
    workingVertices.forEach(item => {
        if (!stacks.has(item.stackKey)) stacks.set(item.stackKey, []);
        stacks.get(item.stackKey).push(item);
    });

    console.log(`\n=== Found ${stacks.size} unique X,Z positions ===`);

    // Step 1: Detect overlaps within stacks and collect alerts
    stacks.forEach((stack, key) => {
        if (stack.length <= 1) return;

        // Sort by original Y for overlap detection
        stack.sort((a, b) => a.originalY - b.originalY);

        for (let i = 0; i < stack.length - 1; i++) {
            const distance = Math.abs(stack[i].originalY - stack[i + 1].originalY);
            if (distance < EPSILON) {
                if (stack[i].type === 'MINIMA' && stack[i + 1].type === 'MINIMA') {
                    overlappingMinima.push([stack[i].originalIndex, stack[i + 1].originalIndex]);
                } else if (stack[i].type === 'SADDLE' && stack[i + 1].type === 'SADDLE') {
                    overlappingSaddles.push([stack[i].originalIndex, stack[i + 1].originalIndex]);
                }
                stack[i].wasOverlapping = true;
                stack[i + 1].wasOverlapping = true;
            }
        }
    });

    // Step 2: Log warnings for overlapping minima and saddles
    if (overlappingMinima.length > 0) {
        overlappingMinima.forEach(([v1, v2]) => {
            console.log(`Warning: Minima vertices ${v1} and ${v2} are overlapping!`);
        });
    }
    if (overlappingSaddles.length > 0) {
        overlappingSaddles.forEach(([v1, v2]) => {
            console.log(`Warning: Saddle vertices ${v1} and ${v2} are overlapping!`);
        });
    }

    // Step 3: Assign global Y positions based on function value order
    const sortedVertices = workingVertices.slice().sort((a, b) => a.functionValue - b.functionValue);
    const yMapping = new Map(); // Maps original Y to new Y
    let currentY = Math.min(...workingVertices.map(v => v.originalY));

    sortedVertices.forEach((vertex, index) => {
        const prevVertex = index > 0 ? sortedVertices[index - 1] : null;
        const yKey = vertex.originalY.toFixed(6);
        const isOverlapping = vertex.wasOverlapping;
        const requiredSpacing = isOverlapping ? overlapDistance : minDistance;

        if (!yMapping.has(yKey)) {
            if (prevVertex) {
                const prevYKey = prevVertex.originalY.toFixed(6);
                const prevMappedY = yMapping.get(prevYKey) || prevVertex.vertex[1];
                const prevIsOverlapping = prevVertex.wasOverlapping;
                const prevRequiredSpacing = prevIsOverlapping ? overlapDistance : minDistance;
                // Use the original distance if it's greater than the required spacing
                const originalDistance = Math.abs(vertex.originalY - prevVertex.originalY);
                const spacing = Math.max(originalDistance, prevRequiredSpacing);
                const proposedY = prevMappedY + spacing;
                yMapping.set(yKey, proposedY);
                console.log(`Mapping original Y=${vertex.originalY} to Y=${proposedY} for group ${yKey} (spacing=${spacing}, originalDistance=${originalDistance})`);
            } else {
                yMapping.set(yKey, currentY);
                console.log(`Mapping original Y=${vertex.originalY} to Y=${currentY} for group ${yKey} (first group)`);
            }
        }

        vertex.vertex[1] = yMapping.get(yKey);
    });

    // Step 4: Handle stacks with same original Y to ensure distinct Y within stack
    stacks.forEach((stack, key) => {
        if (stack.length <= 1) return;

        // Group within stack by original Y
        const stackYGroups = new Map();
        stack.forEach(item => {
            const yKey = item.originalY.toFixed(6);
            if (!stackYGroups.has(yKey)) stackYGroups.set(yKey, []);
            stackYGroups.get(yKey).push(item);
        });

        stackYGroups.forEach((group, yKey) => {
            if (group.length <= 1) return;

            // Sort by function value within group
            group.sort((a, b) => a.functionValue - b.functionValue);

            // Assign distinct Y values within the group
            let baseY = yMapping.get(yKey);
            group.forEach((item, i) => {
                if (i === 0) {
                    item.vertex[1] = baseY;
                    console.log(`Adjusting vertex ${item.originalIndex} in stack ${key} to Y=${item.vertex[1]} (original Y=${item.originalY}, base position)`);
                    return;
                }
                const prevItem = group[i - 1];
                const isOverlapping = item.wasOverlapping || prevItem.wasOverlapping;
                const requiredSpacing = isOverlapping ? overlapDistance : minDistance;
                // Use the original distance if it's greater than the required spacing
                const originalDistance = Math.abs(item.originalY - prevItem.originalY);
                const spacing = Math.max(originalDistance, requiredSpacing);
                item.vertex[1] = prevItem.vertex[1] + spacing;
                console.log(`Adjusting vertex ${item.originalIndex} in stack ${key} to Y=${item.vertex[1]} (original Y=${item.originalY}, spacing=${spacing}, originalDistance=${originalDistance})`);
            });
        });
    });

    // Step 5: Create result array in original order
    const result = new Array(vertices.length);
    workingVertices.forEach(item => {
        result[item.originalIndex] = item.vertex;
    });

    console.log("\n=== Final vertices ===");
    result.forEach((vertex, i) => {
        console.log(`Vertex ${i}: [${vertex.join(', ')}]`);
    });

    return result;
}


function getNodeType(typeStr) {
    switch (typeStr.toUpperCase()) {
        case 'MINIMA': return NODE_TYPES.MINIMUM;
        case 'MAXIMA': return NODE_TYPES.MAXIMUM;
        case 'SADDLE': return NODE_TYPES.SADDLE;
        default:
            console.warn(`Unknown type: ${typeStr}, defaulting to SADDLE`);
            return NODE_TYPES.SADDLE;
    }
}

// Parse OFF data
function parseOFFData(data) {
    const lines = data.trim().split('\n').map(line => line.trim());
    
    // Skip the OFF header
    let currentLine = 1;
    
    // Parse counts (vertices, faces, edges)
    const counts = lines[currentLine].split(/\s+/).map(Number);
    const numVertices = counts[0];
    const numFaces = counts[1];
    currentLine++;
    
    // Parse vertices (only coordinates now)
    let vertices = [];
    
    for (let i = 0; i < numVertices; i++) {
        const parts = lines[currentLine].split(/\s+/);
        
        // Extract coordinates (first 3 values)
        const coords = [
            parseFloat(parts[0]),
            parseFloat(parts[1]),
            parseFloat(parts[2])
        ];
        
        vertices.push(coords);
        currentLine++;
    }
    
    // Initialize arrays for vertex data
    const vertexValues = new Array(numVertices);
    const vertexTypes = new Array(numVertices);
    
    // Parse edges and extract vertex data
    const edges = [];
    for (let i = 0; i < numFaces; i++) {
        // Format 2 v1 v2 val1 val2 type1 type2
        const parts = lines[currentLine].split(/\s+/);
        if (parts.length < 7 || parts[0] !== '2') {
            console.warn(`Skipping malformed or unsupported edge line: ${lines[currentLine - 1]}`);
            continue;
        }

        const v1 = parseInt(parts[1]);
        const v2 = parseInt(parts[2]);
        const val1 = parseFloat(parts[3]);
        const val2 = parseFloat(parts[4]);
        const type1 = getNodeType(parts[5]);
        const type2 = getNodeType(parts[6]);

        // Assign vertex 1
        if (vertexValues[v1] === undefined) {
            vertexValues[v1] = val1;
            vertexTypes[v1] = type1;
        }

        // Assign vertex 2
        if (vertexValues[v2] === undefined) {
            vertexValues[v2] = val2;
            vertexTypes[v2] = type2;
        }

        edges.push([v1, v2]);
        currentLine++;
    }
    
    // Fill any missing vertex data with defaults
    for (let i = 0; i < numVertices; i++) {
        if (vertexValues[i] === undefined) {
            vertexValues[i] = 0.0;
            vertexTypes[i] = NODE_TYPES.SADDLE;
            console.warn(`Missing data for vertex ${i}, using defaults`);
        }
    }  

    // Apply node spacing to vertices
    if(applySpacing === true) {
        vertices = applyNodeSpacing(vertices, sphereRadius, vertexValues, vertexTypes);
    }

    if(applySpacing === false){
        // use original vertices
        vertices = vertices.map(vertex => [
            vertex[0],
            vertex[1],
            vertex[2]
        ]);
    }

    validVertices = [...vertices];
    validTypes = [...vertexTypes];  // Vertex Types now get from OFF data 

    
    return { 
        vertices, 
        edges, 
        vertexValues, 
        vertexTypes 
    };
}

function createBillboardQuad() {
    const positions = [
        -0.5, 0, -0.5, // Bottom left
         0.5, 0, -0.5, // Bottom right
        -0.5, 0,  0.5, // Top left
         0.5, 0,  0.5  // Top right
    ];
    
    const texCoords = [
        0, 0, // Bottom left
        1, 0, // Bottom right
        0, 1, // Top left
        1, 1  // Top right
    ];
    
    const indices = [
        0, 1, 2, // First triangle
        2, 1, 3  // Second triangle
    ];
    
    return {
        positions: new Float32Array(positions),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

function createCylinderQuad() {
    const positions = [
        -1.0, -1.0, 0.0, // Bottom left
            1.0, -1.0, 0.0, // Bottom right
        -1.0,  1.0, 0.0, // Top left
            1.0,  1.0, 0.0  // Top right
    ];
    const indices = [
        0, 1, 2, // First triangle
        2, 1, 3  // Second triangle
    ];
    return {
        positions: new Float32Array(positions),
        indices: new Uint16Array(indices)
    };
}

// Create shader program
function createShaderProgram() {
    const sphereVertexShaderSrc = `
        attribute vec3 aPosition;
        attribute vec2 aTexCoord;
        attribute vec3 a_instancePosition;
        attribute float a_instanceSize;
        attribute vec3 a_instanceColor;

        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform vec3 uCameraPos;
        uniform mat4 uInvViewMatrix;

        varying vec2 vTexCoord;
        varying vec3 vCameraPos;
        varying vec3 vWorldPos; // Pass world-space position
        varying vec3 vInstanceColor;
        varying vec3 vInstanceCenter; // Pass sphere center in world space

        void main() {
            // Compute world-space center of the sphere
            vec4 worldCenter = uModelMatrix * vec4(a_instancePosition, 1.0);
            
            // Compute world-space position of the vertex
            // Billboard: vertices are offset in view space, so transform to view space first
            vec4 viewCenter = uViewMatrix * worldCenter;
            vec3 viewPos = viewCenter.xyz + vec3(aPosition.x * a_instanceSize, aPosition.z * a_instanceSize, 0.0);
            
            // Transform back to world space for fragment shader
            vec4 worldPos = uInvViewMatrix * vec4(viewPos, 1.0);
            
            gl_Position = uProjectionMatrix * vec4(viewPos, 1.0);
            
            vTexCoord = aTexCoord;
            vWorldPos = worldPos.xyz; // Pass world-space position
            vInstanceColor = a_instanceColor;
            vInstanceCenter = worldCenter.xyz; // Pass sphere center
            vCameraPos = uCameraPos;
        }
    `;
    
    const sphereFragmentShaderSrc = `
        precision mediump float;
        uniform vec3 uLightPos;
        uniform vec3 uLightColor;
        varying vec2 vTexCoord;
        varying vec3 vWorldPos;
        varying vec3 vInstanceColor;
        varying vec3 vInstanceCenter;
        varying vec3 vCameraPos;

        void main() {
            // Map texture coordinates to [-1, 1] range, centered at (0.5, 0.5)
            vec2 uv = (vTexCoord - vec2(0.5)) * 2.0;
            float distFromCenter = length(uv);
            
            // Discard fragments outside the sphere
            if (distFromCenter > 1.0) {
                discard;
            }
            
            // Calculate the Z coordinate for the sphere surface
            float z = sqrt(1.0 - distFromCenter * distFromCenter);
            
            // The normal in tangent space (relative to the quad)
            vec3 normal = normalize(vec3(uv.x, uv.y, z));
            
            // Transform normal to world space if needed
            // For a basic imposter, we can use the normal as-is if the quad faces the camera
            // For more complex cases, you might need to transform this normal to world space
            
            // Lighting calculations
            vec3 lightDir = normalize(uLightPos - vWorldPos);
            vec3 viewDir = normalize(vCameraPos - vWorldPos);
            
            // Ambient
            float ambientStrength = 0.7;
            vec3 ambient = ambientStrength * vInstanceColor;
            
            // Diffuse
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * vInstanceColor * 0.5;
            
            // Specular
            float specularStrength = 0.3;
            vec3 reflectDir = reflect(-lightDir, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
            vec3 specular = specularStrength * spec * uLightColor;
            
            // Combine lighting components
            gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
        }
    `;


const pipeVertexShaderSrc = `
            attribute vec3 aPosition;
            attribute vec3 a_instanceStart;
            attribute vec3 a_instanceEnd;
            attribute float a_instanceRadius;
            attribute vec3 a_instanceColor;

            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform vec3 uCameraPos;

            varying vec3 vCylStart;
            varying vec3 vCylEnd;
            varying float vRadius;
            varying vec3 vInstanceColor;
            varying vec3 vCameraPos;
            varying vec3 vWorldPos;
            varying vec3 vRight;
            varying vec3 vUp;

            void main() {
                vec4 worldStart = uModelMatrix * vec4(a_instanceStart, 1.0);
                vec4 worldEnd = uModelMatrix * vec4(a_instanceEnd, 1.0);
                
                vec3 cylDir = normalize(worldEnd.xyz - worldStart.xyz);
                float cylLength = length(worldEnd.xyz - worldStart.xyz) * 0.5;
                vec3 cylCenter = (worldStart.xyz + worldEnd.xyz) * 0.5;
                
                // Billboard coordinate system
                vec3 viewDir = normalize(uCameraPos - cylCenter);
                
                // Ensure up aligns with cylinder direction
                vec3 up = cylDir;
                
                // Compute right vector perpendicular to both viewDir and up
                vec3 right = normalize(cross(viewDir, up));
                
                // Scale quad: x for width (right), y for height (cylDir)
                float widthScale = a_instanceRadius * 2.0; // Horizontal extent
                float heightScale = cylLength * 1.2; // Vertical extent
                vec3 localPos = (right * aPosition.x * widthScale) + (up * aPosition.y * heightScale);
                
                vec3 worldPos = cylCenter + localPos;
                vec4 viewPos = uViewMatrix * vec4(worldPos, 1.0);
                gl_Position = uProjectionMatrix * viewPos;
                
                vCylStart = worldStart.xyz;
                vCylEnd = worldEnd.xyz;
                vRadius = a_instanceRadius;
                vInstanceColor = a_instanceColor;
                vCameraPos = uCameraPos;
                vWorldPos = worldPos;
                vRight = right;
                vUp = up;
            }
        `;
    
const pipeFragmentShaderSrc = `
    precision highp float;

    uniform vec3 uLightPos;
    uniform vec3 uLightColor;

    varying vec3 vCylStart;
    varying vec3 vCylEnd;
    varying float vRadius;
    varying vec3 vInstanceColor;
    varying vec3 vCameraPos;
    varying vec3 vWorldPos;

    void main() {
        // Cylinder properties
        vec3 cylDir = normalize(vCylEnd - vCylStart);
        float cylHeight = length(vCylEnd - vCylStart) * 0.5;
        vec3 cylCenter = (vCylStart + vCylEnd) * 0.5;
        
        // Ray setup
        vec3 rayOrigin = vCameraPos;
        vec3 rayDir = normalize(vWorldPos - vCameraPos);
        
        // Local coordinate system
        vec3 up = cylDir;
        vec3 right;
        if (abs(dot(up, vec3(0.0, 1.0, 0.0))) > 0.999) {
            right = normalize(cross(vec3(1.0, 0.0, 0.0), up));
        } else {
            right = normalize(cross(vec3(0.0, 1.0, 0.0), up));
        }
        vec3 forward = normalize(cross(up, right));
        
        // World-to-cylinder transformation
        mat3 worldToCyl = mat3(
            right.x, up.x, forward.x,
            right.y, up.y, forward.y,
            right.z, up.z, forward.z
        );
        
        // Cylinder-to-world transformation
        mat3 cylToWorld = mat3(
            right.x, right.y, right.z,
            up.x, up.y, up.z,
            forward.x, forward.y, forward.z
        );
        
        // Transform ray to local space
        vec3 ro = worldToCyl * (rayOrigin - cylCenter);
        vec3 rd = worldToCyl * rayDir;
        
        // Ray-cylinder intersection (side)
        float A = rd.x * rd.x + rd.z * rd.z;
        float B = 2.0 * (ro.x * rd.x + ro.z * rd.z);
        float C = ro.x * ro.x + ro.z * ro.z - vRadius * vRadius;
        float D = B * B - 4.0 * A * C;
        
        float t = 1e20;
        vec3 localNormal;
        vec3 localHitPos;
        bool hit = false;
        
        // Side surface intersection
        if (D >= 0.0 && A > 0.001) {
            float sqrtD = sqrt(D);
            float t0 = (-B - sqrtD) / (2.0 * A);
            float t1 = (-B + sqrtD) / (2.0 * A);
            
            for (int i = 0; i < 2; ++i) {
                float tt = i == 0 ? t0 : t1;
                vec3 p = ro + rd * tt;
                if (tt > 0.0 && abs(p.y) <= cylHeight && tt < t) {
                    t = tt;
                    localHitPos = p;
                    localNormal = normalize(vec3(p.x, 0.0, p.z));
                    hit = true;
                }
            }
        }
        
        // Caps intersection
        for (int i = -1; i <= 1; i += 2) {
            if (abs(rd.y) > 0.001) {
                float capY = float(i) * cylHeight;
                float tt = (capY - ro.y) / rd.y;
                vec3 p = ro + rd * tt;
                if (tt > 0.0 && (p.x * p.x + p.z * p.z) <= vRadius * vRadius && tt < t) {
                    t = tt;
                    localHitPos = p;
                    localNormal = vec3(0.0, float(i), 0.0);
                    hit = true;
                }
            }
        }
        
        if (!hit) {
            discard;
        }
        
        // Transform hit position and normal to world space
        vec3 worldHitPos = cylCenter + cylToWorld * localHitPos;
        vec3 worldNormal = normalize(cylToWorld * localNormal);
        
        // Lighting calculations
        vec3 lightDir = normalize(uLightPos - worldHitPos);
        vec3 viewDir = normalize(vCameraPos - worldHitPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        
        // Ambient
        float ambientStrength = 0.4;
        vec3 ambient = ambientStrength * vInstanceColor;
        
        // Diffuse
        float diff = max(dot(worldNormal, lightDir), 0.0);
        vec3 diffuse = diff * vInstanceColor * 0.6;
        
        // Specular
        float specularStrength = 0.3;
        float spec = pow(max(dot(worldNormal, halfDir), 0.0), 32.0);
        vec3 specular = specularStrength * spec * uLightColor;
        
        // Combine lighting
        vec3 result = ambient + diffuse + specular;
        
        gl_FragColor = vec4(result, 1.0);

     }
`;
    
    // Create sphere shader program
    const sphereProgram = createProgram(sphereVertexShaderSrc, sphereFragmentShaderSrc);
    
    // Create pipe shader program  
    const pipeProgram = createProgram(pipeVertexShaderSrc, pipeFragmentShaderSrc);
    
    return { sphereProgram, pipeProgram };
}

function createProgram(vertexSrc, fragmentSrc) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSrc);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error("Vertex shader compilation failed:", gl.getShaderInfoLog(vertexShader));
        return null;
    }
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSrc);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error("Fragment shader compilation failed:", gl.getShaderInfoLog(fragmentShader));
        return null;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program linking failed:", gl.getProgramInfoLog(program));
        return null;
    }
    
    return program;
}

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

function createLShapedConnections(vertices, edges, vertexTypes, vertexValues) {
    const lShapedEdges = [];
   
    edges.forEach(edge => {

        // Change the vertices near the node connections on the basis of SphereRadius so that it doesnt overlap with the sphere

        const startVertex = vertices[edge[0]];
        const endVertex = vertices[edge[1]];
        const startType = vertexTypes[edge[0]];
        const endType = vertexTypes[edge[1]];
       
        // Determine which vertex is the saddle and which is the extremum
        let saddleVertex, extremumVertex, saddleValue, extremumValue;

        //If start is Saddle and end is Maxima or Minima
        if (startType === NODE_TYPES.SADDLE && (endType === NODE_TYPES.MAXIMUM || endType === NODE_TYPES.MINIMUM)) {
            saddleVertex = startVertex;
            extremumVertex = endVertex;
            saddleValue = vertexValues[edge[0]];
            extremumValue = vertexValues[edge[1]];
        }
        //If end is Saddle and start is Maxima or Minima
        else if (endType === NODE_TYPES.SADDLE && (startType === NODE_TYPES.MAXIMUM || startType === NODE_TYPES.MINIMUM)) {
            saddleVertex = endVertex;
            extremumVertex = startVertex;
            saddleValue = vertexValues[edge[1]];
            extremumValue = vertexValues[edge[0]];
        }
        // Saddle to Saddle
        else if (startType === NODE_TYPES.SADDLE && endType === NODE_TYPES.SADDLE) {
            // Both are saddles, choose on the basis of distance from the main trunk (z=0, x=0)
            const startDistance = Math.sqrt(startVertex[0] * startVertex[0] + startVertex[2] * startVertex[2]);
            const endDistance = Math.sqrt(endVertex[0] * endVertex[0] + endVertex[2] * endVertex[2]);
            
            if (startDistance < endDistance) {
                // Horizontal first, then vertical
                saddleVertex = startVertex;
                extremumVertex = endVertex;
                saddleValue = vertexValues[edge[0]];
                extremumValue = vertexValues[edge[1]];
            } else {
                // Vertical first, then horizontal
                saddleVertex = endVertex;
                extremumVertex = startVertex;
                saddleValue = vertexValues[edge[1]];
                extremumValue = vertexValues[edge[0]];
            }
            
            // if (vertexValues[edge[0]] < vertexValues[edge[1]]) {
            //     saddleVertex = startVertex;
            //     extremumVertex = endVertex;
            //     saddleValue = vertexValues[edge[0]];
            //     extremumValue = vertexValues[edge[1]];
            // } else {
            //     saddleVertex = endVertex;
            //     extremumVertex = startVertex;
            //     saddleValue = vertexValues[edge[1]];
            //     extremumValue = vertexValues[edge[0]];
            // }
        }
        // else {
        //     saddleVertex = startVertex;
        //     extremumVertex = endVertex;
        //     saddleValue = vertexValues[edge[0]];
        //     extremumValue = vertexValues[edge[1]];
        // }

        // Create L-shaped connection based on function value relationship
        const intermediatePoint = [
            extremumVertex[0],    // Move horizontally to extremum's X position
            saddleVertex[1],      // Keep saddle's Y position (height)
            extremumVertex[2]     // Move horizontally to extremum's Z position
        ];

        // Check if we're going from higher to lower or lower to higher function value
        // Check if we're going from higher to lower or lower to higher function value
        if (saddleValue > extremumValue) {
            // Lower to Higher: Vertical First then Horizontal
            
            // First segment: saddle to intermediate (shorten only at saddle end)
            const direction1 = [
                intermediatePoint[0] - saddleVertex[0],
                intermediatePoint[1] - saddleVertex[1],
                intermediatePoint[2] - saddleVertex[2]
            ];
            const length1 = Math.sqrt(direction1[0] * direction1[0] + direction1[1] * direction1[1] + direction1[2] * direction1[2]);
            
            // let newStart1 = saddleVertex;
            // if (length1 > sphereRadius) {
            //     const normalizedDir1 = [direction1[0] / length1, direction1[1] / length1, direction1[2] / length1];
            //     newStart1 = [
            //         saddleVertex[0] + normalizedDir1[0] * sphereRadius/2,
            //         saddleVertex[1] + normalizedDir1[1] * sphereRadius/2,
            //         saddleVertex[2] + normalizedDir1[2] * sphereRadius/2
            //     ];
            // }
            
            lShapedEdges.push({
                // start: newStart1,
                start: saddleVertex, // Keep saddle point unchanged
                end: intermediatePoint, // Keep intermediate point unchanged
                type: 'horizontal'
            });
            
            // Second segment: intermediate to extremum (shorten only at extremum end)
            const direction2 = [
                extremumVertex[0] - intermediatePoint[0],
                extremumVertex[1] - intermediatePoint[1],
                extremumVertex[2] - intermediatePoint[2]
            ];
            const length2 = Math.sqrt(direction2[0] * direction2[0] + direction2[1] * direction2[1] + direction2[2] * direction2[2]);
            
            // let newEnd2 = extremumVertex;
            // if (length2 > sphereRadius) {
            //     const normalizedDir2 = [direction2[0] / length2, direction2[1] / length2, direction2[2] / length2];
            //     newEnd2 = [
            //         extremumVertex[0] - normalizedDir2[0] * sphereRadius/2,
            //         extremumVertex[1] - normalizedDir2[1] * sphereRadius/2,
            //         extremumVertex[2] - normalizedDir2[2] * sphereRadius/2
            //     ];
            // }
            
            lShapedEdges.push({
                start: intermediatePoint, // Keep intermediate point unchanged
                // end: newEnd2,
                end: extremumVertex, // Keep extremum point unchanged
                type: 'vertical'
            });

            intermediatePoints.push(intermediatePoint);
        } else {
            // Higher to Lower: Horizontal first, then Vertical
            const verticalIntermediatePoint = [
                saddleVertex[0],      // Keep saddle's X position
                extremumVertex[1],    // Move vertically to extremum's Y position
                saddleVertex[2]       // Keep saddle's Z position
            ];
            
            // First segment: saddle to vertical intermediate (shorten only at saddle end)
            const direction1 = [
                verticalIntermediatePoint[0] - saddleVertex[0],
                verticalIntermediatePoint[1] - saddleVertex[1],
                verticalIntermediatePoint[2] - saddleVertex[2]
            ];
            const length1 = Math.sqrt(direction1[0] * direction1[0] + direction1[1] * direction1[1] + direction1[2] * direction1[2]);
            
            let newStart1 = saddleVertex;
            if (length1 > sphereRadius) {
                const normalizedDir1 = [direction1[0] / length1, direction1[1] / length1, direction1[2] / length1];
                newStart1 = [
                    saddleVertex[0] + normalizedDir1[0] * sphereRadius/2,
                    saddleVertex[1] + normalizedDir1[1] * sphereRadius/2,
                    saddleVertex[2] + normalizedDir1[2] * sphereRadius/2
                ];
            }
            
            lShapedEdges.push({
                start: newStart1,
                end: verticalIntermediatePoint, // Keep intermediate point unchanged
                type: 'vertical'
            });
            
            // Second segment: vertical intermediate to extremum (shorten only at extremum end)
            const direction2 = [
                extremumVertex[0] - verticalIntermediatePoint[0],
                extremumVertex[1] - verticalIntermediatePoint[1],
                extremumVertex[2] - verticalIntermediatePoint[2]
            ];
            const length2 = Math.sqrt(direction2[0] * direction2[0] + direction2[1] * direction2[1] + direction2[2] * direction2[2]);
            
            let newEnd2 = extremumVertex;
            if (length2 > sphereRadius) {
                const normalizedDir2 = [direction2[0] / length2, direction2[1] / length2, direction2[2] / length2];
                newEnd2 = [
                    extremumVertex[0] - normalizedDir2[0] * sphereRadius/2,
                    extremumVertex[1] - normalizedDir2[1] * sphereRadius/2,
                    extremumVertex[2] - normalizedDir2[2] * sphereRadius/2
                ];
            }
            
            lShapedEdges.push({
                start: verticalIntermediatePoint, // Keep intermediate point unchanged
                end: newEnd2,
                type: 'horizontal'
            });

            intermediatePoints.push(verticalIntermediatePoint);
        }
    });
   
    return lShapedEdges;
}

// Updated pipe instance data preparation
// Modify the prepareLShapedPipeData function
function prepareLShapedPipeData(vertices, edges, vertexTypes, vertexValues) {
    const lShapedEdges = createLShapedConnections(vertices, edges, vertexTypes, vertexValues);
    const pipeInstanceData = new Float32Array(lShapedEdges.length * 10); // 3+3+1+3 for start+end+radius+color

    let offset = 0;
    lShapedEdges.forEach((edge, index) => {
        const originalEdgeIndex = Math.floor(index / 2) + 1; // L-shaped edges are paired
        const isSelected = selectedEdge === originalEdgeIndex;

        pipeInstanceData.set(edge.start, offset);
        pipeInstanceData.set(edge.end, offset + 3);
        pipeInstanceData[offset + 6] = pipeRadius;
        pipeInstanceData.set(isSelected ? [1.0, 0.0, 1.0] : pipeColor, offset + 7);
        offset += 10;
    });

    return { pipeInstanceData, edgeCount: lShapedEdges.length };
}

function renderGraph() {
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = calculateCameraPosition();
    const up = calculateUpVector();
    const target = [
        cameraTarget[0] + cameraOffset[0],
        cameraTarget[1] + cameraOffset[1],
        cameraTarget[2] + cameraOffset[2]
    ];

    mat4.lookAt(viewMatrix, eye, target, up);
    invViewMatrix = mat4.invert(mat4.create(), viewMatrix);

    // Render pipes first
    gl.useProgram(pipeProgram);
    if (pipeUniforms.uProjectionMatrix) {
        gl.uniformMatrix4fv(pipeUniforms.uProjectionMatrix, false, projectionMatrix);
    }
    if (pipeUniforms.uViewMatrix) {
        gl.uniformMatrix4fv(pipeUniforms.uViewMatrix, false, viewMatrix);
    }
    if (pipeUniforms.uModelMatrix) {
        gl.uniformMatrix4fv(pipeUniforms.uModelMatrix, false, modelMatrix);
    }
    if (pipeUniforms.uLightPos) {
        gl.uniform3fv(pipeUniforms.uLightPos, lightPosition);
    }
    if (pipeUniforms.uLightColor) {
        gl.uniform3fv(pipeUniforms.uLightColor, lightColor);
    }
    if (pipeUniforms.uCameraPos) {
        gl.uniform3fv(pipeUniforms.uCameraPos, eye);
    }

    vertArrObjExt.bindVertexArrayOES(pipeVAO);
    instRenExt.drawElementsInstancedANGLE(
        gl.TRIANGLES,
        pipeIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        edgesCount
    );
    vertArrObjExt.bindVertexArrayOES(null);

    // Render spheres with polygon offset
    gl.useProgram(sphereProgram);
    if (sphereUniforms.uProjectionMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uProjectionMatrix, false, projectionMatrix);
    }
    if (sphereUniforms.uModelMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uModelMatrix, false, modelMatrix);
    }
    if (sphereUniforms.uViewMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uViewMatrix, false, viewMatrix);
    }
    if (sphereUniforms.uLightPos) {
        gl.uniform3fv(sphereUniforms.uLightPos, lightPosition);
    }
    if (sphereUniforms.uLightColor) {
        gl.uniform3fv(sphereUniforms.uLightColor, lightColor);
    }
    if (sphereUniforms.uCameraPos) {
        gl.uniform3fv(sphereUniforms.uCameraPos, eye);
    }
    if (sphereUniforms.uInvViewMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uInvViewMatrix, false, invViewMatrix);
    }

    // Enable polygon offset for spheres
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0); // Adjust factor and units as needed
    vertArrObjExt.bindVertexArrayOES(sphereVAO);
    instRenExt.drawElementsInstancedANGLE(
        gl.TRIANGLES,
        sphereIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        validVertices.length
    );
    vertArrObjExt.bindVertexArrayOES(null);
    gl.disable(gl.POLYGON_OFFSET_FILL); // Disable after spheres
}

function updateInstanceData() {
    // Instance data to be moved here
    // Return the instance data for spheres and pipes

    // Create L-shaped pipe connections
    const pipeData = prepareLShapedPipeData(vertices, edges, vertexTypes, vertexValues);
    const pipeInstanceData = pipeData.pipeInstanceData;
    edgesCount = pipeData.edgeCount;
    
    // Add the intermediate points sphere with same color and radius as pipes
    intermediatePoints.forEach(point => {
        validVertices.push(point);
        validTypes.push(NODE_TYPES.INTERMEDIATE); // Assuming intermediate points are treated as saddles
    });
    
    // // Prepare sphere instance data
    const instanceData = new Float32Array(validVertices.length * 7); // [x, y, z, size, r, g, b]

    validVertices.forEach((vertex, i) => {
        const type = validTypes[i];
        const color = NODE_COLORS[type] || [1.0, 1.0, 1.0]; // Default to white if type not found
        
        instanceData[i * 7] = vertex[0];      // x
        instanceData[i * 7 + 1] = vertex[1];  // y  
        instanceData[i * 7 + 2] = vertex[2];  // z
        instanceData[i * 7 + 3] = sphereRadius; // size if its not a intermediate point
        if (type === NODE_TYPES.INTERMEDIATE) {
            instanceData[i * 7 + 3] = pipeRadius*2; // Use pipe radius for intermediate points
        }
        instanceData[i * 7 + 4] = color[0];   // r
        instanceData[i * 7 + 5] = color[1];   // g
        instanceData[i * 7 + 6] = color[2];   // b
        if (type === NODE_TYPES.INTERMEDIATE) {
            instanceData[i * 7 + 4] = pipeColor[0];   // r for intermediate points
            instanceData[i * 7 + 5] = pipeColor[1];   // g for intermediate points
            instanceData[i * 7 + 6] = pipeColor[2];   // b for intermediate points
        }
    });

    return {
        instanceData, // Sphere instance data
        pipeInstanceData, // Pipe instance data
        edgeCount: edgesCount // Number of edges for pipes
    };

}

function getUniformLocations(program) {
    // Get uniform locations for the given program instead of multiple times with the intialization
}

function getAttributeLocations(sphereProgram, pipeProgram) {
    const posLoc = gl.getAttribLocation(sphereProgram, "aPosition");
    const texLoc = gl.getAttribLocation(sphereProgram, "aTexCoord");
    const instPosLoc = gl.getAttribLocation(sphereProgram, "a_instancePosition");
    const instSizeLoc = gl.getAttribLocation(sphereProgram, "a_instanceSize");
    const instColorLoc = gl.getAttribLocation(sphereProgram, "a_instanceColor");

    const pipePosLoc = gl.getAttribLocation(pipeProgram, "aPosition");
    const pipeInstSizeLoc = gl.getAttribLocation(pipeProgram, "a_instanceRadius");
    const pipeInstStartVertex = gl.getAttribLocation(pipeProgram, "a_instanceStart");
    const pipeInstEndVertex = gl.getAttribLocation(pipeProgram, "a_instanceEnd");
    const pipeInstColorLoc = gl.getAttribLocation(pipeProgram, "a_instanceColor");
    
    return {
        sphere: {
            posLoc,
            texLoc,
            instPosLoc,
            instSizeLoc,
            instColorLoc
        },
        pipe: {
            pipePosLoc,
            pipeInstSizeLoc,
            pipeInstStartVertex,
            pipeInstEndVertex,
            instColorLoc: pipeInstColorLoc
        }
    };
}

// Updated initializeGraph function with L-shaped connections
function initializeGraph(offData) {

    // In initializeGraph function, add this at the beginning:
    intermediatePoints = []; // Clear previous intermediate points


    try {
        // Replace the condition check:
        if (offData === prevOffData && prevSpacing === applySpacing) {
            console.log("Same graph data is already initialized, skipping parsing part of initialization.");
            // // Only update radius-dependent data, not recreate everything
            // updateInstanceData(); // Create this new function
            // return;
        }
        else{
            prevOffData = offData; // Update previous OFF data
            prevSpacing = applySpacing; // Update previous spacing
            const parsedData = parseOFFData(offData);
            vertices = parsedData.vertices;
            edges = parsedData.edges;
            vertexTypes = parsedData.vertexTypes // Now we have new column for vertex types
            vertexValues = parsedData.vertexValues; // Function values for each vertex

            // Calculate graph center
            const minX = Math.min(...vertices.map(v => v[0]));
            const maxX = Math.max(...vertices.map(v => v[0]));
            const minY = Math.min(...vertices.map(v => v[1]));
            const maxY = Math.max(...vertices.map(v => v[1]));
            const minZ = Math.min(...vertices.map(v => v[2]));
            const maxZ = Math.max(...vertices.map(v => v[2]));

            const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
            cameraDistance = Math.max(15, maxDim * 1.5);

            // Update Count
            verticesCount = vertices.length;

            // // replace the vertices y coordiante with function value
            // vertices = vertices.map((vertex, i) => {
            //     return [vertex[0], vertexValues[i], vertex[2]]; // Use function value as Y coordinate
            // })
        }

        // Create geometries
        const sphere = createBillboardQuad(); // Create billboard quad for spheres
        const cylinder = createCylinderQuad(); // Use quad instead
        sphereIndexCount = sphere.indices.length;
        pipeIndexCount = cylinder.indices.length;


        let instanceObjects = updateInstanceData(); // Create this new function
        let instanceData = instanceObjects.instanceData; // Sphere instance data
        let pipeInstanceData = instanceObjects.pipeInstanceData; // Pipe instance data
        let edgesCount = instanceObjects.edgeCount; // Number of edges for pipes


        // Count different status type points
        const counts = {
            [NODE_TYPES.MINIMUM]: 0,
            [NODE_TYPES.SADDLE]: 0,
            [NODE_TYPES.MAXIMUM]: 0
        };
        
        vertexTypes.forEach(type => {
            counts[type]++;
        });

        showStatus(`Loaded graph: ${verticesCount} vertices, 
            ${edgesCount} L-shaped edges | Minima: ${counts[NODE_TYPES.MINIMUM]}, 
            Saddles: ${counts[NODE_TYPES.SADDLE]}, Maxima: ${counts[NODE_TYPES.MAXIMUM]}`, 
            'success'
        );

        

        // Set up shaders and uniforms if not already done
        if (!sphereProgram) {
            const shaders = createShaderProgram();
            sphereProgram = shaders.sphereProgram;
            pipeProgram = shaders.pipeProgram;

            // Set up uniforms
            gl.useProgram(sphereProgram);
            sphereUniforms = {
                uProjectionMatrix: gl.getUniformLocation(sphereProgram, "uProjectionMatrix"),
                uViewMatrix: gl.getUniformLocation(sphereProgram, "uViewMatrix"),
                uModelMatrix: gl.getUniformLocation(sphereProgram, "uModelMatrix"),
                uLightPos: gl.getUniformLocation(sphereProgram, "uLightPos"),
                uLightColor: gl.getUniformLocation(sphereProgram, "uLightColor"),
                uCameraPosLocation: gl.getUniformLocation(sphereProgram, "uCameraPos"),
                uColorLocation: gl.getUniformLocation(sphereProgram, "uColor"),
                uInvViewMatrix: gl.getUniformLocation(sphereProgram, "uInvViewMatrix")
            };

            gl.useProgram(pipeProgram);
            pipeUniforms = {
                uProjectionMatrix: gl.getUniformLocation(pipeProgram, "uProjectionMatrix"),
                uViewMatrix: gl.getUniformLocation(pipeProgram, "uViewMatrix"),
                uModelMatrix: gl.getUniformLocation(pipeProgram, "uModelMatrix"),
                uLightPos: gl.getUniformLocation(pipeProgram, "uLightPos"),
                uLightColor: gl.getUniformLocation(pipeProgram, "uLightColor"),
                uCameraPos: gl.getUniformLocation(pipeProgram, "uCameraPos"),
                uInvViewMatrix: gl.getUniformLocation(pipeProgram, "uInvViewMatrix")
            };
        }

        let attributes = null;
        // Get attribute locations
        if (!attributes) {
            attributes = getAttributeLocations(sphereProgram, pipeProgram);
        }
        else {
            // If attributes are already set, we can skip this step
            console.log("Using existing attribute locations.");
        }
        
        


        
        // Clean up old VAOs if they exist
        if (sphereVAO) vertArrObjExt.deleteVertexArrayOES(sphereVAO);

        sphereVAO = vertArrObjExt.createVertexArrayOES();
        vertArrObjExt.bindVertexArrayOES(sphereVAO);

        const spherePositionBuffer = gl.createBuffer();
        const sphereTexCoordBuffer = gl.createBuffer();
        const instanceBuffer = gl.createBuffer();
        const sphereIndexBuffer = gl.createBuffer();

        // Position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, spherePositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(attributes.sphere.posLoc);
        gl.vertexAttribPointer(attributes.sphere.posLoc, 3, gl.FLOAT, false, 0, 0);
        instRenExt.vertexAttribDivisorANGLE(attributes.sphere.posLoc, 0);

        // Texture coordinates buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.texCoords, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(attributes.sphere.texLoc);
        gl.vertexAttribPointer(attributes.sphere.texLoc, 2, gl.FLOAT, false, 0, 0);
        instRenExt.vertexAttribDivisorANGLE(attributes.sphere.texLoc, 0);

        // Instance buffer (position + size)
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.STATIC_DRAW);

        // Instance position attribute
        gl.enableVertexAttribArray(attributes.sphere.instPosLoc);
        gl.vertexAttribPointer(attributes.sphere.instPosLoc, 3, gl.FLOAT, false, 28, 0);
        instRenExt.vertexAttribDivisorANGLE(attributes.sphere.instPosLoc, 1);

        // Instance size attribute
        gl.enableVertexAttribArray(attributes.sphere.instSizeLoc);
        gl.vertexAttribPointer(attributes.sphere.instSizeLoc, 1, gl.FLOAT, false, 28, 12);
        instRenExt.vertexAttribDivisorANGLE(attributes.sphere.instSizeLoc, 1);

        // Instance color attribute
        gl.enableVertexAttribArray(attributes.sphere.instColorLoc);
        gl.vertexAttribPointer(attributes.sphere.instColorLoc, 3, gl.FLOAT, false, 28, 16);
        instRenExt.vertexAttribDivisorANGLE(attributes.sphere.instColorLoc, 1);

        // Index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

        vertArrObjExt.bindVertexArrayOES(null);


        // Set up pipe VAO

        // In initializeGraph, update the pipe VAO setup
// In initializeGraph, pipe VAO setup
if (pipeVAO) vertArrObjExt.deleteVertexArrayOES(pipeVAO);
pipeVAO = vertArrObjExt.createVertexArrayOES();
vertArrObjExt.bindVertexArrayOES(pipeVAO);

const pipePositionBuffer = gl.createBuffer();
const pipeInstanceBuffer = gl.createBuffer();
const pipeIndexBuffer = gl.createBuffer();

// Position buffer
gl.bindBuffer(gl.ARRAY_BUFFER, pipePositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cylinder.positions, gl.STATIC_DRAW);
gl.enableVertexAttribArray(attributes.pipe.pipePosLoc);
gl.vertexAttribPointer(attributes.pipe.pipePosLoc, 3, gl.FLOAT, false, 0, 0);
instRenExt.vertexAttribDivisorANGLE(attributes.pipe.pipePosLoc, 0);

// Instance buffer
gl.bindBuffer(gl.ARRAY_BUFFER, pipeInstanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pipeInstanceData, gl.STATIC_DRAW);

// Instance start position
gl.enableVertexAttribArray(attributes.pipe.pipeInstStartVertex);
gl.vertexAttribPointer(attributes.pipe.pipeInstStartVertex, 3, gl.FLOAT, false, 40, 0);
instRenExt.vertexAttribDivisorANGLE(attributes.pipe.pipeInstStartVertex, 1);

// Instance end position
gl.enableVertexAttribArray(attributes.pipe.pipeInstEndVertex);
gl.vertexAttribPointer(attributes.pipe.pipeInstEndVertex, 3, gl.FLOAT, false, 40, 12);
instRenExt.vertexAttribDivisorANGLE(attributes.pipe.pipeInstEndVertex, 1);

// Instance radius
gl.enableVertexAttribArray(attributes.pipe.pipeInstSizeLoc);
gl.vertexAttribPointer(attributes.pipe.pipeInstSizeLoc, 1, gl.FLOAT, false, 40, 24);
instRenExt.vertexAttribDivisorANGLE(attributes.pipe.pipeInstSizeLoc, 1);

// Instance color
gl.enableVertexAttribArray(attributes.pipe.instColorLoc);
gl.vertexAttribPointer(attributes.pipe.instColorLoc, 3, gl.FLOAT, false, 40, 28);
instRenExt.vertexAttribDivisorANGLE(attributes.pipe.instColorLoc, 1);

// Index buffer
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pipeIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cylinder.indices, gl.STATIC_DRAW);

vertArrObjExt.bindVertexArrayOES(null);

    // Update max attribute of edge input
    document.getElementById('edgeSelect').max = edges.length;

        // debugUniforms(); // Call the debugging function to check uniform locations

        renderGraph();

    } catch (error) {
        if(offData !== ""){
            showStatus(`Error loading graph: ${error.message}`, 'error');
            console.error("Graph initialization error:", error);
        }
    }
}

// 4. Add debugging function to check uniform locations
function debugUniforms() {
    console.log("Sphere uniforms:", sphereUniforms);
    console.log("Pipe uniforms:", pipeUniforms);
    

sphereUniforms = {
                uProjectionMatrix: gl.getUniformLocation(sphereProgram, "uProjectionMatrix"),
                uViewMatrix: gl.getUniformLocation(sphereProgram, "uViewMatrix"),
                uModelMatrix: gl.getUniformLocation(sphereProgram, "uModelMatrix"),
                uLightPos: gl.getUniformLocation(sphereProgram, "uLightPos"),
                // uViewPos: gl.getUniformLocation(sphereProgram, "uViewPos"),
                uCameraPosLocation: gl.getUniformLocation(sphereProgram, "uCameraPos"),
                uColorLocation: gl.getUniformLocation(sphereProgram, "uColor")
            };

            gl.useProgram(pipeProgram);
            pipeUniforms = {
                uProjectionMatrix: gl.getUniformLocation(pipeProgram, "uProjectionMatrix"),
                uViewMatrix: gl.getUniformLocation(pipeProgram, "uViewMatrix"),
                uModelMatrix: gl.getUniformLocation(pipeProgram, "uModelMatrix"),
                uLightPos: gl.getUniformLocation(pipeProgram, "uLightPos"),
                uColor: gl.getUniformLocation(pipeProgram, "uColor"),
                uCameraPosLocationPipe: gl.getUniformLocation(pipeProgram, "uCameraPos")
                // Removed uViewPos since we're using uCameraPos directly in renderGraph
            };

    // Check if all expected uniforms exist
    const expectedSphereUniforms = ["uProjectionMatrix", "uViewMatrix", "uModelMatrix", "uLightPos", "uCameraPos", "uColor"];
    const expectedPipeUniforms = ["uProjectionMatrix", "uViewMatrix", "uModelMatrix", "uLightPos", "uColor", "uCameraPos"];
    
    expectedSphereUniforms.forEach(uniform => {
        if (sphereUniforms[uniform] === null || sphereUniforms[uniform] === undefined) {
            console.warn(`Sphere uniform ${uniform} not found`);
        }
    });
    
    expectedPipeUniforms.forEach(uniform => {
        if (pipeUniforms[uniform] === null || pipeUniforms[uniform] === undefined) {
            console.warn(`Pipe uniform ${uniform} not found`);
        }
    });
}


function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Time out to hide the messages (delay in ms)
    // setTimeout(() => {
    //     statusDiv.style.display = 'none';
    // }, 5000);
}


// File input handler
document.getElementById('fileInput').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) {
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.off')) {
        showStatus('Please select a .off file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function (e) {
        offData = e.target.result;
        showStatus(`Loaded file: ${file.name}`, 'success');
        // change color of the button
        document.getElementById('fileInputWrapper').style.backgroundColor = '#F0FF0F'; // Green color for success
        initializeGraph(offData);
    };
    reader.readAsText(file);
});

document.getElementById('sphereRadius').addEventListener('input', function () {
    sphereRadius = parseFloat(this.value);
    initializeGraph(offData);
    renderGraph(); // Re-render the graph with the new sphere radius
    showStatus(`Sphere radius set to ${sphereRadius}`, 'info');
});

document.getElementById('pipeRadius').addEventListener('input', function () {
    pipeRadius = parseFloat(this.value);
    initializeGraph(offData);
    renderGraph(); // Re-render the graph with the new sphere radius
    showStatus(`Pipe radius set to ${pipeRadius}`, 'info');
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    renderGraph();
}); 

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
            cameraOffset = [0, 0, 0]; // Reset camera offset when applying spacing
        } else {
            showStatus('Spacing removed from edges', 'info');
            cameraOffset = [0, 0, 0]; // Reset camera offset when applying spacing
        }
        initializeGraph(offData);
        renderGraph();
        return;
    }
    
    if (moved) {
        renderGraph();
    }
}

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

window.onload = () => {
    //Load default OFF file if available
    if(offData !== "") {
        initializeGraph(offData);
    }
    else{
        showStatus('Please select a .off file', 'error');
    }
}
