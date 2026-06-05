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

test('autorunner restarts in the level where the player lost', async () => {
	installBrowserLikeGlobals();

	const ig = (await import(moduleUrl('public/lib/impact/impact.js'))).default;
	const { AutorunnerGame } = await import(moduleUrl('public/games/001-autorunner/game.js'));
	const { LevelStart } = await import(moduleUrl('public/games/001-autorunner/levels/start.js'));
	const { LevelMiddle } = await import(moduleUrl('public/games/001-autorunner/levels/middle.js'));

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

	game.loadLevelDeferred(LevelStart);
	game.lose();
	game.update();
	game.restart();

	assert.equal(game.currentLevel, LevelMiddle);
	assert.equal(game.state, 'playing');
	assert.equal(game.collisionMap.data, getLayer(LevelMiddle, 'collision').data);
});
