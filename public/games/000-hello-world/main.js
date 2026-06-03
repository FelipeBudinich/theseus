import ig from '../../lib/impact/impact.js';

const GAME_WIDTH = 180;
const GAME_HEIGHT = 320;
const TITLE = 'Hello World!';
const MESSAGE = 'The quick brown fox jumps over the lazy dog.';

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
	font: new ig.Font('games/000-hello-world/media/pressstartreg.font.png'),
	draw: function() {
		this.parent();
		const centerX = GAME_WIDTH / 2;
		
		this.font.draw(TITLE, centerX, GAME_HEIGHT * 0.2, {
			align: ig.Font.ALIGN.CENTER,
			verticalAlign: ig.Font.VALIGN.BOTTOM
		});
		this.font.draw(MESSAGE, 10, GAME_HEIGHT * 0.33, {
			align: ig.Font.ALIGN.CENTER,
			maxWidth: 160,
			letterSpacing: 0,
			alpha: 0.75,
			lineSpacing: 8
		});
		this.font.draw("0123456789", centerX, GAME_HEIGHT * 0.76, {
			align: ig.Font.ALIGN.CENTER,
			verticalAlign: ig.Font.VALIGN.MIDDLE,
			alpha: 0.5,
		});
	}
});

fitCanvas();
window.addEventListener('resize', fitCanvas, false);

ig.main('#canvas', HelloWorldGame, 60, GAME_WIDTH, GAME_HEIGHT, 1);
