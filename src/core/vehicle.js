import * as THREE from 'three';

function getModelMetrics(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { box, size, center };
}

function prepareVehicleModel(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const { size, center, box } = getModelMetrics(model);
  if (size.lengthSq() === 0) {
    throw new Error('Race-Modell hat keine gültige Geometrie.');
  }

  const targetLength = 3.6;
  const dominantAxis = Math.max(size.x, size.z);
  const uniformScale = targetLength / dominantAxis;
  model.scale.setScalar(uniformScale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;

  return {
    cabinHeight: Math.max(0.8, (box.max.y - center.y) * uniformScale + 0.8),
    length: targetLength,
  };
}

export async function createVehicle(scene, assetPipeline, worldData) {
  const root = new THREE.Group();
  const model = (await assetPipeline.loadModel('race')).clone(true);
  const metrics = prepareVehicleModel(model);

  root.add(model);
  root.position.copy(worldData.spawn);

  scene.add(root);

  const state = {
    speed: 0,
    maxForwardSpeed: 42,
    maxReverseSpeed: -14,
    acceleration: 24,
    brakeForce: 36,
    drag: 7,
    steerRate: 1.8,
  };

  return {
    object: root,
    model,
    cameraProfile: {
      followDistance: metrics.length * 2.8,
      followHeight: metrics.cabinHeight + 1.6,
      lookAtHeight: metrics.cabinHeight,
    },
    state,
    update(input, dt) {
      const throttleForce = input.throttle * state.acceleration;
      const brakingForce = input.brake * state.brakeForce;
      const directionalBrake = state.speed > 0 ? -brakingForce : brakingForce * 0.55;

      state.speed += throttleForce * dt;
      state.speed += directionalBrake * dt;

      const dragDirection = state.speed === 0 ? 0 : -Math.sign(state.speed);
      state.speed += dragDirection * state.drag * dt;

      if (Math.abs(state.speed) < 0.18) state.speed = 0;
      state.speed = Math.max(state.maxReverseSpeed, Math.min(state.maxForwardSpeed, state.speed));

      const steerStrength = (0.35 + Math.min(Math.abs(state.speed) / state.maxForwardSpeed, 1)) * state.steerRate;
      root.rotation.y -= input.steer * steerStrength * dt;

      const heading = new THREE.Vector3(0, 0, -1).applyQuaternion(root.quaternion);
      root.position.addScaledVector(heading, state.speed * dt);

      root.position.x = THREE.MathUtils.clamp(root.position.x, worldData.bounds.minX, worldData.bounds.maxX);
      root.position.z = THREE.MathUtils.clamp(root.position.z, worldData.bounds.minZ, worldData.bounds.maxZ);

      return state;
    },
  };
}
