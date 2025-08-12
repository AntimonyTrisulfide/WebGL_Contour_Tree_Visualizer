#version 300 es
in vec3 aPosition;
in vec2 aTexCoord;
in vec3 a_instancePosition;
in float a_instanceSize;
in vec3 a_instanceColor;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;

out vec2 vTexCoord;
out vec3 vWorldPos;
out vec3 vInstanceColor;
out vec3 vInstanceCenter;
out float vInstanceRadius;

void main() {
    // Compute world-space center of the sphere
    vec4 worldCenter = uModelMatrix * vec4(a_instancePosition, 1.0);
    
    // For ray-casting, we need to create a proper billboard quad
    // Get the right and up vectors from the view matrix
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
    
    // Create billboard quad in world space
    vec3 worldPos = worldCenter.xyz + 
                   (aPosition.x * right + aPosition.z * up) * a_instanceSize;
    
    // Transform to clip space
    gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 1.0);
    
    // Pass data to fragment shader
    vTexCoord = aTexCoord;
    vWorldPos = worldPos;
    vInstanceColor = a_instanceColor;
    vInstanceCenter = worldCenter.xyz;
    vInstanceRadius = a_instanceSize;
}
