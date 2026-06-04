import { WORLD } from './segments.js';

export const LevelAutorunner = {
	entities: [
		{
			type: 'EntitySegmentManager',
			x: 0,
			y: 0,
		},
		{
			type: 'EntityRunner',
			x: WORLD.runnerStartX,
			y: WORLD.groundY - WORLD.runnerHeight,
		},
		{
			type: 'EntityHud',
			x: 0,
			y: 0,
		},
		{
			type: 'EntityLossOverlay',
			x: 0,
			y: 0,
		},
	],
	layer: [],
};
