import ig from '../../impact/impact.js';

ig.EntityLevelchange = ig.Entity.extend({
	_wmDrawBox: true,
	_wmBoxColor: 'rgba(0, 0, 255, 0.7)',
	
	size: {x: 32, y: 32},
	level: null,
	
	triggeredBy: function() {
		if (!this.level) {
			return;
		}
		
		var levelData = ig.game.getLevelByName(this.level);
		if (levelData) {
			ig.game.loadLevelDeferred(levelData);
		}
	},
	
	update: function() {}
});

ig.registerClass('EntityLevelchange', ig.EntityLevelchange);
