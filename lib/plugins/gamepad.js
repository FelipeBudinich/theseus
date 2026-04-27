import ig from '../impact/impact.js';

ig.GAMEPAD_BUTTON_OFFSET = 256;
ig.GAMEPAD = {
	FACE_1: ig.GAMEPAD_BUTTON_OFFSET + 0,
	FACE_2: ig.GAMEPAD_BUTTON_OFFSET + 1,
	FACE_3: ig.GAMEPAD_BUTTON_OFFSET + 2,
	FACE_4: ig.GAMEPAD_BUTTON_OFFSET + 3,
	LEFT_SHOULDER: ig.GAMEPAD_BUTTON_OFFSET + 4,
	RIGHT_SHOULDER: ig.GAMEPAD_BUTTON_OFFSET + 5,
	LEFT_SHOULDER_BOTTOM: ig.GAMEPAD_BUTTON_OFFSET + 6,
	RIGHT_SHOULDER_BOTTOM: ig.GAMEPAD_BUTTON_OFFSET + 7,
	SELECT: ig.GAMEPAD_BUTTON_OFFSET + 8,
	START: ig.GAMEPAD_BUTTON_OFFSET + 9,
	LEFT_ANALOGUE_STICK: ig.GAMEPAD_BUTTON_OFFSET + 10,
	RIGHT_ANALOGUE_STICK: ig.GAMEPAD_BUTTON_OFFSET + 11,
	PAD_TOP: ig.GAMEPAD_BUTTON_OFFSET + 12,
	PAD_BOTTOM: ig.GAMEPAD_BUTTON_OFFSET + 13,
	PAD_LEFT: ig.GAMEPAD_BUTTON_OFFSET + 14,
	PAD_RIGHT: ig.GAMEPAD_BUTTON_OFFSET + 15
};

const navigatorRef = typeof navigator !== 'undefined' ? navigator : null;

if (navigatorRef && navigatorRef.getGamepads) {
	ig.Input.inject({
		gamepad: null,
		lastButtons: {},
		hasButtonObject: typeof window !== 'undefined' && !!window.GamepadButton,

		getFirstGamepadSnapshot: function() {
			var gamepads = navigatorRef.getGamepads();
			for (var i = 0; i < gamepads.length; i++) {
				if (gamepads[i]) {
					return gamepads[i];
				}
			}
			return null;
		},

		pollGamepad: function() {
			this.gamepad = this.getFirstGamepadSnapshot();
			if (!this.gamepad) {
				return;
			}

			for (var b = 0; b < this.gamepad.buttons.length; b++) {
				var action = this.bindings[b + ig.GAMEPAD_BUTTON_OFFSET];
				var currentState = false;

				if (action) {
					var button = this.gamepad.buttons[b];
					currentState =
						typeof button.pressed !== 'undefined' ? button.pressed : button;
					
					var prevState = this.lastButtons[b];
					
					if (!prevState && currentState) {
						this.actions[action] = true;
						this.presses[action] = true;
					}
					else if (prevState && !currentState) {
						this.delayedKeyup[action] = true;
					}
				}

				this.lastButtons[b] = currentState;
			}
		}
	});

	ig.Game.inject({
		run: function() {
			ig.input.pollGamepad();
			this.parent();
		}
	});
}
