import ig from '../../../lib/impact/impact.js';

import { screenRect } from '../lib/drawing.js';

ig.EntityHud = ig.Entity.extend({
	size: {x: 0, y: 0},
	gravityFactor: 0,
	collides: ig.Entity.COLLIDES.NEVER,
	zIndex: 900,
	font: new ig.Font('games/001-autorunner/media/font-16.png'),

	update: function() {},

	draw: function() {
		const meters = Math.floor(ig.game.distance / 10);
		const speed = Math.floor(ig.game.speed);
		const best = Math.floor(ig.game.bestDistance / 10);

		screenRect(18, 18, 182, 46, '#111318', 0.72);
		screenRect(22, 22, 4, 38, '#d4b56a', 1);
		this.font.draw('Best', 36, 32);
		this.font.draw('Now', 36, 58);
		this.font.draw(String(best).padStart(6, '0'), 108, 32);
		this.font.draw(String(meters).padStart(6, '0'), 108, 58);


	},
});

ig.registerClass('EntityHud', ig.EntityHud);
