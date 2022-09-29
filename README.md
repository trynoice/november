<p align="center">
  <a href="https://trynoice.com">
    <img alt="Noice Logo" src="https://raw.githubusercontent.com/trynoice/.github/main/graphics/icon-round.png" width="92" />
  </a>
</p>
<h1 align="center">Noice November</h1>

Various tests we performed to achieve gapless transition between two or more MP3
tracks in modern browsers.

## What did we try?

### Howler.js

Branch: https://github.com/trynoice/november/tree/test/howler

[Howler.js](https://github.com/goldfire/howler.js) supports playback using both
the HTML5 Media Elements and Web Audio API. However, Howler.js doesn't have a
built-in playlist API. Creating a rudimentary playlist API on top of Howler.js
resulted in failure using both playback methods.

### Gapless-5

[Gapless-5](https://github.com/regosen/Gapless-5) uses both HTML5 Media Elements
and Web Audio API. It uses HTML5 Media Elements to start playback as soon as
enough data is available and seamlessly switches it to Web Audio once it
finishes loading the resource. It, however, didn't provide a gapless transition
when moving from one playlist item to another.

### HTML5 Audio API

Branch: https://github.com/trynoice/november/tree/test/html5-audio

It is a high-level audio API available in modern browsers. Since it is high
level, its callbacks lag, and thus, we cannot use them to implement a seamless
switch between two tracks.

To work around this issue, we buffered two HTMLAudioElements together. We used
timeupdate events on the first track to pause it about 350 milliseconds before
it ended and play the next (already buffered). It effectively produced a
seamless transition between the two audios in Google Chrome but didn't work for
Firefox, Microsoft Edge or the Chromium instance running on Chromecast v1.

Reference: https://stackoverflow.com/questions/7330023/gapless-looping-audio-html5

### Web Audio API

Branch: https://github.com/trynoice/november/tree/test/web-audio-api

It is the lowest level audio API available in the browser. Its first limitation
is that it doesn't support data streaming. [It only supports decoding the entire
resource at
once.](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)
Since our MP3s are usually longer than a minute, holding decoded PCM data in
memory wouldn't work since we want to play multiple tracks at once.

To overcome this limitation, we turned to
[aurora.js](https://github.com/trynoice/aurora.js). The project seemed dead, but
we forked the relevant repositories and made it work for WAV. However, we
couldn't make its MP3 decoder work. Starting and stopping audio decoding at our
will is another issue we couldn't resolve.

It is the closest we came to achieve gapless playback. We used aurora.js to
decode the WAV file chunk by chunk. We then used the Web Audio API to queue
decoded PCM chunks in an `AudioContext`. When a resource finished buffering, we
moved on to the next one in the playlist and repeated the process.

## License

[GNU GPL v3](LICENSE)

<a href="https://thenounproject.com/icon/white-noise-1287855/">
  <small>White Noise icon by Juraj Sedlák</small>
</a>
