import * as THREE from 'three';

export function createWorld(scene) {
  const world = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0x24303f, roughness: 0.98, metalness: 0.03 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 600),
    new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.75, metalness: 0.08 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  world.add(road);

  const laneMark = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 600),
    new THREE.MeshBasicMaterial({ color: 0xe8ebf5 })
  );
  laneMark.rotation.x = -Math.PI / 2;
  laneMark.position.y = 0.03;
  world.add(laneMark);

  for (let i = 0; i < 36; i++) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(8, 3 + Math.random() * 9, 8),
      new THREE.MeshStandardMaterial({ color: 0x415066, roughness: 0.85 })
    );
    block.position.set((Math.random() - 0.5) * 280, block.geometry.parameters.height / 2, (Math.random() - 0.5) * 580);
    block.castShadow = true;
    block.receiveShadow = true;
    world.add(block);
  }

  scene.add(world);
  return world;
}
