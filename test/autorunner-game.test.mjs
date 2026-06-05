import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ensureGlobal = (name, value) => {
	if (globalThis[name] === undefined) {
		Object.defineProperty(globalThis, name, {
			configurable: true,
			value,
			writable: true
		});
	}
};

const installBrowserLikeGlobals = () => {
	ensureGlobal('window', globalThis);
	ensureGlobal('document', {
		body: {},
		createElement: () => ({
			getContext: () => null,
			style: {}
		}),
		getElementById: () => null,
		getElementsByTagName: () => [],
		location: { href: 'http://localhost/', search: '' },
		readyState: 'complete'
	});
	ensureGlobal('navigator', { maxTouchPoints: 0, userAgent: 'node' });
	ensureGlobal('screen', { availHeight: 0, availWidth: 0 });
	ensureGlobal('Image', class Image {});
	ensureGlobal('Audio', class Audio {
		canPlayType() {
			return '';
		}

		play() {
			return { catch() {} };
		}
	});
	ensureGlobal('XMLHttpRequest', class XMLHttpRequest {});
};

const moduleUrl = (relativePath) =>
	pathToFileURL(path.resolve(relativePath)).href;

const getLayer = (level, name) =>
	level.layer.find((layer) => layer.name === name);

const getLevelChangeTarget = (level) =>
	level.entities.find((entity) => entity.type === 'EntityLevelchange')?.settings?.level;

test('autorunner registers a start to middle to end level chain', async () => {
	installBrowserLikeGlobals();

	const ig = (await import(moduleUrl('public/lib/impact/impact.js'))).default;
	const { LevelStart } = await import(moduleUrl('public/games/001-autorunner/levels/start.js'));
	const { LevelMiddle } = await import(moduleUrl('public/games/001-autorunner/levels/middle.js'));
	const { LevelEnd } = await import(moduleUrl('public/games/001-autorunner/levels/end.js'));

	assert.equal(getLevelChangeTarget(LevelStart), 'middle');
	assert.equal(getLevelChangeTarget(LevelMiddle), 'end');
	assert.equal(getLevelChangeTarget(LevelEnd), 'start');
	assert.equal(ig.Game.getLevelByName('start'), LevelStart);
	assert.equal(ig.Game.getLevelByName('middle'), LevelMiddle);
	assert.equal(ig.Game.getLevelByName('end'), LevelEnd);
});

test('autorunner restarts in the level where the player lost', async () => {
	installBrowserLikeGlobals();

	const ig = (await import(moduleUrl('public/lib/impact/impact.js'))).default;
	const { AutorunnerGame } = await import(moduleUrl('public/games/001-autorunner/game.js'));
	const { LevelStart } = await import(moduleUrl('public/games/001-autorunner/levels/start.js'));
	const { LevelMiddle } = await import(moduleUrl('public/games/001-autorunner/levels/middle.js'));
	const { LevelEnd } = await import(moduleUrl('public/games/001-autorunner/levels/end.js'));

	ig.system = {
		clear() {},
		context: { globalAlpha: 1 },
		tick: 1 / 60
	};
	ig.input = {
		bind() {},
		pressed() {
			return false;
		}
	};

	const game = new AutorunnerGame();
	assert.equal(game.currentLevel, LevelStart);

	game.loadLevel(LevelMiddle);
	assert.equal(game.currentLevel, LevelMiddle);
	assert.equal(game.collisionMap.data, getLayer(LevelMiddle, 'collision').data);

	game.loadLevelDeferred(LevelEnd);
	game.lose();
	game.update();
	game.restart();

	assert.equal(game.currentLevel, LevelMiddle);
	assert.equal(game.state, 'playing');
	assert.equal(game.collisionMap.data, getLayer(LevelMiddle, 'collision').data);
});
