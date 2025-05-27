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

// Global variables
let offData = ""; // Variable to store the OFF file data


// Camera controls
//Initial camera angles in spherical coordinates
let cameraPhi = Math.PI / 4;    // Polar angle (0 to PI)
let cameraTheta = 0;            // Azimuthal angle (0 to 2*PI)
// set camera distance (initial)
let cameraDistance = 25;
// flag and data for storing mouse state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Sphere and Pipe radius and segments
// get radius of the sphere from the user using the slider

let sphereRadius = 0.2; // Default radius of the spheres
let pipeRadius = 0.1; // Default radius of the pipes


const sphereLatitudeBands = 16; // Number of latitude bands for sphere
const sphereLongitudeBands = 16; // Number of longitude bands for sphere
const pipeSegments = 12; // Number of segments for the pipe (cylinder)

const sphereColor = [0.8, 0.3, 0.3]; // Color of the spheres
const pipeColor = [0.3, 0.7, 0.9]; // Color of the pipes

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
    MAXIMUM: 2
};

// Colors for each type
const NODE_COLORS = {
    [NODE_TYPES.MINIMUM]: [0.0, 0.4, 1.0],   // Blue
    [NODE_TYPES.SADDLE]: [0.0, 1.0, 1.0],    // Cyan
    [NODE_TYPES.MAXIMUM]: [1.0, 0.0, 0.0]    // Red
};

let vertices, edges, graphCenter;
let sphereVAO, pipeVAO;
let sphereProgram, pipeProgram;
let sphereUniforms, pipeUniforms;
let verticesCount, edgesCount;
let sphereIndexCount, pipeIndexCount;
let projectionMatrix, viewMatrix, modelMatrix;

// Parse OFF data
function parseOFFData(data) {
    const lines = data.trim().split('\n').map(line => line.trim()); //find newline character and thus break the whole thing into lines
    
    // omitt line number 1 (OFF Header)
    let currentLine = 1;
    
    //for the next line use whitespace as the break
    const counts = lines[currentLine].split(/\s+/).map(Number);
    // get data of vertices and faces
    const numVertices = counts[0];
    const numFaces = counts[1];
    currentLine++;
    
    // vertices parsing and storing
    const vertices = [];
    for (let i = 0; i < numVertices; i++) {
        const vertex = lines[currentLine].split(/\s+/).map(Number);
        vertices.push(vertex);
        currentLine++;
    }

    // edges parsing and storing
    const edges = [];
    for (let i = 0; i < numFaces; i++) {
        const face = lines[currentLine].split(/\s+/).map(Number);
        
        // for now we are handling only the case where it starts with value 2 (normal edge - no close loops)
        if (face[0] === 2) {
            edges.push([face[1], face[2]]); // get which nodes are connected with which
        }
        currentLine++;
    }
    
    return { vertices, edges };
    // return the vertices and edges data
}


function analyzeNodePoints(vertices, edges) {
    const n = vertices.length; // get number of vertices
    const adjacencyList = Array(n).fill(null).map(() => []); // create a array of n empty arrays for adjacency list
    const vertexTypes = new Array(n); // create an array to store types of each vertex (will be filled in the loop and then returned)

    // Build adjacency list
    edges.forEach(([u, v]) => {
        adjacencyList[u].push(v);
        adjacencyList[v].push(u);
    }); // for each edge, add the vertices to each other's adjacency list

    // Analyze each vertex
    for (let i = 0; i < n; i++) {
        const currentHeight = vertices[i][1]; // Y-coordinate as height
        const neighbors = adjacencyList[i];
        
        if (neighbors.length === 0) {
            vertexTypes[i] = NODE_TYPES.SADDLE; // Isolated vertex
            continue;
        }
        
        let higherNeighbors = 0;
        let lowerNeighbors = 0;
        let equalNeighbors = 0;
        
        neighbors.forEach(neighborIdx => {
            const neighborHeight = vertices[neighborIdx][1]; //neighborIdx is the index of the neighbor vertex, so we can get its height using vertices[neighborIdx][1]
            if (neighborHeight > currentHeight) {
                higherNeighbors++;
            } else if (neighborHeight < currentHeight) {
                lowerNeighbors++;
            } else {
                equalNeighbors++;
            }
        });
        
        // Classify based on neighbor heights
        if (lowerNeighbors === 0 && higherNeighbors > 0) {
            // All neighbors are higher -> minimum
            vertexTypes[i] = NODE_TYPES.MINIMUM;
        } else if (higherNeighbors === 0 && lowerNeighbors > 0) {
            // All neighbors are lower -> maximum
            vertexTypes[i] = NODE_TYPES.MAXIMUM;
        } else if (higherNeighbors > 0 && lowerNeighbors > 0) {
            // Mixed neighbors -> saddle point
            vertexTypes[i] = NODE_TYPES.SADDLE;
        } else {
            // Default case (including equal heights)
            vertexTypes[i] = NODE_TYPES.SADDLE;
        }
    }

    return { vertexTypes, adjacencyList };
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
    const x = graphCenter[0] + cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    const y = graphCenter[1] + cameraDistance * Math.cos(cameraPhi);
    const z = graphCenter[2] + cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    
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

function renderGraph() {
    // set black background
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = calculateCameraPosition(); // Calculate camera position
    const up = calculateUpVector(); // Calculate up vector

    mat4.lookAt(viewMatrix, eye, graphCenter, up);

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
        verticesCount
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

function initializeGraph(offData) {
    try {
        // Parse the OFF data
        const parsedData = parseOFFData(offData);
        vertices = parsedData.vertices;
        edges = parsedData.edges;

        // Analyze Node points
        const analysis = analyzeNodePoints(vertices, edges);
        vertexTypes = analysis.vertexTypes;
        adjacencyList = analysis.adjacencyList;

        // Calculate graph center
        const minX = Math.min(...vertices.map(v => v[0]));
        const maxX = Math.max(...vertices.map(v => v[0]));
        const minY = Math.min(...vertices.map(v => v[1]));
        const maxY = Math.max(...vertices.map(v => v[1]));
        const minZ = Math.min(...vertices.map(v => v[2]));
        const maxZ = Math.max(...vertices.map(v => v[2]));
            
        graphCenter = [
            (minX + maxX) / 2,
            (minY + maxY) / 2,
            (minZ + maxZ) / 2
        ];

        // Update counts
        verticesCount = vertices.length;
        edgesCount = edges.length;

        // Create geometries
        const sphere = createSphere(sphereRadius, sphereLatitudeBands, sphereLongitudeBands);
        const cylinder = createCylinder(pipeRadius, pipeSegments);

        sphereIndexCount = sphere.indices.length;
        pipeIndexCount = cylinder.indices.length;

        // Prepare instance data
        // Prepare instance data with colors
        const sphereInstanceData = new Float32Array(vertices.length * 6); // 3 for position, 3 for color
        let offsetSphere = 0;
        vertices.forEach((vertex, i) => {
            // Position
            sphereInstanceData[offsetSphere] = vertex[0];
            sphereInstanceData[offsetSphere + 1] = vertex[1];
            sphereInstanceData[offsetSphere + 2] = vertex[2];
            
            // Color based on node point type
            const color = NODE_COLORS[vertexTypes[i]];
            sphereInstanceData[offsetSphere + 3] = color[0];
            sphereInstanceData[offsetSphere + 4] = color[1];
            sphereInstanceData[offsetSphere + 5] = color[2];
            
            offsetSphere += 6;
        });


        // More efficient - build Float32Array directly
        const pipeInstanceData = new Float32Array(edges.length * 6); // 6 floats per edge (2 vertices × 3 coordinates)
        let offsetPipeVertices = 0;
        edges.forEach(edge => {
            const startVertex = vertices[edge[0]];
            const endVertex = vertices[edge[1]];
            pipeInstanceData.set(startVertex, offsetPipeVertices);
            pipeInstanceData.set(endVertex, offsetPipeVertices + 3);
            offsetPipeVertices += 6;
        });

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

        // Reset camera distance based on graph size
        const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
        cameraDistance = Math.max(15, maxDim * 1.5);

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
            ${edgesCount} edges | Minima: ${counts[NODE_TYPES.MINIMUM]}, 
            Saddles: ${counts[NODE_TYPES.SADDLE]}, Maxima: ${counts[NODE_TYPES.MAXIMUM]}`, 
            'success'
        );
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

// Initialize matrices
projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

viewMatrix = mat4.create();
modelMatrix = mat4.create();
mat4.identity(modelMatrix);

// Enable depth testing 
gl.enable(gl.DEPTH_TEST);

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
        
        // Update theta (azimuthal angle) for horizontal movement
        cameraTheta -= deltaX * 0.01;
        
        // Update phi (polar angle) for vertical movement
        cameraPhi += deltaY * 0.01;
        
        // Clamp phi to avoid flipping (small epsilon to prevent singularities)
        const epsilon = 0.01;
        cameraPhi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraPhi));
        
        // Normalize theta to keep it in [0, 2*PI]
        cameraTheta = cameraTheta % (2 * Math.PI);
        if (cameraTheta < 0) cameraTheta += 2 * Math.PI;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        renderGraph();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance += e.deltaY * 0.01;
    cameraDistance = Math.max(5, Math.min(50, cameraDistance));
    renderGraph();
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    renderGraph();
});

window.onload = () => {
    showStatus('Please select a .off file', 'error');
}