// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite( bgImg, fgImg, fgOpac, fgPos )
{
    //Loop over foreground pixels
    for ( var i = 0; i < fgImg.height; ++i ) {
		if ( i + fgPos.y < 0 || i + fgPos.y >= bgImg.height ) 
            continue;
        //Loop over foreground columns
		for ( var j = 0; j < fgImg.width; ++j ) {
			const fgIdx = ( i * fgImg.width + j ) * 4;
			if (j + fgPos.x < 0 || j + fgPos.x >= bgImg.width ) 
                continue;
            //Update background pixel index and alpha values
			const bgIdx = ( (i + fgPos.y) * bgImg.width + j + fgPos.x) * 4;
			const alpha = fgImg.data[fgIdx + 3] * fgOpac / 255;
            //Compute final alpha value through alpha blending formula
			const finalAlpha = alpha + ( 1 - alpha ) * bgImg.data[bgIdx + 3] / 255;
            //Compute blended RGB colors
			for ( var k = 0; k < 3; ++k )
				bgImg.data[bgIdx + k] = (( 1 - alpha ) * bgImg.data[bgIdx + k] * bgImg.data[bgIdx + 3] / 255 + alpha * fgImg.data[fgIdx + k]) / finalAlpha;
			//Compute final alpha
            bgImg.data[bgIdx + k] = finalAlpha * 255;
		}
	}
}
