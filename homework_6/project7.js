// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.

function GetModelViewMatrix(tx, ty, tz, pitch, yaw) {
    const cosX = Math.cos(pitch), sinX = Math.sin(pitch);
    const cosY = Math.cos(yaw),   sinY = Math.sin(yaw);

    // Rotation about X axis
    const rotX = [1,0,0,0, 0,cosX,sinX,0, 0,-sinX,cosX,0, 0,0,0,1];
    // Rotation about Y axis
    const rotY = [cosY,0,-sinY,0, 0,1,0,0, sinY,0,cosY,0, 0,0,0,1];
    const R = MatrixMult(rotY, rotX);
    R[12] = tx;  R[13] = ty;  R[14] = tz;
    return R;
}

class MeshDrawer {
    constructor() {
        this.prog = InitShaderProgram(VERT_SRC, FRAG_SRC);
        gl.useProgram(this.prog);

        // Attributes
        this.aPos    = gl.getAttribLocation(this.prog, "pos");
        this.aNorm   = gl.getAttribLocation(this.prog, "norm");
        this.aTex    = gl.getAttribLocation(this.prog, "txc");
        // Uniforms
        this.uMVP    = gl.getUniformLocation(this.prog, "mvp");
        this.uMV     = gl.getUniformLocation(this.prog, "mv");
        this.uMVN    = gl.getUniformLocation(this.prog, "mvn");
        this.uSwap   = gl.getUniformLocation(this.prog, "y_up");
        this.uShow   = gl.getUniformLocation(this.prog, "show");
        this.uTex    = gl.getUniformLocation(this.prog, "tex");
        this.uLight  = gl.getUniformLocation(this.prog, "light");
        this.uAlpha  = gl.getUniformLocation(this.prog, "alpha");

        // buffers
        this.bufPos  = gl.createBuffer();
        this.bufNorm = gl.createBuffer();
        this.bufUV   = gl.createBuffer();
        this.texID   = gl.createTexture();

        this.vertexCount = 0;
        this.swapAxes    = true;
        this.wantTex     = true;
        this.hasTex      = false;
        this.alpha       = 32.0;
        this.lightDir    = [0,0,1];
    }

    setMesh(posArr, uvArr, normArr) {
        this.vertexCount = posArr.length / 3;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posArr), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNorm);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normArr), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvArr), gl.STATIC_DRAW);
    }
    swapYZ(flag) { this.swapAxes = !!flag; }
    showTexture(flag) { this.wantTex = !!flag; }
    setTexture(image) {
        gl.bindTexture(gl.TEXTURE_2D, this.texID);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        this.hasTex = true;
    }
    setLightDir(x,y,z) { this.lightDir = [x,y,z]; }
    setShininess(a) { this.alpha = a; }

    draw(MVP, MV, normalMat) {
        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.uMVP, false, MVP);
        gl.uniformMatrix4fv(this.uMV, false, MV);
        gl.uniformMatrix3fv(this.uMVN, false, normalMat);
        gl.uniform1i(this.uSwap, this.swapAxes ? 1 : 0);
        gl.uniform3fv(this.uLight, this.lightDir);
        gl.uniform1f(this.uAlpha, this.alpha);
        gl.uniform1i(this.uShow, (this.hasTex && this.wantTex) ? 1 : 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texID);
        gl.uniform1i(this.uTex, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.enableVertexAttribArray(this.aPos);
        gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNorm);
        gl.enableVertexAttribArray(this.aNorm);
        gl.vertexAttribPointer(this.aNorm, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
        gl.enableVertexAttribArray(this.aTex);
        gl.vertexAttribPointer(this.aTex, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    }
}

function SimTimeStep(dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution) {
    const n = positions.length;
    const forces = Array.from({ length: n }, () => gravity.mul(particleMass));
    for (let {p0:i, p1:j, rest} of springs) {
        const rel = positions[i].sub(positions[j]);
        const d = rel.len(); if (d===0) continue;
        const dir = rel.div(d);
        const springF = dir.mul(stiffness*(d-rest));
        forces[i].inc(springF.mul(-1)); forces[j].inc(springF);
        const dampF = dir.mul(damping*velocities[i].sub(velocities[j]).dot(dir));
        forces[i].inc(dampF.mul(-1)); forces[j].inc(dampF);
    }
    for (let i=0;i<n;i++){
        if (massSpring.selVert===i) continue;
        const a = forces[i].div(particleMass);
        velocities[i].inc(a.mul(dt));
        positions[i].inc(velocities[i].mul(dt));
    }
    for (let i=0;i<n;i++){
        ['x','y','z'].forEach(ax=>{
            let p=positions[i][ax], v=velocities[i][ax];
            if(p<-1||p>1){
                const pen = p<-1?-1-p:p-1;
                positions[i][ax]=(p<-1?-1:1)-restitution*pen;
                velocities[i][ax]=-v*restitution;
            }
        });
    }
}

const VERT_SRC = `
    uniform bool y_up;
    attribute vec3 pos, norm;
    attribute vec2 txc;
    uniform mat4 mvp, mv;
    uniform mat3 mvn;
    varying vec3 n, p;
    varying vec2 texCoord;
    void main() {
      if (y_up) {
        gl_Position = mvp * vec4(pos, 1);
        p = (mv * vec4(pos,1)).xyz;
        n = normalize(mvn * norm);
      } else {
        mat4 swap = mat4(
          1,0,0,0,
          0,0,-1,0,
          0,1,0,0,
          0,0,0,1
        );
        gl_Position = mvp * swap * vec4(pos,1);
        p = (mv * swap * vec4(pos,1)).xyz;
        n = normalize(mvn * (swap * vec4(norm,0)).xyz);
      }
      texCoord = txc;
    }
`;

const FRAG_SRC = `
    precision mediump float;
    uniform sampler2D tex;
    uniform bool show;
    uniform float alpha;
    uniform vec3 light;
    varying vec3 n, p;
    varying vec2 texCoord;
    void main() {
      vec3 omega = normalize(light);
      float intensity = length(light);
      vec3 N = normalize(n);
      vec3 V = -normalize(p);
      vec3 H = normalize(omega + V);
      vec4 base = show ? texture2D(tex, texCoord) : vec4(1);
      float diff = max(dot(omega, N), 0.0);
      float spec = pow(max(dot(H, N), 0.0), alpha);
      gl_FragColor = intensity * (diff + spec) * base;
    }
`;
