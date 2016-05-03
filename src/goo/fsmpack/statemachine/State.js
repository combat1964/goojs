var ArrayUtils = require('../../util/ArrayUtils');
var SystemBus = require('../../entities/SystemBus');

/**
 * @param {object} [options]
 * @param {number} [options.id]
 * @param {Array<Action>} [options.actions]
 */
function State(options) {
	options = options || {};

	/**
	 * @type {string}
	 */
	this.id = options.id || 'defaultStateId';

	/**
	 * The host machine.
	 * @type {Machine|null}
	 */
	this.machine = null;

	/**
	 * @type {Array<Action>}
	 */
	this.actions = [];

	/**
	 * Maps transition ID's to State instances.
	 * @type {Map}
	 */
	this.transitions = new Map();

	/**
	 * @type {object}
	 */
	this.vars = {};

	/**
	 * @type {number}
	 */
	this.depth = 0;

	var actions = options.actions || [];
	for (var i = 0; i < actions.length; i++) {
		this.addAction(actions[i]);
	}
}

/**
 * @param {Action} action
 */
State.prototype.addAction = function (action) {
	if (this.actions.indexOf(action) !== -1) {
		throw new Error('Action ' + action.id + ' was already added.');
	}

	action.parent = this;
	this.actions.push(action);
};

/**
 * @param {Action} action
 */
State.prototype.removeAction = function (action) {
	ArrayUtils.remove(this.actions, action);
};

State.prototype.removeAllActions = function () {
	while (this.actions.length) {
		this.removeAction(this.actions[0]);
	}
};

/**
 * Sets the current .depth to 0
 */
State.prototype.resetDepth = function () {
	this.depth = 0;
};

/**
 * @returns {boolean}
 */
State.prototype.isCurrentState = function () {
	return this === this.machine.currentState;
};

/**
 * @param {string} transitionId
 */
State.prototype.handleTransition = function (transitionId) {
	var state = this.transitions.get(transitionId);
	this.requestTransition(state);
};

/**
 * @param {State} targetState
 */
State.prototype.requestTransition = function (targetState) {
	if (!this.isCurrentState()) {
		return;
	}

	if (!this.machine.asyncMode) {
		this.depth++;
		var fsm = this.machine.parent;
		if (this.depth > this.machine.maxLoopDepth) {
			var data = {
				entityId: fsm && fsm.entity ? fsm.entity.id : '',
				entityName: fsm && fsm.entity ? fsm.entity.name : '',
				machineName: this.machine ? this.machine.name : '',
				stateId: this.id,
				stateName: this.name
			};
			data.error = 'Exceeded max loop depth (' + this.machine.maxLoopDepth + ') in "' + [data.entityName, data.machineName, data.stateName].join('" / "') + '"';
			console.warn(data.error);
			SystemBus.emit('goo.fsm.error', data);
			return;
		}

		if (targetState && this.machine.containsState(targetState)) {
			this.machine.currentState.exit();
			this.machine.setState(targetState);
		}
	} else {
		this.transitionTarget = targetState;
	}
};

/**
 * @param {string} transitionId
 * @param {State} targetState
 */
State.prototype.setTransition = function (transitionId, targetState) {
	this.transitions.set(transitionId, targetState);
};

/**
 * @param {string} transitionId
 */
State.prototype.clearTransition = function (transitionId) {
	this.transitions.delete(transitionId);
};

State.prototype.enter = function () {
	SystemBus.emit('goo.fsm.enter', {
		entityId: this.component && this.component.entity ? this.component.entity.id : '',
		machineName: this.machine ? this.machine.name : '',
		stateId: this.id,
		stateName: this.name
	});

	// on enter of self
	var depth = this.depth;
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].enter();
		if (this.depth > depth) {
			return;
		}
	}
};

State.prototype.update = function () {
	// do on update of self
	var depth = this.depth;

	if (!this.machine.asyncMode) {
		for (var i = 0; i < this.actions.length; i++) {
			this.actions[i].update();
			if (this.depth > depth) {
				return;
			}
		}
	} else {
		// old async mode
		for (var i = 0; i < this.actions.length; i++) {
			this.actions[i].update();
			if (this.transitionTarget) {
				var tmp = this.transitionTarget;
				this.transitionTarget = null;
				return tmp;
			}
		}
	}
};

/**
 * Exit this state.
 */
State.prototype.exit = function () {
	SystemBus.emit('goo.fsm.exit', {
		entityId: this.component && this.component.entity ? this.component.entity.id : '',
		machineName: this.machine ? this.machine.name : '',
		stateId: this.id,
		stateName: this.name
	});

	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].exit();
	}
};

State.prototype.reset = function () {
	// TODO: ???
};

State.prototype.ready = function () {
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].ready();
	}
};

State.prototype.cleanup = function () {
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].cleanup();
	}
};

/**
 * @param {string} id
 * @return {Action}
 */
State.prototype.getActionById = function (id) {
	for (var i = 0; i < this.actions.length; i++) {
		var action = this.actions[i];
		if (action.id === id) {
			return action;
		}
	}
};

module.exports = State;