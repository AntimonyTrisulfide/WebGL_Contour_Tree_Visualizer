#version 300 es
in vec3 aPosition;
in vec3 a_instanceStart;
in vec3 a_instanceEnd;
in float a_instanceRadius;
in vec3 a_instanceColor;
in vec3 a_jointPoint;
in vec3 a_cutPlaneNormal;
in float a_jointType;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;

out vec3 vWorldPos;
out vec3 vInstanceColor;
out vec3 vCameraPos;
out vec3 vCylStart;
out vec3 vCylEnd;
out vec3 vModelCylStart;  // Model-space cylinder start
out vec3 vModelCylEnd;    // Model-space cylinder end
out float vRadius;
out vec3 vJointPoint;
out vec3 vCutPlaneNormal;
out float vJointType;

void main() {
    // Store model-space coordinates (before model transformation)
    vModelCylStart = a_instanceStart;
    vModelCylEnd = a_instanceEnd;
    
    // Calculate cylinder properties in model space
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

    // Transformation matrix from local cuboid space to model space
    mat3 transform = mat3(
        right * a_instanceRadius * 2.0,     // X-axis (width)
        up * cylLength,                      // Y-axis (length along cylinder)
        forward * a_instanceRadius * 2.0     // Z-axis (depth)
    );

    // Transform vertex position to model space
    vec3 modelPos = cylCenter + transform * aPosition;

    // Apply model matrix transformation for trackball rotation
    vec4 transformedWorldPos = uModelMatrix * vec4(modelPos, 1.0);

    // Transform to view space
    vec4 viewPos = uViewMatrix * transformedWorldPos;

    // Transform to clip space
    gl_Position = uProjectionMatrix * viewPos;

    // Pass data to fragment shader
    vWorldPos = transformedWorldPos.xyz;
    vInstanceColor = a_instanceColor;
    vCameraPos = uCameraPos;
    
    // Transform cylinder endpoints to world space for compatibility
    vCylStart = (uModelMatrix * vec4(cylStart, 1.0)).xyz;
    vCylEnd = (uModelMatrix * vec4(cylEnd, 1.0)).xyz;
    
    vRadius = a_instanceRadius;
    
    // Pass model-space joint data (don't transform these)
    vJointPoint = a_jointPoint;
    vCutPlaneNormal = a_cutPlaneNormal;
    vJointType = a_jointType;
}
