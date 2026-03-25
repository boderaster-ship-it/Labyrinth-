import * as THREE from 'three';

export function createFollowCamera(camera, target, profile = {}) {
  const offset = new THREE.Vector3(0, profile.followHeight ?? 4.2, profile.followDistance ?? 9.5);
  const lookAtLift = new THREE.Vector3(0, profile.lookAtHeight ?? 1.2, 0);
  const desired = new THREE.Vector3();
  const targetLook = new THREE.Vector3();

  return {
    update(dt) {
      desired.copy(offset).applyQuaternion(target.quaternion).add(target.position);
      camera.position.lerp(desired, 1 - Math.exp(-6 * dt));

      targetLook.copy(target.position).add(lookAtLift);
      camera.lookAt(targetLook);
    },
  };
}
