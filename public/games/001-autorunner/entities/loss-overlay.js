import ig from '../../../lib/impact/impact.js';

import { screenRect } from '../lib/drawing.js';
import { WORLD } from '../game.js';

ig.EntityLossOverlay = ig.Entity.extend({
	size: {x: 0, y: 0},
	gravityFactor: 0,
	collides: ig.Entity.COLLIDES.NEVER,
	zIndex: 1000,
	titleFont: new ig.Font('games/001-autorunner/media/font-bold-32.png'),
	bodyFont: new ig.Font('games/001-autorunner/media/font-32.png'),

	init: function(x, y, settings) {
		this.parent(x, y, settings);
		this.size = {x: WORLD.width, y: WORLD.height};
	},

	update: function() {},

	draw: function() {
		if (ig.game.state !== 'lost') {
			return;
		}

		const alpha = Math.min(0.82, 0.36 + ig.game.fallTime * 0.9);
		const meters = Math.floor(ig.game.distance / 10);

		screenRect(0, 0, WORLD.width, WORLD.height, '#090a0d', alpha);
		screenRect(306, 178, 348, 126, '#181a21', 0.92);
		screenRect(306, 178, 348, 8, '#af4b3f', 1);
		this.titleFont.draw('FELL', 480, 203, {
			align: ig.Font.ALIGN.CENTER,
			verticalAlign: ig.Font.VALIGN.TOP,
		});
		this.bodyFont.draw(String(meters).padStart(6, '0'), 480, 259, {
			align: ig.Font.ALIGN.CENTER,
		});
		this.bodyFont.draw('RUN AGAIN', 480, 334, {
			align: ig.Font.ALIGN.CENTER,
			alpha: ig.game.fallTime > 0.35 ? 1 : 0.35,
		});
	},
});

ig.registerClass('EntityLossOverlay', ig.EntityLossOverlay);
