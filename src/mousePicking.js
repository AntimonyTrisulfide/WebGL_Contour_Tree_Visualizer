// src/mousePicking.js

// Mouse picking system using framebuffer with unique colors for edge selection

let pickingFramebuffer = null;
let pickingTexture = null;
let pickingDepthBuffer = null;
let pickingShaderProgram = null;
let pickingUniforms = {};
let edgeColorMap = new Map(); // Maps color values to edge indices
let pickingVAO = null;

// Pre-allocated buffers to avoid recreation
let pickingInstanceBuffer = null;
let pickingPositionBuffer = null;
let pickingIndexBuffer = null;
let pickingInstanceData = null;

// Initialize the picking system
function initializeMousePicking() {
    createPickingFramebuffer();
    createPickingShader();
    createPickingVAO();
}

// Create picking VAO and initialize buffers
function createPickingVAO() {
    if (pickingVAO) {
        gl.deleteVertexArray(pickingVAO);
        // Clean up old buffers
        if (pickingInstanceBuffer) gl.deleteBuffer(pickingInstanceBuffer);
        if (pickingPositionBuffer) gl.deleteBuffer(pickingPositionBuffer);
        if (pickingIndexBuffer) gl.deleteBuffer(pickingIndexBuffer);
    }
    
    pickingVAO = gl.createVertexArray();
    gl.bindVertexArray(pickingVAO);
    
    // Create geometry buffers once
    const cuboid = createCuboidGeometry();
    
    // Position buffer
    pickingPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pickingPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cuboid.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); // aPosition
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);
    
    // Index buffer
    pickingIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pickingIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cuboid.indices, gl.STATIC_DRAW);
    
    // Create instance buffer (will be updated when edges change)
    pickingInstanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pickingInstanceBuffer);
    
    // Setup vertex attributes for picking
    gl.enableVertexAttribArray(1); // aCylStart
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 10 * 4, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2); // aCylEnd
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 10 * 4, 3 * 4);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3); // aRadius
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 10 * 4, 6 * 4);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4); // aPickingColor
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 10 * 4, 7 * 4);
    gl.vertexAttribDivisor(4, 1);
    
    gl.bindVertexArray(null);
}

// Create framebuffer for off-screen rendering with unique colors
function createPickingFramebuffer() {
    // Create framebuffer
    pickingFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickingFramebuffer);

    // Create color texture
    pickingTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, pickingTexture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA8,
        canvas.width, canvas.height, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create depth buffer
    pickingDepthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, pickingDepthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, canvas.width, canvas.height);

    // Attach to framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickingTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, pickingDepthBuffer);

    // Check framebuffer completeness
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Picking framebuffer is not complete!');
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// Create simplified shader for picking (renders each edge with unique color)
function createPickingShader() {
    const vertexShaderSource = `#version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aCylStart;
        layout(location = 2) in vec3 aCylEnd;
        layout(location = 3) in float aRadius;
        layout(location = 4) in vec3 aPickingColor;

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;

        out vec3 vPickingColor;

        void main() {
            // Use the same transformation logic as the main pipe shader
            vec3 cylStart = aCylStart;
            vec3 cylEnd = aCylEnd;
            vec3 cylDir = normalize(cylEnd - cylStart);
            float cylLength = length(cylEnd - cylStart);
            vec3 cylCenter = (cylStart + cylEnd) * 0.5;
            
            // Create transformation matrix to orient cuboid along cylinder direction
            vec3 up = cylDir;
            vec3 right;
            
            // Choose a perpendicular vector
            if (abs(dot(up, vec3(0.0, 1.0, 0.0))) > 0.9) {
                right = normalize(cross(up, vec3(1.0, 0.0, 0.0)));
            } else {
                right = normalize(cross(up, vec3(0.0, 1.0, 0.0)));
            }
            vec3 forward = normalize(cross(up, right));
            
            // Transformation matrix from local cuboid space to world space
            mat3 transform = mat3(
                right * aRadius * 2.0,     // X-axis (width)
                up * cylLength,            // Y-axis (length along cylinder)
                forward * aRadius * 2.0    // Z-axis (depth)
            );
            
            // Transform position and translate to cylinder center
            vec3 worldPos = cylCenter + transform * aPosition;
            
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(worldPos, 1.0);
            vPickingColor = aPickingColor;
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision highp float;

        in vec3 vPickingColor;
        out vec4 fragColor;

        void main() {
            // Simply output the picking color - no ray casting needed!
            fragColor = vec4(vPickingColor, 1.0);
        }
    `;

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Picking vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
        return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Picking fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
        return;
    }

    // Create shader program
    pickingShaderProgram = gl.createProgram();
    gl.attachShader(pickingShaderProgram, vertexShader);
    gl.attachShader(pickingShaderProgram, fragmentShader);
    gl.linkProgram(pickingShaderProgram);

    if (!gl.getProgramParameter(pickingShaderProgram, gl.LINK_STATUS)) {
        console.error('Picking shader program linking failed:', gl.getProgramInfoLog(pickingShaderProgram));
        return;
    }

    // Get uniform locations
    pickingUniforms = {
        uProjectionMatrix: gl.getUniformLocation(pickingShaderProgram, 'uProjectionMatrix'),
        uViewMatrix: gl.getUniformLocation(pickingShaderProgram, 'uViewMatrix'),
        uModelMatrix: gl.getUniformLocation(pickingShaderProgram, 'uModelMatrix')
    };
}

// Generate unique color for edge index
function generatePickingColor(edgeIndex) {
    // Convert edge index to RGB using a more robust method
    // Add 1 to avoid pure black (0,0,0) which is background
    const adjustedIndex = edgeIndex + 1;
    
    // Use full 24-bit color space more efficiently
    const r = ((adjustedIndex) % 256) / 255.0;
    const g = (Math.floor(adjustedIndex / 256) % 256) / 255.0;
    const b = (Math.floor(adjustedIndex / 65536) % 256) / 255.0;
    
    return [r, g, b];
}

// Create picking instance data with unique colors for each edge
function createPickingInstanceData(lShapedEdges) {
    const pickingInstanceData = new Float32Array(lShapedEdges.length * 10); // start(3)+end(3)+radius(1)+color(3)
    edgeColorMap.clear();

    let offset = 0;
    lShapedEdges.forEach((edge, index) => {
        const originalEdgeIndex = edge.originalEdgeIndex;
        const pickingColor = generatePickingColor(originalEdgeIndex);
        
        // Store the mapping from color to edge index using exact values
        const r = Math.round(pickingColor[0] * 255);
        const g = Math.round(pickingColor[1] * 255);
        const b = Math.round(pickingColor[2] * 255);
        const colorKey = `${r},${g},${b}`;
        edgeColorMap.set(colorKey, originalEdgeIndex);
        
        console.log(`Edge ${originalEdgeIndex} -> Color: (${r}, ${g}, ${b})`);
        
        // Instance data
        pickingInstanceData.set(edge.start, offset);                    // Start position (0-2)
        pickingInstanceData.set(edge.end, offset + 3);                 // End position (3-5)
        pickingInstanceData[offset + 6] = pipeRadius;            // Make radius larger for easier picking
        pickingInstanceData.set(pickingColor, offset + 7);             // Picking color (7-9)
        
        offset += 10;
    });

    console.log(`Created picking data for ${lShapedEdges.length} edges`);
    console.log('Color map:', edgeColorMap);
    return pickingInstanceData;
}

// Update picking instance data (call only when edges change)
function updatePickingData() {
    if (!vertices || !edges || !vertexTypes || !vertexValues) {
        console.warn('Graph data not available for picking data update');
        return false;
    }

    const lShapedEdges = createLShapedConnections(vertices, edges, vertexTypes, vertexValues);
    pickingInstanceData = createPickingInstanceData(lShapedEdges);
    
    // Update the buffer
    if (pickingInstanceBuffer && pickingInstanceData) {
        gl.bindBuffer(gl.ARRAY_BUFFER, pickingInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, pickingInstanceData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return true;
    }
    return false;
}

// Render scene to picking framebuffer (optimized)
function renderPickingPass() {
    if (!pickingShaderProgram || !pickingFramebuffer || !pickingVAO) {
        console.error('Picking system not initialized');
        return;
    }

    if (!pickingInstanceData) {
        console.error('Picking data not available - call updatePickingData() first');
        return;
    }

    // Calculate number of instances
    const instanceCount = pickingInstanceData.length / 10;
    const cuboid = createCuboidGeometry();

    // Bind picking framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickingFramebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Clear with black background (no selection)
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Calculate the same matrices as the main rendering system
    const pickingViewMatrix = mat4.create();
    const pickingModelMatrix = mat4.create();
    
    // Calculate camera position - same as main rendering
    const eye = calculateCameraPosition();
    const up = [0, 1, 0]; // Fixed up vector
    const target = cameraTarget;

    // Create view matrix - same as main rendering
    mat4.lookAt(pickingViewMatrix, eye, target, up);
    
    // Calculate model matrix with trackball rotation - same as main rendering
    mat4.copy(pickingModelMatrix, calculateModelMatrix());
    
    // Use picking shader
    gl.useProgram(pickingShaderProgram);
    
    // Set uniforms with the correctly calculated matrices
    gl.uniformMatrix4fv(pickingUniforms.uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(pickingUniforms.uViewMatrix, false, pickingViewMatrix);
    gl.uniformMatrix4fv(pickingUniforms.uModelMatrix, false, pickingModelMatrix);

    // Bind VAO and render
    gl.bindVertexArray(pickingVAO);
    gl.drawElementsInstanced(
        gl.TRIANGLES,
        cuboid.indices.length,
        gl.UNSIGNED_SHORT,
        0,
        instanceCount
    );

    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // Restore main viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
}

// Handle mouse click for edge selection (optimized GPU picking)
function handleMousePick(mouseX, mouseY, event = null) {
    console.log('🎯 handleMousePick called with:', {mouseX, mouseY, event: event ? 'provided' : 'null'});
    
    if (!pickingFramebuffer || !edges || edges.length === 0) {
        console.error('❌ Mouse picking prerequisites not met:', {
            pickingFramebuffer: !!pickingFramebuffer,
            edges: edges ? edges.length : 'null',
            edgesLength: edges ? edges.length : 0
        });
        return;
    }

    console.log('✅ Mouse picking prerequisites met, proceeding...');

    // Render picking pass
    renderPickingPass();

    // Convert mouse coordinates to framebuffer coordinates
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((mouseX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((canvas.height - (mouseY - rect.top) * (canvas.height / rect.height))); // Flip Y coordinate
    
    console.log('🎯 Mouse coordinates:', {mouseX, mouseY, x, y});
    
    // Read pixel at mouse position
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickingFramebuffer);
    const pixel = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    console.log('🎯 Pixel color at mouse position:', pixel);

    // Check if we hit an edge
    if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
        // Clicked on background - do nothing to preserve selections
        console.log('🎯 Background click - maintaining current selection');
        return;
    } else {
        // Convert pixel color back to edge index
        const colorKey = `${pixel[0]},${pixel[1]},${pixel[2]}`;
        console.log('🎯 Looking for edge with color key:', colorKey);
        console.log('🎯 Available color keys:', Array.from(edgeColorMap.keys()));
        
        const edgeIndex = edgeColorMap.get(colorKey);
        
        if (edgeIndex !== undefined) {
            console.log('🎯 Found edge index:', edgeIndex);
            
            // Use the selection manager to handle the selection
            if (window.selectionManager) {
                const isCtrlPressed = event && event.ctrlKey;
                window.selectionManager.handleMouseClick(edgeIndex, isCtrlPressed);
                
                console.log(`📊 Selected edges array:`, window.selectionManager.getSelection());
                console.log(`📊 Selected edges count:`, window.selectionManager.getSelectionCount());
            } else {
                console.error('❌ Selection manager not found - falling back to legacy behavior');
                
                // Fallback to legacy behavior if selection manager is not available
                if (event && event.ctrlKey) {
                    const edgeIndexInSelection = window.selectedEdges.indexOf(edgeIndex);
                    if (edgeIndexInSelection > -1) {
                        window.selectedEdges.splice(edgeIndexInSelection, 1);
                        console.log(`🔴 Edge ${edgeIndex} removed from selection`);
                    } else {
                        window.selectedEdges.push(edgeIndex);
                        console.log(`🟢 Edge ${edgeIndex} added to selection`);
                    }
                    selectedEdge = window.selectedEdges.length > 0 ? window.selectedEdges[window.selectedEdges.length - 1] : null;
                } else {
                    window.selectedEdges = [edgeIndex];
                    selectedEdge = edgeIndex;
                    console.log(`🔵 Edge ${edgeIndex} selected (replacing previous selection)`);
                }
                
                // Legacy visualization update
                if (typeof updateMultipleEdgeHighlighting !== 'undefined') {
                    updateMultipleEdgeHighlighting();
                } else if (typeof updatePipeHighlighting !== 'undefined') {
                    updatePipeHighlighting();
                }
                
                if (typeof renderGraph === 'function') {
                    renderGraph();
                }
            }
        } else {
            console.warn(`No edge found for color: ${colorKey}`);
        }
    }
}

// Resize picking framebuffer when canvas resizes
function resizePickingFramebuffer(width, height) {
    if (!pickingFramebuffer) return;

    gl.bindTexture(gl.TEXTURE_2D, pickingTexture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA8,
        width, height, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
    );

    gl.bindRenderbuffer(gl.RENDERBUFFER, pickingDepthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}
