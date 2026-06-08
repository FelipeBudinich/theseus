import ig from '../../../lib/impact/impact.js';
import './trigger.js';

const normalizeSpawnPointIndex = (value) => {
	const index = Number(value);

	return Number.isFinite(index) && index > 0 ? Math.floor(index) : 0;
};

const EntitySpawnPoint = ig.EntityTrigger.extend({
	_wmBoxColor: 'rgba(0, 255, 196, 0.7)',

	index: 0,

	check: function(other) {
		if (!ig.EntityRunner || !(other instanceof ig.EntityRunner)) {
			return;
		}

		ig.spawnPoint = normalizeSpawnPointIndex(this.index);
	}
});

ig.EntitySpawnPoint = EntitySpawnPoint;
ig.registerClass('EntitySpawnPoint', EntitySpawnPoint);

export { EntitySpawnPoint };
export default EntitySpawnPoint;
