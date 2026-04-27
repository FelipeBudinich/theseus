import ig from '../impact/impact.js';

const navigatorRef = typeof navigator !== 'undefined' ? navigator : null;
const windowRef = typeof window !== 'undefined' ? window : null;

const GAMEPAD_BUTTON_THRESHOLD = 0.5;
const GAMEPAD_AXIS_DEADZONE = 0.5;

const STANDARD_GAMEPAD_BUTTON_SUFFIXES = [
	['FaceBottom'], // 0
	['FaceRight'], // 1
	['FaceLeft'], // 2
	['FaceTop'], // 3

	['LeftShoulder'], // 4
	['RightShoulder'], // 5
	['LeftTrigger'], // 6
	['RightTrigger'], // 7

	['CenterLeft', 'Select'], // 8
	['CenterRight', 'Start'], // 9

	['LeftStickPress'], // 10
	['RightStickPress'], // 11

	['DpadUp', 'Up'], // 12
	['DpadDown', 'Down'], // 13
	['DpadLeft', 'Left'], // 14
	['DpadRight', 'Right'], // 15

	['Center', 'Home'] // 16
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

		isGamepadInputCode: function(code) {
			return /^Gamepad[0-9]+[A-Z]/.test(code);
		},

		gamepadconnected: function(event) {
			this.gamepads[event.gamepad.index] = event.gamepad;
		},

		gamepaddisconnected: function(event) {
			delete this.gamepads[event.gamepad.index];
		},

		refreshGamepads: function() {
			var connectedGamepads = {};
			var gamepads = navigatorRef.getGamepads() || [];

			for (var i = 0; i < gamepads.length; i++) {
				var gamepad = gamepads[i];

				if (gamepad && gamepad.connected !== false) {
					connectedGamepads[gamepad.index] = gamepad;
				}
			}

			this.gamepads = connectedGamepads;
		},

		gamepadInputCode: function(gamepad, suffix) {
			return 'Gamepad' + gamepad.index + suffix;
		},

		addGamepadInputCode: function(states, gamepad, suffix) {
			states[this.gamepadInputCode(gamepad, suffix)] = true;
		},

		addGamepadInputCodes: function(states, gamepad, suffixes) {
			if (!suffixes) {
				return;
			}

			for (var i = 0; i < suffixes.length; i++) {
				this.addGamepadInputCode(states, gamepad, suffixes[i]);
			}
		},

		isGamepadButtonPressed: function(button) {
			if (!button) {
				return false;
			}

			if (typeof button == 'object') {
				return button.pressed ||
					button.value >= this.gamepadButtonThreshold;
			}

			return button >= this.gamepadButtonThreshold;
		},

		pollGamepadButtons: function(gamepad, states) {
			var buttons = gamepad.buttons || [];
			var isStandard = gamepad.mapping == 'standard';

			for (var i = 0; i < buttons.length; i++) {
				if (!this.isGamepadButtonPressed(buttons[i])) {
					continue;
				}

				// Raw indexed button code.
				// Example: Gamepad0Button0, Gamepad1Button0
				this.addGamepadInputCode(states, gamepad, 'Button' + i);

				// Standard indexed semantic codes.
				// Example: Gamepad0FaceBottom, Gamepad1DpadLeft
				if (isStandard) {
					this.addGamepadInputCodes(
						states,
						gamepad,
						STANDARD_GAMEPAD_BUTTON_SUFFIXES[i]
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
					// Example: Gamepad0Axis0Negative
					this.addGamepadInputCode(
						states,
						gamepad,
						'Axis' + i + 'Negative'
					);
				}
				else if (value >= deadzone) {
					// Example: Gamepad0Axis0Positive
					this.addGamepadInputCode(
						states,
						gamepad,
						'Axis' + i + 'Positive'
					);
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
				this.addGamepadInputCode(states, gamepad, 'LeftStickLeft');
				this.addGamepadInputCode(states, gamepad, 'Left');
			}
			else if (axes[0] >= deadzone) {
				this.addGamepadInputCode(states, gamepad, 'LeftStickRight');
				this.addGamepadInputCode(states, gamepad, 'Right');
			}

			if (axes[1] <= -deadzone) {
				this.addGamepadInputCode(states, gamepad, 'LeftStickUp');
				this.addGamepadInputCode(states, gamepad, 'Up');
			}
			else if (axes[1] >= deadzone) {
				this.addGamepadInputCode(states, gamepad, 'LeftStickDown');
				this.addGamepadInputCode(states, gamepad, 'Down');
			}

			if (axes[2] <= -deadzone) {
				this.addGamepadInputCode(states, gamepad, 'RightStickLeft');
			}
			else if (axes[2] >= deadzone) {
				this.addGamepadInputCode(states, gamepad, 'RightStickRight');
			}

			if (axes[3] <= -deadzone) {
				this.addGamepadInputCode(states, gamepad, 'RightStickUp');
			}
			else if (axes[3] >= deadzone) {
				this.addGamepadInputCode(states, gamepad, 'RightStickDown');
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
