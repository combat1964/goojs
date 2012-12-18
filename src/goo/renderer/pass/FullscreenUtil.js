define(['goo/shapes/ShapeCreator', 'goo/renderer/Camera', 'goo/math/Vector3'],
	function (ShapeCreator, Camera, Vector3) {
	"use strict";

	/**
	 * @name FullscreenUtil
	 * @class Utility class with a default setup parallel camera and fullscreen quad for fullscreen pass usage
	 */
	function FullscreenUtil() {
	}

	var camera = new Camera();
	camera.projectionMode = Camera.Parallel;
	camera.setFrustum(-1, 1, -1, 1, 1, -1);
	camera._left.copy(Vector3.UNIT_X).invert();
	camera._up.copy(Vector3.UNIT_Y);
	camera._direction.copy(Vector3.UNIT_Z);
	camera.onFrameChange();
	FullscreenUtil.camera = camera;

	FullscreenUtil.quad = ShapeCreator.createQuad(2, 2);

	return FullscreenUtil;
});