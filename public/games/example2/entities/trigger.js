import ig from '../../../lib/impact/impact.js';

ig.EntityTrigger = ig.Entity.extend({
	size: {x: 32, y: 32},
	
	_wmScalable: true,
	_wmDrawBox: true,
	_wmBoxColor: 'rgba(196, 255, 0, 0.7)',
	
	target: null,
	wait: -1,
	waitTimer: null,
	canFire: true,
	
	type: ig.Entity.TYPE.NONE,
	checkAgainst: ig.Entity.TYPE.A,
	collides: ig.Entity.COLLIDES.NEVER,
	
	init: function(x, y, settings) {
		if (settings.checks) {
			this.checkAgainst = ig.Entity.TYPE[settings.checks.toUpperCase()] || ig.Entity.TYPE.A;
			delete settings.check;
		}
		
		this.parent(x, y, settings);
		this.waitTimer = new ig.Timer();
	},
	
	check: function(other) {
		if (this.canFire && this.waitTimer.delta() >= 0) {
			if (typeof this.target == 'object') {
				for (var t in this.target) {
					var ent = ig.game.getEntityByName(this.target[t]);
					if (ent && typeof ent.triggeredBy == 'function') {
						ent.triggeredBy(other, this);
					}
				}
			}
			
			if (this.wait == -1) {
				this.canFire = false;
			}
			else {
				this.waitTimer.set(this.wait);
			}
		}
	},
	
	update: function() {}
});

ig.registerClass('EntityTrigger', ig.EntityTrigger);
