import ig from '../../../lib/impact/impact.js';

import { worldRect } from '../lib/drawing.js';
import { WORLD } from '../levels/segments.js';

ig.EntityDust = ig.Entity.extend({
	size: {x: 3, y: 3},
	gravityFactor: 0,
	collides: ig.Entity.COLLIDES.NEVER,
	zIndex: 24,
	life: 0.3,
	age: 0,
	color: '#d4b56a',

	update: function() {
		const dt = Math.min(ig.system.tick, 1 / 30);
		this.age += dt;
		this.last.x = this.pos.x;
		this.last.y = this.pos.y;
		this.vel.y += 260 * dt;
		this.pos.x += this.vel.x * dt;
		this.pos.y += this.vel.y * dt;

		if (
			this.age >= this.life ||
			this.pos.x + this.size.x < ig.game.screen.x - WORLD.pruneBehind
		) {
			this.kill();
		}
	},

	draw: function() {
		const alpha = Math.max(0, 1 - this.age / this.life);
		worldRect(this.pos.x, this.pos.y, this.size.x, this.size.y, this.color, alpha);
	},
});

ig.registerClass('EntityDust', ig.EntityDust);
