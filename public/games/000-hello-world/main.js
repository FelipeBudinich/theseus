import ig from '../../lib/impact/impact.js';

const GAME_WIDTH = 180;
const GAME_HEIGHT = 320;
const MESSAGE = 'Hello World!';

const canvas = document.getElementById('canvas');

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

const HelloWorldGame = ig.Game.extend({
	font: new ig.Font('games/000-hello-world/media/arialmt.font.png'),
	draw: function() {
		this.parent();
		const centerX = GAME_WIDTH / 2;
		const baseY = Math.round(GAME_HEIGHT * 0.45);
		this.font.draw(MESSAGE, centerX, baseY, ig.Font.ALIGN.CENTER);
		
	}
});

fitCanvas();
window.addEventListener('resize', fitCanvas, false);

ig.main('#canvas', HelloWorldGame, 60, GAME_WIDTH, GAME_HEIGHT, 4);
