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
    
    // Calculate surface normal in view space
    vec3 viewNormal = normalize(viewHitPos - sphereCenter);
    
    // Transform hit position back to world space for lighting
    mat4 invModelView = inverse(uViewMatrix * uModelMatrix);
    vec3 worldHitPos = (invModelView * vec4(viewHitPos, 1.0)).xyz;
    
    // Transform normal to world space (simple approach - since sphere center is in world space)
    vec3 worldNormal = normalize(worldHitPos - vInstanceCenter);
    // === DEPTH CALCULATION ===
    // Use view space hit position to calculate depth (like ProteinVis)
    vec4 clipHitPos = uProjectionMatrix * vec4(viewHitPos, 1.0);
    
    // Convert to normalized device coordinates and then to depth buffer value
    float ndcDepth = clipHitPos.z / clipHitPos.w;
    gl_FragDepth = (ndcDepth + 1.0) * 0.5; // Convert from [-1,1] to [0,1]
      // Lighting calculations using world space positions and normals
    vec3 lightDir = normalize(uLightPos - worldHitPos);
    vec3 viewDir = normalize(vCameraPos - worldHitPos);
    vec3 halfDir = normalize(lightDir + viewDir);
      // Ambient - reduced for less flat lighting
    float ambientStrength = 0.4;
    vec3 ambient = ambientStrength * vInstanceColor;
    
    // Diffuse - enhanced for better shape definition
    float diff = max(dot(worldNormal, lightDir), 0.0);
    vec3 diffuse = 0.5 * diff * vInstanceColor;
    
    // Specular - reduced strength and softer falloff (using Blinn-Phong like the pipe shader)
    float specularStrength = 0.3;
    float spec = pow(max(dot(worldNormal, halfDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * uLightColor;
      // Combine lighting components
    vec3 result = ambient + diffuse + specular;
    
    fragColor = vec4(result, 1.0);

    
}