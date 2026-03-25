import * as THREE from 'three';

export function createScene(renderRoot) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fbad1);
  scene.fog = new THREE.Fog(0x9fbad1, 160, 620);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 1400);
  camera.position.set(0, 7, 18);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderRoot.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xe6efff, 0x2f3b29, 0.62);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(140, 180, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xc6d7ff, 0.35);
  fill.position.set(-100, 60, -120);
  scene.add(fill);

  return { scene, camera, renderer };
}
