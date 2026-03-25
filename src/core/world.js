import * as THREE from 'three';

function enableModelShadows(node) {
  node.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function getHorizontalSpan(node) {
  const box = new THREE.Box3().setFromObject(node);
  const size = new THREE.Vector3();
  box.getSize(size);
  return Math.max(size.x, size.z);
}

export async function createWorld(scene, assetPipeline) {
  const world = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0x2a3240, roughness: 0.97, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const roadStraight = await assetPipeline.loadModel('roadStraight');
  const roadCurve = await assetPipeline.loadModel('roadCurve');

  const straightSpan = getHorizontalSpan(roadStraight) || 12;
  const curveSpan = getHorizontalSpan(roadCurve) || straightSpan;
  const unit = Math.max(4, Math.round(Math.max(straightSpan, curveSpan)));

  const pieces = [
    { type: 'curve', x: -3, z: -3, rot: Math.PI },
    { type: 'straight', x: -3, z: -2, rot: Math.PI / 2 },
    { type: 'straight', x: -3, z: -1, rot: Math.PI / 2 },
    { type: 'straight', x: -3, z: 0, rot: Math.PI / 2 },
    { type: 'straight', x: -3, z: 1, rot: Math.PI / 2 },
    { type: 'straight', x: -3, z: 2, rot: Math.PI / 2 },
    { type: 'curve', x: -3, z: 3, rot: Math.PI / 2 },

    { type: 'straight', x: -2, z: 3, rot: 0 },
    { type: 'straight', x: -1, z: 3, rot: 0 },
    { type: 'straight', x: 0, z: 3, rot: 0 },
    { type: 'straight', x: 1, z: 3, rot: 0 },
    { type: 'straight', x: 2, z: 3, rot: 0 },
    { type: 'curve', x: 3, z: 3, rot: 0 },

    { type: 'straight', x: 3, z: 2, rot: Math.PI / 2 },
    { type: 'straight', x: 3, z: 1, rot: Math.PI / 2 },
    { type: 'straight', x: 3, z: 0, rot: Math.PI / 2 },
    { type: 'straight', x: 3, z: -1, rot: Math.PI / 2 },
    { type: 'straight', x: 3, z: -2, rot: Math.PI / 2 },
    { type: 'curve', x: 3, z: -3, rot: -Math.PI / 2 },

    { type: 'straight', x: 2, z: -3, rot: 0 },
    { type: 'straight', x: 1, z: -3, rot: 0 },
    { type: 'straight', x: 0, z: -3, rot: 0 },
    { type: 'straight', x: -1, z: -3, rot: 0 },
    { type: 'straight', x: -2, z: -3, rot: 0 },
  ];

  for (const piece of pieces) {
    const source = piece.type === 'curve' ? roadCurve : roadStraight;
    const instance = source.clone(true);
    enableModelShadows(instance);
    instance.position.set(piece.x * unit, 0, piece.z * unit);
    instance.rotation.y = piece.rot;
    world.add(instance);
  }

  scene.add(world);

  const laneHalfWidth = unit * 3.6;
  const bounds = {
    minX: -laneHalfWidth,
    maxX: laneHalfWidth,
    minZ: -laneHalfWidth,
    maxZ: laneHalfWidth,
  };

  return {
    object: world,
    bounds,
    spawn: new THREE.Vector3(0, 0, unit * 2.5),
  };
}
