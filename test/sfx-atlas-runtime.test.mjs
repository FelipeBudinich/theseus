import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const ensureGlobal = (name, value) => {
  if (globalThis[name] === undefined) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value,
      writable: true,
    });
  }
};

const installBrowserLikeGlobals = () => {
  ensureGlobal('window', globalThis);
  ensureGlobal('document', {
    body: {},
    createElement: () => ({
      getContext: () => null,
      style: {},
    }),
    getElementById: () => null,
    getElementsByTagName: () => [],
    location: { href: 'http://localhost/' },
    readyState: 'complete',
  });
  ensureGlobal('navigator', { maxTouchPoints: 0, userAgent: 'node' });
  ensureGlobal('screen', { availHeight: 0, availWidth: 0 });
};

installBrowserLikeGlobals();

const createdSources = [];
const createdAudios = [];
const requests = [];

class MockAudio {
  constructor(src) {
    this.src = src || '';
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.loop = false;
    this.volume = 1;
    this.preload = '';
    this.readyState = 1;
    this.loadCalls = 0;
    this.eventListeners = {};
    createdAudios.push(this);
  }

  canPlayType(mime) {
    return mime.includes('ogg') ? 'probably' : '';
  }

  load() {
    this.loadCalls++;
  }

  addEventListener(eventName, callback) {
    this.eventListeners[eventName] = callback;
  }

  removeEventListener(eventName) {
    delete this.eventListeners[eventName];
  }

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }
}

class MockAudioContext {
  constructor() {
    this.destination = {};
    this.decodeCalls = 0;
  }

  createGain() {
    return {
      connect() {},
      gain: { value: 1 },
    };
  }

  createBuffer() {
    return {};
  }

  createBufferSource() {
    const source = {
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      onended: null,
      startArgs: null,
      connect() {},
      start(...args) {
        this.startArgs = args;
      },
      stop() {
        if (this.onended) {
          this.onended();
        }
      },
    };
    createdSources.push(source);
    return source;
  }

  decodeAudioData(response, success) {
    this.decodeCalls++;
    success({ decodedFrom: response });
  }
}

class MockXMLHttpRequest {
  open(method, url, async) {
    this.method = method;
    this.url = url;
    this.async = async;
    requests.push(this);
  }

  send() {}
}

ensureGlobal('Audio', MockAudio);
ensureGlobal('AudioContext', MockAudioContext);
ensureGlobal('XMLHttpRequest', MockXMLHttpRequest);

const moduleUrl =
  `${pathToFileURL(path.resolve('public/lib/impact/sound.js')).href}?test=${Date.now()}`;
await import(moduleUrl);
const ig = globalThis.window.ig;

const resetSoundEnvironment = () => {
  requests.length = 0;
  createdSources.length = 0;
  createdAudios.length = 0;
  ig.prefix = '';
  ig.nocache = '';
  ig.ua.mobile = false;
  ig.system = {
    canvas: {
      addEventListener() {},
      removeEventListener() {},
    },
    stopRunLoop() {
      throw new Error('stopRunLoop should not be called during this test');
    },
  };
  ig.Sound.enabled = true;
  ig.Sound.useWebAudio = true;
  delete globalThis.__THESEUS_SFX_ATLAS_MANIFEST__;
  delete globalThis.__THESEUS_MUSIC_ATLAS_MANIFEST__;
};

const createManifest = () => ({
  version: 1,
  sampleRate: 44100,
  channels: 2,
  padding: 0.05,
  atlases: [
    {
      formats: {
        ogg: '/dist/sfx-atlas/sfx-atlas.ogg',
      },
      duration: 1,
    },
  ],
  sounds: {
    'media/sounds/jump.*': {
      atlas: 0,
      start: 0.05,
      duration: 0.2,
      source: 'media/sounds/jump.ogg',
    },
    'media/sounds/jump.ogg': {
      atlas: 0,
      start: 0.05,
      duration: 0.2,
      source: 'media/sounds/jump.ogg',
    },
    'media/sounds/coin.*': {
      atlas: 0,
      start: 0.3,
      duration: 0.1,
      source: 'media/sounds/coin.ogg',
    },
  },
});

const createMusicManifest = () => ({
  version: 1,
  sampleRate: 44100,
  channels: 2,
  padding: 1,
  atlases: [
    {
      formats: {
        ogg: '/dist/music-atlas/music-atlas.ogg',
      },
      duration: 125,
    },
  ],
  tracks: {
    'media/music/energy-warrior.*': {
      atlas: 0,
      start: 1,
      duration: 122.5,
      source: 'media/music/energy-warrior.ogg',
    },
    'media/music/energy-warrior.ogg': {
      atlas: 0,
      start: 1,
      duration: 122.5,
      source: 'media/music/energy-warrior.ogg',
    },
    'media/music/energy-warrior.mp3': {
      atlas: 0,
      start: 1,
      duration: 122.5,
      source: 'media/music/energy-warrior.ogg',
    },
  },
});

test('SoundManager resolves exact and wildcard SFX atlas manifest paths', () => {
  resetSoundEnvironment();
  globalThis.__THESEUS_SFX_ATLAS_MANIFEST__ = createManifest();
  const manager = new ig.SoundManager();

  assert.equal(
    manager.getSfxAtlasEntry('media\\sounds\\jump.ogg').source,
    'media/sounds/jump.ogg',
  );
  assert.equal(
    manager.getSfxAtlasEntry('media/sounds/jump.mp3').source,
    'media/sounds/jump.ogg',
  );
  assert.equal(manager.getSfxAtlasEntry('media/sounds/missing.*'), null);
});

test('SoundManager uses SFX atlas only for multichannel WebAudio sounds', () => {
  resetSoundEnvironment();
  globalThis.__THESEUS_SFX_ATLAS_MANIFEST__ = createManifest();
  ig.nocache = '?cache=1';
  const manager = new ig.SoundManager();
  ig.soundManager = manager;

  const sfxSource = manager.load('media/sounds/jump.*', true);
  assert.equal(sfxSource instanceof ig.Sound.AtlasWebAudioSource, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/dist/sfx-atlas/sfx-atlas.ogg?cache=1');

  const musicSource = manager.load('media/sounds/coin.*', false);
  assert.equal(musicSource instanceof MockAudio, true);
  assert.equal(musicSource.src, 'media/sounds/coin.ogg?cache=1');
  assert.equal(requests.length, 1);
});

test('SoundManager resolves exact and wildcard music atlas manifest paths', () => {
  resetSoundEnvironment();
  globalThis.__THESEUS_MUSIC_ATLAS_MANIFEST__ = createMusicManifest();
  const manager = new ig.SoundManager();

  assert.equal(
    manager.getMusicAtlasEntry('media\\music\\energy-warrior.ogg').source,
    'media/music/energy-warrior.ogg',
  );
  assert.equal(
    manager.getMusicAtlasEntry('media/music/energy-warrior.mp3').source,
    'media/music/energy-warrior.ogg',
  );
  assert.equal(manager.getMusicAtlasEntry('media/music/missing.*'), null);
});

test('SoundManager uses music atlas only for non-multichannel HTML5 music', () => {
  resetSoundEnvironment();
  globalThis.__THESEUS_MUSIC_ATLAS_MANIFEST__ = createMusicManifest();
  ig.nocache = '?cache=1';
  const manager = new ig.SoundManager();
  ig.soundManager = manager;

  const musicSource = manager.load('media/music/energy-warrior.*', false);
  assert.equal(musicSource instanceof ig.Sound.MusicAtlasHTML5Source, true);
  assert.equal(musicSource instanceof ig.Sound.WebAudioSource, false);
  assert.equal(musicSource.audio.src, '/dist/music-atlas/music-atlas.ogg?cache=1');
  assert.equal(requests.length, 0);

  resetSoundEnvironment();
  globalThis.__THESEUS_MUSIC_ATLAS_MANIFEST__ = createMusicManifest();
  ig.nocache = '?cache=1';
  const multichannelManager = new ig.SoundManager();
  ig.soundManager = multichannelManager;
  const webAudioSource = multichannelManager.load('media/music/energy-warrior.ogg', true);
  assert.equal(webAudioSource instanceof ig.Sound.WebAudioSource, true);
  assert.equal(webAudioSource instanceof ig.Sound.MusicAtlasHTML5Source, false);
  assert.equal(requests[0].url, 'media/music/energy-warrior.ogg?cache=1');
});

test('SoundManager falls back to individual music files when atlas lacks the browser format', () => {
  resetSoundEnvironment();
  globalThis.__THESEUS_MUSIC_ATLAS_MANIFEST__ = {
    ...createMusicManifest(),
    atlases: [
      {
        formats: {
          mp3: '/dist/music-atlas/music-atlas.mp3',
        },
        duration: 125,
      },
    ],
  };
  ig.nocache = '?cache=1';
  const manager = new ig.SoundManager();
  ig.soundManager = manager;

  const musicSource = manager.load('media/music/energy-warrior.*', false);
  assert.equal(musicSource instanceof MockAudio, true);
  assert.equal(musicSource.src, 'media/music/energy-warrior.ogg?cache=1');
});

test('ig.Music.add accepts music atlas HTML5 sources without WebAudio music errors', () => {
  resetSoundEnvironment();
  globalThis.__THESEUS_MUSIC_ATLAS_MANIFEST__ = createMusicManifest();
  const manager = new ig.SoundManager();
  ig.soundManager = manager;

  const music = new ig.Music();
  music.loop = true;
  music.volume = 0.5;

  assert.doesNotThrow(() => {
    music.add('media/music/energy-warrior.*', 'theme');
  });
  assert.equal(music.namedTracks.theme instanceof ig.Sound.MusicAtlasHTML5Source, true);
  assert.equal(music.namedTracks.theme.loop, true);
  assert.equal(music.namedTracks.theme.volume, 0.5);
});

test('MusicAtlasHTML5Source exposes relative time and segment-only ended and loop behavior', () => {
  resetSoundEnvironment();
  const manager = new ig.SoundManager();
  ig.soundManager = manager;

  const source = new ig.Sound.MusicAtlasHTML5Source('/dist/music-atlas/music-atlas.ogg', 10, 5);
  const endedEvents = [];
  source.addEventListener('ended', (ev) => {
    endedEvents.push(ev);
  });

  source.audio.currentTime = 12;
  assert.equal(source.currentTime, 2);
  source.currentTime = 99;
  assert.equal(source.audio.currentTime, 15);

  source.audio.currentTime = 15;
  source.audio.paused = false;
  source._checkBoundary();
  assert.equal(source.audio.paused, true);
  assert.equal(source.audio.currentTime, 10);
  assert.equal(source.ended, true);
  assert.equal(endedEvents.length, 1);
  assert.equal(endedEvents[0].target, source);

  const looped = new ig.Sound.MusicAtlasHTML5Source('/dist/music-atlas/music-atlas.ogg', 20, 3);
  looped.loop = true;
  looped.audio.currentTime = 23;
  looped.audio.paused = false;
  looped._checkBoundary();
  assert.equal(looped.audio.currentTime, 20);
  assert.equal(looped.audio.paused, false);
  assert.equal(looped.ended, false);
  looped._clearBoundaryCheck();
});

test('SFX atlas buffer loading shares one XHR and decode across sounds in the same atlas', () => {
  resetSoundEnvironment();
  globalThis.__THESEUS_SFX_ATLAS_MANIFEST__ = createManifest();
  const manager = new ig.SoundManager();
  ig.soundManager = manager;

  const callbacks = [];
  const jumpSource = manager.load('media/sounds/jump.*', true, (path, status) => {
    callbacks.push([path, status]);
  });
  const coinSource = manager.load('media/sounds/coin.*', true, (path, status) => {
    callbacks.push([path, status]);
  });

  assert.equal(requests.length, 1);
  assert.equal(manager.sfxAtlasCache['0:ogg'].callbacks.length, 2);

  requests[0].response = new ArrayBuffer(8);
  requests[0].onload({ type: 'load' });

  assert.equal(manager.audioContext.decodeCalls, 1);
  assert.deepEqual(callbacks, [
    ['media/sounds/jump.*', true],
    ['media/sounds/coin.*', true],
  ]);
  assert.equal(jumpSource.buffer, manager.sfxAtlasCache['0:ogg'].buffer);
  assert.equal(coinSource.buffer, manager.sfxAtlasCache['0:ogg'].buffer);
});

test('AtlasWebAudioSource plays one-shot and looping slices from the decoded atlas buffer', () => {
  resetSoundEnvironment();
  const manager = new ig.SoundManager();
  ig.soundManager = manager;

  const oneShot = new ig.Sound.AtlasWebAudioSource({ id: 'atlas-buffer' }, 0.5, 0.25);
  oneShot.play();
  assert.deepEqual(createdSources[0].startArgs, [0, 0.5, 0.25]);

  const looped = new ig.Sound.AtlasWebAudioSource({ id: 'atlas-buffer' }, 0.75, 0.5);
  looped.loop = true;
  looped.play();
  assert.equal(createdSources[1].loop, true);
  assert.equal(createdSources[1].loopStart, 0.75);
  assert.equal(createdSources[1].loopEnd, 1.25);
  assert.deepEqual(createdSources[1].startArgs, [0, 0.75]);
});
