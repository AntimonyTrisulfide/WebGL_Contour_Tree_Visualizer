#version 300 es
precision highp float;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform vec3 uLightColor;

in vec2 vTexCoord;
in vec3 vWorldPos;
in vec3 vInstanceColor;
in vec3 vInstanceCenter;
in float vInstanceRadius;

out vec4 fragColor;

void main() {
    // Calculate distance from center of quad to fragment
    vec2 coord = vTexCoord * 2.0 - 1.0; // Convert to [-1, 1] range
    float d = dot(coord, coord);
    
    // Reject fragments outside the circle to make it round
    if (d > 1.0) {
        discard;
    }
    
    // Calculate z coordinate for sphere surface using the sphere equation
    float z = sqrt(1.0 - d);
    
    // Get the right and up vectors from view matrix (same as vertex shader)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
    vec3 forward = vec3(uViewMatrix[0][2], uViewMatrix[1][2], uViewMatrix[2][2]);
    
    // Calculate the sphere surface position in world space
    // Match the vertex shader mapping: aPosition.x * right + aPosition.z * up
    // coord.x maps to aPosition.x, coord.y maps to aPosition.z
    vec3 worldCenter = vInstanceCenter;
    vec3 sphereOffset = (coord.x * right + coord.y * up + z * forward) * vInstanceRadius;
    vec3 worldSurfacePos = worldCenter + sphereOffset;
    
    // Calculate proper depth by transforming surface position to clip space
    vec4 clipPos = uProjectionMatrix * uViewMatrix * vec4(worldSurfacePos, 1.0);
    float ndcDepth = clipPos.z / clipPos.w;
    
    // Use standard depth calculation (WebGL ES doesn't have gl_DepthRange)
    gl_FragDepth = (ndcDepth + 1.0) * 0.5;
    
    // Calculate surface normal directly from sphere coordinates
    // For dual-tone lighting, we work in world space
    vec3 normal = normalize(vec3(coord.x, coord.y, z));
    
    // Transform normal to world space to match cylinder lighting
    vec3 worldNormal = normal; // Already in local space, no transformation needed for billboard
    
    // === DUAL-TONE LIGHTING (Matching pipe shader) ===
    // Calculate view direction in world space
    vec3 viewDir = normalize(uCameraPos - worldSurfacePos);
    
    // Ensure normal faces the camera for consistent lighting
    float normalDotView = max(0.0, dot(worldNormal, viewDir));
    if (normalDotView < 0.0) {
        worldNormal = -worldNormal;
        normalDotView = max(0.0, dot(worldNormal, viewDir));
    }
    
    // Light direction (matching pipe shader)
    vec3 lightDir = normalize(uLightDir);
    
    // Half vector for Blinn-Phong
    vec3 halfVector = normalize(lightDir + viewDir);
    
    // Calculate diffuse and specular contributions with improved falloff
    float diffuse = max(0.0, dot(worldNormal, lightDir));
    float specular = pow(max(0.0, dot(worldNormal, halfVector)), 32.0); // Restored high shininess
    
    // EXTREMELY SUBTLE RIM LIGHTING FOR SPHERES
    // Use very gentle rim lighting effect for spheres
    float fresnel = pow(1.0 - max(0.0, normalDotView), 3.0);
    float rimLight = pow(1.0 - max(0.0, normalDotView), 5.0);
    
    // Very subtle specular enhancement for spheres
    float specularEnhancement = 0.1 * fresnel + 0.05 * rimLight;
    
    // IMPROVED MATERIAL PROPERTIES
    vec3 baseColor = vInstanceColor;
    
    // Reduced ambient calculation with subtle tint
    vec3 ambient = baseColor * 0.3;
    
    // Reduced diffuse with better light balance
    vec3 diffuseContrib = baseColor * diffuse * uLightColor * 0.6;
    
    // Slightly enhanced specular highlights with very subtle rim lighting
    vec3 specularContrib = uLightColor * (specular + specularEnhancement) * 0.8;
    
    // Extremely subtle rim lighting for spheres
    vec3 rimContrib = vec3(0.05, 0.08, 0.1) * rimLight * 0.06;
    
    // Combine all contributions with better balance
    vec3 finalColor = ambient + diffuseContrib + specularContrib + rimContrib;
    
    fragColor = vec4(finalColor, 1.0);
}
