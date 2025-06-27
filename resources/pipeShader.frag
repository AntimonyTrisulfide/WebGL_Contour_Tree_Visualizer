#version 300 es
precision highp float;

uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

in vec3 vCylStart;
in vec3 vCylEnd;
in float vRadius;
in vec3 vInstanceColor;
in vec3 vCameraPos;
in vec3 vWorldPos;
in vec3 vJointPoint;
in vec3 vCutPlaneNormal;
in float vJointType;

out vec4 fragColor;

void main() {
    // Cylinder properties
    vec3 cylDir = normalize(vCylEnd - vCylStart);
    float cylLength = length(vCylEnd - vCylStart);
    
    // Ray setup
    vec3 rayOrigin = vCameraPos;
    vec3 rayDir = normalize(vWorldPos - vCameraPos);
    
    // Ray-cylinder intersection in world space
    vec3 oc = rayOrigin - vCylStart;
    vec3 proj_oc = oc - dot(oc, cylDir) * cylDir;
    vec3 proj_ray = rayDir - dot(rayDir, cylDir) * cylDir;
    
    float a = dot(proj_ray, proj_ray);
    float b = 2.0 * dot(proj_oc, proj_ray);
    float c = dot(proj_oc, proj_oc) - vRadius * vRadius;
    
    float discriminant = b * b - 4.0 * a * c;
    if (discriminant < 0.0) {
        discard;
    }
    
    float sqrt_d = sqrt(discriminant);
    float t1 = (-b - sqrt_d) / (2.0 * a);
    float t2 = (-b + sqrt_d) / (2.0 * a);
    float t = (t1 > 0.0) ? t1 : t2;
    
    if (t <= 0.0) {
        discard;
    }    // Calculate intersection point
    vec3 hitPoint = rayOrigin + t * rayDir;
    float distAlongAxis = dot(hitPoint - vCylStart, cylDir);

    // Simple bounds check - no extensions, just the cylinder as defined
    if (distAlongAxis < 0.0 || distAlongAxis > cylLength) {
        discard;
    }
      // Calculate basic cylinder normal
    vec3 axisPoint = vCylStart + distAlongAxis * cylDir;
    vec3 toAxis = hitPoint - axisPoint;
    vec3 cylinderNormal = normalize(toAxis);    // === L-JOINT CUTTING: 45-degree beveled cut ===
    // This section creates clean 45° beveled cuts at L-joint intersections.
    // Key insight: Using [0,1,0] bias for both up/down directions works because:
    // 1. Cut plane gets consistent upward tilt from positive Y bias
    // 2. Cylinder direction (cylDir) has opposite signs for up/down segments  
    // 3. Joint type determines which side of plane to discard
    // 4. These factors combine to produce correct beveled cuts for all orientations
    if (length(vJointPoint) > 0.001 && length(vCutPlaneNormal) > 0.001 && vJointType > 0.5) {
        // Vector from joint point to hit point
        vec3 toHitPoint = hitPoint - vJointPoint;
        
        // Use the pre-calculated cut plane normal from CPU
        vec3 cutPlaneNormal = normalize(vCutPlaneNormal);
        
        // Calculate distance from the cutting plane
        float planeDistance = dot(toHitPoint, cutPlaneNormal);
        
        // Determine cylinder orientation
        vec3 cylDirAbs = abs(cylDir);
        bool isVertical = cylDirAbs.y > max(cylDirAbs.x, cylDirAbs.z);
        
        // Joint type encoding: 1.0=horizontal-then-up, 2.0=horizontal-then-down, 
        // 3.0=up-then-horizontal, 4.0=down-then-horizontal
        float jointType = vJointType;
        
        if (isVertical) {
            // For vertical cylinders, discard based on joint type and cylinder direction
            float cylDirY = cylDir.y;
            
            if (jointType > 0.5 && jointType < 1.5 || jointType > 2.5 && jointType < 3.5) {
                // Connections that go upward (1.0 or 3.0): reject fragments before cutting plane
                if (planeDistance < 0.0) {
                    discard;
                }
            } else if (jointType > 1.5 && jointType < 2.5 || jointType > 3.5 && jointType < 4.5) {
                // Connections that go downward (2.0 or 4.0): reject fragments after cutting plane
                if (planeDistance > 0.0) {
                    discard;
                }
            }
        } else {
            // For horizontal cylinders, discard based on joint type
            if (jointType > 0.5 && jointType < 1.5 || jointType > 1.5 && jointType < 2.5) {
                // horizontal-then-vertical patterns (1.0 or 2.0): reject fragments after cutting plane
                if (planeDistance > 0.0) {
                    discard;
                }
            } else if (jointType > 2.5 && jointType < 3.5 || jointType > 3.5 && jointType < 4.5) {
                // vertical-then-horizontal patterns (3.0 or 4.0): reject fragments before cutting plane
                if (planeDistance < 0.0) {
                    discard;
                }
            }
        }
    }


    // === DEPTH CALCULATION (ProteinVis style) ===
    // Transform hit point to view space first, then apply projection
    vec3 viewSpacePoint = (uViewMatrix * uModelMatrix * vec4(hitPoint, 1.0)).xyz;
    vec4 clipPos = uProjectionMatrix * vec4(viewSpacePoint, 1.0);
    gl_FragDepth = (clipPos.z / clipPos.w + 1.0) * 0.5;
    
    // === LIGHTING (ProteinVis style) ===
    // For camera-attached light, use a fixed offset in view space to create moving specular
    // This simulates a headlamp slightly above and to the right of the camera
    vec3 viewLightPos = vec3(1, 4, 5); // Fixed position in view space
    
    // Transform normal to view space for lighting calculations
    vec3 viewNormal = normalize((uViewMatrix * uModelMatrix * vec4(cylinderNormal, 0.0)).xyz);
    
    // Calculate lighting vectors in view space
    vec3 lightDir = normalize(viewLightPos - viewSpacePoint);
    vec3 viewDir = normalize(-viewSpacePoint); // From surface to camera (origin) in view space
    vec3 halfVector = normalize(lightDir + viewDir);
    
    // Blinn-Phong lighting with ProteinVis parameters
    float diffuse = max(0.0, dot(viewNormal, lightDir));
    float specular = pow(max(0.0, dot(viewNormal, halfVector)), 64.0);
    
    // ProteinVis lighting formula: ambient(0.2) + diffuse(0.5) + specular(0.3) to match sphere
    vec3 finalColor = vInstanceColor * (0.25 + 0.5 * diffuse) + vec3(1.0, 1.0, 1.0) * 0.6 * specular;
    
    fragColor = vec4(finalColor, 1.0);
}
