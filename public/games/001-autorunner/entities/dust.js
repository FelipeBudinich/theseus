import ig from '../../../lib/impact/impact.js';

const EntityDust = ig.Entity.extend({
	size: {x: 1, y: 1},
	gravityFactor: -0.1,
	collides: ig.Entity.COLLIDES.NEVER,
	zIndex: 31,
	life: 0.3,
	age: 0,

	animSheet: new ig.AnimationSheet('games/001-autorunner/media/dust.png', 16, 16),

	init: function(x, y, settings) {
		this.parent(x, y, settings || {});
		this.size.x = 16;
		this.size.y = 16;
		this.addAnim('puff', this.life / 7, [0, 1, 2, 3, 4, 5, 6], true);
		this.currentAnim.angle = (180 - (Math.random()*90)).toRad();
	},

	update: function() {

		if (
			this.age >= this.life
		) {
			this.kill();
		}
		this.age += ig.system.tick;

		this.parent();
	},

	draw: function() {
		this.currentAnim.alpha = Math.min(0.22, 1 - this.age / this.life);
		this.parent();
	},
});

ig.EntityDust = EntityDust;
ig.registerClass('EntityDust', EntityDust);

export { EntityDust };
export default EntityDust;
