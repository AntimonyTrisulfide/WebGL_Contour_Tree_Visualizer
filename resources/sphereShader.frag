#version 300 es
precision highp float;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPos;
uniform vec3 uLight1Dir;
uniform vec3 uLight1Color;
uniform vec3 uLight2Dir;
uniform vec3 uLight2Color;

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
    
    // Light directions (matching pipe shader)
    vec3 light1Dir = normalize(uLight1Dir);
    vec3 light2Dir = normalize(uLight2Dir);
    
    // Half vectors for Blinn-Phong
    vec3 halfVector1 = normalize(light1Dir + viewDir);
    vec3 halfVector2 = normalize(light2Dir + viewDir);
    
    // Calculate diffuse contributions with improved falloff
    float diffuse1 = max(0.0, dot(worldNormal, light1Dir));
    float diffuse2 = max(0.0, dot(worldNormal, light2Dir));
    
    // Improved specular calculation with restored shininess
    float specular1 = pow(max(0.0, dot(worldNormal, halfVector1)), 32.0); // Restored high shininess
    float specular2 = pow(max(0.0, dot(worldNormal, halfVector2)), 32.0); // Made equal for balanced lighting
    
    // EXTREMELY SUBTLE RIM LIGHTING FOR SPHERES
    // Use very gentle rim lighting effect for spheres
    float fresnel = pow(1.0 - max(0.0, normalDotView), 3.0);
    float rimLight = pow(1.0 - max(0.0, normalDotView), 5.0);
    
    // Very subtle specular enhancement for spheres
    float specularEnhancement = 0.1 * fresnel + 0.05 * rimLight;
    
    // IMPROVED MATERIAL PROPERTIES
    vec3 baseColor = vInstanceColor;
    
    // Reduced ambient calculation with subtle tint
    vec3 ambient = baseColor * 0.25 * vec3(0.9, 0.95, 1.0);
    
    // Reduced diffuse with better light balance
    vec3 diffuseContrib1 = baseColor * diffuse1 * uLight1Color * 0.4;
    vec3 diffuseContrib2 = baseColor * diffuse2 * uLight2Color * 0.4;
    
    // Slightly enhanced specular highlights with very subtle rim lighting
    vec3 specularContrib1 = uLight1Color * (specular1 + specularEnhancement) * 0.5;
    vec3 specularContrib2 = uLight2Color * (specular2 + specularEnhancement) * 0.5;
    
    // Extremely subtle rim lighting for spheres
    vec3 rimContrib = vec3(0.05, 0.08, 0.1) * rimLight * 0.02;
    
    // Combine all contributions with better balance
    vec3 finalColor = ambient + diffuseContrib1 + diffuseContrib2 + 
                     specularContrib1 + specularContrib2 + rimContrib;
    
    fragColor = vec4(finalColor, 1.0);
}
