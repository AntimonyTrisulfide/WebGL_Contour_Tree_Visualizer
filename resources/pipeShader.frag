#version 300 es
precision highp float;

uniform vec3 uLightPos;
uniform vec3 uLightColor;

in vec3 vCylStart;
in vec3 vCylEnd;
in float vRadius;
in vec3 vInstanceColor;
in vec3 vCameraPos;
in vec3 vWorldPos;

out vec4 fragColor;

void main() {
    // Cylinder properties
    vec3 cylDir = normalize(vCylEnd - vCylStart);
    float cylHeight = length(vCylEnd - vCylStart) * 0.5;
    vec3 cylCenter = (vCylStart + vCylEnd) * 0.5;
    
    // Ray setup
    vec3 rayOrigin = vCameraPos;
    vec3 rayDir = normalize(vWorldPos - vCameraPos);
    
    // Local coordinate system
    vec3 up = cylDir;
    vec3 right;
    if (abs(dot(up, vec3(0.0, 1.0, 0.0))) > 0.999) {
        right = normalize(cross(vec3(1.0, 0.0, 0.0), up));
    } else {
        right = normalize(cross(vec3(0.0, 1.0, 0.0), up));
    }
    vec3 forward = normalize(cross(up, right));
    
    // World-to-cylinder transformation
    mat3 worldToCyl = mat3(
        right.x, up.x, forward.x,
        right.y, up.y, forward.y,
        right.z, up.z, forward.z
    );
    
    // Cylinder-to-world transformation
    mat3 cylToWorld = mat3(
        right.x, right.y, right.z,
        up.x, up.y, up.z,
        forward.x, forward.y, forward.z
    );
    
    // Transform ray to local space
    vec3 ro = worldToCyl * (rayOrigin - cylCenter);
    vec3 rd = worldToCyl * rayDir;
    
    // Ray-cylinder intersection (side)
    float A = rd.x * rd.x + rd.z * rd.z;
    float B = 2.0 * (ro.x * rd.x + ro.z * rd.z);
    float C = ro.x * ro.x + ro.z * ro.z - vRadius * vRadius;
    float D = B * B - 4.0 * A * C;
    
    float t = 1e20;
    vec3 localNormal;
    vec3 localHitPos;
    bool hit = false;
    bool isCapHit = false;
    
    // Side surface intersection
    if (D >= 0.0 && A > 0.001) {
        float sqrtD = sqrt(D);
        float t0 = (-B - sqrtD) / (2.0 * A);
        float t1 = (-B + sqrtD) / (2.0 * A);
        
        for (int i = 0; i < 2; ++i) {
            float tt = i == 0 ? t0 : t1;
            vec3 p = ro + rd * tt;
            if (tt > 0.0 && abs(p.y) <= cylHeight && tt < t) {
                t = tt;
                localHitPos = p;
                localNormal = normalize(vec3(p.x, 0.0, p.z));
                hit = true;
            }
        }
    }
    
    // Caps intersection
    for (int i = -1; i <= 1; i += 2) {
        if (abs(rd.y) > 0.001) {
            float capY = float(i) * cylHeight;
            float tt = (capY - ro.y) / rd.y;
            vec3 p = ro + rd * tt;
            if (tt > 0.0 && (p.x * p.x + p.z * p.z) <= vRadius * vRadius && tt < t) {
                t = tt;
                localHitPos = p;
                localNormal = vec3(0.0, float(i), 0.0);
                hit = true;
                isCapHit = true;
            }
        }
    }
    
    if (!hit) {
        discard;
    }
    
    // Transform hit position and normal to world space
    vec3 worldHitPos = cylCenter + cylToWorld * localHitPos;
    vec3 worldNormal = normalize(cylToWorld * localNormal);
    
    // Compute anti-aliasing alpha
    float alpha = 1.0;
    float edgeWidth = 0.005; // Adjust this value (try 0.002 to 0.01) for a tighter transition
    if (isCapHit) {
        float radialDist = sqrt(localHitPos.x * localHitPos.x + localHitPos.z * localHitPos.z);
        float edgeDistance = abs(radialDist - vRadius);
        alpha = smoothstep(edgeWidth, 0.0, edgeDistance);
    } else {
        float radialDist = sqrt(localHitPos.x * localHitPos.x + localHitPos.z * localHitPos.z);
        float edgeDistance = abs(radialDist - vRadius);
        alpha = smoothstep(edgeWidth, 0.0, edgeDistance);
    }
    
    // Early exit for fully transparent fragments
    if (alpha <= 0.0) {
        discard;
    }
    
    // Lighting calculations (unchanged)
    vec3 lightDir = normalize(uLightPos - worldHitPos);
    vec3 viewDir = normalize(vCameraPos - worldHitPos);
    vec3 halfDir = normalize(lightDir + viewDir);
    
    // Ambient
    float ambientStrength = 0.3;
    vec3 ambient = ambientStrength * vInstanceColor;
    
    // Diffuse
    float diff = max(dot(worldNormal, lightDir), 0.0);
    vec3 diffuse = diff * vInstanceColor;
    
    // Specular
    float specularStrength = 0.8;
    float spec = pow(max(dot(worldNormal, halfDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * uLightColor;
    
    // Combine lighting
    vec3 result = ambient + diffuse + specular;
    
    // Apply anti-aliased alpha
    fragColor = vec4(result, alpha);
}