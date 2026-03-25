import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/loaders/GLTFLoader.js';

const MODEL_BASE = './assets/models';
const TEXTURE_BASE = './assets/textures';

const ASSET_REGISTRY = {
  models: {
    race: `${MODEL_BASE}/race.glb`,
    roadStraight: `${MODEL_BASE}/road-straight.glb`,
    roadBend: `${MODEL_BASE}/road-bend.glb`,
    roadCurve: `${MODEL_BASE}/road-curve.glb`,
  },
  textures: {
    roadSurface: `${TEXTURE_BASE}/colormap.png`,
    groundVariation: `${TEXTURE_BASE}/variation-a.png`,
  },
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
      await Promise.all([
        loadModel('race'),
        loadModel('roadStraight'),
        loadModel('roadBend'),
        loadModel('roadCurve'),
        loadTexture('roadSurface'),
        loadTexture('groundVariation'),
      ]);
    },
    async getModelMetrics(key) {
      const model = await loadModel(key);
      return computeModelMetrics(model);
    },
  };
}
