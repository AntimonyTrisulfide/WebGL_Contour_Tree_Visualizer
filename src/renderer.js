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
    const pipeInstanceData = new Float32Array(lShapedEdges.length * 16); // Extended to include junction data: 3+3+1+3+3+3 for start+end+radius+color+prevEnd+nextStart

    let offset = 0;
    lShapedEdges.forEach((edge, index) => {
        const originalEdgeIndex = edge.originalEdgeIndex;
        const isSelected = selectedEdge === originalEdgeIndex;
        
        // Calculate junction data for this segment
        const junctionData = calculateJunctionData(lShapedEdges, index);        // Calculate extended start and end positions
        let extendedStart = [...edge.start];
        let extendedEnd = [...edge.end];
        
        // Calculate cylinder direction vector
        const cylDir = [
            edge.end[0] - edge.start[0],
            edge.end[1] - edge.start[1],
            edge.end[2] - edge.start[2]
        ];
        const cylLength = Math.sqrt(cylDir[0] * cylDir[0] + cylDir[1] * cylDir[1] + cylDir[2] * cylDir[2]);
        
        // Normalize direction vector
        const cylDirNorm = [
            cylDir[0] / cylLength,
            cylDir[1] / cylLength,
            cylDir[2] / cylLength
        ];
        
        // Check if start point is an intermediate point (elbow joint)
        const startIsIntermediate = intermediatePoints.some(point => 
            Math.abs(point[0] - edge.start[0]) < 0.001 &&
            Math.abs(point[1] - edge.start[1]) < 0.001 &&
            Math.abs(point[2] - edge.start[2]) < 0.001
        );
        
        // Check if end point is an intermediate point (elbow joint)
        const endIsIntermediate = intermediatePoints.some(point => 
            Math.abs(point[0] - edge.end[0]) < 0.001 &&
            Math.abs(point[1] - edge.end[1]) < 0.001 &&
            Math.abs(point[2] - edge.end[2]) < 0.001
        );
        
        // Extend start point only if it's an intermediate point AND there's a previous connection
        if (startIsIntermediate && junctionData.hasPrev) {
            extendedStart[0] -= cylDirNorm[0] * pipeRadius;
            extendedStart[1] -= cylDirNorm[1] * pipeRadius;
            extendedStart[2] -= cylDirNorm[2] * pipeRadius;
        }
        
        // Extend end point only if it's an intermediate point AND there's a next connection
        if (endIsIntermediate && junctionData.hasNext) {
            extendedEnd[0] += cylDirNorm[0] * pipeRadius;
            extendedEnd[1] += cylDirNorm[1] * pipeRadius;
            extendedEnd[2] += cylDirNorm[2] * pipeRadius;
        }

        // Basic pipe data with extended positions
        pipeInstanceData.set(extendedStart, offset);                                 // 0-2: extended start position
        pipeInstanceData.set(extendedEnd, offset + 3);                               // 3-5: extended end position  
        pipeInstanceData[offset + 6] = pipeRadius;                                   // 6: radius
        pipeInstanceData.set(isSelected ? [1.0, 0.0, 1.0] : pipeColor, offset + 7); // 7-9: color
        
        // Junction data for cutting (keep original intermediate points for connection logic)
        pipeInstanceData.set(junctionData.prevCylEnd, offset + 10);                  // 10-12: previous cylinder end
        pipeInstanceData.set(junctionData.nextCylStart, offset + 13);                // 13-15: next cylinder start
        
        offset += 16;
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