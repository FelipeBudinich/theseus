import ig from '../../../lib/impact/impact.js';

const drawPos = (value) => ig.system.getDrawPos(value);

const withAlpha = (alpha, draw) => {
	const context = ig.system.context;
	if (alpha >= 1) {
		draw(context);
		return;
	}

	context.save();
	context.globalAlpha = alpha;
	draw(context);
	context.restore();
};

export const screenRect = (x, y, width, height, color, alpha = 1) => {
	withAlpha(alpha, (context) => {
		context.fillStyle = color;
		context.fillRect(
			drawPos(x),
			drawPos(y),
			Math.ceil(width * ig.system.scale),
			Math.ceil(height * ig.system.scale)
		);
	});
};

export const worldRect = (x, y, width, height, color, alpha = 1) => {
	screenRect(
		x - ig.game._rscreen.x,
		y - ig.game._rscreen.y,
		width,
		height,
		color,
		alpha
	);
};
