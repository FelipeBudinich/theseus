import ig from '../../lib/impact/impact.js';

import { AutorunnerAudio } from './lib/audio.js';
import { LevelStart } from './levels/start.js';
import './levels/middle.js';
import './levels/end.js';

import './entities/dust.js';
import './entities/hud.js';
import './entities/loss-overlay.js';
import './entities/runner.js';
import './entities/runner-enter.js';
import './entities/spikes.js';
import './entities/levelchange.js';
import './entities/trigger.js';
import './entities/kill-trigger.js';
import './entities/spawn-point.js';

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

const normalizeSpawnPointIndex = (value) => {
	const index = Number(value);

	return Number.isFinite(index) && index > 0 ? Math.floor(index) : 0;
};

export const AutorunnerGame = ig.Game.extend({
	gravity: 982,
	autoSort: true,

	init: function() {
		ig.input.bind('Space', 'jump');
		ig.input.bind('MousePrimary', 'jump');
		ig.spawnPoint = 0;

		this.audio = new AutorunnerAudio();
		this.bestDistance = readBestDistance();
		//this.hud = new HUD();
		this.restart();
	},

	restart: function() {
		const levelToLoad = this.levelAtLoss || this.currentLevel || LevelStart;
		const respawningFromLoss = Boolean(this.levelAtLoss);

		if (!respawningFromLoss) {
			ig.spawnPoint = 0;
		}

		this.runner = null;
		this.distance = 0;
		this.speed = 0;
		this.frozenDistance = 0;
		this.fallTime = 0;
		this.state = 'playing';
		this.levelAtLoss = null;
		this._levelToLoad = null;
		this._runnerEnterSpawn = null;
		this._loadingForRespawn = respawningFromLoss;
		this.loadLevel(levelToLoad);
		this._loadingForRespawn = false;
	},

	loadLevel: function(data) {
		if (!this._loadingForRespawn) {
			ig.spawnPoint = 0;
		}

		this.runner = null;
		this._runnerEnterSpawn = null;
		this.currentLevel = data || LevelStart;
		this.parent(this.currentLevel);
		this.moveRunnerToSpawnPoint();
	},

	getSpawnPoint: function(index) {
		if (!ig.EntitySpawnPoint) {
			return null;
		}

		const targetIndex = normalizeSpawnPointIndex(index);
		const spawnPoints = this.getEntitiesByType(ig.EntitySpawnPoint);
		let defaultSpawnPoint = null;

		for (let i = 0; i < spawnPoints.length; i++) {
			const spawnPoint = spawnPoints[i];
			const spawnPointIndex = normalizeSpawnPointIndex(spawnPoint.index);

			if (spawnPointIndex === 0 && !defaultSpawnPoint) {
				defaultSpawnPoint = spawnPoint;
			}

			if (spawnPointIndex === targetIndex) {
				return spawnPoint;
			}
		}

		return defaultSpawnPoint;
	},

	moveRunnerToSpawnPoint: function() {
		const spawnPoint = this.getSpawnPoint(ig.spawnPoint);
		let runner = this.getEntitiesByType('EntityRunner')[0];

		if (!runner || !spawnPoint) {
			if (!runner && spawnPoint && ig.EntityRunnerEnter) {
				this.spawnRunnerEnterAtSpawnPoint(spawnPoint);
			}
			return;
		}

		runner.pos.x = spawnPoint.pos.x;
		runner.pos.y = spawnPoint.pos.y;
		runner.last.x = spawnPoint.pos.x;
		runner.last.y = spawnPoint.pos.y;
	},

	spawnRunnerEnterAtSpawnPoint: function(spawnPoint) {
		this.screen.x = Math.max(0, spawnPoint.pos.x - WORLD.runnerAnchorX);
		this.screen.y = 0;

		const enterY = this.screen.y - ig.EntityRunnerEnter.prototype.size.y - 1;
		this.spawnEntity(ig.EntityRunnerEnter, spawnPoint.pos.x, enterY);
	},

	spawnRunnerFromEnter: function(x, y) {
		this._runnerEnterSpawn = {x, y};
	},

	spawnPendingRunnerFromEnter: function() {
		if (!this._runnerEnterSpawn || !ig.EntityRunner) {
			return null;
		}

		const spawn = this._runnerEnterSpawn;
		this._runnerEnterSpawn = null;
		return this.spawnEntity(ig.EntityRunner, spawn.x, spawn.y);
	},

	lose: function() {
		if (this.state === 'lost') {
			return;
		}

		this.state = 'lost';
		this.levelAtLoss = this.currentLevel || LevelStart;
		this._levelToLoad = null;
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
		this.spawnPendingRunnerFromEnter();

		if (this.runner && this.state === 'playing') {
			this.screen.x = Math.max(0, this.runner.pos.x - WORLD.runnerAnchorX);
			this.screen.y = 0;
			this.distance = Math.max(0, this.runner.pos.x - WORLD.runnerStartX);
			this.speed = this.runner.vel.x;
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
