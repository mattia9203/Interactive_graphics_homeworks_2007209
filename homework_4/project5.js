// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
/*---------------------------------------------------------
  1.  GetModelViewMatrix : translate → rotateX → rotateY
---------------------------------------------------------*/
function GetModelViewMatrix(tx, ty, tz, pitch, yaw) {
	const cX = Math.cos(pitch), sX = Math.sin(pitch);
	const cY = Math.cos(yaw  ), sY = Math.sin(yaw );
  
	/* rotation about X */
	const Rx = [
	  1,  0,   0, 0,
	  0,  cX,  sX, 0,
	  0, -sX,  cX, 0,
	  0,  0,   0, 1
	];
  
	/* rotation about Y */
	const Ry = [
	   cY, 0, -sY, 0,
		0, 1,   0, 0,
	   sY, 0,  cY, 0,
		0, 0,   0, 1
	];
  
	/* R = Ry · Rx (column-major) */
	const R = MatrixMult(Ry, Rx);
  
	/* embed translation */
	R[12] = tx;  R[13] = ty;  R[14] = tz;
	return R;
  }
  
  
  /*---------------------------------------------------------
	2.  MeshDrawer  –  same API, shading + texture fixed
  ---------------------------------------------------------*/
class MeshDrawer {
	constructor() {
	  /* compile + link */
	  this.program = InitShaderProgram(VERT_SRC, FRAG_SRC);
	  gl.useProgram(this.program);
  
	  /* attribute locations */
	  this.aPos  = gl.getAttribLocation(this.program, "aPosition");
	  this.aNorm = gl.getAttribLocation(this.program, "aNormal");
	  this.aUV   = gl.getAttribLocation(this.program, "aTexCoord");
  
	  /* uniform locations */
	  this.uMVP        = gl.getUniformLocation(this.program, "uMVP");
	  this.uMV         = gl.getUniformLocation(this.program, "uMV");
	  this.uNormalMat  = gl.getUniformLocation(this.program, "uNormalMat");
	  this.uSwapYZ     = gl.getUniformLocation(this.program, "uSwapYZ");
	  this.uUseTexture = gl.getUniformLocation(this.program, "uUseTexture"); // <-- fixed
	  this.uSampler    = gl.getUniformLocation(this.program, "uSampler");
	  this.uLightDir   = gl.getUniformLocation(this.program, "uLightDir");
	  this.uShininess  = gl.getUniformLocation(this.program, "uShininess");
  
	  /* buffers + texture */
	  this.bPos  = gl.createBuffer();
	  this.bNorm = gl.createBuffer();
	  this.bUV   = gl.createBuffer();
	  this.texID = gl.createTexture();
  
	  /* state flags */
	  this.vertCount   = 0;
	  this.swapAxes    = false;
	  this.wantTexture = true;
	  this.hasTexture  = false;
  
	  /* default material */
	  gl.uniform1f(this.uShininess, 32.0);
	}
  
	/* Upload OBJ data --------------------------------------------------*/
	setMesh(vertPos, texCoords, normals) {
	  this.vertCount = vertPos.length / 3;
  
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
  
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.bNorm);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.bUV);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}
  
	/* UI toggles -------------------------------------------------------*/
	swapYZ(flag)      { this.swapAxes    = !!flag; }
	showTexture(flag) { this.wantTexture = !!flag; }
  
	/* Texture upload ---------------------------------------------------*/
	setTexture(img) {
	  gl.bindTexture(gl.TEXTURE_2D, this.texID);
	  gl.texImage2D(gl.TEXTURE_2D, 0,
					gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
	  gl.generateMipmap(gl.TEXTURE_2D);
	  gl.texParameteri(gl.TEXTURE_2D,
					   gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	  gl.texParameteri(gl.TEXTURE_2D,
					   gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	  gl.texParameteri(gl.TEXTURE_2D,
					   gl.TEXTURE_WRAP_S, gl.REPEAT);
	  gl.texParameteri(gl.TEXTURE_2D,
					   gl.TEXTURE_WRAP_T, gl.REPEAT);
	  this.hasTexture = true;
	}
  
	/* Lighting controls -----------------------------------------------*/
	setLightDir(x, y, z) {
	  gl.useProgram(this.program);
	  const len = Math.hypot(x, y, z) || 1.0;
	  gl.uniform3f(this.uLightDir, x/len, y/len, z/len); // arrow → light
	}
	setShininess(exp) {
	  gl.useProgram(this.program);
	  gl.uniform1f(this.uShininess, exp);
	}
  
	/* Draw -------------------------------------------------------------*/
	draw(MVP, MV, normalMat) {
	  gl.useProgram(this.program);
  
	  gl.uniformMatrix4fv(this.uMVP,       false, MVP);
	  gl.uniformMatrix4fv(this.uMV,        false, MV);
	  gl.uniformMatrix3fv(this.uNormalMat, false, normalMat);
	  gl.uniform1i(this.uSwapYZ, this.swapAxes ? 1 : 0);
	  gl.uniform1i(
		this.uUseTexture,
		(this.hasTexture && this.wantTexture) ? 1 : 0
	  );
  
	  /* bind texture */
	  gl.activeTexture(gl.TEXTURE0);
	  gl.bindTexture(gl.TEXTURE_2D, this.texID);
	  gl.uniform1i(this.uSampler, 0);
  
	  /* attributes */
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos);
	  gl.enableVertexAttribArray(this.aPos);
	  gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
  
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.bNorm);
	  gl.enableVertexAttribArray(this.aNorm);
	  gl.vertexAttribPointer(this.aNorm, 3, gl.FLOAT, false, 0, 0);
  
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.bUV);
	  gl.enableVertexAttribArray(this.aUV);
	  gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, 0, 0);
  
	  /* draw */
	  gl.drawArrays(gl.TRIANGLES, 0, this.vertCount);
	}
}
  
  
  /* ---------------------------------------------------------------------------
	 3.  GLSL sources
  --------------------------------------------------------------------------- */
const VERT_SRC = `
	precision mediump float;
	attribute vec3 aPosition, aNormal;
	attribute vec2 aTexCoord;
  
	uniform mat4 uMVP, uMV;
	uniform mat3 uNormalMat;
	uniform bool uSwapYZ;
  
	varying vec3 vN, vP;
	varying vec2 vUV;
  
	void main() {
	  vec4 P = vec4(aPosition, 1.0);
	  vec3 N = aNormal;
	  if (uSwapYZ) {
		P = vec4(P.x, P.z, -P.y, 1.0);
		N = vec3(N.x, N.z, -N.y);
	  }
	  gl_Position = uMVP * P;
	  vP = (uMV * P).xyz;
	  vN = normalize(uNormalMat * N);
	  vUV = aTexCoord;
	}
`;
  
const FRAG_SRC = `
	precision mediump float;
  
	uniform sampler2D uSampler;
	uniform bool  uUseTexture;
	uniform vec3  uLightDir;   // arrow → light
	uniform float uShininess;
  
	varying vec3 vN, vP;
	varying vec2 vUV;
  
	void main() {
	  vec3 N = normalize(vN);
	  vec3 L = normalize(uLightDir);     // use as-is
	  vec3 V = normalize(-vP);
	  vec3 H = normalize(L + V);
  
	  float ambient = 0.1;
	  float diff    = max(dot(N, L), 0.0);
	  float spec    = pow(max(dot(N, H), 0.0), uShininess);
  
	  vec4 base = uUseTexture ? texture2D(uSampler, vUV)
							  : vec4(1.0);
  
	  vec3 rgb = base.rgb * (ambient + diff + spec);
	  gl_FragColor = vec4(rgb, base.a);
	}
`;