import ig from '../impact/impact.js';

import '../plugins/camera.js';
import '../plugins/touch-button.js';
import '../plugins/impact-splash-loader.js';
import '../plugins/gamepad.js';

import './entities/fireball.js';
import './entities/player.js';
import './entities/blob.js';
import './entities/coin.js';
import './entities/hurt.js';
import './entities/trigger.js';
import './entities/levelchange.js';

import { LevelTitle } from './levels/title.js';
import { LevelGrasslands } from './levels/grasslands.js';
import './levels/snowhills.js';

let touchButtons = null;

const MyGame = ig.Game.extend({
	clearColor: '#d0f4f7',
	gravity: 800,
	
	font: new ig.Font('media/fredoka-one.font.png'),
	heartFull: new ig.Image('media/heart-full.png'),
	heartEmpty: new ig.Image('media/heart-empty.png'),
	coinIcon: new ig.Image('media/coin.png'),
	
	init: function() {
		this.font.letterSpacing = -2;
		this.loadLevel(LevelGrasslands);
	},

	loadLevel: function(data) {
		this.currentLevel = data;
		this.parent(data);
		this.setupCamera();
	},
	
	setupCamera: function() {
		this.camera = new ig.Camera(ig.system.width / 3, ig.system.height / 3, 3);
		this.camera.trap.size.x = ig.system.width / 10;
		this.camera.trap.size.y = ig.system.height / 3;
		this.camera.lookAhead.x = ig.system.width / 6;
		this.camera.max.x = this.collisionMap.pxWidth - ig.system.width;
		this.camera.max.y = this.collisionMap.pxHeight - ig.system.height;
		this.camera.set(this.player);
	},

	reloadLevel: function() {
		this.loadLevelDeferred(this.currentLevel);
	},
	
	update: function() {
		this.parent();
		this.camera.follow(this.player);
	},
	
	draw: function() {
		this.parent();
		
		if (this.player) {
			var x = 16;
			var y = 16;

			for (var i = 0; i < this.player.maxHealth; i++) {
				if (this.player.health > i) {
					this.heartFull.draw(x, y);
				}
				else {
					this.heartEmpty.draw(x, y);
				}

				x += this.heartEmpty.width + 8;
			}

			x += 48;
			this.coinIcon.drawTile(x, y + 6, 0, 36);

			x += 42;
			this.font.draw('x ' + this.player.coins, x, y + 10);
		}
		
		if (touchButtons) {
			touchButtons.draw();
		}
	}
});

const MyTitle = ig.Game.extend({
	clearColor: '#d0f4f7',
	gravity: 800,

	title: new ig.Image('media/title.png'),
	font: new ig.Font('media/fredoka-one.font.png'),

	init: function() {
		ig.input.bind('ArrowLeft', 'left');
		ig.input.bind('ArrowRight', 'right');
		ig.input.bind('KeyX', 'jump');
		ig.input.bind('KeyC', 'shoot');

		ig.input.bind('GamepadLeft', 'left');
		ig.input.bind('GamepadRight', 'right');
		ig.input.bind('GamepadFaceBottom', 'jump');
		ig.input.bind('GamepadFaceRight', 'shoot');
		ig.input.bind('GamepadFaceLeft', 'shoot');

		if (touchButtons) {
			touchButtons.align();
		}

		this.font.letterSpacing = -2;
		this.loadLevel(LevelTitle);
		this.maxY = this.backgroundMaps[0].pxHeight - ig.system.height;
	},

	update: function() {
		if (ig.input.pressed('jump') || ig.input.pressed('shoot')) {
			ig.system.setGame(MyGame);
			return;
		}
		
		this.parent();

		var move = this.maxY - this.screen.y;
		if (move > 5) {
			this.screen.y += move * ig.system.tick;
			this.titleAlpha = this.screen.y / this.maxY;
		}
		this.screen.x = (this.backgroundMaps[0].pxWidth - ig.system.width) / 2;
	},

	draw: function() {
		this.parent();

		var cx = ig.system.width / 2;
		this.title.draw(cx - this.title.width / 2, 60);
		
		var startText = ig.ua.mobile ? 'Press Button to Play!' : 'Press X or C to Play!';
		this.font.draw(startText, cx, 420, ig.Font.ALIGN.CENTER);

		if (touchButtons) {
			touchButtons.draw();
		}
	}
});

if (ig.ua.mobile) {
	var buttonImage = new ig.Image('media/touch-buttons.png');
	touchButtons = new ig.TouchButtonCollection([
		new ig.TouchButton('left', {left: 0, bottom: 0}, 128, 128, buttonImage, 0),
		new ig.TouchButton('right', {left: 128, bottom: 0}, 128, 128, buttonImage, 1),
		new ig.TouchButton('shoot', {right: 128, bottom: 0}, 128, 128, buttonImage, 2),
		new ig.TouchButton('jump', {right: 0, bottom: 96}, 128, 128, buttonImage, 3)
	]);
}

const scale = window.innerWidth < 640 ? 2 : 1;
const canvas = document.getElementById('canvas');

const resizeCanvas = () => {
	if (!canvas) {
		return;
	}
	
	canvas.style.width = window.innerWidth + 'px';
	canvas.style.height = window.innerHeight + 'px';
	
	if (!ig.system) {
		return;
	}
	
	ig.system.resize(window.innerWidth * scale, window.innerHeight * scale);
	
	if (ig.game && ig.game.setupCamera) {
		ig.game.setupCamera();
	}

	if (touchButtons) {
		touchButtons.align();
	}
};

resizeCanvas();
window.addEventListener('resize', resizeCanvas, false);

var width = window.innerWidth * scale;
var height = window.innerHeight * scale;
ig.main('#canvas', MyTitle, 60, width, height, 1, ig.ImpactSplashLoader);
