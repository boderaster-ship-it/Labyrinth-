import * as THREE from 'three';

const TARGET_CAR_LENGTH_METERS = 4.4;

function prepareVehicleVisual(model, worldScale) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const sourceBox = new THREE.Box3().setFromObject(model);
  const sourceSize = new THREE.Vector3();
  sourceBox.getSize(sourceSize);

  if (!sourceSize.lengthSq()) {
    throw new Error('Race-Modell enthält keine auswertbare Geometrie.');
  }

  const sourceLength = Math.max(sourceSize.x, sourceSize.z);
  const scaleToMeters = TARGET_CAR_LENGTH_METERS / sourceLength;
  const worldAdjustedScale = scaleToMeters * (worldScale / 8);
  model.scale.setScalar(worldAdjustedScale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  model.position.set(-center.x, -scaledBox.min.y, -center.z);

  const finalSize = new THREE.Vector3();
  new THREE.Box3().setFromObject(model).getSize(finalSize);

  return {
    length: Math.max(finalSize.x, finalSize.z),
    width: Math.min(finalSize.x, finalSize.z),
    height: finalSize.y,
  };
}

export async function createVehicle(scene, assetPipeline, worldData) {
  const root = new THREE.Group();
  root.name = 'VehicleRoot';

  const visualPivot = new THREE.Group();
  visualPivot.name = 'VehicleVisualPivot';

  const raceModel = (await assetPipeline.loadModel('race')).clone(true);
  const metrics = prepareVehicleVisual(raceModel, worldData.scale);

  visualPivot.add(raceModel);
  root.add(visualPivot);
  root.position.copy(worldData.spawn);

  scene.add(root);

  const state = {
    speed: 0,
    maxForwardSpeed: 48,
    maxReverseSpeed: -15,
    acceleration: 25,
    brakeForce: 40,
    drag: 8.5,
    steerRate: 1.95,
  };

  const heading = new THREE.Vector3();

  return {
    object: root,
    model: raceModel,
    cameraProfile: {
      followDistance: metrics.length * 2.7,
      followHeight: Math.max(4, metrics.height * 2.1),
      lookAtHeight: metrics.height * 0.75,
      lateralLag: 0.12,
    },
    state,
    update(input, dt) {
      const throttleForce = input.throttle * state.acceleration;
      const brakingForce = input.brake * state.brakeForce;
      const directionalBrake = state.speed > 0 ? -brakingForce : brakingForce * 0.5;

      state.speed += throttleForce * dt;
      state.speed += directionalBrake * dt;

      const dragDirection = state.speed === 0 ? 0 : -Math.sign(state.speed);
      state.speed += dragDirection * state.drag * dt;

      if (Math.abs(state.speed) < 0.2) state.speed = 0;
      state.speed = THREE.MathUtils.clamp(state.speed, state.maxReverseSpeed, state.maxForwardSpeed);

      const steeringGain = (0.26 + Math.min(Math.abs(state.speed) / state.maxForwardSpeed, 1)) * state.steerRate;
      root.rotation.y -= input.steer * steeringGain * dt;

      heading.set(0, 0, -1).applyQuaternion(root.quaternion);
      root.position.addScaledVector(heading, state.speed * dt);
      root.position.y = worldData.roadY;

      root.position.x = THREE.MathUtils.clamp(root.position.x, worldData.bounds.minX, worldData.bounds.maxX);
      root.position.z = THREE.MathUtils.clamp(root.position.z, worldData.bounds.minZ, worldData.bounds.maxZ);

      return state;
    },
  };
}
