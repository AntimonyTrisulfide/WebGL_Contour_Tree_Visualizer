// src/renderer.js

// Global variables for efficient edge selection
let cachedPipeInstanceData = null; // Cache the full instance data
let edgeToInstanceMapping = new Map(); // Map original edge index to instance indices
let previousSelectedEdge = -1; // Track previous selection for efficient updates
let lShapedEdgesCache = null; // Cache the L-shaped edges to avoid recalculation

function calculateJunctionData(lShapedEdges, index) {
    const currentEdge = lShapedEdges[index];
    const originalEdgeIndex = currentEdge.originalEdgeIndex;
    
    // Find previous and next segments
    let prevCylEnd = null;
    let nextCylStart = null;
    let hasPrev = false;
    let hasNext = false;
    
    // Look for previous segment (same original edge, but earlier in sequence)
    for (let i = index - 1; i >= 0; i--) {
        if (lShapedEdges[i].originalEdgeIndex === originalEdgeIndex) {
            prevCylEnd = lShapedEdges[i].end;
            hasPrev = true;
            break;
        }
    }
    
    // If no previous segment in same edge, look for connecting edge
    if (!hasPrev) {
        for (let i = 0; i < lShapedEdges.length; i++) {
            if (i !== index && lShapedEdges[i].originalEdgeIndex !== originalEdgeIndex) {
                // Check if this edge connects to current edge's start
                const distance = vec3.distance(lShapedEdges[i].end, currentEdge.start);
                if (distance < 0.001) { // Small threshold for connection
                    prevCylEnd = lShapedEdges[i].end;
                    hasPrev = true;
                    break;
                }
            }
        }
    }
    
    // Look for next segment (same original edge, but later in sequence)
    for (let i = index + 1; i < lShapedEdges.length; i++) {
        if (lShapedEdges[i].originalEdgeIndex === originalEdgeIndex) {
            nextCylStart = lShapedEdges[i].start;
            hasNext = true;
            break;
        }
    }
    
    // If no next segment in same edge, look for connecting edge
    if (!hasNext) {
        for (let i = 0; i < lShapedEdges.length; i++) {
            if (i !== index && lShapedEdges[i].originalEdgeIndex !== originalEdgeIndex) {
                // Check if this edge connects to current edge's end
                const distance = vec3.distance(currentEdge.end, lShapedEdges[i].start);
                if (distance < 0.001) { // Small threshold for connection
                    nextCylStart = lShapedEdges[i].start;
                    hasNext = true;
                    break;
                }
            }
        }
    }
    
    return {
        prevCylEnd: prevCylEnd || [0, 0, 0],
        nextCylStart: nextCylStart || [0, 0, 0],
        hasPrev: hasPrev,
        hasNext: hasNext
    };
}
function prepareLShapedPipeData(vertices, edges, vertexTypes, vertexValues) {
    // If we have cached data and we're just updating selection, use it
    if (cachedPipeInstanceData && edgeToInstanceMapping.size > 0) {
        // Update selection in cached data efficiently
        if (window.selectedEdges && window.selectedEdges.length > 0) {
            updateMultipleEdgeHighlighting();
        } else if (selectedEdge) {
            updateEdgeSelection(selectedEdge, previousSelectedEdge);
        } else {
            // Reset all to default color
            updateMultipleEdgeHighlighting();
        }
        previousSelectedEdge = selectedEdge; // Update tracking
        return { 
            pipeInstanceData: cachedPipeInstanceData, 
            edgeCount: cachedPipeInstanceData.length / 17 
        };
    }
    
    // Otherwise, initialize fresh data (first time or after graph change)
    console.log('Initializing fresh pipe instance data');
    return initializePipeInstanceData(vertices, edges, vertexTypes, vertexValues);
}

// Initialize and cache pipe instance data for efficient updates
function initializePipeInstanceData(vertices, edges, vertexTypes, vertexValues) {
    lShapedEdgesCache = createLShapedConnections(vertices, edges, vertexTypes, vertexValues);
    cachedPipeInstanceData = new Float32Array(lShapedEdgesCache.length * 17);
    edgeToInstanceMapping.clear();

    let offset = 0;
    lShapedEdgesCache.forEach((edge, index) => {
        const originalEdgeIndex = edge.originalEdgeIndex;
        
        // Map original edge to all its L-shaped segments
        if (!edgeToInstanceMapping.has(originalEdgeIndex)) {
            edgeToInstanceMapping.set(originalEdgeIndex, []);
        }
        edgeToInstanceMapping.get(originalEdgeIndex).push(index);
        
        // Check if this edge should be selected initially
        const isSelected = selectedEdge === originalEdgeIndex;
        const edgeColor = isSelected ? [1.0, 0.0, 1.0] : pipeColor;
        
        // Set initial data
        cachedPipeInstanceData.set(edge.start, offset);                              // Start position (0-2)
        cachedPipeInstanceData.set(edge.end, offset + 3);                           // End position (3-5)
        cachedPipeInstanceData[offset + 6] = pipeRadius;                            // Radius (6)
        cachedPipeInstanceData.set(edgeColor, offset + 7);                          // Color with initial selection (7-9)
        
        // Joint data for L-joint cutting
        cachedPipeInstanceData.set(edge.jointPoint || [0.0, 0.0, 0.0], offset + 10); // Joint point (10-12)
        cachedPipeInstanceData.set(edge.cutPlaneNormal || [0.0, 0.0, 0.0], offset + 13); // Cut plane normal (13-15)
        
        // Joint type encoding
        let jointTypeValue = 0;
        if (edge.jointType) {
            switch (edge.jointType) {
                case 'horizontal-then-up': jointTypeValue = 1; break;
                case 'horizontal-then-down': jointTypeValue = 2; break;
                case 'up-then-horizontal': jointTypeValue = 3; break;
                case 'down-then-horizontal': jointTypeValue = 4; break;
                default: jointTypeValue = 0; break;
            }
        }
        cachedPipeInstanceData[offset + 16] = jointTypeValue; // Joint type (16)
        
        offset += 17;
    });

    // Set the tracking variable to current selection
    previousSelectedEdge = selectedEdge;

    console.log(`Initialized cached pipe data for ${lShapedEdgesCache.length} edge segments`);
    console.log(`Initial selected edge: ${selectedEdge}`);
    console.log(`Edge to instance mapping:`, edgeToInstanceMapping);
    
    return { pipeInstanceData: cachedPipeInstanceData, edgeCount: lShapedEdgesCache.length };
}

// Efficient function to update only color data for selection changes
function updateEdgeSelection(newSelectedEdge, previousEdge = -1) {
    if (!cachedPipeInstanceData || !edgeToInstanceMapping) {
        console.warn('Pipe data not cached, need full initialization');
        return false;
    }

    console.log(`updateEdgeSelection called: ${previousEdge} -> ${newSelectedEdge}`);

    const selectionColor = [1.0, 0.0, 1.0]; // Magenta for selected
    const defaultColor = pipeColor; // Default pipe color
    const colorUpdates = []; // Track which color regions to update

    // Deselect previous edge (set to default color)
    if (previousEdge >= 0 && edgeToInstanceMapping.has(previousEdge)) {
        const instanceIndices = edgeToInstanceMapping.get(previousEdge);
        console.log(`Deselecting edge ${previousEdge}, affects ${instanceIndices.length} segments`);
        instanceIndices.forEach(instanceIndex => {
            const colorOffset = instanceIndex * 17 + 7; // Color starts at offset 7
            cachedPipeInstanceData[colorOffset] = defaultColor[0];     // R
            cachedPipeInstanceData[colorOffset + 1] = defaultColor[1]; // G
            cachedPipeInstanceData[colorOffset + 2] = defaultColor[2]; // B
            
            // Track this update for efficient GPU upload
            colorUpdates.push({
                byteOffset: colorOffset * 4, // 4 bytes per float
                data: new Float32Array([defaultColor[0], defaultColor[1], defaultColor[2]])
            });
        });
    }

    // Select new edge (set to selection color)
    if (newSelectedEdge >= 0 && edgeToInstanceMapping.has(newSelectedEdge)) {
        const instanceIndices = edgeToInstanceMapping.get(newSelectedEdge);
        console.log(`Selecting edge ${newSelectedEdge}, affects ${instanceIndices.length} segments`);
        instanceIndices.forEach(instanceIndex => {
            const colorOffset = instanceIndex * 17 + 7; // Color starts at offset 7
            cachedPipeInstanceData[colorOffset] = selectionColor[0];     // R
            cachedPipeInstanceData[colorOffset + 1] = selectionColor[1]; // G
            cachedPipeInstanceData[colorOffset + 2] = selectionColor[2]; // B
            
            // Track this update for efficient GPU upload
            colorUpdates.push({
                byteOffset: colorOffset * 4, // 4 bytes per float
                data: new Float32Array([selectionColor[0], selectionColor[1], selectionColor[2]])
            });
        });
    } else if (newSelectedEdge >= 0) {
        console.warn(`Edge ${newSelectedEdge} not found in mapping. Available edges:`, Array.from(edgeToInstanceMapping.keys()));
    }

    // Update GPU buffer with only the changed color data using bufferSubData
    if (colorUpdates.length > 0 && pipeInstanceBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, pipeInstanceBuffer);
        
        // Apply each color update individually for maximum efficiency
        colorUpdates.forEach(update => {
            gl.bufferSubData(gl.ARRAY_BUFFER, update.byteOffset, update.data);
        });
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        
        console.log(`Updated ${colorUpdates.length} color regions efficiently using bufferSubData`);
    } else {
        console.log('No color updates needed or buffer not available');
    }

    return true;
}

// Efficient function to update multiple edge selection highlighting
function updateMultipleEdgeHighlighting() {
    if (!cachedPipeInstanceData || !edgeToInstanceMapping) {
        console.warn('Pipe data not cached, need full initialization');
        return false;
    }

    const selectionColor = [1.0, 0.0, 1.0]; // Magenta for selected
    const defaultColor = pipeColor; // Default pipe color
    const colorUpdates = []; // Track which color regions to update

    // First, reset all edges to default color
    edgeToInstanceMapping.forEach((instanceIndices, edgeIndex) => {
        instanceIndices.forEach(instanceIndex => {
            const colorOffset = instanceIndex * 17 + 7; // Color starts at offset 7
            cachedPipeInstanceData[colorOffset] = defaultColor[0];     // R
            cachedPipeInstanceData[colorOffset + 1] = defaultColor[1]; // G
            cachedPipeInstanceData[colorOffset + 2] = defaultColor[2]; // B
            
            // Track this update for efficient GPU upload
            colorUpdates.push({
                byteOffset: colorOffset * 4, // 4 bytes per float
                data: new Float32Array([defaultColor[0], defaultColor[1], defaultColor[2]])
            });
        });
    });

    // Then, highlight all selected edges
    window.selectedEdges.forEach(edgeIndex => {
        if (edgeToInstanceMapping.has(edgeIndex)) {
            const instanceIndices = edgeToInstanceMapping.get(edgeIndex);
            instanceIndices.forEach(instanceIndex => {
                const colorOffset = instanceIndex * 17 + 7; // Color starts at offset 7
                cachedPipeInstanceData[colorOffset] = selectionColor[0];     // R
                cachedPipeInstanceData[colorOffset + 1] = selectionColor[1]; // G
                cachedPipeInstanceData[colorOffset + 2] = selectionColor[2]; // B
                
                // Track this update for efficient GPU upload
                colorUpdates.push({
                    byteOffset: colorOffset * 4, // 4 bytes per float
                    data: new Float32Array([selectionColor[0], selectionColor[1], selectionColor[2]])
                });
            });
        }
    });

    // Update GPU buffer with only the changed color data using bufferSubData
    if (colorUpdates.length > 0 && pipeInstanceBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, pipeInstanceBuffer);
        
        // Sort by offset for efficient batching
        colorUpdates.sort((a, b) => a.byteOffset - b.byteOffset);
        
        // Apply updates
        colorUpdates.forEach(update => {
            gl.bufferSubData(gl.ARRAY_BUFFER, update.byteOffset, update.data);
        });
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return true;
}

// Export multiple edge highlighting function
window.updateMultipleEdgeHighlighting = updateMultipleEdgeHighlighting;

function updateInstanceData() {
    // Instance data to be moved here
    // Return the instance data for spheres and pipes    // Create L-shaped pipe connections
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
            // instanceData[i * 7 + 3] = sphereRadius * 2; // Use sphere radius for intermediate points
        }
        instanceData[i * 7 + 4] = color[0];   // r
        instanceData[i * 7 + 5] = color[1];   // g
        instanceData[i * 7 + 6] = color[2];   // b
        if (type === NODE_TYPES.INTERMEDIATE) {
            instanceData[i * 7 + 4] = pipeColor[0];   // r for intermediate points
            instanceData[i * 7 + 5] = pipeColor[1];   // g for intermediate points
            instanceData[i * 7 + 6] = pipeColor[2];   // b for intermediate points
        }
    });    return {
        instanceData, // Sphere instance data
        pipeInstanceData, // Pipe instance data
        edgeCount: edgesCount // Number of edges for pipes
    };

}

function renderGraph() {
    // Guard to prevent rendering when uniforms are not properly initialized
    if (!pipeUniforms || !sphereUniforms) {
        // Just clear the screen if uniforms aren't ready
        gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return;
    }

    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);

    // Calculate camera position - fixed for trackball
    const eye = calculateCameraPosition();
    const up = [0, 1, 0]; // Fixed up vector
    const target = cameraTarget;

    mat4.lookAt(viewMatrix, eye, target, up);
    invViewMatrix = mat4.invert(mat4.create(), viewMatrix);
    
    // Calculate model matrix with trackball rotation
    const trackballModelMatrix = calculateModelMatrix();
    
    // Render pipes first
    gl.useProgram(pipeProgram);
    if (pipeUniforms.uProjectionMatrix) {
        gl.uniformMatrix4fv(pipeUniforms.uProjectionMatrix, false, projectionMatrix);
    }
    if (pipeUniforms.uViewMatrix) {
        gl.uniformMatrix4fv(pipeUniforms.uViewMatrix, false, viewMatrix);
    }
    if (pipeUniforms.uModelMatrix) {
        gl.uniformMatrix4fv(pipeUniforms.uModelMatrix, false, trackballModelMatrix);
    }
    if (pipeUniforms.uCameraPos) {
        gl.uniform3fv(pipeUniforms.uCameraPos, eye);    
    }
    
    // Set dual-tone camera headlamp lighting
    // NOTE: These are DIRECTIONAL LIGHTS (at infinity), not point lights
    // The values represent light directions in world space, not positions
    if (pipeUniforms.uLightDir) {
        // Use API lighting if available, otherwise use hardcoded defaults
        // let lightDir = [0.6, 0.4, 0.7]; // Modified: Slightly different angle for variation
        if (window.usingAPILighting && window.lightConfig && window.lightConfig.directions && window.lightConfig.directions.main) {
            lightDir = window.lightConfig.directions.main;
        }
        gl.uniform3fv(pipeUniforms.uLightDir, lightDir);
    }
    if (pipeUniforms.uLightColor) {
        // Use API lighting if available, otherwise use hardcoded defaults
        // let lightDir = [-0.4, -0.3, 0.9]; // Modified: Slightly different angle for variation
        if (window.usingAPILighting && window.lightConfig && window.lightConfig.directions && window.lightConfig.directions.main) {
            lightColor = window.lightConfig.colors.main;
        }
        gl.uniform3fv(pipeUniforms.uLightColor, lightColor);
    }

    gl.bindVertexArray(pipeVAO);
    gl.drawElementsInstanced(
        gl.TRIANGLES,
        pipeIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        edgesCount
    );
    gl.bindVertexArray(null);

    // Render spheres second
    gl.useProgram(sphereProgram);
    if (sphereUniforms.uProjectionMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uProjectionMatrix, false, projectionMatrix);
    }
    if (sphereUniforms.uModelMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uModelMatrix, false, trackballModelMatrix);
    }
    if (sphereUniforms.uViewMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uViewMatrix, false, viewMatrix);
    }
    if (sphereUniforms.uCameraPosLocation) {
        gl.uniform3fv(sphereUniforms.uCameraPosLocation, eye);
    }
    if (sphereUniforms.uInvViewMatrix) {
        gl.uniformMatrix4fv(sphereUniforms.uInvViewMatrix, false, invViewMatrix);
    }
    
    // Set dual-tone camera headlamp lighting (same as pipes)
    // NOTE: These are DIRECTIONAL LIGHTS (at infinity), not point lights
    // The values represent light directions in world space, not positions
    if (sphereUniforms.uLightDir) {
        // Use API lighting if available, otherwise use hardcoded defaults
        // let lightDir = [0.6, 0.4, 0.7]; // Modified: Slightly different angle for variation
        if (window.usingAPILighting && window.lightConfig && window.lightConfig.directions && window.lightConfig.directions.main) {
            lightDir = window.lightConfig.directions.main;
        }
        gl.uniform3fv(sphereUniforms.uLightDir, lightDir);
    }
    if (sphereUniforms.uLightColor) {
        // Use API lighting if available, otherwise use hardcoded defaults
        // let lightDir = [-0.4, -0.3, 0.9]; // Modified: Slightly different angle for variation
        if (window.usingAPILighting && window.lightConfig && window.lightConfig.directions && window.lightConfig.directions.main) {
            lightColor = window.lightConfig.colors.main;
        }
        gl.uniform3fv(sphereUniforms.uLightColor, lightColor);
    }

    gl.bindVertexArray(sphereVAO);
    gl.drawElementsInstanced(
        gl.TRIANGLES,
        sphereIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        validVertices.length
    );
    gl.bindVertexArray(null);
}

// Integrate trackball camera into the rendering pipeline
function renderScene() {
    const cameraPosition = calculateCameraPosition();
    const viewMatrix = mat4.create();

    // Calculate view matrix using camera position and target
    mat4.lookAt(viewMatrix, cameraPosition, cameraTarget, [0, 1, 0]);

    // Pass the view matrix to the shaders
    gl.uniformMatrix4fv(shaderProgram.uniformLocations.viewMatrix, false, viewMatrix);

    // Render the scene (pipes, spheres, etc.)
    renderPipes();
    renderSpheres(cameraPosition);
}

function renderSpheres(cameraPosition) {
    // Update spherical imposters based on the camera position
    gl.uniform3fv(shaderProgram.uniformLocations.cameraPosition, cameraPosition);

    // Render spheres
    sphereInstances.forEach((sphere) => {
        gl.uniform3fv(shaderProgram.uniformLocations.spherePosition, sphere.position);
        gl.uniform1f(shaderProgram.uniformLocations.sphereRadius, sphere.radius);
        gl.drawArrays(gl.TRIANGLES, 0, sphere.vertexCount);
    });
}

// Ensure shaders have the necessary uniforms for camera position and view matrix
function initializeShaderUniforms() {
    shaderProgram.uniformLocations.viewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    shaderProgram.uniformLocations.cameraPosition = gl.getUniformLocation(shaderProgram, 'uCameraPosition');
    shaderProgram.uniformLocations.spherePosition = gl.getUniformLocation(shaderProgram, 'uSpherePosition');
    shaderProgram.uniformLocations.sphereRadius = gl.getUniformLocation(shaderProgram, 'uSphereRadius');
}

// FPS Counter functions
function updateFPS(currentTime) {
    fpsCounter.frameCount++;
    
    if (currentTime - fpsCounter.lastFpsUpdate >= fpsCounter.fpsUpdateInterval) {
        // Calculate FPS
        const deltaTime = currentTime - fpsCounter.lastFpsUpdate;
        fpsCounter.fps = Math.round((fpsCounter.frameCount * 1000) / deltaTime);
        
        // Update FPS display
        const fpsElement = document.getElementById('fpsDisplay');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${fpsCounter.fps}`;
        }
        
        // Reset counters
        fpsCounter.frameCount = 0;
        fpsCounter.lastFpsUpdate = currentTime;
    }
}

function startContinuousRendering() {
    if (!isAnimating) {
        isAnimating = true;
        fpsCounter.lastTime = performance.now();
        fpsCounter.lastFpsUpdate = fpsCounter.lastTime;
        renderLoop();
    }
}

function stopContinuousRendering() {
    isAnimating = false;
}

function renderLoop() {
    if (!isAnimating) return;
    
    const currentTime = performance.now();
    updateFPS(currentTime);
    
    renderGraph();
    
    requestAnimationFrame(renderLoop);
}

// Enhanced renderGraph function with FPS tracking
function renderGraphWithFPS() {
    // Guard to prevent rendering when uniforms are not properly initialized
    if (!pipeUniforms || !sphereUniforms) {
        // Just clear the screen if uniforms aren't ready
        gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return;
    }

    if (isAnimating) {
        // FPS is handled in renderLoop
        renderGraph();
    } else {
        // Single frame render
        renderGraph();
    }
}

// Function to update only pipe highlighting without full reinitialization
function updatePipeHighlighting() {
    if (!vertices || !edges || !vertexTypes || !vertexValues) {
        console.warn('Graph data not available for updating pipe highlighting');
        return;
    }

    if (!pipeInstanceBuffer) {
        console.warn('Pipe instance buffer not available, reinitializing graph');
        // If buffer doesn't exist, we need to reinitialize
        if (window.treeData) {
            initializeGraph(window.treeData);
        }
        return;
    }

    // Try efficient selection update first
    const success = updateEdgeSelection(selectedEdge, previousSelectedEdge);
    
    if (!success) {
        // Fallback to full recreation if efficient update failed
        console.warn('Efficient update failed, falling back to full recreation');
        const pipeData = prepareLShapedPipeData(vertices, edges, vertexTypes, vertexValues);
        const pipeInstanceData = pipeData.pipeInstanceData;

        // Update the existing pipe instance buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, pipeInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, pipeInstanceData, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    
    // Update the tracking variable
    previousSelectedEdge = selectedEdge;
    
    console.log('Pipe highlighting updated successfully');
    
    // Trigger a re-render to show the color changes
    renderGraphWithFPS();
}

// Clear cached data when graph changes (call when loading new file)
function clearPipeCache() {
    cachedPipeInstanceData = null;
    edgeToInstanceMapping.clear();
    lShapedEdgesCache = null;
    previousSelectedEdge = -1;
    console.log('Pipe cache cleared');
}