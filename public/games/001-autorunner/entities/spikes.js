import ig from '../../../lib/impact/impact.js';

const TILE_SIZE = 16;
const ROTATE_CCW = -Math.PI / 2;

const getOppositeClipOffset = function(size) {
	return Math.max(0, TILE_SIZE - size);
};

const isTruthySetting = function(value) {
	if (value === true || value === 1) {
		return true;
	}

	if (typeof value != 'string') {
		return false;
	}

	var normalized = value.trim().toLowerCase();
	return (
		normalized == '1' ||
		normalized == 'true' ||
		normalized == 'yes' ||
		normalized == 'ccw' ||
		normalized == 'counterclockwise' ||
		normalized == 'counter-clockwise'
	);
};

const isCounterClockwiseRotation = function(value) {
	if (typeof value == 'number') {
		var normalized = ((value % 360) + 360) % 360;
		return normalized == 270;
	}

	if (typeof value != 'string') {
		return false;
	}

	var normalized = value.trim().toLowerCase();
	return (
		normalized == '-90' ||
		normalized == '270' ||
		normalized == 'ccw' ||
		normalized == 'counterclockwise' ||
		normalized == 'counter-clockwise'
	);
};

const EntitySpikes = ig.Entity.extend({
	size: {x: 16, y: 16},
	gravityFactor: 0,
	zIndex: 20,

	_wmScalable: true,

	type: ig.Entity.TYPE.NONE,
	checkAgainst: ig.Entity.TYPE.A,
	collides: ig.Entity.COLLIDES.NEVER,

	rotateCcw: false,
	rotation: 0,
	animSheet: new ig.AnimationSheet('games/001-autorunner/media/spikes.png', 16, 16),

	init: function(x, y, settings) {
		this.parent(x, y, settings);
		this.addAnim('idle', 1, [0], true);
	},

	update: function() {},

	check: function(other) {
		if (other && typeof other.kill == 'function') {
			other.kill();
		}
	},

	isRotatedCounterClockwise: function() {
		return (
			isTruthySetting(this.rotateCcw) ||
			isTruthySetting(this.rotateCCW) ||
			isTruthySetting(this.rotated) ||
			isCounterClockwiseRotation(this.rotation) ||
			isCounterClockwiseRotation(this.angle)
		);
	},

	draw: function() {
		var image = this.animSheet.image;
		var screenX = this.pos.x - this.offset.x - ig.game._rscreen.x;
		var screenY = this.pos.y - this.offset.y - ig.game._rscreen.y;

		if (
			!image.loaded ||
			screenX > ig.system.width ||
			screenY > ig.system.height ||
			screenX + this.size.x < 0 ||
			screenY + this.size.y < 0
		) {
			return;
		}

		if (this.isRotatedCounterClockwise()) {
			this.drawVerticalSpikes(screenX, screenY);
		}
		else {
			this.drawHorizontalSpikes(screenX, screenY);
		}
	},

	drawHorizontalSpikes: function(screenX, screenY) {
		var width = Math.max(0, this.size.x);
		var height = Math.min(TILE_SIZE, Math.max(0, this.size.y));
		var sourceY = getOppositeClipOffset(height);

		if (!width || !height) {
			return;
		}

		for (var offsetX = 0; offsetX < width; offsetX += TILE_SIZE) {
			var segmentWidth = Math.min(TILE_SIZE, width - offsetX);
			this.animSheet.image.draw(
				screenX + offsetX,
				screenY,
				getOppositeClipOffset(segmentWidth),
				sourceY,
				segmentWidth,
				height
			);
		}
	},

	drawVerticalSpikes: function(screenX, screenY) {
		var width = Math.min(TILE_SIZE, Math.max(0, this.size.x));
		var height = Math.max(0, this.size.y);
		var sourceY = getOppositeClipOffset(width);

		if (!width || !height) {
			return;
		}

		for (var offsetY = 0; offsetY < height; offsetY += TILE_SIZE) {
			var segmentHeight = Math.min(TILE_SIZE, height - offsetY);
			this.drawRotatedSegment(
				screenX,
				screenY + offsetY,
				getOppositeClipOffset(segmentHeight),
				sourceY,
				segmentHeight,
				width
			);
		}
	},

	drawRotatedSegment: function(screenX, screenY, sourceX, sourceY, segmentHeight, segmentWidth) {
		var context = ig.system.context;

		context.save();
		context.translate(
			ig.system.getDrawPos(screenX),
			ig.system.getDrawPos(screenY + segmentHeight)
		);
		context.rotate(ROTATE_CCW);
		this.animSheet.image.draw(0, 0, sourceX, sourceY, segmentHeight, segmentWidth);
		context.restore();
	}
});

ig.EntitySpikes = EntitySpikes;
ig.registerClass('EntitySpikes', EntitySpikes);

export { EntitySpikes };
export default EntitySpikes;
