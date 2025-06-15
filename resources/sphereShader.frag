#version 300 es
precision mediump float;
uniform vec3 uLightPos;
uniform vec3 uLightColor;

in vec2 vTexCoord;
in vec3 vWorldPos;
in vec3 vInstanceColor;
in vec3 vInstanceCenter;
in vec3 vCameraPos;

out vec4 fragColor;

void main() {
    // Map texture coordinates to [-1, 1] range, centered at (0.5, 0.5)
    vec2 uv = (vTexCoord - vec2(0.5)) * 2.0;
    float distFromCenter = length(uv);
    
    // Compute alpha for smooth anti-aliasing
    float edgeWidth = 0.05; // Width of the anti-aliasing transition (adjust as needed)
    float alpha = smoothstep(1.0, 1.0 - edgeWidth, distFromCenter);
    
    // Early exit for fully transparent fragments to optimize
    if (alpha <= 0.0) {
        discard;
    }
    
    // Calculate the Z coordinate for the sphere surface
    float z = sqrt(1.0 - distFromCenter * distFromCenter);
    
    // The normal in tangent space (relative to the quad)
    vec3 normal = normalize(vec3(uv.x, uv.y, z));
    
    // Lighting calculations
    vec3 lightDir = normalize(uLightPos - vWorldPos);
    vec3 viewDir = normalize(vCameraPos - vWorldPos);
    
    // Ambient
    float ambientStrength = 0.3;
    vec3 ambient = ambientStrength * vInstanceColor;
    
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * vInstanceColor;
    
    // Specular
    float specularStrength = 0.8;
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * uLightColor;
    
    // Combine lighting components with alpha
    fragColor = vec4(ambient + diffuse + specular, alpha);
}