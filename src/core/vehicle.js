import * as THREE from 'three';

function prepareVehicleVisual(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  model.position.set(-center.x, -scaledBox.min.y, -center.z);

  const finalSize = new THREE.Vector3();
  new THREE.Box3().setFromObject(model).getSize(finalSize);

  return {
    length: finalSize.z,
    width: finalSize.x,
    height: finalSize.y,
  };
}

export async function createVehicle(scene, assetPipeline, worldData) {
  const vehicleRoot = new THREE.Object3D();
  vehicleRoot.name = 'VehicleRoot';

  const carModel = (await assetPipeline.loadModel('race')).clone(true);
  const metrics = prepareVehicleVisual(carModel);

  vehicleRoot.add(carModel);
  vehicleRoot.position.copy(worldData.spawn);

  scene.add(vehicleRoot);

  const state = {
    speed: 0,
    maxForwardSpeed: 42,
    maxReverseSpeed: -12,
    acceleration: 22,
    brakeForce: 36,
    drag: 8,
    steerRate: 1.85,
  };

  const heading = new THREE.Vector3();

  return {
    object: vehicleRoot,
    model: carModel,
    cameraProfile: {
      followDistance: Math.max(10, metrics.length * 2.2),
      followHeight: Math.max(5, metrics.height * 2.2),
      lookAtHeight: metrics.height * 0.65,
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

      const steeringGain = (0.3 + Math.min(Math.abs(state.speed) / state.maxForwardSpeed, 1)) * state.steerRate;
      vehicleRoot.rotation.y -= input.steer * steeringGain * dt;

      heading.set(0, 0, -1).applyQuaternion(vehicleRoot.quaternion);
      vehicleRoot.position.addScaledVector(heading, -state.speed * dt);
      vehicleRoot.position.y = worldData.roadY;

      vehicleRoot.position.x = THREE.MathUtils.clamp(vehicleRoot.position.x, worldData.bounds.minX, worldData.bounds.maxX);
      vehicleRoot.position.z = THREE.MathUtils.clamp(vehicleRoot.position.z, worldData.bounds.minZ, worldData.bounds.maxZ);

      return state;
    },
  };
}
