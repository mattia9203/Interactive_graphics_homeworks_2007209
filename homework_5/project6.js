var raytraceFS = `
struct Ray {
    vec3 pos;
    vec3 dir;
};

struct Material {
    vec3  k_d; // diffuse color
    vec3  k_s; // specular color
    float n;   // shininess
};

struct Sphere {
    vec3     center;
    float    radius;
    Material mtl;
};

struct Light {
    vec3 position;
    vec3 intensity;
};

struct HitInfo {
    float    t;
    vec3     position;
    vec3     normal;
    Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

// Returns true if the ray hits any sphere, updating HitInfo to the closest intersection
bool IntersectRay(inout HitInfo hit, Ray ray) {
    hit.t = 1e30;
    bool hasHit = false;
    ray.dir = normalize(ray.dir);
    for (int i = 0; i < NUM_SPHERES; ++i) {
        vec3 toCenter = ray.pos - spheres[i].center;
        float b = dot(ray.dir, toCenter);
        float c = dot(toCenter, toCenter) - spheres[i].radius * spheres[i].radius;
        float discriminant = b * b - c;
        if (discriminant > 0.0) {
            float t = -b - sqrt(discriminant);
            if (t > 0.0001 && t < hit.t) {
                hit.t = t;
                hit.position = ray.pos + t * ray.dir;
                hit.normal = normalize(hit.position - spheres[i].center);
                hit.mtl = spheres[i].mtl;
                hasHit = true;
            }
        }
    }
    return hasHit;
}

// Computes color at a surface point using Blinn-Phong shading and hard shadows
vec3 Shade(Material mtl, vec3 position, vec3 normal, vec3 view) {
    vec3 total = vec3(0.0);
    for (int i = 0; i < NUM_LIGHTS; ++i) {
        vec3 lightVec = lights[i].position - position;
        float lightDist = length(lightVec);
        vec3 lightDir = lightVec / lightDist;

        // Shadow ray setup
        Ray shadowRay;
        shadowRay.pos = position + normal * 1e-3;
        shadowRay.dir = lightDir;

        HitInfo shadowHit;
        bool blocked = IntersectRay(shadowHit, shadowRay) && (shadowHit.t < lightDist - 1e-3);
        if (blocked)
            continue;

        float diff = dot(normal, lightDir);
        if (diff > 0.0) {
            vec3 diffuse = mtl.k_d * diff;
            vec3 halfway = normalize(lightDir + view);
            float specAngle = max(dot(normal, halfway), 0.0);
            vec3 specular = mtl.k_s * pow(specAngle, mtl.n);
            total += (diffuse + specular) * lights[i].intensity;
        }
    }
    return total;
}

// Main recursive ray tracing function, includes reflections
vec4 RayTracer(Ray ray) {
    HitInfo hit;
    if (IntersectRay(hit, ray)) {
        vec3 viewDir = normalize(-ray.dir);
        vec3 color = Shade(hit.mtl, hit.position, hit.normal, viewDir);

        vec3 reflMask = hit.mtl.k_s;
        for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
            if (bounce >= bounceLimit)
                break;
            if (reflMask.r + reflMask.g + reflMask.b <= 0.0)
                break;

            Ray reflRay;
            reflRay.pos = hit.position;
            reflRay.dir = normalize(reflect(-viewDir, hit.normal));

            HitInfo reflHit;
            if (IntersectRay(reflHit, reflRay)) {
                viewDir = normalize(-reflRay.dir);
                color += reflMask * Shade(reflHit.mtl, reflHit.position, reflHit.normal, viewDir);
                reflMask *= reflHit.mtl.k_s;
                hit = reflHit;
            } else {
                color += reflMask * textureCube(envMap, reflRay.dir.xzy).rgb;
                break;
            }
        }
        return vec4(color, 1.0);
    } else {
        return vec4(textureCube(envMap, ray.dir.xzy).rgb, 0.0);
    }
}
`;
