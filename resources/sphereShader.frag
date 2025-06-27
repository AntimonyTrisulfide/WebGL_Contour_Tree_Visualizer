#version 300 es
precision highp float;
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

in vec2 vTexCoord;
in vec3 vWorldPos;
in vec3 vInstanceColor;
in vec3 vInstanceCenter;
in vec3 vCameraPos;
in float vInstanceRadius;

out vec4 fragColor;

void main() {
    // Map texture coordinates to [-1, 1] range, centered at (0.5, 0.5)
    vec2 uv = (vTexCoord - vec2(0.5)) * 2.0;
    float distFromCenter = length(uv);
    
    // Discard fragments outside the sphere's circular boundary
    if (distFromCenter > 1.0) {
        discard;
    }

    // Convert world positions to view space for calculations (like ProteinVis)
    vec4 viewCenter = uViewMatrix * uModelMatrix * vec4(vInstanceCenter, 1.0);
    vec4 viewWorldPos = uViewMatrix * uModelMatrix * vec4(vWorldPos, 1.0);
    
    // Create ray in view space from eye (0,0,0) through fragment
    vec3 rayOrigin = vec3(0.0, 0.0, 0.0); // Eye is at origin in view space
    vec3 rayDirection = normalize(viewWorldPos.xyz);
    
    // Sphere center and radius in view space
    vec3 sphereCenter = viewCenter.xyz;
    float sphereRadius = vInstanceRadius;
    
    // Ray-sphere intersection using quadratic formula
    // Ray: P = rayOrigin + t * rayDirection  
    // Sphere: |P - center|² = radius²
    vec3 oc = rayOrigin - sphereCenter;
    float a = dot(rayDirection, rayDirection);
    float b = 2.0 * dot(oc, rayDirection);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float discriminant = b * b - 4.0 * a * c;
    
    // No intersection if discriminant is negative
    if (discriminant < 0.0) {
        discard;
    }
      // Calculate intersection points in view space
    float sqrtDiscriminant = sqrt(discriminant);
    float t1 = (-b - sqrtDiscriminant) / (2.0 * a); // Near intersection
    float t2 = (-b + sqrtDiscriminant) / (2.0 * a); // Far intersection
    
    // Use the closest positive intersection (front face of sphere)
    float t = (t1 > 0.0) ? t1 : t2;
    if (t <= 0.0) {
        discard;
    }
      // Calculate intersection point in view space
    vec3 viewHitPos = rayOrigin + t * rayDirection;
    
    // Calculate surface normal in view space (ProteinVis style)
    vec3 viewNormal = normalize(viewHitPos - sphereCenter);
    
    // === DEPTH CALCULATION (ProteinVis style) ===
    vec4 clipHitPos = uProjectionMatrix * vec4(viewHitPos, 1.0);
    float ndcDepth = clipHitPos.z / clipHitPos.w;
    gl_FragDepth = (ndcDepth + 1.0) * 0.5; // Convert from [-1,1] to [0,1]
    
    // === LIGHTING (ProteinVis style) ===
    // For camera-attached light, use a fixed offset in view space to create moving specular
    // This simulates a headlamp slightly above and to the right of the camera
    vec3 viewLightPos = vec3(1, 4, 5); // Fixed position in view space
    
    // Calculate lighting vectors in view space
    vec3 lightDir = normalize(viewLightPos - viewHitPos);
    vec3 viewDir = normalize(-viewHitPos); // From surface to camera (origin) in view space
    vec3 halfVector = normalize(lightDir + viewDir);
    
    // ProteinVis lighting model: much lower ambient, proper diffuse/specular balance
    float diffuse = max(0.0, dot(viewNormal, lightDir));
    float specular = pow(max(0.0, dot(viewNormal, halfVector)), 64.0);
    
    // ProteinVis lighting formula: low ambient + diffuse color + white specular
    vec3 finalColor = vInstanceColor * (0.25 + 0.5 * diffuse) + vec3(1.0, 1.0, 1.0) * 0.6 * specular;
    
    fragColor = vec4(finalColor, 1.0);

    
}