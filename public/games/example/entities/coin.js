import ig from '../../../lib/impact/impact.js';

ig.EntityCoin = ig.Entity.extend({
	size: {x: 36, y: 36},
	
	type: ig.Entity.TYPE.NONE,
	checkAgainst: ig.Entity.TYPE.A,
	collides: ig.Entity.COLLIDES.NEVER,
	
	animSheet: new ig.AnimationSheet('media/coin.png', 36, 36),
	sfxCollect: new ig.Sound('media/sounds/coin.*'),
	
	init: function(x, y, settings) {
		this.parent(x, y, settings);
		
		this.addAnim('idle', 0.1, [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2]);
	},
	
	update: function() {
		this.currentAnim.update();
	},
	
	check: function(other) {
		if (other instanceof ig.EntityPlayer) {
			other.giveCoins(1);
			this.sfxCollect.play();
			this.kill();
		}
	}
});

ig.registerClass('EntityCoin', ig.EntityCoin);
