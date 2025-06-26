// src/initialize.js

let sphereProgram, pipeProgram;
let sphereUniforms, pipeUniforms;
let verticesCount, edgesCount;


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
        loadShaderSource('resources/sphereShader.vert'),
        loadShaderSource('resources/sphereShader.frag'),
        loadShaderSource('resources/pipeShader.vert'),
        loadShaderSource('resources/pipeShader.frag')
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
async function initializeGraph(offData) {

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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
        }        // Create geometries
        const sphere = createSphereQuad(); // Create billboard quad for spheres
        const cuboid = createCuboidGeometry(); // Use cuboid geometry for pipes
        sphereIndexCount = sphere.indices.length;
        pipeIndexCount = cuboid.indices.length;        let instanceObjects = updateInstanceData(); // Create this new function
        let instanceData = instanceObjects.instanceData; // Sphere instance data
        let pipeInstanceData = instanceObjects.pipeInstanceData; // Pipe instance datalet edgesCount = instanceObjects.edgeCount; // Number of edges for pipes


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
            const shaders = await createShaderProgram();
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
            };            gl.useProgram(pipeProgram);            pipeUniforms = {
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
        if (sphereVAO) gl.deleteVertexArray(sphereVAO);        sphereVAO = gl.createVertexArray();
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


        // Set up pipe VAO

        // In initializeGraph, update the pipe VAO setup
// In initializeGraph, pipe VAO setup
if (pipeVAO) gl.deleteVertexArray(pipeVAO);
pipeVAO = gl.createVertexArray();
gl.bindVertexArray(pipeVAO);

const pipePositionBuffer = gl.createBuffer();
const pipeInstanceBuffer = gl.createBuffer();
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

    // Update max attribute of edge input
    document.getElementById('edgeSelect').max = edges.length;

        // debugUniforms(); // Call the debugging function to check uniform locations

        renderGraphWithFPS();

    } catch (error) {
        if(offData !== ""){
            showStatus(`Error loading graph: ${error.message}`, 'error');
            console.error("Graph initialization error:", error);
        }
    }
}