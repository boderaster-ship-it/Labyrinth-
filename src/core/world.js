import * as THREE from 'three';

const TARGET_ROAD_WIDTH_METERS = 7;
const WORLD_SIZE_METERS = 200;

function enableShadows(node) {
  node.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function getRoadScale(roadPiece) {
  const box = new THREE.Box3().setFromObject(roadPiece);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.x <= 0) {
    throw new Error('Road-Asset hat keine gültige Breite auf der X-Achse.');
  }

  return TARGET_ROAD_WIDTH_METERS / size.x;
}

function normalizePieceTransform(piece) {
  const box = new THREE.Box3().setFromObject(piece);
  const center = new THREE.Vector3();
  box.getCenter(center);

  piece.position.set(-center.x, -box.min.y, -center.z);
}

function createTrackLayout(step) {
  return [
    { type: 'straight', position: new THREE.Vector3(0, 0, 0), rotation: 0 },
    { type: 'straight', position: new THREE.Vector3(0, 0, -step), rotation: 0 },
    { type: 'straight', position: new THREE.Vector3(0, 0, -step * 2), rotation: 0 },

    { type: 'curve', position: new THREE.Vector3(step, 0, -step * 3), rotation: 0 },

    { type: 'straight', position: new THREE.Vector3(step * 2, 0, -step * 3), rotation: Math.PI / 2 },
    { type: 'straight', position: new THREE.Vector3(step * 3, 0, -step * 3), rotation: Math.PI / 2 },

    { type: 'curve', position: new THREE.Vector3(step * 4, 0, -step * 2), rotation: -Math.PI / 2 },

    { type: 'straight', position: new THREE.Vector3(step * 4, 0, -step), rotation: Math.PI },
    { type: 'straight', position: new THREE.Vector3(step * 4, 0, 0), rotation: Math.PI },

    { type: 'curve', position: new THREE.Vector3(step * 3, 0, step), rotation: Math.PI },

    { type: 'straight', position: new THREE.Vector3(step * 2, 0, step), rotation: -Math.PI / 2 },
    { type: 'straight', position: new THREE.Vector3(step, 0, step), rotation: -Math.PI / 2 },

    { type: 'curve', position: new THREE.Vector3(0, 0, 0), rotation: Math.PI / 2 },
  ];
}

function createEnvironment(world, trackBounds, roadY) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE_METERS, WORLD_SIZE_METERS),
    new THREE.MeshStandardMaterial({ color: 0x1f252c, roughness: 0.95, metalness: 0.02 })
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = roadY - 0.03;
  ground.receiveShadow = true;
  world.add(ground);

  const centerX = (trackBounds.minX + trackBounds.maxX) * 0.5;
  const centerZ = (trackBounds.minZ + trackBounds.maxZ) * 0.5;
  const width = trackBounds.maxX - trackBounds.minX;
  const depth = trackBounds.maxZ - trackBounds.minZ;

  const border = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.05, 48),
    new THREE.MeshStandardMaterial({ color: 0x505963, roughness: 0.9, metalness: 0.1 })
  );
  border.scale.set(width * 0.5, depth * 0.5, 1);
  border.rotation.x = -Math.PI / 2;
  border.position.set(centerX, roadY - 0.002, centerZ);
  border.receiveShadow = true;
  world.add(border);
}

export async function createWorld(scene, assetPipeline) {
  const world = new THREE.Group();

  const [roadStraightSource, roadCurveSource] = await Promise.all([
    assetPipeline.loadModel('roadStraight'),
    assetPipeline.loadModel('roadCurve'),
  ]);

  const scale = getRoadScale(roadStraightSource);
  const laneStep = 14;
  const pieces = createTrackLayout(laneStep);

  let roadTopY = 0;
  const trackBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };

  for (const piece of pieces) {
    const template = piece.type === 'curve' ? roadCurveSource : roadStraightSource;
    const instance = template.clone(true);
    instance.scale.setScalar(scale);
    normalizePieceTransform(instance);
    instance.position.copy(piece.position);
    instance.rotation.y = piece.rotation;

    enableShadows(instance);
    world.add(instance);

    const box = new THREE.Box3().setFromObject(instance);
    roadTopY = Math.max(roadTopY, box.max.y);
    trackBounds.minX = Math.min(trackBounds.minX, box.min.x);
    trackBounds.maxX = Math.max(trackBounds.maxX, box.max.x);
    trackBounds.minZ = Math.min(trackBounds.minZ, box.min.z);
    trackBounds.maxZ = Math.max(trackBounds.maxZ, box.max.z);
  }

  createEnvironment(world, trackBounds, roadTopY);
  scene.add(world);

  return {
    object: world,
    scale,
    roadY: roadTopY,
    laneWidth: TARGET_ROAD_WIDTH_METERS,
    bounds: {
      minX: trackBounds.minX - 3,
      maxX: trackBounds.maxX + 3,
      minZ: trackBounds.minZ - 3,
      maxZ: trackBounds.maxZ + 3,
    },
    spawn: new THREE.Vector3(0, roadTopY, 3),
  };
}
