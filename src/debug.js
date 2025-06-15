// src/debug.js


// Add debugging function to check uniform locations
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