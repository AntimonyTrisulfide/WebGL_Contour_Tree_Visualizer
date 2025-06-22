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
    if (length(vJointPoint) > 0.001 && length(vCutPlaneNormal) > 0.001) {
        // Vector from joint point to hit point
        vec3 toHitPoint = hitPoint - vJointPoint;
        
        // Use the pre-calculated cut plane normal from CPU
        vec3 cutPlaneNormal = normalize(vCutPlaneNormal);
        
        // Calculate distance from the cutting plane
        float planeDistance = dot(toHitPoint, cutPlaneNormal);
        
        // Determine cylinder orientation
        vec3 cylDirAbs = abs(cylDir);
        bool isVertical = cylDirAbs.y > max(cylDirAbs.x, cylDirAbs.z);
        
        if (isVertical) {
            // For vertical cylinders: 
            // - Upward (positive Y direction): reject fragments before cutting plane
            // - Downward (negative Y direction): reject fragments after cutting plane
            float cylDirY = cylDir.y;
            
            if (cylDirY > 0.0) {
                // Vertical upward: reject fragments before the cutting plane
                if (planeDistance > 0.0) {
                    discard;
                }
            } else {
                // Vertical downward: reject fragments after the cutting plane
                if (planeDistance < 0.0) {
                    discard;
                }
            }
        } else {
            // For horizontal cylinders: always reject fragments after the cutting plane
            // This creates the 45-degree cut at the joint
            if (planeDistance > 0.0) {
                discard;
            }
        }
    }


    // === DEPTH CALCULATION ===
    vec4 clipPos = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(hitPoint, 1.0);
    float ndcDepth = clipPos.z / clipPos.w;
    gl_FragDepth = (ndcDepth + 1.0) * 0.5;
    
    // === LIGHTING (ProteinVis style) ===
    vec3 lightDir = normalize(uLightPos - hitPoint);
    vec3 viewDir = normalize(vCameraPos - hitPoint);
    vec3 halfVector = normalize(lightDir + viewDir);
    
    // Blinn-Phong lighting with ProteinVis parameters
    float diffuse = max(0.0, dot(cylinderNormal, lightDir));
    float specular = pow(max(0.0, dot(cylinderNormal, halfVector)), 64.0);
    
    // ProteinVis lighting formula: ambient(0.4) + diffuse(0.6) + specular(0.3)
    vec3 finalColor = vInstanceColor * (0.4 + 0.6 * diffuse) + vec3(1.0, 1.0, 1.0) * 0.3 * specular;
    
    fragColor = vec4(finalColor, 1.0);
}
