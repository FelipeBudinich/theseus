import ig from '../../../lib/impact/impact.js';

import { worldRect } from '../lib/drawing.js';
import { WORLD } from '../levels/segments.js';

const KIND_PALETTE = {
	factory: {body: '#181a20', roof: '#d0c8b4', lip: '#8d8779', window: '#9fd0c9'},
	glass: {body: '#1a2028', roof: '#c9d0c6', lip: '#7f9190', window: '#9fd0c9'},
	launch: {body: '#16181d', roof: '#d4b56a', lip: '#8f6d36', window: '#d4b56a'},
	office: {body: '#1d1d22', roof: '#d9d3c2', lip: '#827f76', window: '#c0ad75'},
	short: {body: '#17191f', roof: '#c4c0b4', lip: '#77736b', window: '#af4b3f'},
};

ig.EntityPlatform = ig.Entity.extend({
	size: {x: 64, y: 200},
	gravityFactor: 0,
	collides: ig.Entity.COLLIDES.NEVER,
	zIndex: 10,
	kind: 'office',
	segmentIndex: 0,

	init: function(x, y, settings) {
		this.parent(x, y, settings);
		ig.game.registerPlatform(this);
	},

	update: function() {
		if (this.pos.x + this.size.x < ig.game.screen.x - WORLD.pruneBehind) {
			this.kill();
		}
	},

	draw: function() {
		const palette = KIND_PALETTE[this.kind] || KIND_PALETTE.office;
		const x = this.pos.x;
		const y = this.pos.y;
		const width = this.size.x;
		const height = this.size.y;

		worldRect(x, y + 8, width, height - 8, palette.body, 1);
		worldRect(x, y, width, 8, palette.roof, 1);
		worldRect(x, y + 8, width, 5, palette.lip, 1);
		worldRect(x, y + 18, width, 4, '#0e1015', 0.7);

		for (let wx = x + 24; wx < x + width - 18; wx += 42) {
			for (let wy = y + 42; wy < Math.min(y + height, WORLD.height + 120); wy += 38) {
				if (((wx + wy + this.segmentIndex * 17) | 0) % 5 === 0) {
					worldRect(wx, wy, 12, 12, palette.window, 0.34);
				}
				else {
					worldRect(wx, wy, 12, 12, '#0b0d12', 0.44);
				}
			}
		}

		for (let stripe = 0; stripe < 4; stripe++) {
			worldRect(x + width - 32 + stripe * 8, y - 7, 4, 7, '#af4b3f', 0.9);
		}
	},

	kill: function() {
		ig.game.unregisterPlatform(this);
		this.parent();
	},
});

ig.registerClass('EntityPlatform', ig.EntityPlatform);
