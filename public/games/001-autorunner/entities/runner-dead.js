import ig from '../../../lib/impact/impact.js';

const EntityRunnerDead = ig.Entity.extend({
	_wmIgnore: true,

	size: {x: 9, y: 15},
	offset: {x: 4, y: 8},
	gravityFactor: 1,
	collides: ig.Entity.COLLIDES.NEVER,
	type: ig.Entity.TYPE.NONE,
	checkAgainst: ig.Entity.TYPE.NONE,
	zIndex: 31,
	maxVel: {x: 640, y: 640},

	startVelY: -200,
	spinSpeed: 18,
	ignoreCollisionTiles: false,

	animSheet: new ig.AnimationSheet('games/001-autorunner/media/player.png', 17, 23),

	init: function(x, y, settings) {
		settings = settings || {};
		this.parent(x, y, settings);
		this.addAnim('dead', 1, [0], true);

		this.vel.y = this.startVelY;
		if (settings.angle) {
			this.currentAnim.angle = settings.angle;
		}
	},

	update: function() {
		if (this.ignoreCollisionTiles) {
			this.updateWithoutCollisionTiles();
		}
		else {
			this.parent();
		}

		this.currentAnim.angle += this.spinSpeed * ig.system.tick;
	},

	updateWithoutCollisionTiles: function() {
		this.last.x = this.pos.x;
		this.last.y = this.pos.y;
		this.standing = false;
		this.vel.y += ig.game.gravity * ig.system.tick * this.gravityFactor;

		this.vel.x = this.getNewVelocity(this.vel.x, this.accel.x, this.friction.x, this.maxVel.x);
		this.vel.y = this.getNewVelocity(this.vel.y, this.accel.y, this.friction.y, this.maxVel.y);

		this.pos.x += this.vel.x * ig.system.tick;
		this.pos.y += this.vel.y * ig.system.tick;

		if (this.currentAnim) {
			this.currentAnim.update();
		}
	},

	handleMovementTrace: function(res) {
		this.parent(res);

		if (res.collision.x || res.collision.y || res.collision.slope) {
			this.ignoreCollisionTiles = true;
			this.standing = false;
		}
	}
});

ig.EntityRunnerDead = EntityRunnerDead;
ig.registerClass('EntityRunnerDead', EntityRunnerDead);

export { EntityRunnerDead };
export default EntityRunnerDead;
