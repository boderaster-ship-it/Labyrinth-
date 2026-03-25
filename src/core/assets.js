import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/loaders/GLTFLoader.js';

const MODEL_BASE = './assets/models';
const TARGET_CAR_LENGTH_METERS = 4.5;

const ASSET_REGISTRY = {
  models: {
    race: `${MODEL_BASE}/race.glb`,
    roadStraight: `${MODEL_BASE}/road-straight.glb`,
    roadCurve: `${MODEL_BASE}/road-curve.glb`,
  },
  textures: {},
};

function computeModelMetrics(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  return {
    box,
    size,
    center,
    spanXZ: Math.max(size.x, size.z),
  };
}

function normalizeRaceScale(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.z <= 0) {
    throw new Error('Race-Modell hat keine gültige Länge auf der Z-Achse.');
  }

  const scaleFactor = TARGET_CAR_LENGTH_METERS / size.z;
  model.scale.setScalar(scaleFactor);
}

export function createAssetPipeline() {
  const modelLoader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();

  const modelCache = new Map();
  const textureCache = new Map();

  const resolveModelPath = (key) => {
    const path = ASSET_REGISTRY.models[key];
    if (!path) {
      throw new Error(`Unbekannter Model-Asset-Schlüssel: ${key}`);
    }
    return path;
  };

  const resolveTexturePath = (key) => {
    const path = ASSET_REGISTRY.textures[key];
    if (!path) {
      throw new Error(`Unbekannter Textur-Asset-Schlüssel: ${key}`);
    }
    return path;
  };

  const loadModel = async (key) => {
    if (modelCache.has(key)) return modelCache.get(key);

    const path = resolveModelPath(key);
    const gltf = await modelLoader.loadAsync(path).catch((error) => {
      throw new Error(`Asset-Ladefehler für Modell "${key}" (${path}): ${error.message}`);
    });

    if (!gltf?.scene) {
      throw new Error(`Modell "${key}" wurde geladen, enthält aber keine Szene.`);
    }

    if (key === 'race') {
      normalizeRaceScale(gltf.scene);
    }

    modelCache.set(key, gltf.scene);
    return gltf.scene;
  };

  const loadTexture = async (key) => {
    if (textureCache.has(key)) return textureCache.get(key);

    const path = resolveTexturePath(key);
    const texture = await textureLoader.loadAsync(path).catch((error) => {
      throw new Error(`Asset-Ladefehler für Textur "${key}" (${path}): ${error.message}`);
    });

    if (!texture) {
      throw new Error(`Textur "${key}" konnte nicht geladen werden.`);
    }

    textureCache.set(key, texture);
    return texture;
  };

  return {
    registry: ASSET_REGISTRY,
    loadModel,
    loadTexture,
    async loadRequired() {
      await Promise.all([loadModel('race'), loadModel('roadStraight'), loadModel('roadCurve')]);
    },
    async getModelMetrics(key) {
      const model = await loadModel(key);
      return computeModelMetrics(model);
    },
  };
}
