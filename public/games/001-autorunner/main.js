import ig from '../../lib/impact/impact.js';

import { AutorunnerGame } from './game.js';

const canvas = document.getElementById('canvas');
const GAME_WIDTH = 480
const GAME_HEIGHT = 270;

const fitCanvas = () => {
	if (!canvas) {
		return;
	}

	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const targetRatio = GAME_WIDTH / GAME_HEIGHT;
	let displayWidth = viewportWidth;
	let displayHeight = displayWidth / targetRatio;

	if (displayHeight > viewportHeight) {
		displayHeight = viewportHeight;
		displayWidth = displayHeight * targetRatio;
	}

	canvas.style.width = Math.floor(displayWidth) + 'px';
	canvas.style.height = Math.floor(displayHeight) + 'px';
};

ig.input?.unbindAll?.();
fitCanvas();
window.addEventListener('resize', fitCanvas, false);

ig.main('#canvas', AutorunnerGame, 60, GAME_WIDTH, GAME_HEIGHT, 4);
