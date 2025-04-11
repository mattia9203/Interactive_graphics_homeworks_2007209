// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale )
{
	const rad = rotation * Math.PI / 180;
	const cos = Math.cos(rad);
  	const sin = Math.sin(rad);
  
  	// Create the 3x3 transformation matrix.
  	// Column-major order:
  	// [ a, d, g,
  	//   b, e, h,
  	//   c, f, i ]
  	// where the transformation matrix is:
  	// [ scale * cos, -sin,       positionX,
  	//   sin,         scale * cos,  positionY,
  	//   0,           0,            1         ]
  	return [
    	scale * cos,  // element (0,0)
    	sin,         // element (1,0)
    	0,           // element (2,0)
    
    	-sin,        // element (0,1)
    	scale * cos, // element (1,1)
    	0,           // element (2,1)
    
    	positionX,   // element (0,2)
    	positionY,   // element (1,2)
    	1            // element (2,2)
  	];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{
	const result = new Array(9).fill(0);

	// Matrix multiplication: result = trans2 * trans1
	for (let row = 0; row < 3; ++row) {
	  for (let col = 0; col < 3; ++col) {
		for (let k = 0; k < 3; ++k) {
		  // For column-major order, compute the correct indices
		  result[col * 3 + row] += trans2[k * 3 + row] * trans1[col * 3 + k];
		}
	  }
	}
  
	return result;
}
