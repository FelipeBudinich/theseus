import ig from '../impact/impact.js';

const navigatorRef = typeof navigator !== 'undefined' ? navigator : null;
const windowRef = typeof window !== 'undefined' ? window : null;

const GAMEPAD_BUTTON_THRESHOLD = 0.5;
const GAMEPAD_AXIS_DEADZONE = 0.5;

const STANDARD_GAMEPAD_BUTTON_CODES = [
	['GamepadFaceBottom'], // 0
	['GamepadFaceRight'], // 1
	['GamepadFaceLeft'], // 2
	['GamepadFaceTop'], // 3

	['GamepadLeftShoulder'], // 4
	['GamepadRightShoulder'], // 5
	['GamepadLeftTrigger'], // 6
	['GamepadRightTrigger'], // 7

	['GamepadCenterLeft', 'GamepadSelect'], // 8
	['GamepadCenterRight', 'GamepadStart'], // 9

	['GamepadLeftStickPress'], // 10
	['GamepadRightStickPress'], // 11

	['GamepadDpadUp', 'GamepadUp'], // 12
	['GamepadDpadDown', 'GamepadDown'], // 13
	['GamepadDpadLeft', 'GamepadLeft'], // 14
	['GamepadDpadRight', 'GamepadRight'], // 15

	['GamepadCenter', 'GamepadHome'] // 16
];

if (navigatorRef && navigatorRef.getGamepads) {
	ig.Input.inject({
		isUsingGamepad: false,

		gamepads: {},
		lastGamepadInputStates: {},

		gamepadButtonThreshold: GAMEPAD_BUTTON_THRESHOLD,
		gamepadAxisDeadzone: GAMEPAD_AXIS_DEADZONE,

		initGamepad: function() {
			if (this.isUsingGamepad) {
				return;
			}

			this.isUsingGamepad = true;

			if (windowRef) {
				windowRef.addEventListener(
					'gamepadconnected',
					this.gamepadconnected.bind(this),
					false
				);

				windowRef.addEventListener(
					'gamepaddisconnected',
					this.gamepaddisconnected.bind(this),
					false
				);
			}

			this.refreshGamepads();
		},

		gamepadconnected: function(event) {
			this.gamepads[event.gamepad.index] = event.gamepad;
		},

		gamepaddisconnected: function(event) {
			delete this.gamepads[event.gamepad.index];
		},

		refreshGamepads: function() {
			var gamepads = navigatorRef.getGamepads();

			for (var i = 0; i < gamepads.length; i++) {
				if (gamepads[i]) {
					this.gamepads[gamepads[i].index] = gamepads[i];
				}
			}
		},

		isGamepadButtonPressed: function(button) {
			return !!button && (
				button.pressed ||
				button.value >= this.gamepadButtonThreshold
			);
		},

		addGamepadInputCode: function(states, code) {
			states[code] = true;
		},

		addGamepadInputCodes: function(states, codes) {
			if (!codes) {
				return;
			}

			for (var i = 0; i < codes.length; i++) {
				this.addGamepadInputCode(states, codes[i]);
			}
		},

		pollGamepadButtons: function(gamepad, states) {
			var buttons = gamepad.buttons || [];
			var isStandard = gamepad.mapping == 'standard';

			for (var i = 0; i < buttons.length; i++) {
				if (!this.isGamepadButtonPressed(buttons[i])) {
					continue;
				}

				this.addGamepadInputCode(states, 'GamepadButton' + i);

				if (isStandard) {
					this.addGamepadInputCodes(
						states,
						STANDARD_GAMEPAD_BUTTON_CODES[i]
					);
				}
			}
		},

		pollGamepadAxes: function(gamepad, states) {
			var axes = gamepad.axes || [];
			var deadzone = this.gamepadAxisDeadzone;
			var isStandard = gamepad.mapping == 'standard';

			for (var i = 0; i < axes.length; i++) {
				var value = axes[i] || 0;

				if (value <= -deadzone) {
					this.addGamepadInputCode(states, 'GamepadAxis' + i + 'Negative');
				}
				else if (value >= deadzone) {
					this.addGamepadInputCode(states, 'GamepadAxis' + i + 'Positive');
				}
			}

			if (!isStandard) {
				return;
			}

			// Standard Gamepad axes:
			// 0: left stick horizontal, negative left / positive right
			// 1: left stick vertical, negative up / positive down
			// 2: right stick horizontal, negative left / positive right
			// 3: right stick vertical, negative up / positive down

			if (axes[0] <= -deadzone) {
				this.addGamepadInputCode(states, 'GamepadLeftStickLeft');
				this.addGamepadInputCode(states, 'GamepadLeft');
			}
			else if (axes[0] >= deadzone) {
				this.addGamepadInputCode(states, 'GamepadLeftStickRight');
				this.addGamepadInputCode(states, 'GamepadRight');
			}

			if (axes[1] <= -deadzone) {
				this.addGamepadInputCode(states, 'GamepadLeftStickUp');
				this.addGamepadInputCode(states, 'GamepadUp');
			}
			else if (axes[1] >= deadzone) {
				this.addGamepadInputCode(states, 'GamepadLeftStickDown');
				this.addGamepadInputCode(states, 'GamepadDown');
			}

			if (axes[2] <= -deadzone) {
				this.addGamepadInputCode(states, 'GamepadRightStickLeft');
			}
			else if (axes[2] >= deadzone) {
				this.addGamepadInputCode(states, 'GamepadRightStickRight');
			}

			if (axes[3] <= -deadzone) {
				this.addGamepadInputCode(states, 'GamepadRightStickUp');
			}
			else if (axes[3] >= deadzone) {
				this.addGamepadInputCode(states, 'GamepadRightStickDown');
			}
		},

		updateGamepadInputCode: function(code, isDown) {
			var action = this.bindings[code];

			if (!action) {
				return;
			}

			if (isDown) {
				this.actions[action] = true;

				if (!this.locks[action]) {
					this.presses[action] = true;
					this.locks[action] = true;
				}
			}
			else {
				this.delayedKeyup[action] = true;
			}
		},

		pollGamepad: function() {
			if (!this.isUsingGamepad) {
				return;
			}

			var currentStates = {};
			var previousStates = this.lastGamepadInputStates;

			this.refreshGamepads();

			for (var index in this.gamepads) {
				var gamepad = this.gamepads[index];

				if (!gamepad || gamepad.connected === false) {
					continue;
				}

				this.pollGamepadButtons(gamepad, currentStates);
				this.pollGamepadAxes(gamepad, currentStates);
			}

			for (var downCode in currentStates) {
				this.updateGamepadInputCode(downCode, true);
			}

			for (var previousCode in previousStates) {
				if (!currentStates[previousCode]) {
					this.updateGamepadInputCode(previousCode, false);
				}
			}

			this.lastGamepadInputStates = currentStates;
		}
	});

	ig.Game.inject({
		run: function() {
			ig.input.pollGamepad();
			this.parent();
		}
	});
}
