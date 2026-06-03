# Sound

Defined in Module `public/lib/impact/sound.js`

The sound module defines the sound manager, music playlist, sound effect class,
and audio source wrappers. Theseus adds SFX and music atlas support in addition
to classic HTML5 Audio and WebAudio playback.

## Synopsis

```js
const jump = new ig.Sound('media/jump.ogg');
const theme = new ig.Sound('media/theme.ogg', false);

jump.play();
ig.music.add(theme, 'theme');
ig.music.play('theme');
```

## Class ig.SoundManager

### Constructor

`new ig.SoundManager()`

Detects browser audio support, selects the first playable format in
`ig.Sound.use`, creates a WebAudio context when enabled, and installs a pointer
unlock handler on the canvas.

### Properties

- `clips` - cache of loaded sources by original path.
- `sfxAtlasCache` - decoded WebAudio atlas buffers.
- `volume` - global multiplier used by `ig.Sound.play()`.
- `format` - selected entry from `ig.Sound.FORMAT`.

### Methods

- `unlockWebAudio()` - unlocks the audio context after user interaction.
- `load(path, multiChannel, loadCallback)` - routes loading to WebAudio, SFX atlas, music atlas, or HTML5 Audio.
- `getSfxAtlasEntry(path)` - returns SFX atlas metadata for a path.
- `getMusicAtlasEntry(path)` - returns music atlas metadata for a path.
- `loadWebAudio(path, multiChannel, loadCallback)` - loads and decodes one sound file.
- `loadSfxAtlasWebAudio(path, atlasEntry, loadCallback)` - creates a segment source inside a decoded SFX atlas.
- `loadSfxAtlasBuffer(atlasIndex, callback)` - loads and caches a decoded atlas buffer.
- `loadMusicAtlasHTML5(path, atlasEntry, loadCallback)` - creates an HTML5 segment source inside a music atlas.
- `loadHTML5Audio(path, multiChannel, loadCallback)` - loads one or more HTML5 Audio channels.
- `get(path)` - returns an available source or rewinds a channel.

## Class ig.Music

### Constructor

`new ig.Music()`

Creates `volume` and `loop` accessors and prepares the ended callback.

### Properties

- `tracks` - ordered list of HTML5-compatible tracks.
- `namedTracks` - name to track map.
- `currentTrack` - currently selected track.
- `currentIndex` - index into `tracks`.
- `random` - selects a random next track when true.
- `volume` - accessor for `_volume`.
- `loop` - accessor for `_loop`.

### Methods

- `add(music, name)` - loads a non-multichannel track and optionally stores it by name.
- `next()` - stops the current track and advances to another.
- `pause()` - pauses the current track.
- `stop()` - pauses and rewinds the current track.
- `play(name)` - plays the current or named track.
- `getLooping()` and `setLooping(value)` - access loop state and apply it to all tracks.
- `getVolume()` and `setVolume(value)` - access volume and apply it to all tracks.
- `fadeOut(time)` - fades current track to silence over seconds.
- `_fadeStep()` - internal fade timer callback.
- `_endedCallback()` - loops or advances when a track ends.

## Class ig.Sound

### Constructor

`new ig.Sound(path, multiChannel)`

Stores the path, defaults `multiChannel` to true, creates a `loop` accessor,
and loads immediately or queues as a resource.

### Properties

- `path` - original sound path.
- `volume` - per-sound multiplier.
- `currentClip` - source returned by the sound manager.
- `multiChannel` - whether effects should allow overlapping playback.
- `loop` - accessor for `_loop`.

### Methods

- `getLooping()` and `setLooping(loop)` - access loop state and update the active clip.
- `load(loadCallback)` - loads through `ig.soundManager` or queues the sound resource.
- `play()` - gets a source, applies loop and volume, then plays.
- `stop()` - pauses and rewinds the active clip.

## Audio Source Classes

- `ig.Sound.MusicAtlasHTML5Source` - wraps one HTML5 Audio element and seeks within an atlas segment. It exposes `currentTime`, `loop`, `volume`, `paused`, `ended`, `preload`, `load()`, `play()`, `pause()`, and event methods.
- `ig.Sound.WebAudioSource` - wraps a decoded buffer and gain node for overlapping WebAudio playback.
- `ig.Sound.AtlasWebAudioSource` - extends `WebAudioSource` with `offset` and `duration` for SFX atlas segments.

## Constants

- `ig.Sound.FORMAT` - `MP3`, `M4A`, `OGG`, `WEBM`, and `CAF` definitions.
- `ig.Sound.use` - preferred formats, default OGG then MP3.
- `ig.Sound.channels` - HTML5 multichannel count, default `4`.
- `ig.Sound.enabled` - global audio enabled flag.
- `ig.Sound.useWebAudio` - true when `window.AudioContext` is available.

## Theseus Audio Atlases

SFX atlas lookup uses `globalThis.__THESEUS_SFX_ATLAS_MANIFEST__`; music atlas
lookup uses `globalThis.__THESEUS_MUSIC_ATLAS_MANIFEST__`. Entries are matched
by normalized path and by wildcard extension. If an atlas or requested format is
missing, loading falls back to individual audio files.

Music atlas playback uses a streaming HTML5 Audio element and segment boundary
checks. It reduces baked request count, but exact seamless loops should keep
individual files or use a future WebAudio music mode.
