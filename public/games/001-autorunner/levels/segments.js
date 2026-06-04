export const WORLD = {
	width: 960,
	height: 540,
	groundY: 388,
	lossY: 704,
	runnerAnchorX: 238,
	runnerStartX: 168,
	runnerHeight: 60,
	platformDepth: 260,
	spawnAhead: 2100,
	pruneBehind: 520,
};

export const START_SEGMENT = {
	id: 'launch-block',
	length: 920,
	startY: 0,
	endY: 0,
	platforms: [
		{x: -360, y: 0, width: 1280, kind: 'launch'},
	],
};

export const LEVEL_SEGMENTS = [
	{
		id: 'flat-burst',
		length: 1040,
		startY: 0,
		endY: 0,
		platforms: [
			{x: 0, y: 0, width: 360, kind: 'factory'},
			{x: 478, y: 0, width: 432, kind: 'office'},
		],
	},
	{
		id: 'drop-step',
		length: 1160,
		startY: 0,
		endY: 24,
		platforms: [
			{x: 0, y: 0, width: 286, kind: 'office'},
			{x: 420, y: 24, width: 324, kind: 'factory'},
			{x: 872, y: 24, width: 274, kind: 'short'},
		],
	},
	{
		id: 'high-window',
		length: 1300,
		startY: 0,
		endY: -48,
		platforms: [
			{x: 0, y: 0, width: 310, kind: 'short'},
			{x: 474, y: -48, width: 284, kind: 'glass'},
			{x: 888, y: -48, width: 386, kind: 'factory'},
		],
	},
	{
		id: 'broken-adline',
		length: 1380,
		startY: 0,
		endY: 0,
		platforms: [
			{x: 0, y: 0, width: 428, kind: 'office'},
			{x: 598, y: 20, width: 222, kind: 'short'},
			{x: 938, y: 0, width: 438, kind: 'factory'},
		],
	},
	{
		id: 'short-roofs',
		length: 1140,
		startY: 0,
		endY: 12,
		platforms: [
			{x: 0, y: 0, width: 248, kind: 'short'},
			{x: 360, y: -18, width: 246, kind: 'glass'},
			{x: 720, y: 12, width: 356, kind: 'office'},
		],
	},
	{
		id: 'long-breath',
		length: 1360,
		startY: 0,
		endY: -28,
		platforms: [
			{x: 0, y: 0, width: 620, kind: 'factory'},
			{x: 792, y: -28, width: 496, kind: 'office'},
		],
	},
	{
		id: 'recenter-low',
		length: 1090,
		startY: 0,
		endY: -34,
		platforms: [
			{x: 0, y: 0, width: 330, kind: 'office'},
			{x: 462, y: -34, width: 410, kind: 'factory'},
		],
	},
	{
		id: 'recenter-high',
		length: 1080,
		startY: 0,
		endY: 32,
		platforms: [
			{x: 0, y: 0, width: 318, kind: 'glass'},
			{x: 456, y: 32, width: 418, kind: 'office'},
		],
	},
];
