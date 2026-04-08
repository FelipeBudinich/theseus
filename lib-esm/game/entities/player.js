import ig from '../../impact/impact.js';

ig.EntityPlayer = ig.Entity.extend({
	size: {x: 40, y: 88},
	offset: {x: 17, y: 10},
	
	maxVel: {x: 400, y: 800},
	friction: {x: 800, y: 0},
	
	type: ig.Entity.TYPE.A,
	checkAgainst: ig.Entity.TYPE.NONE,
	collides: ig.Entity.COLLIDES.PASSIVE,
	
	animSheet: new ig.AnimationSheet('media/player.png', 75, 100),
	
	sfxHurt: new ig.Sound('media/sounds/hurt.*'),
	sfxJump: new ig.Sound('media/sounds/jump.*'),
	
	health: 3,
	flip: false,
	accelGround: 1200,
	accelAir: 600,
	jump: 500,
	maxHealth: 3,
	coins: 0,
	
	init: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.addAnim('idle', 1, [15, 15, 15, 15, 15, 14]);
		this.addAnim('run', 0.07, [4, 5, 11, 0, 1, 2, 7, 8, 9, 3]);
		this.addAnim('jump', 1, [13]);
		this.addAnim('fall', 0.4, [13, 12], true);
		this.addAnim('pain', 0.3, [6], true);

		ig.game.player = this;
	},
	
	update: function() {
		var accel = this.standing ? this.accelGround : this.accelAir;
		if (ig.input.state('left')) {
			this.accel.x = -accel;
			this.flip = true;
		}
		else if (ig.input.state('right')) {
			this.accel.x = accel;
			this.flip = false;
		}
		else {
			this.accel.x = 0;
		}

		if (this.standing && ig.input.pressed('jump')) {
			this.vel.y = -this.jump;
			this.sfxJump.play();
		}
		
		if (ig.input.pressed('shoot')) {
			ig.game.spawnEntity(ig.EntityFireball, this.pos.x, this.pos.y + 40, {flip: this.flip});
		}
		
		if (this.currentAnim == this.anims.pain && this.currentAnim.loopCount < 1) {
			if (this.health <= 0) {
				var dec = (1 / this.currentAnim.frameTime) * ig.system.tick;
				this.currentAnim.alpha = (this.currentAnim.alpha - dec).limit(0, 1);
			}
		}
		else if (this.health <= 0) {
			this.kill();
		}
		else if (this.vel.y < 0) {
			this.currentAnim = this.anims.jump;
		}
		else if (this.vel.y > 0) {
			if (this.currentAnim != this.anims.fall) {
				this.currentAnim = this.anims.fall.rewind();
			}
		}
		else if (this.vel.x != 0) {
			this.currentAnim = this.anims.run;
		}
		else {
			this.currentAnim = this.anims.idle;
		}
		
		this.currentAnim.flip.x = this.flip;
		this.parent();
	},

	kill: function() {
		this.parent();
		ig.game.reloadLevel();
	},

	giveCoins: function(amount) {
		this.coins += amount;
	},

	receiveDamage: function(amount, from) {
		if (this.currentAnim == this.anims.pain) {
			return;
		}

		this.health -= amount;
		this.currentAnim = this.anims.pain.rewind();
		this.vel.x = from.pos.x > this.pos.x ? -400 : 400;
		this.vel.y = -300;
		this.sfxHurt.play();
	}
});

ig.registerClass('EntityPlayer', ig.EntityPlayer);
