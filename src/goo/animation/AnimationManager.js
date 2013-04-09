define(['goo/animation/layer/AnimationLayer', 'goo/animation/clip/AnimationClipInstance'],
/** @lends */
function (AnimationLayer, AnimationClipInstance) {
	"use strict";

	/**
	 * @class
	 * <p>
	 * AnimationManager describes and maintains an animation system. It tracks one or more layered animation state machines (AnimationLayer) and uses
	 * their combined result to update one or more poses (via a set AnimationApplier.) AnimationClips used in these layers are instanced and tracked
	 * specifically for this manager.
	 * </p>
	 * <p>
	 * By default, an animation manager has a single base animation layer. Other layers may be added to this. It is important that the base layer (the
	 * layer at index 0) always has a full set of data to put a skeleton pose into a valid state.
	 * </p>
	 * @param {SkeletonPose} pose a pose to update. Optional if we won't be animating a skinmesh.
	 */
	function AnimationManager (pose) {
		this.globalTime = 0.0;
		this._layers = [];
		this._applier = null; // animationapplier
		this._clipInstances = {}; // Map<AnimationClip, AnimationClipInstance>

		this._updateRate = 1.0 / 60.0;
		this._lastUpdate = 0.0;

		// add our base layer
		var layer = new AnimationLayer(AnimationLayer.BASE_LAYER_NAME);
		layer._manager = this;
		this._layers.push(layer);

		this._applyToPoses = [];
		if (pose) {
			this._applyToPoses.push(pose);
		}

		this._valuesStore = {};
	}

	/**
	 * Move associated layers forward to the current global time and then apply the associated animation data to any SkeletonPoses set on the manager.
	 */
	AnimationManager.prototype.update = function (tpf) {
		// grab current global time
		this.globalTime += tpf;
		var globalTime = this.globalTime;

		// check throttle
		if (this._updateRate !== 0.0) {
			if (globalTime - this._lastUpdate < this._updateRate) {
				return;
			}

			// we subtract a bit to maintain our desired rate, even if there are some gc pauses, etc.
			this._lastUpdate = globalTime - (globalTime - this._lastUpdate) % this._updateRate;
		}

		// move the time forward on the layers
		for ( var i = 0, max = this._layers.length; i < max; i++) {
			var layer = this._layers[i];
			var state = layer._currentState;
			if (state) {
				state.update(globalTime, layer);
			}
		}

		// call apply on blend module, passing in pose
		for ( var i = 0, max = this._applyToPoses.length; i < max; i++) {
			var pose = this._applyToPoses[i];
			this._applier.applyTo(pose, this);
		}

		// apply for non-pose related assets
		if (this._entityManager) {
			this._applier.apply(this._entityManager, this);
		}

		// post update to clear states
		for ( var i = 0, max = this._layers.length; i < max; i++) {
			var layer = this._layers[i];
			var state = layer._currentState;
			if (state) {
				state.postUpdate(layer);
			}
		}
	};

	/**
	 * @description Retrieve and track an instance of an animation clip to be used with this manager.
	 * @param clip the clip to instance.
	 * @return our new clip instance.
	 */
	AnimationManager.prototype.getClipInstance = function (clip) {
		var instance = this._clipInstances[clip];
		if (!instance) {
			instance = new AnimationClipInstance();
			instance._startTime = this.globalTime;
			this._clipInstances[clip] = instance;
		}

		return instance;
	};

	AnimationManager.prototype.getCurrentSourceData = function () {
		// set up our layer blending.
		for ( var i = 0, max = this._layers.length - 1; i < max; i++) {
			var layerA = this._layers[i];
			var layerB = this._layers[i + 1];
			layerB.updateLayerBlending(layerA);
		}

		return this._layers[this._layers.length - 1].getCurrentSourceData();
	};

	/**
	 * @return the "local time", in seconds reported by our global timer.
	 */
	AnimationManager.prototype.getCurrentGlobalTime = function () {
		return this.globalTime;
	};

	/**
	 * @description Rewind and reactivate the clip instance associated with the given clip.
	 * @param clip the clip to pull the instance for.
	 * @param globalStartTime the time to set the clip instance's start as.
	 */
	AnimationManager.prototype.resetClipInstance = function (clip, globalStartTime) {
		var instance = this.getClipInstance(clip);
		if (instance) {
			instance._startTime = globalStartTime;
			instance._active = true;
		}
	};

	/**
	 * @return our bottom most layer. This layer should always consist of a full skeletal pose data.
	 */
	AnimationManager.prototype.getBaseAnimationLayer = function () {
		return this._layers[0];
	};

	/**
	 * @param layerName the name of the layer to find.
	 * @return the first animation layer with a matching name, or null of none are found.
	 */
	AnimationManager.prototype.findAnimationLayer = function (layerName) {
		for ( var i = 0, max = this._layers.length; i < max; i++) {
			var layer = this._layers[i];
			if (layerName === layer._name) {
				return layer;
			}
		}
		return null;
	};

	/**
	 * @description Add a new layer to our list of animation layers.
	 * @param layer the layer to add.
	 * @return the index of our added layer in our list of animation layers.
	 */
	AnimationManager.prototype.addAnimationLayer = function (layer) {
		this._layers.push(layer);
		layer._manager = this;
		return this._layers.length - 1;
	};

	return AnimationManager;
});