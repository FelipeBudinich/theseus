import ig from '../../../lib/impact/impact.js';

const EntityRunnerEnter = ig.Entity.extend({
	_wmIgnore: true,

	size: {x: 9, y: 15},
	offset: {x: 4, y: 8},
	gravityFactor: 1,
	collides: ig.Entity.COLLIDES.NEVER,
	type: ig.Entity.TYPE.NONE,
	checkAgainst: ig.Entity.TYPE.NONE,
	zIndex: 31,
	maxVel: {x: 0, y: 640},

	spinSpeed: 18,
	hasEntered: false,

	animSheet: new ig.AnimationSheet('games/001-autorunner/media/player.png', 17, 23),

	init: function(x, y, settings) {
		this.parent(x, y, settings || {});
		this.vel.x = 0;
		this.vel.y = 0;
		this.addAnim('enter', 1, [0], true);
	},

	update: function() {
		this.vel.x = 0;
		this.parent();
		this.currentAnim.angle += this.spinSpeed * ig.system.tick;
	},

	handleMovementTrace: function(res) {
		this.parent(res);

		if (this.hasEntered || !(res.collision.x || res.collision.y || res.collision.slope)) {
			return;
		}

		this.hasEntered = true;
		if (ig.game && typeof ig.game.spawnRunnerFromEnter == 'function') {
			ig.game.spawnRunnerFromEnter(this.pos.x, this.pos.y);
		}
		else if (ig.EntityRunner && typeof ig.game.spawnEntity == 'function') {
			ig.game.spawnEntity(ig.EntityRunner, this.pos.x, this.pos.y);
		}
		this.kill();
	}
});

ig.EntityRunnerEnter = EntityRunnerEnter;
ig.registerClass('EntityRunnerEnter', EntityRunnerEnter);

export { EntityRunnerEnter };
export default EntityRunnerEnter;
