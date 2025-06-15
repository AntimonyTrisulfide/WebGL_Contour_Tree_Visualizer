// src/renderer.js

// Updated pipe instance data preparation
// Modify the prepareLShapedPipeData function
function prepareLShapedPipeData(vertices, edges, vertexTypes, vertexValues) {
    const lShapedEdges = createLShapedConnections(vertices, edges, vertexTypes, vertexValues);
    const pipeInstanceData = new Float32Array(lShapedEdges.length * 10); // 3+3+1+3 for start+end+radius+color

    let offset = 0;    lShapedEdges.forEach((edge, index) => {
        const originalEdgeIndex = edge.originalEdgeIndex; // Use the stored original edge index
        const isSelected = selectedEdge === originalEdgeIndex;

        pipeInstanceData.set(edge.start, offset);
        pipeInstanceData.set(edge.end, offset + 3);
        pipeInstanceData[offset + 6] = pipeRadius;
        pipeInstanceData.set(isSelected ? [1.0, 0.0, 1.0] : pipeColor, offset + 7);
        offset += 10;
    });

    return { pipeInstanceData, edgeCount: lShapedEdges.length };
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

    gl.bindVertexArray(pipeVAO);
    gl.drawElementsInstanced(
        gl.TRIANGLES,
        pipeIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        edgesCount
    );
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