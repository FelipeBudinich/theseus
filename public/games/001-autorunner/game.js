import ig from '../../lib/impact/impact.js';

import { AutorunnerAudio } from './lib/audio.js';
import { LevelAutorunner } from './levels/start.js';
import { WORLD } from './levels/segments.js';

import './entities/dust.js';
import './entities/hud.js';
import './entities/loss-overlay.js';
import './entities/platform.js';
import './entities/runner.js';
import './entities/segment-manager.js';

const STORAGE_KEY = 'theseus-001-autorunner-best';

export const GAME_WIDTH = WORLD.width;
export const GAME_HEIGHT = WORLD.height;

const readBestDistance = () => {
	try {
		return Number(window.localStorage.getItem(STORAGE_KEY)) || 0;
	}
	catch (_error) {
		return 0;
	}
};

const writeBestDistance = (distance) => {
	try {
		window.localStorage.setItem(STORAGE_KEY, String(Math.floor(distance)));
	}
	catch (_error) {
		// Storage is optional; a browser may deny it in private contexts.
	}
};

export const AutorunnerGame = ig.Game.extend({
	gravity: 0,
	autoSort: true,

	init: function() {
		ig.input.bind('Space', 'jump');
		ig.input.bind('MousePrimary', 'jump');

		this.audio = new AutorunnerAudio();
		this.bestDistance = readBestDistance();
		this.restart();
	},

	restart: function() {
		this.platforms = [];
		this.runner = null;
		this.segmentManager = null;
		this.distance = 0;
		this.speed = 0;
		this.frozenDistance = 0;
		this.fallTime = 0;
		this.state = 'playing';
		this.loadLevel(LevelAutorunner);
	},

	registerPlatform: function(platform) {
		this.platforms.push(platform);
	},

	unregisterPlatform: function(platform) {
		this.platforms = this.platforms.filter((candidate) => candidate !== platform);
	},

	resolveRunnerPlatform: function(runner) {
		const previousBottom = runner.last.y + runner.size.y;
		const nextBottom = runner.pos.y + runner.size.y;
		let landingPlatform = null;

		if (runner.vel.y < 0) {
			runner.currentPlatform = null;
			return null;
		}

		for (let i = 0; i < this.platforms.length; i++) {
			const platform = this.platforms[i];
			const top = platform.pos.y;
			const wasAbove = previousBottom <= top + 8;
			const crossesTop = nextBottom >= top;
			const overlapsX =
				runner.pos.x + runner.size.x > platform.pos.x + 8 &&
				runner.pos.x < platform.pos.x + platform.size.x - 8;

			if (!wasAbove || !crossesTop || !overlapsX) {
				continue;
			}

			if (!landingPlatform || top < landingPlatform.pos.y) {
				landingPlatform = platform;
			}
		}

		if (!landingPlatform) {
			runner.currentPlatform = null;
			return null;
		}

		runner.pos.y = landingPlatform.pos.y - runner.size.y;
		runner.vel.y = 0;
		runner.standing = true;
		runner.currentPlatform = landingPlatform;
		return landingPlatform;
	},

	resolveRunnerLedgeHit: function(runner) {
		if (runner.standing || runner.vel.x <= 0) {
			return null;
		}

		const previousRight = runner.last.x + runner.size.x;
		const nextRight = runner.pos.x + runner.size.x;
		const previousBottom = runner.last.y + runner.size.y;
		let ledgePlatform = null;

		for (let i = 0; i < this.platforms.length; i++) {
			const platform = this.platforms[i];
			const platformLeft = platform.pos.x;
			const platformTop = platform.pos.y;
			const crossedFrontEdge =
				previousRight <= platformLeft + 4 &&
				nextRight >= platformLeft + 4;
			const nearLedgeTop =
				runner.pos.y < platformTop + runner.ledgeGrabVerticalReach &&
				runner.pos.y + runner.size.y > platformTop + 10;
			const missedLandingLine = previousBottom > platformTop + 8;

			if (!crossedFrontEdge || !nearLedgeTop || !missedLandingLine) {
				continue;
			}

			if (!ledgePlatform || platformTop < ledgePlatform.pos.y) {
				ledgePlatform = platform;
			}
		}

		if (ledgePlatform) {
			runner.grantLedgeJump(ledgePlatform);
		}

		return ledgePlatform;
	},

	lose: function() {
		if (this.state === 'lost') {
			return;
		}

		this.state = 'lost';
		this.fallTime = 0;
		this.frozenDistance = this.runner
			? Math.max(0, this.runner.pos.x - WORLD.runnerStartX)
			: this.distance;
		this.distance = this.frozenDistance;
		this.speed = 0;
		this.bestDistance = Math.max(this.bestDistance, Math.floor(this.distance));
		writeBestDistance(this.bestDistance);
		this.audio.fail();
	},

	update: function() {
		if (ig.input.pressed('jump')) {
			this.audio.ensure();
		}

		if (this.state === 'lost') {
			this.fallTime += ig.system.tick;
			if (this.fallTime > 0.35 && ig.input.pressed('jump')) {
				this.restart();
				return;
			}
		}

		this.parent();

		if (this.runner && this.state === 'playing') {
			this.screen.x = Math.max(0, this.runner.pos.x - WORLD.runnerAnchorX);
			this.screen.y = 0;
			this.distance = Math.max(0, this.runner.pos.x - WORLD.runnerStartX);
			this.speed = this.runner.runSpeed;
		}
		else if (this.state === 'lost') {
			this.distance = this.frozenDistance;
			this.speed = 0;
		}
	},

	draw: function() {
		this.parent();
	},
});
