import ig from '../../../lib/impact/impact.js';

import { WORLD } from '../levels/segments.js';

ig.EntityRunner = ig.Entity.extend({
	size: {x: 34, y: 60},
	gravityFactor: 0,
	collides: ig.Entity.COLLIDES.NEVER,
	zIndex: 30,

	accelY: 1720,
	coyoteWindow: 0.105,
	jumpBufferWindow: 0.115,
	jumpHoldDuration: 0.22,
	jumpImpulse: 642,
	minJumpHeightScale: 0.15,
	maxJumpHeightScale: 2.6,
	diveSpeedMultiplier: 1.1,
	ledgeGrabFallSpeed: 120,
	ledgeGrabVerticalReach: 42,
	ledgeJumpWindow: 0.16,
	maxFallSpeed: 1160,
	maxRunSpeed: 1548,
	runSpeed: 292,
	spriteScale: 2,
	speedRamp: 2.4,
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
		this.canDive = false;
		this.diveActive = false;
		this.stride = 0;
		this.currentPlatform = null;
		this.addAnim('run', 0.16, [0, 1, 2, 3]);
		this.addAnim('jump', 0.16, [4]);
		this.addAnim('goingUp', 0.16, [5]);
		this.addAnim('goingDown', 0.16, [6]);
		this.addAnim('land', 0.16, [7]);
		ig.game.runner = this;
	},

	update: function() {
		if (ig.game.state === 'lost') {
			this.updateFallingBody();
			return;
		}

		const dt = Math.min(ig.system.tick, 1 / 30);
		const wasStanding = this.standing;

		this.last.x = this.pos.x;
		this.last.y = this.pos.y;
		this.standing = false;

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
			this.startDive();
		}

		if (startedJump && ig.input.released('jump')) {
			this.cutJumpToHoldTime();
		}
		else if (!startedJump) {
			this.updateJumpControl(dt);
		}

		this.runSpeed = Math.min(this.maxRunSpeed, this.runSpeed + this.speedRamp * dt);
		this.vel.x = this.runSpeed;
		const fallSpeedMultiplier = this.diveActive ? this.diveSpeedMultiplier : 1;
		this.vel.y = Math.min(
			this.maxFallSpeed * fallSpeedMultiplier,
			this.vel.y + this.accelY * fallSpeedMultiplier * dt
		);
		this.pos.x += this.vel.x * dt;
		this.pos.y += this.vel.y * dt;

		const landedPlatform = ig.game.resolveRunnerPlatform(this);
		if (landedPlatform && !wasStanding) {
			this.landPoseTimer = this.landPoseDuration;
			this.ledgeJumpTimer = 0;
			this.canDive = false;
			this.diveActive = false;
			ig.game.audio.land();
			this.spawnDust(8, 26);
		}
		else if (landedPlatform) {
			this.ledgeJumpTimer = 0;
			this.canDive = false;
			this.diveActive = false;
		}
		else {
			ig.game.resolveRunnerLedgeHit(this);
		}

		this.stride += (this.standing ? 18 : 8) * dt;
		this.updateAnimationState(dt);

		if (this.pos.y > WORLD.lossY) {
			ig.game.lose();
		}
	},

	updateFallingBody: function() {
		const dt = Math.min(ig.system.tick, 1 / 30);
		this.last.x = this.pos.x;
		this.last.y = this.pos.y;
		this.vel.y = Math.min(this.maxFallSpeed, this.vel.y + this.accelY * dt);
		this.pos.y += this.vel.y * dt;
		this.vel.x = 0;
		this.runSpeed = 0;
		this.updateAnimationState(dt);
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

		for (let i = 0; i < 180; i++) {
			velocityY = Math.min(this.maxFallSpeed, velocityY + this.accelY * dt);
			y += velocityY * dt;
			minY = Math.min(minY, y);

			if (velocityY >= 0 && i > 1) {
				break;
			}
		}

		return -minY;
	},

	startJump: function() {
		this.vel.y = -this.getJumpImpulseForScale(this.maxJumpHeightScale);
		this.jumpBuffer = 0;
		this.coyoteTimer = 0;
		this.jumpControlActive = true;
		this.jumpHoldTime = 0;
		this.jumpPoseTimer = this.jumpPoseDuration;
		this.ledgeJumpTimer = 0;
		this.canDive = true;
		this.diveActive = false;
		this.currentPlatform = null;
		ig.game.audio.jump();
		this.spawnDust(5, -30);
	},

	startDive: function() {
		if (!this.canDive || this.standing || this.currentPlatform || this.diveActive) {
			return;
		}

		this.jumpBuffer = 0;
		this.coyoteTimer = 0;
		this.jumpControlActive = false;
		this.canDive = false;
		this.diveActive = true;
		this.vel.y = Math.max(this.vel.y, this.maxFallSpeed * this.diveSpeedMultiplier);
		this.spawnDust(4, 16);
	},

	grantLedgeJump: function(platform) {
		this.ledgeJumpTimer = this.ledgeJumpWindow;
		this.currentPlatform = null;
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

		this.currentAnim.update();
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
	},

	draw: function() {
		if (!this.currentAnim) {
			return;
		}

		const spriteWidth = this.animSheet.width * this.spriteScale;
		const spriteHeight = this.animSheet.height * this.spriteScale;
		const x = this.pos.x + (this.size.x - spriteWidth) / 2 - ig.game._rscreen.x;
		const y = this.pos.y + this.size.y - spriteHeight - ig.game._rscreen.y;
		const context = ig.system.context;

		context.save();
		context.translate(ig.system.getDrawPos(x), ig.system.getDrawPos(y));
		context.scale(this.spriteScale, this.spriteScale);
		this.currentAnim.draw(0, 0);
		context.restore();
	},
});

ig.registerClass('EntityRunner', ig.EntityRunner);
