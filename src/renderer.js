// src/renderer.js

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
    const lShapedEdges = createLShapedConnections(vertices, edges, vertexTypes, vertexValues);
    const pipeInstanceData = new Float32Array(lShapedEdges.length * 17); // Extended for joint type: start(3)+end(3)+radius(1)+color(3)+jointPoint(3)+cutNormal(3)+jointType(1)

    let offset = 0;
    lShapedEdges.forEach((edge, index) => {
        const originalEdgeIndex = edge.originalEdgeIndex;
        const isSelected = selectedEdge === originalEdgeIndex;
        
        // Basic instance data
        pipeInstanceData.set(edge.start, offset);                              // Start position (0-2)
        pipeInstanceData.set(edge.end, offset + 3);                           // End position (3-5)
        pipeInstanceData[offset + 6] = pipeRadius;                            // Radius (6)
        pipeInstanceData.set(isSelected ? [1.0, 0.0, 1.0] : pipeColor, offset + 7); // Color (7-9)
        
        // Joint data for L-joint cutting
        pipeInstanceData.set(edge.jointPoint || [0.0, 0.0, 0.0], offset + 10); // Joint point (10-12)
        pipeInstanceData.set(edge.cutPlaneNormal || [0.0, 0.0, 0.0], offset + 13); // Cut plane normal (13-15)
        
        // Joint type encoding for fragment shader L-joint cutting logic:
        // 0.0=none, 1.0=horizontal-then-up, 2.0=horizontal-then-down, 
        // 3.0=up-then-horizontal, 4.0=down-then-horizontal
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
        pipeInstanceData[offset + 16] = jointTypeValue; // Joint type (16)
        
        offset += 17;
    });

    return { pipeInstanceData, edgeCount: lShapedEdges.length };
}

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

    const eye = calculateCameraPosition();
    const up = calculateUpVector();
    const target = [
        cameraTarget[0] + cameraOffset[0],
        cameraTarget[1] + cameraOffset[1],
        cameraTarget[2] + cameraOffset[2]
    ];

    mat4.lookAt(viewMatrix, eye, target, up);
    invViewMatrix = mat4.invert(mat4.create(), viewMatrix);
    
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

    gl.bindVertexArray(pipeVAO);
    gl.drawElementsInstanced(
        gl.TRIANGLES,
        pipeIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        edgesCount    );
    gl.bindVertexArray(null);

    // Render spheres second (no polygon offset needed)
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