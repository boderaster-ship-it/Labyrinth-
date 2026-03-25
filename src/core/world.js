import * as THREE from 'three';

const TARGET_TILE_METERS = 8;

function configureTexture(texture, { anisotropy = 8, repeat = 1 } = {}) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = anisotropy;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
}

function enableShadows(node) {
  node.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function applyRoadMaterial(node, baseTexture) {
  node.traverse((child) => {
    if (!child.isMesh) return;

    child.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    child.geometry.boundingBox.getSize(size);
    const dominant = Math.max(size.x, size.z, 0.5);

    const map = baseTexture.clone();
    configureTexture(map, { anisotropy: baseTexture.anisotropy || 8, repeat: dominant * 1.5 });

    child.material = new THREE.MeshStandardMaterial({
      map,
      color: new THREE.Color(0xf2f4f8),
      roughness: 0.83,
      metalness: 0.06,
    });
  });
}

function getScaleFromStraight(roadStraightMetrics) {
  const span = roadStraightMetrics.spanXZ;
  if (!span || span <= 0) {
    throw new Error('Road-Asset roadStraight hat keine gültigen Ausmaße.');
  }
  return TARGET_TILE_METERS / span;
}

function createTrackLayout(tileSize) {
  const definitions = [];

  const addStraightLine = ({ from, to, axis, fixed, rotation }) => {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    for (let i = start; i <= end; i += 1) {
      definitions.push({
        type: 'straight',
        x: axis === 'x' ? i : fixed,
        z: axis === 'z' ? i : fixed,
        rotation,
      });
    }
  };

  // Main loop.
  addStraightLine({ from: -7, to: 7, axis: 'x', fixed: -6, rotation: Math.PI / 2 });
  addStraightLine({ from: -7, to: 7, axis: 'x', fixed: 6, rotation: Math.PI / 2 });
  addStraightLine({ from: -5, to: 5, axis: 'z', fixed: -8, rotation: 0 });
  addStraightLine({ from: -5, to: 5, axis: 'z', fixed: 8, rotation: 0 });

  definitions.push(
    { type: 'bend', x: -8, z: -6, rotation: Math.PI },
    { type: 'bend', x: 8, z: -6, rotation: -Math.PI / 2 },
    { type: 'bend', x: 8, z: 6, rotation: 0 },
    { type: 'bend', x: -8, z: 6, rotation: Math.PI / 2 }
  );

  // Start section and small inner section.
  addStraightLine({ from: -2, to: 2, axis: 'x', fixed: 0, rotation: Math.PI / 2 });
  definitions.push(
    { type: 'bend', x: 3, z: 0, rotation: 0 },
    { type: 'straight', x: 3, z: 1, rotation: 0 },
    { type: 'straight', x: 3, z: 2, rotation: 0 },
    { type: 'bend', x: 3, z: 3, rotation: -Math.PI / 2 },
    { type: 'straight', x: 4, z: 3, rotation: Math.PI / 2 },
    { type: 'straight', x: 5, z: 3, rotation: Math.PI / 2 }
  );

  return {
    lane: tileSize,
    pieces: definitions.map((entry) => ({ ...entry, worldX: entry.x * tileSize, worldZ: entry.z * tileSize })),
  };
}

function createEnvironment(world, groundTexture, trackBounds, roadY) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      color: new THREE.Color(0x8ea36f),
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = roadY - 0.04;
  ground.receiveShadow = true;
  world.add(ground);

  const width = trackBounds.maxX - trackBounds.minX;
  const depth = trackBounds.maxZ - trackBounds.minZ;

  const shoulder = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 0.9, metalness: 0.05 })
  );
  shoulder.scale.set(width * 0.5, depth * 0.5, 1);
  shoulder.rotation.x = -Math.PI / 2;
  shoulder.position.set((trackBounds.minX + trackBounds.maxX) * 0.5, roadY - 0.002, (trackBounds.minZ + trackBounds.maxZ) * 0.5);
  shoulder.receiveShadow = true;
  world.add(shoulder);

  const guardrailMaterial = new THREE.MeshStandardMaterial({ color: 0xd4d8de, roughness: 0.45, metalness: 0.6 });
  const createRail = (x, z, length, horizontal) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? length : 0.4, 0.7, horizontal ? 0.4 : length), guardrailMaterial);
    rail.position.set(x, roadY + 0.32, z);
    rail.castShadow = true;
    rail.receiveShadow = true;
    world.add(rail);
  };

  const cx = (trackBounds.minX + trackBounds.maxX) * 0.5;
  const cz = (trackBounds.minZ + trackBounds.maxZ) * 0.5;
  const margin = 6;
  createRail(cx, trackBounds.minZ - margin, width + 14, true);
  createRail(cx, trackBounds.maxZ + margin, width + 14, true);
  createRail(trackBounds.minX - margin, cz, depth + 14, false);
  createRail(trackBounds.maxX + margin, cz, depth + 14, false);
}

export async function createWorld(scene, assetPipeline, renderer) {
  const world = new THREE.Group();

  const [roadStraightSource, roadBendSource, roadTexture, groundTexture, straightMetrics] = await Promise.all([
    assetPipeline.loadModel('roadStraight'),
    assetPipeline.loadModel('roadBend'),
    assetPipeline.loadTexture('roadSurface'),
    assetPipeline.loadTexture('groundVariation'),
    assetPipeline.getModelMetrics('roadStraight'),
  ]);

  const maxAnisotropy = renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;
  configureTexture(roadTexture, { anisotropy: Math.min(maxAnisotropy, 16), repeat: 1 });
  configureTexture(groundTexture, { anisotropy: Math.min(maxAnisotropy, 8), repeat: 80 });

  const worldScale = getScaleFromStraight(straightMetrics);
  const { pieces, lane } = createTrackLayout(TARGET_TILE_METERS);

  let roadTopY = 0;
  const trackBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };

  for (const piece of pieces) {
    const source = piece.type === 'bend' ? roadBendSource : roadStraightSource;
    const instance = source.clone(true);
    instance.scale.setScalar(worldScale);
    instance.rotation.y = piece.rotation;
    instance.position.set(piece.worldX, 0, piece.worldZ);

    applyRoadMaterial(instance, roadTexture);
    enableShadows(instance);
    world.add(instance);

    const box = new THREE.Box3().setFromObject(instance);
    roadTopY = Math.max(roadTopY, box.max.y);
    trackBounds.minX = Math.min(trackBounds.minX, box.min.x);
    trackBounds.maxX = Math.max(trackBounds.maxX, box.max.x);
    trackBounds.minZ = Math.min(trackBounds.minZ, box.min.z);
    trackBounds.maxZ = Math.max(trackBounds.maxZ, box.max.z);
  }

  createEnvironment(world, groundTexture, trackBounds, roadTopY);
  scene.add(world);

  const boundaryMargin = lane * 1.8;
  return {
    object: world,
    scale: worldScale,
    roadY: roadTopY,
    laneWidth: lane * 0.75,
    bounds: {
      minX: trackBounds.minX - boundaryMargin,
      maxX: trackBounds.maxX + boundaryMargin,
      minZ: trackBounds.minZ - boundaryMargin,
      maxZ: trackBounds.maxZ + boundaryMargin,
    },
    spawn: new THREE.Vector3(-lane * 1.5, roadTopY, 0),
  };
}
