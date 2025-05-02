// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.

// multiply two 4×4 column-major matrices (a · b)
function mat4Mul(a, b) {
	const out = new Float32Array(16);
	for (let c = 0; c < 4; ++c) {
	  for (let r = 0; r < 4; ++r) {
		let s = 0;
		for (let k = 0; k < 4; ++k) {
		  s += a[r + 4*k] * b[k + 4*c];
		}
		out[r + 4*c] = s;
	  }
	}
	return Array.from(out);
  }
  
  // Build the Model-View-Projection matrix as:
  //    MVP =  P × T(tx,ty,tz) × Ry(ry) × Rx(rx)
  function GetModelViewProjection(P, tx, ty, tz, rx, ry) {
	// — translation
	const T = [
	  1,0,0,0,
	  0,1,0,0,
	  0,0,1,0,
	  tx,ty,tz,1
	];
  
	// — rotation about Y (yaw)
	const cy = Math.cos(ry), sy = Math.sin(ry);
	const Ry = [
	   cy, 0, sy, 0,
		0, 1,  0, 0,
	  -sy, 0, cy, 0,
		0, 0,  0, 1
	];
  
	// — rotation about X (pitch)
	const cx = Math.cos(rx), sx = Math.sin(rx);
	const Rx = [
	  1,  0,  0, 0,
	  0, cx, -sx, 0,
	  0, sx,  cx, 0,
	  0,  0,   0, 1
	];
  
	// compose model = T × Ry × Rx
	const model = mat4Mul(T, mat4Mul(Ry, Rx));
	// final MVP = P × model
	return mat4Mul(P, model);
  }
  
  
  // --------------------------------------------------------------------
  // MeshDrawer — handles VBOs, shaders, texture setup & drawing
  // --------------------------------------------------------------------
  class MeshDrawer {
	constructor() {
	  // compile/link
	  this.program = InitShaderProgram(VERT_SRC, FRAG_SRC);
	  gl.useProgram(this.program);
  
	  // look up locations
	  this.locPos    = gl.getAttribLocation (this.program, "position");
	  this.locUV     = gl.getAttribLocation (this.program, "texuv");
	  this.uniMVP    = gl.getUniformLocation(this.program, "MVP");
	  this.uniSwap   = gl.getUniformLocation(this.program, "swapYZ");
	  this.uniUseTex = gl.getUniformLocation(this.program, "useTex");
	  this.uniSampler= gl.getUniformLocation(this.program, "sampler0");
  
	  // create GPU buffers & texture object
	  this.vboPos = gl.createBuffer();
	  this.vboUV  = gl.createBuffer();
	  this.texID  = gl.createTexture();
  
	  // internal state
	  this.triCount   = 0;
	  this.textureOK  = false;
	  this.wantTexture= true;
	  this.swapAxes   = false;
	}
  
	// called each time an OBJ is loaded
	setMesh(positions, uvs) {
	  this.triCount = positions.length / 3;
  
	  // upload positions
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
	  // upload UVs
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
	}
  
	// toggle Y↔Z swap
	swapYZ(flag) {
	  this.swapAxes = !!flag;
	}
  
	// called when texture image is ready
	setTexture(img) {
	  gl.bindTexture(gl.TEXTURE_2D, this.texID);
  
	  gl.texImage2D(
		gl.TEXTURE_2D, 0,
		gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
		img
	  );
	  gl.generateMipmap(gl.TEXTURE_2D);
  
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  
	  this.textureOK = true;
	}
  
	// toggle “show texture”
	showTexture(flag) {
	  this.wantTexture = !!flag;
	}
  
	// draw the mesh
	draw(mvp) {
	  gl.useProgram(this.program);
  
	  // upload uniforms
	  gl.uniformMatrix4fv(this.uniMVP, false, mvp);
	  gl.uniform1i(this.uniSwap,   this.swapAxes);
	  gl.uniform1i(this.uniUseTex, this.textureOK && this.wantTexture);
  
	  // bind texture unit 0
	  gl.activeTexture(gl.TEXTURE0);
	  gl.bindTexture(gl.TEXTURE_2D, this.texID);
	  gl.uniform1i(this.uniSampler, 0);
  
	  // set up position attribute
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
	  gl.enableVertexAttribArray(this.locPos);
	  gl.vertexAttribPointer(this.locPos, 3, gl.FLOAT, false, 0, 0);
  
	  // set up UV attribute
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
	  gl.enableVertexAttribArray(this.locUV);
	  gl.vertexAttribPointer(this.locUV, 2, gl.FLOAT, false, 0, 0);
  
	  // finally draw
	  gl.drawArrays(gl.TRIANGLES, 0, this.triCount);
	}
  }
  
  
  
  const VERT_SRC = `
	attribute vec3 position;
	attribute vec2 texuv;
  
	uniform mat4 MVP;
	uniform bool swapYZ;
  
	varying vec2 vUV;
  
	void main() {
	  vec3 p = position;
	  if (swapYZ) {
		p = vec3(p.x, p.z, p.y);
	  }
	  gl_Position = MVP * vec4(p, 1.0);
	  vUV = texuv;
	}
  `;
  
  const FRAG_SRC = `
	precision mediump float;
  
	uniform bool useTex;
	uniform sampler2D sampler0;
  
	varying vec2 vUV;
  
	void main() {
	  if (useTex) {
		gl_FragColor = texture2D(sampler0, vUV);
	  } else {
		float d = gl_FragCoord.z;
		gl_FragColor = vec4(1.0, d*d, 0.0, 1.0);
	  }
	}
  `;