import ig from './ig.js';
import './image.js';

ig.Font = ig.Image.extend({
	widthMap: [],
	indices: [],
	firstChar: 32,
	alpha: 1,
	letterSpacing: 1,
	lineSpacing: 0,
	
	
	onload: function( ev ) {
		var sourceWidth = this.atlasEntry && this.atlasEntry.sourceSize
			? this.atlasEntry.sourceSize.w
			: this.data.width;
		var sourceHeight = this.atlasEntry && this.atlasEntry.sourceSize
			? this.atlasEntry.sourceSize.h
			: this.data.height;

		this._loadMetrics( sourceWidth, sourceHeight );
		this.parent( ev );
		this.height -= 2; // last 2 lines contain no visual data
	},


	widthForString: function( text ) {
		// Multiline?
		if( text.indexOf('\n') !== -1 ) {
			var lines = text.split( '\n' );
			var width = 0;
			for( var i = 0; i < lines.length; i++ ) {
				width = Math.max( width, this._widthForLine(lines[i]) );
			}
			return width;
		}
		else {
			return this._widthForLine( text );
		}
	},

	
	_widthForLine: function( text ) {
		var width = 0;
		for( var i = 0; i < text.length; i++ ) {
			width += this.widthMap[text.charCodeAt(i) - this.firstChar];
		}
		if( text.length > 0 ) {
			width += this.letterSpacing * (text.length - 1);
		}
		return width;
	},


	heightForString: function( text ) {
		return text.split('\n').length * (this.height + this.lineSpacing);
	},
	
	
	draw: function( text, x, y, align ) {
		if( typeof(text) != 'string' ) {
			text = text.toString();
		}
		
		// Multiline?
		if( text.indexOf('\n') !== -1 ) {
			var lines = text.split( '\n' );
			var lineHeight = this.height + this.lineSpacing;
			for( var i = 0; i < lines.length; i++ ) {
				this.draw( lines[i], x, y + i * lineHeight, align );
			}
			return;
		}
		
		if( align == ig.Font.ALIGN.RIGHT || align == ig.Font.ALIGN.CENTER ) {
			var width = this._widthForLine( text );
			x -= align == ig.Font.ALIGN.CENTER ? width/2 : width;
		}
		

		if( this.alpha !== 1 ) {
			ig.system.context.globalAlpha = this.alpha;
		}

		for( var i = 0; i < text.length; i++ ) {
			var c = text.charCodeAt(i);
			x += this._drawChar( c - this.firstChar, x, y );
		}

		if( this.alpha !== 1 ) {
			ig.system.context.globalAlpha = 1;
		}
		ig.Image.drawCount += text.length;
	},
	
	
	_drawChar: function( c, targetX, targetY ) {
		if( !this.loaded || c < 0 || c >= this.indices.length ) { return 0; }
		
		var scale = ig.system.scale;
		var atlasOffsetX = this.atlasEntry ? this.atlasEntry.frame.x * scale : 0;
		var atlasOffsetY = this.atlasEntry ? this.atlasEntry.frame.y * scale : 0;
		
		var charX = atlasOffsetX + this.indices[c] * scale;
		var charY = atlasOffsetY;
		var charWidth = this.widthMap[c] * scale;
		var charHeight = this.height * scale;
		
		ig.system.context.drawImage( 
			this.data,
			charX, charY,
			charWidth, charHeight,
			ig.system.getDrawPos(targetX), ig.system.getDrawPos(targetY),
			charWidth, charHeight
		);
		
		return this.widthMap[c] + this.letterSpacing;
	},
	
	
	_loadMetrics: function( imageWidth, imageHeight ) {
		// Draw the bottommost line of this font image into an offscreen canvas
		// and analyze it pixel by pixel.
		// A run of non-transparent pixels represents a character and its width
		
		this.widthMap = [];
		this.indices = [];
		
		var px = this.getImagePixels( 0, imageHeight-1, imageWidth, 1 );
		
		var currentWidth = 0;
		for( var x = 0; x < imageWidth; x++ ) {
			var index = x * 4 + 3; // alpha component of this pixel
			if( px.data[index] > 127 ) {
				currentWidth++;
			}
			else if( px.data[index] < 128 && currentWidth ) {
				this.widthMap.push( currentWidth );
				this.indices.push( x-currentWidth );
				currentWidth = 0;
			}
		}
		this.widthMap.push( currentWidth );
		this.indices.push( x-currentWidth );
	}
});


ig.Font.ALIGN = {
	LEFT: 0,
	RIGHT: 1,
	CENTER: 2
};
