#version 300 es
precision highp float;

// Uniforms setup
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform vec3 uLightColor;

// Inputs to the fragment shader
in vec3 vCylStart;
in vec3 vCylEnd;
in float vRadius;
in vec3 vInstanceColor;
in vec3 vCameraPos;
in vec3 vWorldPos;
in vec3 vModelCylStart;  // Model-space cylinder start
in vec3 vModelCylEnd;    // Model-space cylinder end
in vec3 vJointPoint;     // Model-space joint point
in vec3 vCutPlaneNormal; // Model-space cut plane normal
in float vJointType;

// Output Color
out vec4 fragColor;

void main() {
    // All calculations in model space to handle transformations properly
    vec3 modelCylStart = vModelCylStart;
    vec3 modelCylEnd = vModelCylEnd;
    vec3 cylDir = normalize(modelCylEnd - modelCylStart);
    float cylLength = length(modelCylEnd - modelCylStart);
    
    // Transform camera position to model space
    vec4 modelCameraPos = inverse(uModelMatrix) * vec4(vCameraPos, 1.0);
    vec3 modelCamPos = modelCameraPos.xyz;
    
    // Transform world position to model space
    vec4 modelWorldPos = inverse(uModelMatrix) * vec4(vWorldPos, 1.0);
    vec3 modelPos = modelWorldPos.xyz;
    
    // Ray setup in model space
    vec3 rayOrigin = modelCamPos;
    vec3 rayDir = normalize(modelPos - modelCamPos);
    
    // Improved ray-cylinder intersection for better stability at extreme angles
    vec3 oc = rayOrigin - modelCylStart;
    
    // Project ray and offset onto cylinder axis
    float rayDotCyl = dot(rayDir, cylDir);
    float ocDotCyl = dot(oc, cylDir);
    
    // Components perpendicular to cylinder axis
    vec3 rayPerp = rayDir - rayDotCyl * cylDir;
    vec3 ocPerp = oc - ocDotCyl * cylDir;
    
    // Quadratic equation coefficients - more stable formulation
    float a = dot(rayPerp, rayPerp);
    float b = 2.0 * dot(ocPerp, rayPerp);
    float c = dot(ocPerp, ocPerp) - vRadius * vRadius;
    
    float t;
    // Handle degenerate case where ray is parallel to cylinder axis
    if (a < 1e-8) {
        // Ray is nearly parallel to cylinder axis
        if (c > 0.0) {
            discard; // Ray misses cylinder
        }
        // Ray is inside cylinder, use a small t value
        t = 0.001;
    } else {
        float discriminant = b * b - 4.0 * a * c;
        if (discriminant < 0.0) {
            discard;
        }
        
        float sqrt_d = sqrt(discriminant);
        float t1 = (-b - sqrt_d) / (2.0 * a);
        float t2 = (-b + sqrt_d) / (2.0 * a);
        t = (t1 > 0.0) ? t1 : t2;
    }
    
    if (t <= 0.0) {
        discard;
    }
    
    // Calculate intersection point in model space
    vec3 modelHitPoint = rayOrigin + t * rayDir;
    
    // More robust cylinder bounds checking
    float distAlongAxis = dot(modelHitPoint - modelCylStart, cylDir);
    
    // Add small tolerance for numerical precision issues at extreme angles
    float tolerance = vRadius * 0.1;
    if (distAlongAxis < -tolerance || distAlongAxis > cylLength + tolerance) {
        discard;
    }
    
    // Clamp to cylinder bounds for consistent normal calculation
    distAlongAxis = clamp(distAlongAxis, 0.0, cylLength);
    
    // === GEOMETRIC CUTTING PLANE APPROACH ===
    // This approach uses model-space coordinates to ensure proper behavior with transformations
    if (length(vJointPoint) > 0.001 && length(vCutPlaneNormal) > 0.001 && vJointType > 0.5) {
        // All calculations in model space
        vec3 modelJointPoint = vJointPoint;
        vec3 modelCutPlaneNormal = normalize(vCutPlaneNormal);
        
        // Vector from joint point to hit point in model space
        vec3 toHitPoint = modelHitPoint - modelJointPoint;
        
        // Calculate signed distance from the cutting plane
        float planeDistance = dot(toHitPoint, modelCutPlaneNormal);
        
        // Determine cylinder orientation in model space
        vec3 cylDirAbs = abs(cylDir);
        bool isVertical = cylDirAbs.y > max(cylDirAbs.x, cylDirAbs.z);
        
        // Joint type encoding: 1.0=horizontal-then-up, 2.0=horizontal-then-down, 
        // 3.0=up-then-horizontal, 4.0=down-then-horizontal
        float jointType = vJointType;
        
        // Apply cutting logic based on joint type and cylinder orientation
        if (isVertical) {
            // For vertical cylinders
            if (jointType > 0.5 && jointType < 1.5) {
                // horizontal-then-up (1.0): keep positive side of plane
                if (planeDistance < 0.0) discard;
            } else if (jointType > 1.5 && jointType < 2.5) {
                // horizontal-then-down (2.0): keep negative side of plane
                if (planeDistance > 0.0) discard;
            } else if (jointType > 2.5 && jointType < 3.5) {
                // up-then-horizontal (3.0): keep positive side of plane
                if (planeDistance < 0.0) discard;
            } else if (jointType > 3.5 && jointType < 4.5) {
                // down-then-horizontal (4.0): keep negative side of plane
                if (planeDistance > 0.0) discard;
            }
        } else {
            // For horizontal cylinders
            if (jointType > 0.5 && jointType < 1.5) {
                // horizontal-then-up (1.0): keep negative side of plane
                if (planeDistance > 0.0) discard;
            } else if (jointType > 1.5 && jointType < 2.5) {
                // horizontal-then-down (2.0): keep negative side of plane
                if (planeDistance > 0.0) discard;
            } else if (jointType > 2.5 && jointType < 3.5) {
                // up-then-horizontal (3.0): keep negative side of plane
                if (planeDistance < 0.0) discard;
            } else if (jointType > 3.5 && jointType < 4.5) {
                // down-then-horizontal (4.0): keep negative side of plane
                if (planeDistance < 0.0) discard;
            }
        }
    }
    
    // === IMPROVED CYLINDER NORMAL CALCULATION ===
    // Calculate normal using more stable method for extreme angles
    vec3 axisPoint = modelCylStart + distAlongAxis * cylDir;
    vec3 toAxis = modelHitPoint - axisPoint;
    
    // Ensure we have a valid normal vector with improved fallback
    float toAxisLength = length(toAxis);
    if (toAxisLength < 1e-6) {
        // Improved fallback: create a proper perpendicular vector
        vec3 perpendicular;
        if (abs(cylDir.x) < 0.57735) { // 1/sqrt(3) - avoid near-parallel vectors
            perpendicular = normalize(cross(cylDir, vec3(1.0, 0.0, 0.0)));
        } else if (abs(cylDir.y) < 0.57735) {
            perpendicular = normalize(cross(cylDir, vec3(0.0, 1.0, 0.0)));
        } else {
            perpendicular = normalize(cross(cylDir, vec3(0.0, 0.0, 1.0)));
        }
        toAxis = perpendicular * vRadius;
    } else {
        // Normalize the vector from axis to hit point
        toAxis = normalize(toAxis);
    }
    
    vec3 modelNormal = toAxis;
    
    // Transform hit point back to world space for depth calculation
    vec4 worldHitPoint = uModelMatrix * vec4(modelHitPoint, 1.0);
    
    // === DEPTH CALCULATION ===
    vec3 viewSpacePoint = (uViewMatrix * worldHitPoint).xyz;
    vec4 clipPos = uProjectionMatrix * vec4(viewSpacePoint, 1.0);
    gl_FragDepth = (clipPos.z / clipPos.w + 1.0) * 0.5;
    
    // === IMPROVED LIGHTING WITH DUAL-TONE CAMERA HEADLAMP ===
    // Transform normal to world space for lighting calculations
    // Use inverse transpose for proper normal transformation (handles non-uniform scaling)
    mat3 normalMatrix = transpose(inverse(mat3(uModelMatrix)));
    vec3 worldNormal = normalize(normalMatrix * modelNormal);
    
    // Calculate view direction in world space
    vec3 viewDir = normalize(uCameraPos - worldHitPoint.xyz);
    
    // Ensure normal faces the camera for consistent lighting
    float normalDotView = dot(worldNormal, viewDir);
    if (normalDotView < 0.0) {
        worldNormal = -worldNormal;
        normalDotView = -normalDotView;
    }
    
    // Use single directional light
    vec3 lightDir = normalize(uLightDir);
    
    // Calculate half vector for specular
    vec3 halfVector = normalize(lightDir + viewDir);
    
    // Calculate diffuse contribution
    float diffuse = max(0.0, dot(worldNormal, lightDir));
    
    // Apply smooth falloff to diffuse lighting
    diffuse = smoothstep(0.0, 1.0, diffuse);
    
    // Improved specular calculation with enhanced falloff
    float specularDot = max(0.0, dot(worldNormal, halfVector));
    
    // Multiple shininess levels for more natural specular falloff
    float specular_tight = pow(specularDot, 64.0);  // Tight, sharp highlight
    float specular_medium = pow(specularDot, 32.0); // Medium highlight
    float specular_soft = pow(specularDot, 16.0);   // Soft, broader highlight
    
    // Combine multiple specular layers with smooth falloff
    float specular = specular_tight * 0.6 + specular_medium * 0.3 + specular_soft * 0.1;
    
    // Viewing angle-based specular falloff (Fresnel-like effect)
    float specularFresnel = pow(max(0.0, normalDotView), 0.5);
    specular *= specularFresnel;
    
    // RIM LIGHTING FOR CYLINDERS - More prominent effect
    // Use fresnel-like effect for more natural rim lighting behavior
    float fresnel = pow(1.0 - max(0.0, normalDotView), 2.0);
    float rimLight = pow(1.0 - max(0.0, normalDotView), 3.5);
    
    // Natural specular enhancement based on viewing angle for cylinders
    float specularEnhancement = 0.4 * fresnel + 0.3 * rimLight;
    
    // IMPROVED MATERIAL PROPERTIES
    vec3 baseColor = vInstanceColor;
    
    // Reduced ambient calculation with subtle tint
    vec3 ambient = baseColor * 0.25 * vec3(0.9, 0.95, 1.0);
    
    // Diffuse contribution with single white light
    vec3 diffuseContrib = baseColor * diffuse * uLightColor * 0.6;
    
    // Enhanced specular highlights with improved falloff and rim lighting
    vec3 specularContrib = uLightColor * (specular + specularEnhancement) * 0.7;
    
    // Rim lighting for better cylinder shape definition
    vec3 rimContrib = vec3(0.15, 0.2, 0.25) * rimLight * 0.08;
    
    // Combine all contributions with single light
    vec3 finalColor = ambient + diffuseContrib + specularContrib + rimContrib;
    
    fragColor = vec4(finalColor, 1.0);
}
