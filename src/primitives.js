// src/primitives.js

function createSphereQuad() {
    const positions = [
        -0.5, 0, -0.5, // Bottom left
         0.5, 0, -0.5, // Bottom right
        -0.5, 0,  0.5, // Top left
         0.5, 0,  0.5  // Top right
    ];
    
    const texCoords = [
        0, 0, // Bottom left
        1, 0, // Bottom right
        0, 1, // Top left
        1, 1  // Top right
    ];
    
    const indices = [
        0, 1, 2, // First triangle
        2, 1, 3  // Second triangle
    ];
    
    return {
        positions: new Float32Array(positions),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

function createCylinderQuad() {
    const positions = [
        -1.0, -1.0, 0.0, // Bottom left
        1.0, -1.0, 0.0, // Bottom right
        -1.0,  1.0, 0.0, // Top left
        1.0,  1.0, 0.0  // Top right
    ];
    const indices = [
        0, 1, 2, // First triangle
        2, 1, 3  // Second triangle
    ];
    return {
        positions: new Float32Array(positions),
        indices: new Uint16Array(indices)
    };
}