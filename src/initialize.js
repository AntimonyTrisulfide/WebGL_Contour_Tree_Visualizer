// src/initialize.js

let sphereProgram, pipeProgram;
let sphereUniforms, pipeUniforms;
let verticesCount, edgesCount;

// Function to clean up WebGL resources
function cleanupWebGLResources() {
    console.log('🧹 Cleaning up WebGL resources...');
    
    if (gl) {
        // Delete VAOs
        if (window.sphereVAO) {
            gl.deleteVertexArray(window.sphereVAO);
            window.sphereVAO = null;
        }
        if (window.pipeVAO) {
            gl.deleteVertexArray(window.pipeVAO);
            window.pipeVAO = null;
        }
        
        // Delete buffers
        if (window.instanceBuffer) {
            gl.deleteBuffer(window.instanceBuffer);
            window.instanceBuffer = null;
        }
        if (window.pipeInstanceBuffer) {
            gl.deleteBuffer(window.pipeInstanceBuffer);
            window.pipeInstanceBuffer = null;
        }
        
        // Delete shader programs
        if (sphereProgram) {
            gl.deleteProgram(sphereProgram);
            sphereProgram = null;
        }
        if (pipeProgram) {
            gl.deleteProgram(pipeProgram);
            pipeProgram = null;
        }
    }
    
    // Clear uniforms
    sphereUniforms = null;
    pipeUniforms = null;
    
    console.log('✅ WebGL resources cleaned up');
}

// Function to force complete reinitialization
function forceCompleteReinitialization() {
    console.log('🔄 Forcing complete reinitialization...');
    
    // Clean up WebGL resources
    cleanupWebGLResources();
    
    // Clear cached data
    if (typeof window.cachedPipeInstanceData !== 'undefined') {
        window.cachedPipeInstanceData = null;
    }
    if (typeof window.edgeToInstanceMapping !== 'undefined') {
        window.edgeToInstanceMapping = new Map();
    }
    if (typeof window.lShapedEdgesCache !== 'undefined') {
        window.lShapedEdgesCache = null;
    }
    if (typeof window.previousSelectedEdge !== 'undefined') {
        window.previousSelectedEdge = -1;
    }
    
    // Reset camera
    if (typeof resetCameraInitialization === 'function') {
        resetCameraInitialization();
    }
    
    // Clear selections
    window.selectedEdges = [];
    window.edgeId = [];
    
    // Clear previous data tracking (parser-independent)
    window.prevSpacing = undefined;
    
    console.log('✅ Complete reinitialization done');
}

// gl.enable(gl.DEPTH_TEST);
// gl.depthFunc(gl.LEQUAL); // Already default, but explicitly set for clarity


// Load shader source asynchronously using fetch
async function loadShaderSource(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader source from ${url}: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Compile and link shaders into a program
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

// Create both shader programs asynchronously
async function createShaderProgram() {
    const [
        sphereVertexShaderSrc,
        sphereFragmentShaderSrc,
        pipeVertexShaderSrc,
        pipeFragmentShaderSrc
    ] = await Promise.all([
        loadShaderSource('../resources/sphereShader.vert'),
        loadShaderSource('../resources/sphereShader.frag'),
        loadShaderSource('../resources/pipeShader.vert'),
        loadShaderSource('../resources/pipeShader.frag')
    ]);

    if (!sphereVertexShaderSrc || !sphereFragmentShaderSrc ||
        !pipeVertexShaderSrc || !pipeFragmentShaderSrc) {
        console.error("One or more shader sources failed to load.");
        return null;
    }

    const sphereProgram = createProgram(sphereVertexShaderSrc, sphereFragmentShaderSrc);
    if (!sphereProgram) {
        console.error("Sphere shader program creation failed.");
        return null;
    }

    const pipeProgram = createProgram(pipeVertexShaderSrc, pipeFragmentShaderSrc);
    if (!pipeProgram) {
        console.error("Pipe shader program creation failed.");
        return null;
    }

    return { sphereProgram, pipeProgram };
}

function getUniformLocations(program) {
    // Get uniform locations for the given program instead of multiple times with the intialization
}

function getAttributeLocations(sphereProgram, pipeProgram) {
    const posLoc = gl.getAttribLocation(sphereProgram, "aPosition");
    const texLoc = gl.getAttribLocation(sphereProgram, "aTexCoord");
    const instPosLoc = gl.getAttribLocation(sphereProgram, "a_instancePosition");
    const instSizeLoc = gl.getAttribLocation(sphereProgram, "a_instanceSize");
    const instColorLoc = gl.getAttribLocation(sphereProgram, "a_instanceColor");    const pipePosLoc = gl.getAttribLocation(pipeProgram, "aPosition");
    const pipeInstSizeLoc = gl.getAttribLocation(pipeProgram, "a_instanceRadius");
    const pipeInstStartVertex = gl.getAttribLocation(pipeProgram, "a_instanceStart");
    const pipeInstEndVertex = gl.getAttribLocation(pipeProgram, "a_instanceEnd");
    const pipeInstColorLoc = gl.getAttribLocation(pipeProgram, "a_instanceColor");
    const pipeJointPointLoc = gl.getAttribLocation(pipeProgram, "a_jointPoint");
    const pipeCutNormalLoc = gl.getAttribLocation(pipeProgram, "a_cutPlaneNormal");
    const pipeJointTypeLoc = gl.getAttribLocation(pipeProgram, "a_jointType");
    const pipePrevCylEndLoc = gl.getAttribLocation(pipeProgram, "a_prevCylEnd");
    const pipeNextCylStartLoc = gl.getAttribLocation(pipeProgram, "a_nextCylStart");
    
    return {
        sphere: {
            posLoc,
            texLoc,
            instPosLoc,
            instSizeLoc,
            instColorLoc
        },        pipe: {
            pipePosLoc,
            pipeInstSizeLoc,
            pipeInstStartVertex,
            pipeInstEndVertex,
            instColorLoc: pipeInstColorLoc,
            pipeJointPointLoc,
            pipeCutNormalLoc,
            pipeJointTypeLoc
        }
    };
}

// Updated initializeGraph function with L-shaped connections
async function initializeGraph() {

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // In initializeGraph function, add this at the beginning:
    intermediatePoints = []; // Clear previous intermediate points

    // Clear pipe cache when loading new graph data
    if (typeof clearPipeCache !== 'undefined') {
        clearPipeCache();
    }
    
    // Clear previous state when loading new data
    validVertices = [];
    validTypes = [];
    intermediatePoints = [];
    if (typeof window.selectedEdges !== 'undefined') {
        window.selectedEdges = [];
    }

    // Check if we need to force reinitialization due to different data
    const currentDataHash = JSON.stringify(window.treeData);
    const shouldForceReinit = window.lastDataHash && window.lastDataHash !== currentDataHash;

    if (shouldForceReinit) {
        console.log("Different data detected, forcing complete reinitialization...");
        forceCompleteReinitialization();
    }

    // Store current data hash for comparison
    window.lastDataHash = currentDataHash;
    // Only update radius-dependent data, not recreate everything
    // Use data from the visualizer API (parser-independent)
    if (window.treeData) {
        console.log("Using tree data from API (parser-independent)");
        // Apply universal spacing logic
        let processedTreeData = window.treeData;
        if (typeof window.applySpacingToTreeData === 'function') {
            processedTreeData = window.applySpacingToTreeData(window.treeData, window.applySpacing);
        } else if (typeof window.applySpacing !== 'undefined' && window.applySpacing === true && typeof applyNodeSpacing === 'function') {
            // Fallback to direct spacing application
            console.log("[INFO] Applying node spacing to API data (fallback)");
            let spacedVertices = applyNodeSpacing(window.treeData.vertices, sphereRadius, window.treeData.vertexValues, window.treeData.vertexTypes);
            processedTreeData = { ...window.treeData, vertices: spacedVertices };
        }
        vertices = processedTreeData.vertices;
        edges = processedTreeData.edges;
        vertexTypes = processedTreeData.vertexTypes;
        vertexValues = processedTreeData.vertexValues;
        // Initialize validVertices and validTypes
        validVertices = [...vertices];
        validTypes = [...vertexTypes];
    } else {
        throw new Error("No tree data available from API");
    }
    // ...existing code...

    // Initialize camera with proper bounding box calculation
    if (typeof initializeCamera === 'function') {
        initializeCamera(vertices);
    } else {
        // Fallback: manual camera distance calculation
        const minX = Math.min(...vertices.map(v => v[0]));
        const maxX = Math.max(...vertices.map(v => v[0]));
        const minY = Math.min(...vertices.map(v => v[1]));
        const maxY = Math.max(...vertices.map(v => v[1]));
        const minZ = Math.min(...vertices.map(v => v[2]));
        const maxZ = Math.max(...vertices.map(v => v[2]));

        const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
        cameraDistance = Math.max(15, maxDim * 1.5);
    }

    // Update Count
    verticesCount = vertices.length;

    // // replace the vertices y coordiante with function value
    // vertices = vertices.map((vertex, i) => {
    //     return [vertex[0], vertexValues[i], vertex[2]]; // Use function value as Y coordinate
    // })

    // Create geometries
    const sphere = createSphereQuad(); // Create billboard quad for spheres
    const cuboid = createCuboidGeometry(); // Use cuboid geometry for pipes
    sphereIndexCount = sphere.indices.length;
    pipeIndexCount = cuboid.indices.length;
    let instanceObjects = updateInstanceData(); // Create this new function

    if (!instanceObjects || !instanceObjects.instanceData || !instanceObjects.pipeInstanceData) {
        throw new Error("Failed to create instance data");
    }

    let instanceData = instanceObjects.instanceData; // Sphere instance data
    let pipeInstanceData = instanceObjects.pipeInstanceData; // Pipe instance data
    edgesCount = instanceObjects.edgeCount; // Number of edges for pipes

    console.log(`[DEBUG] Instance data created: ${instanceData.length / 7} spheres, ${pipeInstanceData.length / 17} pipe segments`);

    // Count different status type points
    const counts = {
        [NODE_TYPES.MINIMUM]: 0,
        [NODE_TYPES.SADDLE]: 0,
        [NODE_TYPES.MAXIMUM]: 0
    };

    vertexTypes.forEach(type => {
        counts[type]++;
    });

    console.log(`[SUCCESS] Loaded graph: ${verticesCount} vertices, \
        ${edgesCount} L-shaped edges | Minima: ${counts[NODE_TYPES.MINIMUM]}, \
        Saddles: ${counts[NODE_TYPES.SADDLE]}, Maxima: ${counts[NODE_TYPES.MAXIMUM]}`
    );

    // Set up shaders and uniforms if not already done
    if (!sphereProgram) {
        const shaders = await createShaderProgram();
        sphereProgram = shaders.sphereProgram;
        pipeProgram = shaders.pipeProgram;

        // Set up uniforms
        gl.useProgram(sphereProgram);
        sphereUniforms = {
            uProjectionMatrix: gl.getUniformLocation(sphereProgram, "uProjectionMatrix"),
            uViewMatrix: gl.getUniformLocation(sphereProgram, "uViewMatrix"),
            uModelMatrix: gl.getUniformLocation(sphereProgram, "uModelMatrix"),
            uCameraPosLocation: gl.getUniformLocation(sphereProgram, "uCameraPos"),
            uColorLocation: gl.getUniformLocation(sphereProgram, "uColor"),
            uInvViewMatrix: gl.getUniformLocation(sphereProgram, "uInvViewMatrix"),
            uLightDir: gl.getUniformLocation(sphereProgram, "uLightDir"),
            uLightColor: gl.getUniformLocation(sphereProgram, "uLightColor")
        };
        gl.useProgram(pipeProgram);
        pipeUniforms = {
            uProjectionMatrix: gl.getUniformLocation(pipeProgram, "uProjectionMatrix"),
            uViewMatrix: gl.getUniformLocation(pipeProgram, "uViewMatrix"),
            uModelMatrix: gl.getUniformLocation(pipeProgram, "uModelMatrix"),
            uCameraPos: gl.getUniformLocation(pipeProgram, "uCameraPos"),
            uInvViewMatrix: gl.getUniformLocation(pipeProgram, "uInvViewMatrix"),
            uLightDir: gl.getUniformLocation(pipeProgram, "uLightDir"),
            uLightColor: gl.getUniformLocation(pipeProgram, "uLightColor")
        };
    }

    let attributes = null;
    // Get attribute locations
    if (!attributes) {
        attributes = getAttributeLocations(sphereProgram, pipeProgram);
    } else {
        // If attributes are already set, we can skip this step
        console.log("Using existing attribute locations.");
    }

    // Clean up old VAOs and buffers if they exist
    if (sphereVAO) {
        gl.deleteVertexArray(sphereVAO);
        sphereVAO = null;
    }
    if (pipeVAO) {
        gl.deleteVertexArray(pipeVAO);
        pipeVAO = null;
    }
    if (instanceBuffer) {
        gl.deleteBuffer(instanceBuffer);
        instanceBuffer = null;
    }
    if (pipeInstanceBuffer) {
        gl.deleteBuffer(pipeInstanceBuffer);
        pipeInstanceBuffer = null;
    }

    sphereVAO = gl.createVertexArray();
    gl.bindVertexArray(sphereVAO);

    const spherePositionBuffer = gl.createBuffer();
    const sphereTexCoordBuffer = gl.createBuffer();
    instanceBuffer = gl.createBuffer();
    const sphereIndexBuffer = gl.createBuffer();

    // Position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, spherePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attributes.sphere.posLoc);
    gl.vertexAttribPointer(attributes.sphere.posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(attributes.sphere.posLoc, 0);

    // Texture coordinates buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attributes.sphere.texLoc);
    gl.vertexAttribPointer(attributes.sphere.texLoc, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(attributes.sphere.texLoc, 0);        // Instance buffer (position + size)
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

    // Instance position attribute
    gl.enableVertexAttribArray(attributes.sphere.instPosLoc);
    gl.vertexAttribPointer(attributes.sphere.instPosLoc, 3, gl.FLOAT, false, 28, 0);
    gl.vertexAttribDivisor(attributes.sphere.instPosLoc, 1);

    // Instance size attribute
    gl.enableVertexAttribArray(attributes.sphere.instSizeLoc);
    gl.vertexAttribPointer(attributes.sphere.instSizeLoc, 1, gl.FLOAT, false, 28, 12);
    gl.vertexAttribDivisor(attributes.sphere.instSizeLoc, 1);

    // Instance color attribute
    gl.enableVertexAttribArray(attributes.sphere.instColorLoc);
    gl.vertexAttribPointer(attributes.sphere.instColorLoc, 3, gl.FLOAT, false, 28, 16);
    gl.vertexAttribDivisor(attributes.sphere.instColorLoc, 1);

    // Index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    // Set up pipe VAO (already cleaned up above)
    pipeVAO = gl.createVertexArray();
    gl.bindVertexArray(pipeVAO);

    const pipePositionBuffer = gl.createBuffer();
    pipeInstanceBuffer = gl.createBuffer(); // Use global variable
    const pipeIndexBuffer = gl.createBuffer();

    // Position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, pipePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cuboid.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attributes.pipe.pipePosLoc);
    gl.vertexAttribPointer(attributes.pipe.pipePosLoc, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(attributes.pipe.pipePosLoc, 0);

    // Instance buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, pipeInstanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pipeInstanceData, gl.STATIC_DRAW);

    // Instance start position
    gl.enableVertexAttribArray(attributes.pipe.pipeInstStartVertex);
    gl.vertexAttribPointer(attributes.pipe.pipeInstStartVertex, 3, gl.FLOAT, false, 68, 0);
    gl.vertexAttribDivisor(attributes.pipe.pipeInstStartVertex, 1);

    // Instance end position
    gl.enableVertexAttribArray(attributes.pipe.pipeInstEndVertex);
    gl.vertexAttribPointer(attributes.pipe.pipeInstEndVertex, 3, gl.FLOAT, false, 68, 12);
    gl.vertexAttribDivisor(attributes.pipe.pipeInstEndVertex, 1);

    // Instance radius
    gl.enableVertexAttribArray(attributes.pipe.pipeInstSizeLoc);
    gl.vertexAttribPointer(attributes.pipe.pipeInstSizeLoc, 1, gl.FLOAT, false, 68, 24);
    gl.vertexAttribDivisor(attributes.pipe.pipeInstSizeLoc, 1);

    // Instance color
    gl.enableVertexAttribArray(attributes.pipe.instColorLoc);
    gl.vertexAttribPointer(attributes.pipe.instColorLoc, 3, gl.FLOAT, false, 68, 28);
    gl.vertexAttribDivisor(attributes.pipe.instColorLoc, 1);

    // Joint point (L-joint cutting)
    gl.enableVertexAttribArray(attributes.pipe.pipeJointPointLoc);
    gl.vertexAttribPointer(attributes.pipe.pipeJointPointLoc, 3, gl.FLOAT, false, 68, 40);
    gl.vertexAttribDivisor(attributes.pipe.pipeJointPointLoc, 1);

    // Cut plane normal (L-joint cutting)
    gl.enableVertexAttribArray(attributes.pipe.pipeCutNormalLoc);
    gl.vertexAttribPointer(attributes.pipe.pipeCutNormalLoc, 3, gl.FLOAT, false, 68, 52);
    gl.vertexAttribDivisor(attributes.pipe.pipeCutNormalLoc, 1);

    // Joint type (L-joint cutting)
    gl.enableVertexAttribArray(attributes.pipe.pipeJointTypeLoc);
    gl.vertexAttribPointer(attributes.pipe.pipeJointTypeLoc, 1, gl.FLOAT, false, 68, 64);
    gl.vertexAttribDivisor(attributes.pipe.pipeJointTypeLoc, 1);

    // Index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pipeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cuboid.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    // Initialize mouse picking system
    if (typeof initializeMousePicking !== 'undefined') {
        initializeMousePicking();
        // Update picking data after graph is loaded
        if (typeof updatePickingData !== 'undefined') {
            updatePickingData();
        }
    }

    // Update viewport to ensure proper rendering
    if (typeof updateViewport === 'function') {
        updateViewport();
    }

    // debugUniforms(); // Call the debugging function to check uniform locations

    renderGraphWithFPS();
}

// Ported Logic for Data

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

function createLShapedConnections(vertices, edges, vertexTypes, vertexValues) {
    const lShapedEdges = [];
    intermediatePoints = []; // Clear previous intermediate points

    const EPSILON = 1e-6; // Small threshold for floating-point comparisons

    edges.forEach((edge, originalEdgeIndex) => {
        const startVertex = vertices[edge[0]];
        const endVertex = vertices[edge[1]];
        const startType = vertexTypes[edge[0]];
        const endType = vertexTypes[edge[1]];
        const startValue = vertexValues[edge[0]];
        const endValue = vertexValues[edge[1]];

        // Check if the connection is purely horizontal or vertical
        const isHorizontal = Math.abs(startVertex[1] - endVertex[1]) < EPSILON;
        const isVertical = Math.abs(startVertex[0] - endVertex[0]) < EPSILON && Math.abs(startVertex[2] - endVertex[2]) < EPSILON;

        if (isHorizontal || isVertical) {
            // Straight connection: add a single segment from vertex center to vertex center
            lShapedEdges.push({
                start: startVertex,
                end: endVertex,
                type: isHorizontal ? 'horizontal' : 'vertical',
                originalEdgeIndex: originalEdgeIndex + 1 // Store 1-based original edge index
            });
            return; // Skip L-shaped processing for this edge
        }

        // Determine which vertex is the saddle and which is the extremum
        let saddleVertex, extremumVertex, saddleValue, extremumValue;

        if (startType === NODE_TYPES.SADDLE && (endType === NODE_TYPES.MAXIMUM || endType === NODE_TYPES.MINIMUM)) {
            saddleVertex = startVertex;
            extremumVertex = endVertex;
            saddleValue = startValue;
            extremumValue = endValue;
        } else if (endType === NODE_TYPES.SADDLE && (startType === NODE_TYPES.MAXIMUM || startType === NODE_TYPES.MINIMUM)) {
            saddleVertex = endVertex;
            extremumVertex = startVertex;
            saddleValue = endValue;
            extremumValue = startValue;
        } else if (startType === NODE_TYPES.SADDLE && endType === NODE_TYPES.SADDLE) {
            // Both are saddles, choose based on distance from the main trunk (z=0, x=0)
            const startDistance = Math.sqrt(startVertex[0] * startVertex[0] + startVertex[2] * startVertex[2]);
            const endDistance = Math.sqrt(endVertex[0] * endVertex[0] + endVertex[2] * endVertex[2]);

            if (startDistance < endDistance) {
                saddleVertex = startVertex;
                extremumVertex = endVertex;
                saddleValue = startValue;
                extremumValue = endValue;
            } else {
                saddleVertex = endVertex;
                extremumVertex = startVertex;
                saddleValue = endValue;
                extremumValue = startValue;
            }
        } else {
            // Default case: treat as saddle-to-extremum with start as saddle
            saddleVertex = startVertex;
            extremumVertex = endVertex;
            saddleValue = startValue;
            extremumValue = endValue;
        }

        // Create L-shaped connection based on node types and their relationships
        let connectionPattern = '';
        
        if (startType === NODE_TYPES.SADDLE && endType === NODE_TYPES.MAXIMUM) {
            // Saddle to Max: horizontal then vertically up
            connectionPattern = 'horizontal-then-vertical-up';
        } else if (startType === NODE_TYPES.MAXIMUM && endType === NODE_TYPES.SADDLE) {
            // Max to Saddle: vertically down then horizontal
            connectionPattern = 'vertical-down-then-horizontal';
        } else if (startType === NODE_TYPES.SADDLE && endType === NODE_TYPES.MINIMUM) {
            // Saddle to Min: horizontal then vertically down
            connectionPattern = 'horizontal-then-vertical-down';
        } else if (startType === NODE_TYPES.MINIMUM && endType === NODE_TYPES.SADDLE) {
            // Min to Saddle: vertically up then horizontal
            connectionPattern = 'vertical-up-then-horizontal';
        } else if (startType === NODE_TYPES.SADDLE && endType === NODE_TYPES.SADDLE) {
            // Saddle to Saddle: determine parent-child relationship by radial distance
            const startDistance = Math.sqrt(startVertex[0] * startVertex[0] + startVertex[2] * startVertex[2]);
            const endDistance = Math.sqrt(endVertex[0] * endVertex[0] + endVertex[2] * endVertex[2]);
            
            if (startDistance < endDistance) {
                // Parent to Child: horizontal then vertically down
                connectionPattern = 'horizontal-then-vertical-down';
            } else {
                // Child to Parent: vertically up then horizontal
                connectionPattern = 'vertical-up-then-horizontal';
            }
        } else {
            // Default case: horizontal then vertical (direction based on Y difference)
            connectionPattern = startVertex[1] < endVertex[1] ? 'horizontal-then-vertical-up' : 'horizontal-then-vertical-down';
        }

        // Execute the connection pattern
        if (connectionPattern === 'horizontal-then-vertical-up' || connectionPattern === 'horizontal-then-vertical-down') {
            // Horizontal first, then vertical
            const intermediatePoint = [
                endVertex[0],   // Move horizontally to end vertex's X position
                startVertex[1], // Keep start vertex's Y position
                endVertex[2]    // Move horizontally to end vertex's Z position
            ];
            
            // Calculate directions for extension
            const horizontalDir = [
                intermediatePoint[0] - startVertex[0],
                intermediatePoint[1] - startVertex[1],
                intermediatePoint[2] - startVertex[2]
            ];
            const horizontalLength = Math.sqrt(horizontalDir[0]*horizontalDir[0] + horizontalDir[1]*horizontalDir[1] + horizontalDir[2]*horizontalDir[2]);
            const horizontalUnit = horizontalLength > 0 ? [horizontalDir[0]/horizontalLength, horizontalDir[1]/horizontalLength, horizontalDir[2]/horizontalLength] : [1, 0, 0];
            
            const verticalDir = [
                endVertex[0] - intermediatePoint[0],
                endVertex[1] - intermediatePoint[1],
                endVertex[2] - intermediatePoint[2]
            ];
            const verticalLength = Math.sqrt(verticalDir[0]*verticalDir[0] + verticalDir[1]*verticalDir[1] + verticalDir[2]*verticalDir[2]);
            const verticalUnit = verticalLength > 0 ? [verticalDir[0]/verticalLength, verticalDir[1]/verticalLength, verticalDir[2]/verticalLength] : [0, 1, 0];
            
            // Extend horizontal segment (end extended by pipe radius)
            const extendedHorizontalEnd = [
                intermediatePoint[0] + horizontalUnit[0] * pipeRadius,
                intermediatePoint[1] + horizontalUnit[1] * pipeRadius,
                intermediatePoint[2] + horizontalUnit[2] * pipeRadius
            ];
            
            // Extend vertical segment (start extended by pipe radius)
            const extendedVerticalStart = [
                intermediatePoint[0] - verticalUnit[0] * pipeRadius,
                intermediatePoint[1] - verticalUnit[1] * pipeRadius,
                intermediatePoint[2] - verticalUnit[2] * pipeRadius
            ];

            // Calculate cutting plane based on horizontal direction and vertical direction
            const isVerticalUp = (endVertex[1] - intermediatePoint[1]) > 0;
            
            // IMPROVED GEOMETRIC CUTTING PLANE CALCULATION:
            // Calculate the bisector of the angle between the two cylinder directions
            // This creates a 45-degree beveled cut that works correctly with model transformations
            const horizontalDirection = [
                intermediatePoint[0] - startVertex[0],
                intermediatePoint[1] - startVertex[1], 
                intermediatePoint[2] - startVertex[2]
            ];
            const verticalDirection = [
                endVertex[0] - intermediatePoint[0],
                endVertex[1] - intermediatePoint[1],
                endVertex[2] - intermediatePoint[2]
            ];
            
            // Normalize both directions
            const hLen = Math.sqrt(horizontalDirection[0]*horizontalDirection[0] + horizontalDirection[1]*horizontalDirection[1] + horizontalDirection[2]*horizontalDirection[2]);
            const vLen = Math.sqrt(verticalDirection[0]*verticalDirection[0] + verticalDirection[1]*verticalDirection[1] + verticalDirection[2]*verticalDirection[2]);
            
            const hNorm = hLen > 0 ? [horizontalDirection[0]/hLen, horizontalDirection[1]/hLen, horizontalDirection[2]/hLen] : [1, 0, 0];
            const vNorm = vLen > 0 ? [verticalDirection[0]/vLen, verticalDirection[1]/vLen, verticalDirection[2]/vLen] : [0, 1, 0];
            
            // Calculate angle bisector (this gives us the cutting plane normal)
            const bisector = [
                hNorm[0] + vNorm[0],
                hNorm[1] + vNorm[1],
                hNorm[2] + vNorm[2]
            ];
            
            // Normalize the bisector to get the cutting plane normal
            const bisectorLen = Math.sqrt(bisector[0]*bisector[0] + bisector[1]*bisector[1] + bisector[2]*bisector[2]);
            const normalizedCutPlane = bisectorLen > 0 ? [
                bisector[0]/bisectorLen,
                bisector[1]/bisectorLen,
                bisector[2]/bisectorLen
            ] : [0, 1, 0];

            // First segment: start to extended intermediate (horizontal)
            lShapedEdges.push({
                start: startVertex,
                end: extendedHorizontalEnd,
                type: 'horizontal',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: intermediatePoint,
                cutPlaneNormal: normalizedCutPlane,
                jointType: isVerticalUp ? 'horizontal-then-up' : 'horizontal-then-down'
            });

            // Second segment: extended intermediate to end (vertical)
            lShapedEdges.push({
                start: extendedVerticalStart,
                end: endVertex,
                type: 'vertical',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: intermediatePoint,
                cutPlaneNormal: normalizedCutPlane,
                jointType: isVerticalUp ? 'horizontal-then-up' : 'horizontal-then-down'
            });
        
        } else if (connectionPattern === 'vertical-down-then-horizontal' || connectionPattern === 'vertical-up-then-horizontal') {
            // Vertical first, then horizontal - but we'll push horizontal first for easier plane calculation
            const intermediatePoint = [
                startVertex[0],  // Keep start vertex's X position
                endVertex[1],    // Move vertically to end vertex's Y position
                startVertex[2]   // Keep start vertex's Z position
            ];
            
            // Calculate directions for extension
            const verticalDir = [
                intermediatePoint[0] - startVertex[0],
                intermediatePoint[1] - startVertex[1],
                intermediatePoint[2] - startVertex[2]
            ];
            const verticalLength = Math.sqrt(verticalDir[0]*verticalDir[0] + verticalDir[1]*verticalDir[1] + verticalDir[2]*verticalDir[2]);
            const verticalUnit = verticalLength > 0 ? [verticalDir[0]/verticalLength, verticalDir[1]/verticalLength, verticalDir[2]/verticalLength] : [0, 1, 0];
            
            const horizontalDir = [
                endVertex[0] - intermediatePoint[0],
                endVertex[1] - intermediatePoint[1],
                endVertex[2] - intermediatePoint[2]
            ];
            const horizontalLength = Math.sqrt(horizontalDir[0]*horizontalDir[0] + horizontalDir[1]*horizontalDir[1] + horizontalDir[2]*horizontalDir[2]);
            const horizontalUnit = horizontalLength > 0 ? [horizontalDir[0]/horizontalLength, horizontalDir[1]/horizontalLength, horizontalDir[2]/horizontalLength] : [1, 0, 0];
            
            // Extend vertical segment (end extended by pipe radius)
            const extendedVerticalEnd = [
                intermediatePoint[0] + verticalUnit[0] * pipeRadius,
                intermediatePoint[1] + verticalUnit[1] * pipeRadius,
                intermediatePoint[2] + verticalUnit[2] * pipeRadius
            ];
            
            // Extend horizontal segment (start extended by pipe radius)
            const extendedHorizontalStart = [
                intermediatePoint[0] - horizontalUnit[0] * pipeRadius,
                intermediatePoint[1] - horizontalUnit[1] * pipeRadius,
                intermediatePoint[2] - horizontalUnit[2] * pipeRadius
            ];

            // Calculate cutting plane based on horizontal direction and vertical direction
            const isVerticalDown = (intermediatePoint[1] - startVertex[1]) > 0;
            
            // IMPROVED GEOMETRIC CUTTING PLANE CALCULATION:
            // Calculate the bisector of the angle between the two cylinder directions
            // This creates a 45-degree beveled cut that works correctly with model transformations
            const verticalDirection2 = [
                intermediatePoint[0] - startVertex[0],
                intermediatePoint[1] - startVertex[1], 
                intermediatePoint[2] - startVertex[2]
            ];
            const horizontalDirection2 = [
                endVertex[0] - intermediatePoint[0],
                endVertex[1] - intermediatePoint[1],
                endVertex[2] - intermediatePoint[2]
            ];
            
            // Normalize both directions
            const vLen2 = Math.sqrt(verticalDirection2[0]*verticalDirection2[0] + verticalDirection2[1]*verticalDirection2[1] + verticalDirection2[2]*verticalDirection2[2]);
            const hLen2 = Math.sqrt(horizontalDirection2[0]*horizontalDirection2[0] + horizontalDirection2[1]*horizontalDirection2[1] + horizontalDirection2[2]*horizontalDirection2[2]);
            
            const vNorm2 = vLen2 > 0 ? [verticalDirection2[0]/vLen2, verticalDirection2[1]/vLen2, verticalDirection2[2]/vLen2] : [0, 1, 0];
            const hNorm2 = hLen2 > 0 ? [horizontalDirection2[0]/hLen2, horizontalDirection2[1]/hLen2, horizontalDirection2[2]/hLen2] : [1, 0, 0];
            
            // Calculate angle bisector (this gives us the cutting plane normal)
            const bisector2 = [
                vNorm2[0] + hNorm2[0],
                vNorm2[1] + hNorm2[1],
                vNorm2[2] + hNorm2[2]
            ];
            
            // Normalize the bisector to get the cutting plane normal
            const bisectorLen2 = Math.sqrt(bisector2[0]*bisector2[0] + bisector2[1]*bisector2[1] + bisector2[2]*bisector2[2]);
            const normalizedCutPlane = bisectorLen2 > 0 ? [
                bisector2[0]/bisectorLen2,
                bisector2[1]/bisectorLen2,
                bisector2[2]/bisectorLen2
            ] : [0, 1, 0];

            // Push horizontal segment first for easier plane calculation
            lShapedEdges.push({
                start: extendedHorizontalStart,
                end: endVertex,
                type: 'horizontal',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: intermediatePoint,
                cutPlaneNormal: normalizedCutPlane,
                jointType: isVerticalDown ? 'down-then-horizontal' : 'up-then-horizontal'
            });

            // Then push vertical segment
            lShapedEdges.push({
                start: startVertex,
                end: extendedVerticalEnd,
                type: 'vertical',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: intermediatePoint,
                cutPlaneNormal: normalizedCutPlane,
                jointType: isVerticalDown ? 'down-then-horizontal' : 'up-then-horizontal'
            });
        }
    });

    return lShapedEdges;
}