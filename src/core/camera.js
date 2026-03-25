import * as THREE from 'three';

export function createFollowCamera(camera, target, profile = {}) {
  const offset = new THREE.Vector3(0, profile.followHeight ?? 5.8, profile.followDistance ?? 12.5);
  const lookAtLift = new THREE.Vector3(0, profile.lookAtHeight ?? 1.5, 0);
  const desired = new THREE.Vector3();
  const smoothedLook = new THREE.Vector3();

  return {
    update(dt) {
      desired.copy(offset).applyQuaternion(target.quaternion).add(target.position);

      const positionLerp = 1 - Math.exp(-4.5 * dt);
      camera.position.lerp(desired, positionLerp);

      smoothedLook.lerp(target.position, 1 - Math.exp(-8 * dt)).add(lookAtLift);
      camera.lookAt(smoothedLook);
    },
  };
}
