// src/debug.js


// Add debugging function to check uniform locations
function debugUniforms() {
    console.log("Sphere uniforms:", sphereUniforms);
    console.log("Pipe uniforms:", pipeUniforms);

    sphereUniforms = {
        uProjectionMatrix: gl.getUniformLocation(sphereProgram, "uProjectionMatrix"),
        uViewMatrix: gl.getUniformLocation(sphereProgram, "uViewMatrix"),
        uModelMatrix: gl.getUniformLocation(sphereProgram, "uModelMatrix"),
        uCameraPosLocation: gl.getUniformLocation(sphereProgram, "uCameraPos"),
        uColorLocation: gl.getUniformLocation(sphereProgram, "uColor")
    };

    gl.useProgram(pipeProgram);
    pipeUniforms = {
        uProjectionMatrix: gl.getUniformLocation(pipeProgram, "uProjectionMatrix"),
        uViewMatrix: gl.getUniformLocation(pipeProgram, "uViewMatrix"),
        uModelMatrix: gl.getUniformLocation(pipeProgram, "uModelMatrix"),
        uColor: gl.getUniformLocation(pipeProgram, "uColor"),
        uCameraPosLocationPipe: gl.getUniformLocation(pipeProgram, "uCameraPos")
    };

    // Check if all expected uniforms exist
    const expectedSphereUniforms = ["uProjectionMatrix", "uViewMatrix", "uModelMatrix", "uCameraPos", "uColor"];
    const expectedPipeUniforms = ["uProjectionMatrix", "uViewMatrix", "uModelMatrix", "uColor", "uCameraPos"];
    
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


// showStatus function replaced with console logging
function showStatus(message, type) {
    console.log(`[${type ? type.toUpperCase() : 'INFO'}] ${message}`);
}