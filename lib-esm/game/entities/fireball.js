import ig from '../../impact/impact.js';

ig.EntityFireball = ig.Entity.extend({
	_wmIgnore: true,
	
	size: {x: 24, y: 24},
	offset: {x: 6, y: 6},
	maxVel: {x: 800, y: 400},
	bounciness: 0.8,
	
	type: ig.Entity.TYPE.NONE,
	checkAgainst: ig.Entity.TYPE.B,
	collides: ig.Entity.COLLIDES.PASSIVE,
		
	animSheet: new ig.AnimationSheet('media/fireball.png', 36, 36),
	sfxSpawn: new ig.Sound('media/sounds/fireball.*'),
	
	bounceCounter: 0,
	
	init: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.vel.x = settings.flip ? -this.maxVel.x : this.maxVel.x;
		this.vel.y = 200;
		this.addAnim('idle', 1, [0]);
		
		this.sfxSpawn.play();
	},
	
	reset: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.vel.x = settings.flip ? -this.maxVel.x : this.maxVel.x;
		this.vel.y = 200;
		this.sfxSpawn.play();
		this.bounceCounter = 0;
	},

	update: function() {
		this.parent();
		this.currentAnim.angle += ig.system.tick * 10;
	},
		
	handleMovementTrace: function(res) {
		this.parent(res);
		
		if (res.collision.x || res.collision.y || res.collision.slope) {
			this.bounceCounter++;
			if (this.bounceCounter > 3) {
				this.kill();
			}
		}
	},
	
	check: function(other) {
		other.receiveDamage(1, this);
		this.kill();
	}
});

ig.EntityPool.enableFor(ig.EntityFireball);
ig.registerClass('EntityFireball', ig.EntityFireball);
