#version 300 es
precision highp float;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

in vec2 vTexCoord;
in vec3 vWorldPos;
in vec3 vInstanceColor;
in vec3 vInstanceCenter;
in float vInstanceRadius;

out vec4 fragColor;

void main() {
    vec2 uv = (vTexCoord - vec2(0.5)) * 2.0;
    float distFromCenter = length(uv);
    
    if (distFromCenter > 1.0) {
        discard;
    }

    // TRY: Use the SAME coordinate transformation as the ray-casting version
    vec4 viewCenter = uViewMatrix * uModelMatrix * vec4(vInstanceCenter, 1.0);
    vec4 viewWorldPos = uViewMatrix * uModelMatrix * vec4(vWorldPos, 1.0);
    
    // Direct sphere calculation
    float distFromCenterSq = dot(uv, uv);
    float z = sqrt(max(0.0, 1.0 - distFromCenterSq));
    
    // Position on sphere surface in view space
    vec3 sphereOffset = vec3(uv.x, uv.y, z) * vInstanceRadius;
    vec3 viewHitPos = viewCenter.xyz + sphereOffset;
    
    // TRY: Use the SAME depth calculation as ray-casting version
    vec4 clipHitPos = uProjectionMatrix * vec4(viewHitPos, 1.0);
    float ndcDepth = clipHitPos.z / clipHitPos.w;
    gl_FragDepth = (ndcDepth + 1.0) * 0.5; // Same as ray-casting version
    
    // Surface normal points outward from sphere center
    vec3 viewNormal = normalize(sphereOffset);
    
    // Blinn-Phong lighting (Camera-based headlamp)
    // Light position offset from camera in view space to avoid centered specular highlight
    vec3 viewLightPos = vec3(1.0, 4.0, 5.0); // Fixed offset in view space
    
    vec3 lightDir = normalize(viewLightPos - viewHitPos);
    vec3 viewDir = normalize(-viewHitPos);
    vec3 halfVector = normalize(lightDir + viewDir);
    
    float diffuse = max(0.0, dot(viewNormal, lightDir));
    float specular = pow(max(0.0, dot(viewNormal, halfVector)), 32.0);
    
    // Consistent Blinn-Phong lighting
    vec3 baseColor = vInstanceColor;
    vec3 ambient = baseColor * 0.3;
    vec3 diffuseColor = baseColor * diffuse * 0.5;
    vec3 specularColor = vec3(1.0) * specular * 0.6;
    
    vec3 finalColor = ambient + diffuseColor + specularColor;
    
    fragColor = vec4(finalColor, 1.0);
}