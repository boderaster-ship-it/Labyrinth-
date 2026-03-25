import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/loaders/GLTFLoader.js';

const MODEL_BASE = './assets/models';

const MODEL_PATHS = {
  race: `${MODEL_BASE}/race.glb`,
  roadStraight: `${MODEL_BASE}/road-straight.glb`,
  roadCurve: `${MODEL_BASE}/road-curve.glb`,
};

export function createAssetPipeline() {
  const loader = new GLTFLoader();
  const modelCache = new Map();

  const loadModel = async (key) => {
    if (!MODEL_PATHS[key]) {
      throw new Error(`Unbekannter Asset-Schlüssel: ${key}`);
    }

    if (modelCache.has(key)) {
      return modelCache.get(key);
    }

    const gltf = await loader.loadAsync(MODEL_PATHS[key]).catch((error) => {
      throw new Error(`Asset-Ladefehler für "${key}" (${MODEL_PATHS[key]}): ${error.message}`);
    });

    modelCache.set(key, gltf.scene);
    return gltf.scene;
  };

  return {
    paths: MODEL_PATHS,
    loadModel,
    async loadRequired() {
      await Promise.all([loadModel('race'), loadModel('roadStraight'), loadModel('roadCurve')]);
    },
  };
}
