import * as THREE from 'three';

export function createFollowCamera(camera, target) {
  const offset = new THREE.Vector3(0, 5, -10);
  const desired = new THREE.Vector3();
  const lookAtTarget = new THREE.Vector3();

  return {
    update(dt) {
      desired.copy(offset).applyQuaternion(target.quaternion).add(target.position);
      const smoothing = 1 - Math.exp(-6 * dt);
      camera.position.lerp(desired, smoothing);

      lookAtTarget.copy(target.position);
      camera.lookAt(lookAtTarget);
    },
  };
}
