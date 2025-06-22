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
uniform mat4 uInvViewMatrix;

out vec2 vTexCoord;
out vec3 vCameraPos;
out vec3 vWorldPos; // Pass world-space position
out vec3 vInstanceColor;
out vec3 vInstanceCenter; // Pass sphere center in world space
out float vInstanceRadius; // Pass sphere radius

void main() {
    // Compute world-space center of the sphere
    vec4 worldCenter = uModelMatrix * vec4(a_instancePosition, 1.0);
    
    // Compute world-space position of the vertex
    // Billboard: vertices are offset in view space, so transform to view space first
    vec4 viewCenter = uViewMatrix * worldCenter;
    vec3 viewPos = viewCenter.xyz + vec3(aPosition.x * a_instanceSize, aPosition.z * a_instanceSize, 0.0);
    
    // Transform back to world space for fragment shader
    vec4 worldPos = uInvViewMatrix * vec4(viewPos, 1.0);
    
    gl_Position = uProjectionMatrix * vec4(viewPos, 1.0);
      vTexCoord = aTexCoord;
    vWorldPos = worldPos.xyz; // Pass world-space position
    vInstanceColor = a_instanceColor;
    vInstanceCenter = worldCenter.xyz; // Pass sphere center
    vCameraPos = uCameraPos;
    vInstanceRadius = a_instanceSize; // Pass sphere radius
}