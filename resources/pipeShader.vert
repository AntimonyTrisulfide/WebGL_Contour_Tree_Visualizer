#version 300 es
in vec3 aPosition;
in vec3 a_instanceStart;
in vec3 a_instanceEnd;
in float a_instanceRadius;
in vec3 a_instanceColor;
in vec3 a_jointPoint;
in vec3 a_cutPlaneNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;

out vec3 vWorldPos;
out vec3 vInstanceColor;
out vec3 vCameraPos;
out vec3 vCylStart;
out vec3 vCylEnd;
out float vRadius;
out vec3 vJointPoint;
out vec3 vCutPlaneNormal;

void main() {
    // Calculate cylinder properties
    vec3 cylStart = a_instanceStart;
    vec3 cylEnd = a_instanceEnd;
    vec3 cylDir = normalize(cylEnd - cylStart);
    float cylLength = length(cylEnd - cylStart);
    vec3 cylCenter = (cylStart + cylEnd) * 0.5;
    
    // Create transformation matrix to orient cuboid along cylinder direction
    vec3 up = cylDir;
    vec3 right;
    
    // Choose a perpendicular vector
    if (abs(dot(up, vec3(0.0, 1.0, 0.0))) > 0.9) {
        right = normalize(cross(up, vec3(1.0, 0.0, 0.0)));
    } else {
        right = normalize(cross(up, vec3(0.0, 1.0, 0.0)));
    }
    vec3 forward = normalize(cross(up, right));
      // Transformation matrix from local cuboid space to world space
    mat3 transform = mat3(
        right * a_instanceRadius * 2.0,     // X-axis (width)
        up * cylLength,                      // Y-axis (length along cylinder)
        forward * a_instanceRadius * 2.0     // Z-axis (depth)
    );
    
    // Transform vertex position
    vec3 localPos = transform * aPosition;
    vec3 worldPos = cylCenter + localPos;
    
    // Apply model, view, and projection transforms
    vec4 viewPos = uViewMatrix * uModelMatrix * vec4(worldPos, 1.0);
    gl_Position = uProjectionMatrix * viewPos;
      // Pass to fragment shader
    vWorldPos = (uModelMatrix * vec4(worldPos, 1.0)).xyz;
    vInstanceColor = a_instanceColor;
    vCameraPos = uCameraPos;
    vCylStart = (uModelMatrix * vec4(cylStart, 1.0)).xyz;
    vCylEnd = (uModelMatrix * vec4(cylEnd, 1.0)).xyz;
    vRadius = a_instanceRadius;
    vJointPoint = (uModelMatrix * vec4(a_jointPoint, 1.0)).xyz;
    vCutPlaneNormal = (uModelMatrix * vec4(a_cutPlaneNormal, 0.0)).xyz; // Normal vector, so w=0
}