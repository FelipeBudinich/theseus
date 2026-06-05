import ig from '../../lib/impact/impact.js';

import { AutorunnerAudio } from './lib/audio.js';
import { LevelStart } from './levels/start.js';

import './entities/dust.js';
import './entities/hud.js';
import './entities/loss-overlay.js';
import './entities/runner.js';

const STORAGE_KEY = 'theseus-001-autorunner-best';

export const WORLD = {
	groundY: 388,
	lossY: 320,
	runnerAnchorX: 238,
	runnerStartX: 168
};

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
		//this.hud = new HUD();
		this.restart();
	},

	restart: function() {
		this.runner = null;
		this.distance = 0;
		this.speed = 0;
		this.frozenDistance = 0;
		this.fallTime = 0;
		this.state = 'playing';
		this.loadLevel(LevelStart);
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
		//this.hud.draw();
	},
});
