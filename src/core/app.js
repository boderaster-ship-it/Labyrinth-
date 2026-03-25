import { createScene } from './scene.js';
import { createWorld } from './world.js';
import { createInputSystem } from './input.js';
import { createVehicle } from './vehicle.js';
import { createFollowCamera } from './camera.js';
import { createHud } from '../ui/hud.js';
import { createAssetPipeline } from './assets.js';

export class RacingApp {
  constructor(ui) {
    this.ui = ui;
    this.running = false;
    this.lastTime = 0;
  }

  init() {
    const { scene, camera, renderer } = createScene(this.ui.renderRoot);
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.assetPipeline = createAssetPipeline();
    createWorld(scene);
    this.vehicle = createVehicle(scene);
    this.followCamera = createFollowCamera(camera, this.vehicle.object);
    this.input = createInputSystem(this.ui.controls);
    this.hud = createHud(this.ui.hud);

    this.bindUI();
    this.registerPwa();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  bindUI() {
    this.ui.startBtn.addEventListener('click', () => this.start());
    this.ui.pauseBtn.addEventListener('click', () => this.pause());
  }

  start() {
    this.running = true;
    this.ui.menu.classList.remove('visible');
    this.ui.controls.root.classList.add('visible');
    this.ui.controls.root.classList.remove('hidden');
    this.ui.pauseBtn.classList.remove('hidden');
    this.hud.show();
  }

  pause() {
    this.running = false;
    this.ui.menu.classList.add('visible');
    this.ui.controls.root.classList.remove('visible');
    this.ui.controls.root.classList.add('hidden');
    this.ui.pauseBtn.classList.add('hidden');
    this.hud.hide();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(time) {
    const dt = Math.min((time - this.lastTime) / 1000 || 0, 0.05);
    this.lastTime = time;

    if (this.running) {
      const input = this.input.read();
      const state = this.vehicle.update(input, dt);
      this.followCamera.update(dt);
      this.hud.update({ speed: state.speed, mode: 'Fahrt' });

      if (this.input.consumePausePress()) {
        this.pause();
      }
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  async registerPwa() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./service-worker.js');
      } catch {
        // offline fallback is optional in development.
      }
    }
  }
}
