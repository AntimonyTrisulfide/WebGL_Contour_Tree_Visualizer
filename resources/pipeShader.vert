#version 300 es
in vec3 aPosition;
in vec3 a_instanceStart;
in vec3 a_instanceEnd;
in float a_instanceRadius;
in vec3 a_instanceColor;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;

out vec3 vCylStart;
out vec3 vCylEnd;
out float vRadius;
out vec3 vInstanceColor;
out vec3 vCameraPos;
out vec3 vWorldPos;
out vec3 vRight;
out vec3 vUp;

void main() {
    vec4 worldStart = uModelMatrix * vec4(a_instanceStart, 1.0);
    vec4 worldEnd = uModelMatrix * vec4(a_instanceEnd, 1.0);
    
    vec3 cylDir = normalize(worldEnd.xyz - worldStart.xyz);
    float cylLength = length(worldEnd.xyz - worldStart.xyz) * 0.5;
    vec3 cylCenter = (worldStart.xyz + worldEnd.xyz) * 0.5;
    
    // Billboard coordinate system
    vec3 viewDir = normalize(uCameraPos - cylCenter);
    
    // Ensure up aligns with cylinder direction
    vec3 up = cylDir;
    
    // Compute right vector perpendicular to both viewDir and up
    vec3 right = normalize(cross(viewDir, up));
    
    // Scale quad: x for width (right), y for height (cylDir)
    float widthScale = a_instanceRadius * 2.0; // Horizontal extent
    float heightScale = cylLength * 1.2; // Vertical extent
    vec3 localPos = (right * aPosition.x * widthScale) + (up * aPosition.y * heightScale);
    
    vec3 worldPos = cylCenter + localPos;
    vec4 viewPos = uViewMatrix * vec4(worldPos, 1.0);
    gl_Position = uProjectionMatrix * viewPos;
    
    vCylStart = worldStart.xyz;
    vCylEnd = worldEnd.xyz;
    vRadius = a_instanceRadius;
    vInstanceColor = a_instanceColor;
    vCameraPos = uCameraPos;
    vWorldPos = worldPos;
    vRight = right;
    vUp = up;
}