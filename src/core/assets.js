export function createAssetPipeline() {
  const paths = {
    vehicleModel: './assets/models/vehicle.glb',
    worldTexture: './assets/textures/road-asphalt.png',
    engineLoop: './assets/audio/engine-loop.ogg',
  };

  return {
    paths,
    async loadVehicleModel() {
      return null;
    },
  };
}
