import { RacingApp } from './core/app.js';

const app = new RacingApp({
  renderRoot: document.getElementById('render-root'),
  menu: document.getElementById('menu'),
  startBtn: document.getElementById('start-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  hud: {
    root: document.getElementById('hud'),
    speed: document.getElementById('speed'),
    mode: document.getElementById('mode'),
  },
  controls: {
    root: document.getElementById('touch-controls'),
    left: document.getElementById('touch-left'),
    right: document.getElementById('touch-right'),
    throttle: document.getElementById('touch-throttle'),
    brake: document.getElementById('touch-brake'),
  },
});

app.init();
