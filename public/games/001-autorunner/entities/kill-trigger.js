import ig from '../../../lib/impact/impact.js';
import './trigger.js';

const EntityKillTrigger = ig.EntityTrigger.extend({
	_wmBoxColor: 'rgba(255, 0, 0, 0.7)',

	check: function(other) {
		if (other && typeof other.kill == 'function') {
			other.kill();
		}
	}
});

ig.EntityKillTrigger = EntityKillTrigger;
ig.registerClass('EntityKillTrigger', EntityKillTrigger);

export { EntityKillTrigger };
export default EntityKillTrigger;
