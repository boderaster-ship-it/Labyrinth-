import * as THREE from 'three';

export function createVehicle(scene) {
  const root = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 3.4),
    new THREE.MeshStandardMaterial({ color: 0xff4d4d, roughness: 0.45, metalness: 0.2 })
  );
  body.position.y = 0.6;
  body.castShadow = true;
  root.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.5, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xd5deef, roughness: 0.2, metalness: 0.4 })
  );
  cabin.position.set(0, 1.1, -0.2);
  cabin.castShadow = true;
  root.add(cabin);

  root.position.set(0, 0, 40);
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

      root.position.x = THREE.MathUtils.clamp(root.position.x, -180, 180);
      root.position.z = THREE.MathUtils.clamp(root.position.z, -290, 290);

      return state;
    },
  };
}
