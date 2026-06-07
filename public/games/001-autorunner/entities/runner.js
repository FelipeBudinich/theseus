import ig from '../../../lib/impact/impact.js';

import { WORLD } from '../game.js';
import './runner-dead.js';

ig.EntityRunner = ig.Entity.extend({
	size: {x: 9, y: 15},
	offset: {x:4, y:8},
	gravityFactor: 1,
	collides: ig.Entity.COLLIDES.ACTIVE,
	type: ig.Entity.TYPE.A,
	zIndex: 30,

	coyoteWindow: 0.115,
	jumpBufferWindow: 0.115,
	jumpHoldDuration: 0.22,
	jumpImpulse: 321,
	minJumpHeightScale: 0.15,
	maxJumpHeightScale: 2,
	diveSpeedMultiplier: 1.2,
	diveFreezeDuration: 0.016,
	ledgeGrabFallSpeed: 120,
	ledgeGrabVerticalReach: 42,
	ledgeJumpWindow: 0.16,
	maxFallSpeed: 640,
	maxRunSpeed: 240,
	startRunSpeed: 180,
	accel: {x:30, y:0},
	jumpPoseDuration: 0.08,
	landPoseDuration: 0.12,

	animSheet: new ig.AnimationSheet('games/001-autorunner/media/player.png', 17, 23),

	init: function(x, y, settings) {
		this.parent(x, y, settings);
		this.coyoteTimer = this.coyoteWindow;
		this.jumpBuffer = 0;
		this.jumpControlActive = false;
		this.jumpHoldTime = 0;
		this.jumpPoseTimer = 0;
		this.landPoseTimer = 0;
		this.ledgeJumpTimer = 0;
		this.diveFreezeTimer = 0;
		this.diveFreezeVelocityX = 0;
		this.canDive = false;
		this.diveActive = false;
		this.stride = 0;
		this.vel.x = this.startRunSpeed;
		this.vel.y = 0;
		this.maxVel.x = this.maxRunSpeed;
		this.maxVel.y = this.maxFallSpeed;
		this.gravityFactor = 1;
		this.addAnim('run', 0.16, [0, 1, 2, 3]);
		this.addAnim('jump', 0.16, [4]);
		this.addAnim('goingUp', 0.16, [5]);
		this.addAnim('goingDown', 0.16, [6]);
		this.addAnim('land', 0.16, [7]);
		ig.game.runner = this;
	},

	handleMovementTrace: function(res) {
		this.movementTrace = res;
		this.traceVelocity = {x: this.vel.x, y: this.vel.y};
		this.parent(res);
	},

	update: function() {
		if (ig.game.state === 'lost') {
			return;
		}

		if (this.vel.x <= 120){
			this.accel.x = 600;
			if (this.vel.x < -10 && this.standing){
				this.currentAnim.angle = (45).toRad();
			}
		} else {
			this.currentAnim.angle = 0;
			this.accel.x = 30;
		}

		const dt = Math.min(ig.system.tick, 1 / 30);
		const wasStanding = this.standing;

		if (this.ledgeJumpTimer > 0) {
			this.ledgeJumpTimer = Math.max(0, this.ledgeJumpTimer - dt);
		}

		const jumpPressed = ig.input.pressed('jump');
		if (jumpPressed) {
			this.jumpBuffer = this.jumpBufferWindow;
		}

		if (wasStanding) {
			this.coyoteTimer = this.coyoteWindow;
		}
		else {
			this.coyoteTimer -= dt;
		}

		if (this.jumpBuffer > 0) {
			this.jumpBuffer -= dt;
		}

		let startedJump = false;
		if (this.jumpBuffer > 0 && (this.coyoteTimer > 0 || this.ledgeJumpTimer > 0)) {
			this.startJump();
			startedJump = true;
		}
		else if (jumpPressed) {
			this.startDiveFreeze();
		}

		if (startedJump && ig.input.released('jump')) {
			this.cutJumpToHoldTime();
		}
		else if (!startedJump) {
			this.updateJumpControl(dt);
		}

		if (this.diveFreezeTimer > 0) {
			this.updateDiveFreeze(dt);
			return;
		}

		this.gravityFactor = this.diveActive ? this.diveSpeedMultiplier : 1;
		this.movementTrace = null;
		this.traceVelocity = {x: this.vel.x, y: this.vel.y};
		this.parent();

		const movementTrace = this.movementTrace || {collision: {}};
		const attemptedVelocityX = this.traceVelocity.x;
		const attemptedVelocityY = this.traceVelocity.y;

		const landed = this.standing && movementTrace.collision.y && attemptedVelocityY > 0;
		if (landed && !wasStanding) {
			this.landPoseTimer = this.landPoseDuration;
			this.ledgeJumpTimer = 0;
			this.diveFreezeTimer = 0;
			this.canDive = false;
			if (this.diveActive){
				this.diveActive = false;
				this.vel.x = this.startRunSpeed;
			}
			ig.game.audio.land();
			this.spawnDust(8, 26);
		}
		else if (this.standing) {
			this.ledgeJumpTimer = 0;
			this.diveFreezeTimer = 0;
			this.canDive = false;
			this.diveActive = false;
		}
		else if (movementTrace.collision.x && attemptedVelocityX > 0) {
			this.resolveCollisionLedgeHit();
		}

		this.stride += (this.standing ? 18 : 8) * dt;
		this.updateAnimationState(dt);

		if (this.pos.y > WORLD.lossY) {
			ig.game.lose();
		}
	},

	getJumpImpulseForScale: function(heightScale) {
		const dt = Math.min(ig.system.tick || 1 / 60, 1 / 30);
		const targetHeight = this.estimateJumpHeightForImpulse(this.jumpImpulse, dt) * heightScale;
		let low = 0;
		let high = this.jumpImpulse * Math.max(1, Math.sqrt(heightScale) * 1.2);

		while (this.estimateJumpHeightForImpulse(high, dt) < targetHeight) {
			high *= 1.2;
		}

		for (let i = 0; i < 18; i++) {
			const middle = (low + high) / 2;
			if (this.estimateJumpHeightForImpulse(middle, dt) < targetHeight) {
				low = middle;
			}
			else {
				high = middle;
			}
		}

		return high;
	},

	estimateJumpHeightForImpulse: function(impulse, dt) {
		let y = 0;
		let minY = 0;
		let velocityY = -impulse;
		const gravity = ig.game.gravity * this.gravityFactor;

		for (let i = 0; i < 180; i++) {
			velocityY = (velocityY + gravity * dt);
			y += velocityY * dt;
			minY = Math.min(minY, y);

			if (velocityY >= 0 && i > 1) {
				break;
			}
		}

		return -minY;
	},

	startJump: function() {
		this.diveFreezeTimer = 0;
		this.diveActive = false;
		this.vel.y = -this.getJumpImpulseForScale(this.maxJumpHeightScale);
		this.vel.x = Math.max(this.vel.x, this.startRunSpeed);
		this.jumpBuffer = 0;
		this.coyoteTimer = 0;
		this.jumpControlActive = true;
		this.jumpHoldTime = 0;
		this.jumpPoseTimer = this.jumpPoseDuration;
		this.ledgeJumpTimer = 0;
		this.canDive = true;
		ig.game.audio.jump();
		this.spawnDust(5, -30);
	},

	startDiveFreeze: function() {
		if (!this.canDive || this.standing || this.diveActive || this.diveFreezeTimer > 0) {
			return;
		}

		this.jumpBuffer = 0;
		this.coyoteTimer = 0;
		this.jumpControlActive = false;
		this.diveFreezeTimer = this.diveFreezeDuration;
		this.diveFreezeVelocityX = this.vel.x;
	},

	updateDiveFreeze: function(dt) {
		this.diveFreezeTimer = Math.max(0, this.diveFreezeTimer - dt);
		this.accel.x = 0;
		this.accel.y = 0;
		this.gravityFactor = 0;
		this.vel.x = 0;
		this.vel.y = 0;
		this.movementTrace = null;
		this.traceVelocity = {x: 0, y: 0};
		this.updateAnimationState(dt);

		if (this.diveFreezeTimer <= 0) {
			this.vel.x = Math.max(this.diveFreezeVelocityX, this.startRunSpeed);
			this.startDive();
		}
	},

	startDive: function() {
		if (!this.canDive || this.standing || this.diveActive) {
			return;
		}

		this.jumpBuffer = 0;
		this.coyoteTimer = 0;
		this.jumpControlActive = false;
		this.canDive = false;
		this.diveActive = true;
		this.vel.y = this.maxVel.y;
		this.spawnDust(4, 16);
	},

	resolveCollisionLedgeHit: function() {
		const collisionMap = ig.game.collisionMap;
		const tileSize = collisionMap.tilesize;
		const sampleX = this.pos.x + this.size.x + 1;
		const firstTileY = Math.max(0, Math.floor((this.pos.y - this.ledgeGrabVerticalReach) / tileSize));
		const lastTileY = Math.min(
			collisionMap.height - 1,
			Math.floor((this.pos.y + this.size.y - 1) / tileSize)
		);
		const previousBottom = this.last.y + this.size.y;

		for (let tileY = firstTileY; tileY <= lastTileY; tileY++) {
			const tileTop = tileY * tileSize;
			const hasTile = collisionMap.getTile(sampleX, tileTop + 1);
			const hasTileAbove = collisionMap.getTile(sampleX, tileTop - 1);
			const nearLedgeTop =
				this.pos.y < tileTop + this.ledgeGrabVerticalReach &&
				this.pos.y + this.size.y > tileTop + 10;
			const missedLandingLine = previousBottom > tileTop + 8;

			if (hasTile && !hasTileAbove && nearLedgeTop && missedLandingLine) {
				this.grantLedgeJump();
				return true;
			}
		}

		return false;
	},

	grantLedgeJump: function() {
		this.ledgeJumpTimer = this.ledgeJumpWindow;
		if (this.vel.y > this.ledgeGrabFallSpeed) {
			this.vel.y = this.ledgeGrabFallSpeed;
		}

		this.spawnDust(3, 20);
	},

	updateAnimationState: function(dt) {
		if (this.jumpPoseTimer > 0) {
			this.jumpPoseTimer = Math.max(0, this.jumpPoseTimer - dt);
		}

		if (this.landPoseTimer > 0) {
			this.landPoseTimer = Math.max(0, this.landPoseTimer - dt);
		}

		let nextAnim = this.anims.run;
		if (ig.game.state === 'lost' || this.diveActive || this.vel.y > 0) {
			nextAnim = this.anims.goingDown;
		}
		else if (!this.standing && this.jumpPoseTimer > 0) {
			nextAnim = this.anims.jump;
		}
		else if (!this.standing) {
			nextAnim = this.anims.goingUp;
		}
		else if (this.landPoseTimer > 0) {
			nextAnim = this.anims.land;
		}

		if (this.currentAnim !== nextAnim) {
			this.currentAnim = nextAnim.rewind();
		}
	},

	updateJumpControl: function(dt) {
		if (!this.jumpControlActive) {
			return;
		}

		if (this.vel.y >= 0) {
			this.jumpControlActive = false;
			return;
		}

		if (ig.input.released('jump') || !ig.input.state('jump')) {
			this.cutJumpToHoldTime();
			return;
		}

		this.jumpHoldTime = Math.min(this.jumpHoldDuration, this.jumpHoldTime + dt);
		if (this.jumpHoldTime >= this.jumpHoldDuration) {
			this.jumpControlActive = false;
		}
	},

	cutJumpToHoldTime: function() {
		const holdRatio = this.jumpHoldDuration > 0
			? Math.min(1, this.jumpHoldTime / this.jumpHoldDuration)
			: 1;
		const heightScale = this.minJumpHeightScale +
			(this.maxJumpHeightScale - this.minJumpHeightScale) * holdRatio;
		const targetVelocity = -this.getJumpImpulseForScale(heightScale);

		if (this.vel.y < targetVelocity) {
			this.vel.y = targetVelocity;
		}

		this.jumpControlActive = false;
	},

	kill: function() {
		if (!this._killed) {
			this.spawnDeadRunner();

			if (typeof ig.game.lose == 'function') {
				ig.game.lose();
			}

			if (ig.game.runner === this) {
				ig.game.runner = null;
			}
		}

		this.parent();
	},

	spawnDeadRunner: function() {
		if (!ig.EntityRunnerDead || typeof ig.game.spawnEntity != 'function') {
			return null;
		}

		return ig.game.spawnEntity(ig.EntityRunnerDead, this.pos.x, this.pos.y, {
			angle: this.currentAnim ? this.currentAnim.angle : 0,
			vel: {
				x: this.vel.x,
				y: -200
			}
		});
	},

	spawnDust: function(count, xOffset) {
		for (let i = 0; i < count; i++) {
			ig.game.spawnEntity(ig.EntityDust, this.pos.x + xOffset, this.pos.y + this.size.y - 4, {
				vel: {
					x: -70 - Math.random() * 160,
					y: -20 - Math.random() * 70,
				},
				life: 0.22 + Math.random() * 0.18,
				size: {
					x: 2 + Math.random() * 5,
					y: 2 + Math.random() * 4,
				},
			});
		}
	}
});

ig.registerClass('EntityRunner', ig.EntityRunner);
