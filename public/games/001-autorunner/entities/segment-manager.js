import ig from '../../../lib/impact/impact.js';

import { LEVEL_SEGMENTS, START_SEGMENT, WORLD } from '../levels/segments.js';

const platformHeightFor = (topY) => WORLD.height - topY + WORLD.platformDepth;

ig.EntitySegmentManager = ig.Entity.extend({
	gravityFactor: 0,
	collides: ig.Entity.COLLIDES.NEVER,
	zIndex: -100,

	init: function(x, y, settings) {
		this.parent(x, y, settings);
		this.nextX = 0;
		this.currentTopY = WORLD.groundY;
		this.segmentIndex = 0;
		this.recentSegmentIds = [];
		ig.game.segmentManager = this;
		this.spawnSegment(START_SEGMENT);
	},

	update: function() {
		if (ig.game.state === 'lost') {
			return;
		}

		while (this.nextX < ig.game.screen.x + WORLD.width + WORLD.spawnAhead) {
			this.spawnSegment(this.chooseSegment());
		}
	},

	chooseSegment: function() {
		const topY = this.currentTopY;
		let candidates = LEVEL_SEGMENTS.filter((segment) => !this.recentSegmentIds.includes(segment.id));

		if (topY < WORLD.groundY - 42) {
			candidates = candidates.filter((segment) => segment.endY > 0);
		}
		else if (topY > WORLD.groundY + 36) {
			candidates = candidates.filter((segment) => segment.endY < 0);
		}

		if (!candidates.length) {
			candidates = LEVEL_SEGMENTS;
		}

		const index = Math.floor(Math.random() * candidates.length);
		return candidates[index];
	},

	spawnSegment: function(segment) {
		const segmentX = this.nextX;
		const yOffset = this.currentTopY - segment.startY;

		for (let i = 0; i < segment.platforms.length; i++) {
			const platform = segment.platforms[i];
			const topY = yOffset + platform.y;
			ig.game.spawnEntity(ig.EntityPlatform, segmentX + platform.x, topY, {
				kind: platform.kind,
				segmentIndex: this.segmentIndex,
				size: {
					x: platform.width,
					y: platform.height || platformHeightFor(topY),
				},
			});
		}

		this.currentTopY = yOffset + segment.endY;
		this.nextX += segment.length;
		this.segmentIndex++;
		this.recentSegmentIds.push(segment.id);
		if (this.recentSegmentIds.length > 3) {
			this.recentSegmentIds.shift();
		}
	},
});

ig.registerClass('EntitySegmentManager', ig.EntitySegmentManager);
