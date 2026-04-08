import ig from './ig.js';
import { Animation, AnimationSheet } from './animation.js';
import { BackgroundMap } from './background-map.js';
import { CollisionMap } from './collision-map.js';
import { Entity } from './entity.js';
import { EntityPool } from './entity-pool.js';
import { Font } from './font.js';
import { Game } from './game.js';
import { Image } from './image.js';
import { KEY, Input } from './input.js';
import { Loader } from './loader.js';
import { Map } from './map.js';
import { Music, Sound, SoundManager } from './sound.js';
import { System } from './system.js';
import { Timer } from './timer.js';

ig.boot();

ig.main = function main(canvasId, gameClass, fps, width, height, scale, loaderClass) {
  ig.boot();
  ig.system = new System(canvasId, fps, width, height, scale || 1);
  ig.input = new Input();
  ig.soundManager = new SoundManager();
  ig.music = new Music();
  ig.ready = true;

  const loader = new (loaderClass || Loader)(gameClass, ig.resources);
  loader.load();
};

const { main } = ig;

export {
  ig,
  Animation,
  AnimationSheet,
  BackgroundMap,
  CollisionMap,
  Entity,
  EntityPool,
  Font,
  Game,
  Image,
  Input,
  KEY,
  Loader,
  main,
  Map,
  Music,
  Sound,
  SoundManager,
  System,
  Timer
};

export default ig;
