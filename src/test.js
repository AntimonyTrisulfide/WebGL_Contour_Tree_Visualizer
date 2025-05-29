// TO DO
// Know more about Billboard for sphere and cylinder

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
let offData = `
OFF
20 19 0
2.61313 1.42746 1.08239
1.73205 -2.60000 1
1.22474 2.15348 0.707107
0.707107 2.27703 0.707107
0.707107 -3.20000 0.707107
1.22474 -2.80000 0.707107
0 -3.80000 0
0 2.82843 0
0.707107 -3.60000 0.707107
0 -4.00000 0
0.541196 1.83854 1.30656
1.73205 1.65134 1
1.73205 -2.40000 1
1.98289 1.80896 0.261052
1.22474 -3.00000 0.707107
0.707107 -3.40000 0.707107
1.22474 -2.80000 0.707107
0.184592 1.80489 1.40211
2.24394 1.39697 1.72184
1.21752 1.49467 1.58671
2 5 1 0.000286181, 0.000349937, SADDLE, SADDLE
2 14 16 0.000137916, 0.000276051, SADDLE, SADDLE
2 16 5 0.000276051, 0.000286181, SADDLE, SADDLE
2 4 14 0.000119798, 0.000137916, SADDLE, SADDLE
2 6 8 6.19886e-06, 5.00666e-05, SADDLE, SADDLE
2 15 4 7.87942e-05, 0.000119798, SADDLE, SADDLE
2 9 6 0.0, 6.19886e-06, MINIMA, SADDLE
2 1 12 0.000349937, 0.00090963, SADDLE, SADDLE
2 8 15 5.00666e-05, 7.87942e-05, SADDLE, SADDLE
2 8 10 5.00666e-05, 11.3538, SADDLE, MAXIMA
2 16 19 0.000276051, 10.5173, SADDLE, MAXIMA
2 1 0 0.000349937, 10.3538, SADDLE, MAXIMA
2 4 3 0.000119798, 12.4206, SADDLE, MAXIMA
2 6 7 6.19886e-06, 13.762, SADDLE, MAXIMA
2 5 2 0.000286181, 12.12, SADDLE, MAXIMA
2 12 18 0.00090963, 10.2796, SADDLE, MAXIMA
2 15 17 7.87942e-05, 11.272, SADDLE, MAXIMA
2 14 13 0.000137916, 11.2819, SADDLE, MAXIMA
2 12 11 0.00090963, 10.8984, SADDLE, MAXIMA
`; 

let prevOffData;
// Variable to store the OFF file data


// Camera controls
//Initial camera angles in spherical coordinates
let cameraPhi = Math.PI/4;    // Polar angle (0 to PI)
let cameraTheta = 0;            // Azimuthal angle (0 to 2*PI)
// set camera distance (initial)
let cameraDistance = 15;
// flag and data for storing mouse state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Sphere and Pipe radius and segments
// get radius of the sphere from the user using the slider

let sphereRadius = 0.025; // Default radius of the spheres
let pipeRadius = 0.005; // Default radius of the pipes


const sphereLatitudeBands = 16; // Number of latitude bands for sphere
const sphereLongitudeBands = 16; // Number of longitude bands for sphere
const pipeSegments = 12; // Number of segments for the pipe (cylinder)

const sphereColor = [0.8, 0.3, 0.3]; // Color of the spheres
const pipeColor = [1, 1, 1]; // Color of the pipes

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
    SUPPRESSED_SADDLE: 3 // Uncomment if you want to use a special type for suppressed saddles
};

// Colors for each type
const NODE_COLORS = {
    [NODE_TYPES.MINIMUM]: [0.0, 0.4, 1.0],   // Blue
    [NODE_TYPES.SADDLE]: [0.0, 1.0, 1.0],    // Cyan
    [NODE_TYPES.MAXIMUM]: [1.0, 0.0, 0.0]    // Red
};

let vertices, edges, vertexValues, vertexTypes;
let sphereVAO, pipeVAO;
let sphereProgram, pipeProgram;
let sphereUniforms, pipeUniforms;
let verticesCount, edgesCount;
let sphereVerticesCount
let sphereIndexCount, pipeIndexCount;
let projectionMatrix, viewMatrix, modelMatrix;
let cameraPosition = [0,0,0]; // Test point for camera calculations
const DISTANCE_THRESHOLD = 0.0; // Adjust this value as needed

// Initialize matrices
projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

viewMatrix = mat4.create();
modelMatrix = mat4.create();
mat4.identity(modelMatrix);

// Enable depth testing 
gl.enable(gl.DEPTH_TEST);

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
    const vertices = [];
    
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
        const line = lines[currentLine];
        const parts = line.split(/\s+/);
        
        // Handle edges that start with 2 (normal edge - no closed loops)
        if (parseInt(parts[0]) === 2) {
            const vertex1Index = parseInt(parts[1]);
            const vertex2Index = parseInt(parts[2]);
            
            // Extract function values and types from the line
            // Format: "2 v1 v2 val1, val2, type1, type2"
            const dataStr = line.substring(line.indexOf(parts[2]) + parts[2].length).trim();
            const dataParts = dataStr.split(',').map(s => s.trim());
            
            if (dataParts.length >= 4) {
                const functionValue1 = parseFloat(dataParts[0]);
                const functionValue2 = parseFloat(dataParts[1]);
                const typeString1 = dataParts[2].toUpperCase();
                const typeString2 = dataParts[3].toUpperCase();
                
                // Convert type strings to our NODE_TYPES enum
                function getNodeType(typeString) {
                    switch(typeString) {
                        case 'MINIMA':
                            return NODE_TYPES.MINIMUM;
                        case 'MAXIMA':
                            return NODE_TYPES.MAXIMUM;
                        case 'SADDLE':
                            return NODE_TYPES.SADDLE;
                        default:
                            console.warn(`Unknown vertex type: ${typeString}, defaulting to SADDLE`);
                            return NODE_TYPES.SADDLE;
                    }
                }
                
                // Store vertex data if not already set
                if (vertexValues[vertex1Index] === undefined) {
                    vertexValues[vertex1Index] = functionValue1;
                    vertexTypes[vertex1Index] = getNodeType(typeString1);
                }
                if (vertexValues[vertex2Index] === undefined) {
                    vertexValues[vertex2Index] = functionValue2;
                    vertexTypes[vertex2Index] = getNodeType(typeString2);
                }
            }
            
            edges.push([vertex1Index, vertex2Index]);
        }
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
    
    return { 
        vertices, 
        edges, 
        vertexValues, 
        vertexTypes 
    };
}


// Create a sphere geometry
function createSphere(radius, latitudeBands, longitudeBands) {
    const positions = []; //positions of vertices for sphere geometry
    const indices = [];
    const normals = [];

    for (let latNumber = 0; latNumber <= latitudeBands; ++latNumber) {
        const phi = (latNumber * Math.PI) / latitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let longNumber = 0; longNumber <= longitudeBands; ++longNumber) {
            const theta = (longNumber * 2 * Math.PI) / longitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            const x = radius * sinPhi * cosTheta;
            const y = radius * sinPhi * sinTheta;
            const z = radius * cosPhi;

            positions.push(x, y, z);
            normals.push(sinPhi * cosTheta, sinPhi * sinTheta, cosPhi);

            const first = (latNumber * (longitudeBands + 1)) + longNumber;
            const second = first + longitudeBands + 1;

            if (latNumber < latitudeBands) {
                //triangle 1
                indices.push(first, second, first + 1);
                //triangle 2
                indices.push(second, second + 1, first + 1);
            }
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices)
    };
}

// Create a cylinder (pipe) along Y-axis from 0 to 1
function createCylinder(radius, segments) {
    const positions = [];
    const indices = [];
    const normals = [];

    // Generate vertices for the cylinder
    for (let i = 0; i <= segments; i++) {
        const theta = (i * 2 * Math.PI) / segments;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        
        // Bottom circle (y = 0)
        positions.push(radius * cosTheta, 0, radius * sinTheta);
        normals.push(cosTheta, 0, sinTheta);
        
        // Top circle (y = 1)
        positions.push(radius * cosTheta, 1, radius * sinTheta);
        normals.push(cosTheta, 0, sinTheta);
    }
    
    // Build indices for triangles
    for (let i = 0; i < segments; i++) {
        const bottomCurrent = i * 2;
        const topCurrent = bottomCurrent + 1;
        const bottomNext = ((i + 1) % segments) * 2;
        const topNext = bottomNext + 1;
        
        // Triangle 1
        indices.push(bottomCurrent, topCurrent, bottomNext);
        
        // Triangle 2
        indices.push(topCurrent, topNext, bottomNext);
    }
    
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices)
    };
}

// Create shader program
function createShaderProgram() {
    const sphereVertexShaderSrc = `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec3 a_instancePosition;
        attribute vec3 a_instanceColor;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vColor;

        
        void main() {
            vec4 worldPosition = uModelMatrix * vec4(aPosition + a_instancePosition, 1.0);
            vPosition = worldPosition.xyz;
            vNormal = mat3(uModelMatrix) * aNormal;
        
            vColor = a_instanceColor; // Pass instance color to fragment shader

            gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
        }
    `;
    
    const sphereFragmentShaderSrc = `
        precision mediump float;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vColor;
        
        uniform vec3 uLightPos;
        uniform vec3 uViewPos;
        
        void main() {
            vec3 norm = normalize(vNormal);
            vec3 lightDir = normalize(uLightPos - vPosition);
            vec3 viewDir = normalize(uViewPos - vPosition);
            vec3 reflectDir = reflect(-lightDir, norm);
            
            float ambientStrength = 0.3;
            vec3 ambient = ambientStrength * vColor;
            
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * vColor;
            
            float specularStrength = 0.5;
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
            vec3 specular = specularStrength * spec * vec3(1.0, 1.0, 1.0);
            
            vec3 result = ambient + diffuse + specular;
            gl_FragColor = vec4(result, 1.0);
        }
    `;

    // Pipe shader with transformation
    const pipeVertexShaderSrc = `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec3 a_instanceStart;
        attribute vec3 a_instanceEnd;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        mat3 createRotationMatrix(vec3 forward) {
            vec3 up = vec3(0.0, 1.0, 0.0);
            vec3 right;
            
            if (abs(dot(forward, up)) > 0.99) {
                up = vec3(1.0, 0.0, 0.0);
            }
            
            right = normalize(cross(up, forward));
            up = normalize(cross(forward, right));
            
            return mat3(right, forward, up);
        }
        
        void main() {
            vec3 direction = a_instanceEnd - a_instanceStart;
            float length = length(direction);
            vec3 forward = direction / length;
            
            mat3 rotationMatrix = createRotationMatrix(forward);
            
            vec3 scaledPosition = aPosition;
            scaledPosition.y *= length;
            
            vec3 rotatedPosition = rotationMatrix * scaledPosition;
            vec3 worldPos = rotatedPosition + a_instanceStart;
            
            vec4 worldPosition = uModelMatrix * vec4(worldPos, 1.0);
            vPosition = worldPosition.xyz;
            vNormal = mat3(uModelMatrix) * (rotationMatrix * aNormal);
            
            gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
        }
    `;
    
    const pipeFragmentShaderSrc = `
        precision mediump float;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        uniform vec3 uLightPos;
        uniform vec3 uViewPos;
        uniform vec3 uColor;
        
        void main() {
            vec3 norm = normalize(vNormal);
            vec3 lightDir = normalize(uLightPos - vPosition);
            vec3 viewDir = normalize(uViewPos - vPosition);
            vec3 reflectDir = reflect(-lightDir, norm);
            
            float ambientStrength = 0.3;
            vec3 ambient = ambientStrength * uColor;
            
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * uColor;
            
            float specularStrength = 0.5;
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
            vec3 specular = specularStrength * spec * vec3(1.0, 1.0, 1.0);
            
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
    const x = cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    const y = cameraDistance * Math.cos(cameraPhi);
    const z = cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    
    return [x, y, z];
}

// Calculate up vector for camera
function calculateUpVector() {
    // Calculate the up vector based on phi and theta
    // This ensures smooth rotation without gimbal lock
    const upX = -Math.cos(cameraPhi) * Math.cos(cameraTheta);
    const upY = Math.sin(cameraPhi);
    const upZ = -Math.cos(cameraPhi) * Math.sin(cameraTheta);
    
    return [upX, upY, upZ];
}

function createLShapedConnections(vertices, edges, vertexTypes, vertexValues) {
    const lShapedEdges = [];
   
    edges.forEach(edge => {
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
            if (vertexValues[edge[0]] < vertexValues[edge[1]]) {
                saddleVertex = startVertex;
                extremumVertex = endVertex;
                saddleValue = vertexValues[edge[0]];
                extremumValue = vertexValues[edge[1]];
            } else {
                saddleVertex = endVertex;
                extremumVertex = startVertex;
                saddleValue = vertexValues[edge[1]];
                extremumValue = vertexValues[edge[0]];
            }
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
        if (saddleValue < extremumValue) {
            // Lower to Higher: Horizontal first, then vertical
            lShapedEdges.push({
                start: saddleVertex,
                end: intermediatePoint,
                type: 'horizontal'
            });
            lShapedEdges.push({
                start: intermediatePoint,
                end: extremumVertex,
                type: 'vertical'
            });
        } else {
            // Higher to Lower: Vertical first, then horizontal
            // Intermediate Point will change
            const verticalIntermediatePoint = [
                saddleVertex[0],      // Keep saddle's X position
                extremumVertex[1],    // Move vertically to extremum's Y position
                saddleVertex[2]       // Keep saddle's Z position
            ];
            
            lShapedEdges.push({
                start: saddleVertex,
                end: verticalIntermediatePoint,
                type: 'vertical'
            });
            lShapedEdges.push({
                start: verticalIntermediatePoint,
                end: extremumVertex,
                type: 'horizontal'
            });
        }
    });
   
    return lShapedEdges;
}

// Updated pipe instance data preparation
function prepareLShapedPipeData(vertices, edges, vertexTypes, vertexValues) {
    const lShapedEdges = createLShapedConnections(vertices, edges, vertexTypes, vertexValues);
    const pipeInstanceData = new Float32Array(lShapedEdges.length * 6);
    
    let offset = 0;
    lShapedEdges.forEach(edge => {
        pipeInstanceData.set(edge.start, offset);
        pipeInstanceData.set(edge.end, offset + 3);
        offset += 6;
    });
    
    return { pipeInstanceData, edgeCount: lShapedEdges.length };
}


function renderGraph() {
    // set black background
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = calculateCameraPosition(); // Calculate camera position
    const up = calculateUpVector(); // Calculate up vector

    mat4.lookAt(viewMatrix, eye, cameraPosition, up);

    // Render spheres
    gl.useProgram(sphereProgram);

    // Set sphere uniforms
    if(sphereUniforms.uProjectionMatrix){
        gl.uniformMatrix4fv(sphereUniforms.uProjectionMatrix, false, projectionMatrix);
    }
    if(sphereUniforms.uModelMatrix){
        gl.uniformMatrix4fv(sphereUniforms.uModelMatrix, false, modelMatrix);
    }
    if(sphereUniforms.uLightPos){
        gl.uniform3fv(sphereUniforms.uLightPos, [lightPosition[0], lightPosition[1], lightPosition[2]]);
    }
    if(sphereUniforms.uViewMatrix){
        gl.uniformMatrix4fv(sphereUniforms.uViewMatrix, false, viewMatrix);
    }
    if(sphereUniforms.uViewPos){
        gl.uniform3fv(sphereUniforms.uViewPos, eye);
    }

    vertArrObjExt.bindVertexArrayOES(sphereVAO); // bind VAO 

    // Draw spheres
    instRenExt.drawElementsInstancedANGLE(
        gl.TRIANGLES,
        sphereIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        sphereVerticesCount
    );

    vertArrObjExt.bindVertexArrayOES(null); // Unbind VAO after drawing

    // Render pipes
    gl.useProgram(pipeProgram);

    // Set pipe uniforms
    if(pipeUniforms.uProjectionMatrix){
        gl.uniformMatrix4fv(pipeUniforms.uProjectionMatrix, false, projectionMatrix);
    }
    if(pipeUniforms.uModelMatrix){
        gl.uniformMatrix4fv(pipeUniforms.uModelMatrix, false, modelMatrix);
    }
    if(pipeUniforms.uLightPos){
        gl.uniform3fv(pipeUniforms.uLightPos, [lightPosition[0], lightPosition[1], lightPosition[2]]);
    }
    if(pipeUniforms.uViewMatrix){
        gl.uniformMatrix4fv(pipeUniforms.uViewMatrix, false, viewMatrix);
    }
    if(pipeUniforms.uViewPos){
        gl.uniform3fv(pipeUniforms.uViewPos, eye);
    }
    if(pipeUniforms.uColor){
        gl.uniform3fv(pipeUniforms.uColor, [pipeColor[0], pipeColor[1], pipeColor[2]]);
    }

    vertArrObjExt.bindVertexArrayOES(pipeVAO);

    // Draw pipes
    instRenExt.drawElementsInstancedANGLE(
        gl.TRIANGLES,
        pipeIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        edgesCount
    );

    vertArrObjExt.bindVertexArrayOES(null);
}

// Updated initializeGraph function with L-shaped connections
function initializeGraph(offData) {
    try {
        // If offData is same as previous offData
        if (offData === prevOffData) {
            console.log("Same graph data is already initialized, skipping parsing part of initialization.");
        }
        else{
            prevOffData = offData; // Update previous OFF data
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
        }

        // Create geometries
        const sphere = createSphere(sphereRadius, sphereLatitudeBands, sphereLongitudeBands);
        const cylinder = createCylinder(pipeRadius, pipeSegments);
        sphereIndexCount = sphere.indices.length;
        pipeIndexCount = cylinder.indices.length;

        
        // Filter out suppressed saddles
        const validVertices = [];
        const validTypes = [];  // Vertex Types now get from OFF data

        vertices.forEach((vertex, i) => {
            if (vertexTypes[i] !== NODE_TYPES.SUPPRESSED_SADDLE) {
                validVertices.push(vertex);
                validTypes.push(vertexTypes[i]);
            }
        });
        
        
        // Prepare sphere instance data with colors
        const sphereInstanceData = new Float32Array(validVertices.length * 6);
        let offsetSphere = 0;
        
        validVertices.forEach((vertex, i) => {
            // Position
            sphereInstanceData[offsetSphere] = vertex[0];
            sphereInstanceData[offsetSphere + 1] = vertex[1];
            sphereInstanceData[offsetSphere + 2] = vertex[2];

            const color = NODE_COLORS[validTypes[i]];
            sphereInstanceData[offsetSphere + 3] = color[0];
            sphereInstanceData[offsetSphere + 4] = color[1];
            sphereInstanceData[offsetSphere + 5] = color[2];
            
            // // Color based on function value from vibgyor (map values in colorful format so that visible by eye)
            // const functionValue = vertexValues[i];
            // const color = [
            //     (functionValue + 1) / 2, // Normalize to [0, 1] range
            //     0, // Normalize to [0, 1] range
            //     1  // Normalize to [0, 1] range
            // ];
            // sphereInstanceData[offsetSphere + 3] = color[0];
            // sphereInstanceData[offsetSphere + 4] = color[1];
            // sphereInstanceData[offsetSphere + 5] = color[2];

            offsetSphere += 6;
        });

        sphereVerticesCount = validVertices.length;

        // Create L-shaped pipe connections
        const pipeData = prepareLShapedPipeData(vertices, edges, vertexTypes, vertexValues);
        const pipeInstanceData = pipeData.pipeInstanceData;
        edgesCount = pipeData.edgeCount;

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
                uViewPos: gl.getUniformLocation(sphereProgram, "uViewPos")
            };

            gl.useProgram(pipeProgram);
            pipeUniforms = {
                uProjectionMatrix: gl.getUniformLocation(pipeProgram, "uProjectionMatrix"),
                uViewMatrix: gl.getUniformLocation(pipeProgram, "uViewMatrix"),
                uModelMatrix: gl.getUniformLocation(pipeProgram, "uModelMatrix"),
                uLightPos: gl.getUniformLocation(pipeProgram, "uLightPos"),
                uViewPos: gl.getUniformLocation(pipeProgram, "uViewPos"),
                uColor: gl.getUniformLocation(pipeProgram, "uColor"),
            };
        }

        // Set up attribute locations
        const spherePositionLocation = gl.getAttribLocation(sphereProgram, "aPosition");
        const sphereNormalLocation = gl.getAttribLocation(sphereProgram, "aNormal");
        const sphereInstancePositionLocation = gl.getAttribLocation(sphereProgram, "a_instancePosition");
        const sphereInstanceColorLocation = gl.getAttribLocation(sphereProgram, "a_instanceColor");

        const pipePositionLocation = gl.getAttribLocation(pipeProgram, "aPosition");
        const pipeNormalLocation = gl.getAttribLocation(pipeProgram, "aNormal");
        const pipeInstanceStartLocation = gl.getAttribLocation(pipeProgram, "a_instanceStart");
        const pipeInstanceEndLocation = gl.getAttribLocation(pipeProgram, "a_instanceEnd");

        // Clean up old VAOs if they exist
        if (sphereVAO) vertArrObjExt.deleteVertexArrayOES(sphereVAO);
        if (pipeVAO) vertArrObjExt.deleteVertexArrayOES(pipeVAO);

        // Set up sphere VAO
        sphereVAO = vertArrObjExt.createVertexArrayOES();
        vertArrObjExt.bindVertexArrayOES(sphereVAO);

        // Sphere buffers
        const spherePositionBuffer = gl.createBuffer();
        const sphereNormalBuffer = gl.createBuffer();
        const sphereInstanceBuffer = gl.createBuffer();
        const sphereIndexBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, spherePositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(spherePositionLocation);
        gl.vertexAttribPointer(spherePositionLocation, 3, gl.FLOAT, false, 0, 0);
        instRenExt.vertexAttribDivisorANGLE(spherePositionLocation, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(sphereNormalLocation);
        gl.vertexAttribPointer(sphereNormalLocation, 3, gl.FLOAT, false, 0, 0);
        instRenExt.vertexAttribDivisorANGLE(sphereNormalLocation, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sphereInstanceData, gl.STATIC_DRAW);

        // Position attribute (first 3 floats of each instance)
        gl.enableVertexAttribArray(sphereInstancePositionLocation);
        gl.vertexAttribPointer(sphereInstancePositionLocation, 3, gl.FLOAT, false, 24, 0);
        instRenExt.vertexAttribDivisorANGLE(sphereInstancePositionLocation, 1);
        
        // Color attribute (next 3 floats of each instance)
        gl.enableVertexAttribArray(sphereInstanceColorLocation);
        gl.vertexAttribPointer(sphereInstanceColorLocation, 3, gl.FLOAT, false, 24, 12);
        instRenExt.vertexAttribDivisorANGLE(sphereInstanceColorLocation, 1);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

        vertArrObjExt.bindVertexArrayOES(null);

        // Set up pipe VAO
        pipeVAO = vertArrObjExt.createVertexArrayOES();
        vertArrObjExt.bindVertexArrayOES(pipeVAO);

        const pipePositionBuffer = gl.createBuffer();
        const pipeNormalBuffer = gl.createBuffer();
        const pipeInstanceBuffer = gl.createBuffer();
        const pipeIndexBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, pipePositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cylinder.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(pipePositionLocation);
        gl.vertexAttribPointer(pipePositionLocation, 3, gl.FLOAT, false, 0, 0);
        instRenExt.vertexAttribDivisorANGLE(pipePositionLocation, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, pipeNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cylinder.normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(pipeNormalLocation);
        gl.vertexAttribPointer(pipeNormalLocation, 3, gl.FLOAT, false, 0, 0);
        instRenExt.vertexAttribDivisorANGLE(pipeNormalLocation, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, pipeInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, pipeInstanceData, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(pipeInstanceStartLocation);
        gl.vertexAttribPointer(pipeInstanceStartLocation, 3, gl.FLOAT, false, 24, 0);
        instRenExt.vertexAttribDivisorANGLE(pipeInstanceStartLocation, 1);

        gl.enableVertexAttribArray(pipeInstanceEndLocation);
        gl.vertexAttribPointer(pipeInstanceEndLocation, 3, gl.FLOAT, false, 24, 12);
        instRenExt.vertexAttribDivisorANGLE(pipeInstanceEndLocation, 1);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pipeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cylinder.indices, gl.STATIC_DRAW);

        vertArrObjExt.bindVertexArrayOES(null);

        renderGraph();

    } catch (error) {
        if(offData !== ""){
            showStatus(`Error loading graph: ${error.message}`, 'error');
            console.error("Graph initialization error:", error);
        }
    }
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
        
        // Rotate the model matrix instead of camera
        mat4.rotateY(modelMatrix, modelMatrix, deltaX * 0.01);
        
        lastMouseX = e.clientX;
        
        renderGraph();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance += e.deltaY * 0.01;
    // cameraDistance = Math.max(0, Math.min(50, cameraDistance));
    // Add a button instead later than resets the cameraDistance
    renderGraph();
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    renderGraph();
});

// change the value of cameraPosition's X when using W and S
window.addEventListener('keydown', (e) => {
    switch (e.key) {
        // ad for left right
        // ws for front back
        // rf for up down
        case 'd': //d
        cameraPosition[2] += 0.01;
        break;
        case 's': //s
        cameraPosition[0] -= 0.01;
        break;
        case 'a': //a
        cameraPosition[2] -= 0.01;
        break;
        case 'w': //w
        cameraPosition[0] += 0.01;
        break;

        // use t and g to change cameraPhi
        case 't':
        cameraPhi += 0.01;
        break;
        case 'g':
        cameraPhi -= 0.01;
        break;
    }

    if (cameraPhi < 0){
        cameraPhi = 0;
    }
    if (cameraPhi > Math.PI){
        cameraPhi = Math.PI;
    }
    renderGraph();
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