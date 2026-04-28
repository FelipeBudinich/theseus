import ig from '../../impact/impact.js';

ig.EntityHurt = ig.Entity.extend({
	_wmDrawBox: true,
	_wmBoxColor: 'rgba(255, 0, 0, 0.7)',
	
	size: {x: 32, y: 32},
	damage: 10,
		
	triggeredBy: function(entity) {
		entity.receiveDamage(this.damage, this);
	},
	
	update: function() {}
});

ig.registerClass('EntityHurt', ig.EntityHurt);
