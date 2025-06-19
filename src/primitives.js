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

function createCuboidGeometry() {
    // Create a unit cube (1x1x1) centered at origin
    const positions = [
        // Front face
        -0.5, -0.5,  0.5,
         0.5, -0.5,  0.5,
         0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
        
        // Back face
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5, -0.5, -0.5,
        
        // Top face
        -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
         0.5,  0.5,  0.5,
         0.5,  0.5, -0.5,
        
        // Bottom face
        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,
        
        // Right face
         0.5, -0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5,  0.5,  0.5,
         0.5, -0.5,  0.5,
        
        // Left face
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5
    ];
    
    const normals = [
        // Front face
         0,  0,  1,
         0,  0,  1,
         0,  0,  1,
         0,  0,  1,
        
        // Back face
         0,  0, -1,
         0,  0, -1,
         0,  0, -1,
         0,  0, -1,
        
        // Top face
         0,  1,  0,
         0,  1,  0,
         0,  1,  0,
         0,  1,  0,
        
        // Bottom face
         0, -1,  0,
         0, -1,  0,
         0, -1,  0,
         0, -1,  0,
        
        // Right face
         1,  0,  0,
         1,  0,  0,
         1,  0,  0,
         1,  0,  0,
        
        // Left face
        -1,  0,  0,
        -1,  0,  0,
        -1,  0,  0,
        -1,  0,  0
    ];
    
    const indices = [
        0,  1,  2,    0,  2,  3,    // front
        4,  5,  6,    4,  6,  7,    // back
        8,  9,  10,   8,  10, 11,   // top
        12, 13, 14,   12, 14, 15,   // bottom
        16, 17, 18,   16, 18, 19,   // right
        20, 21, 22,   20, 22, 23    // left
    ];
    
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices)
    };
}