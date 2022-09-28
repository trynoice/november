import { Asset, Format } from 'av';
import 'mp3.js';

const AudioContextImpl: typeof AudioContext =
  window.AudioContext || window.webkitAudioContext;

export class Player {
  private readonly context: AudioContext = new AudioContextImpl();
  private readonly gainNode = this.context.createGain();

  private playlist: string[];
  private channels = 0;
  private sampleRate = 0;
  private nextChunkStartTime = this.context.currentTime;
  private playWhenReady = false;
  private asset?: Asset;
  private leftOverChunk?: Float32Array;
  private bufferSizeSeconds: number;

  constructor(bufferSizeSeconds: number) {
    this.playlist = [];
    this.bufferSizeSeconds = bufferSizeSeconds;
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.context.destination);
    this.context.suspend();
  }

  public play(): void {
    this.playWhenReady = true;
    if (this.asset == null) {
      this.bufferNextItem();
    }

    this.context.resume();
  }

  public pause(): void {
    this.playWhenReady = false;
    this.context.suspend();
  }

  public stop(): void {
    this.context.close();
    this.asset?.stop();
    this.playWhenReady = false;
    this.asset = undefined;
  }

  public setVolume(volume: number): void {
    this.gainNode.gain.value = volume;
  }

  public addMediaItem(src: string): void {
    this.playlist.push(src);
    if (this.playWhenReady && this.asset == null) {
      this.bufferNextItem();
    }
  }

  private bufferNextItem() {
    const src = this.playlist.shift();
    if (src == null) {
      this.asset = undefined;
      console.log('playlist is empty, nothing to buffer');
      return;
    }

    console.log('start buffering next item');
    const asset = Asset.fromURL(src);
    asset.on('format', (format: Format) => {
      console.log('got audio format', format);
      this.channels = format.channelsPerFrame;
      this.sampleRate = format.sampleRate;
    });

    asset.on('data', (data: Float32Array) => {
      const buffered = this.nextChunkStartTime - this.context.currentTime;
      if (buffered >= this.bufferSizeSeconds && this.asset?.active) {
        console.log('stop buffering audio', `buffered duration=${buffered}`);
        asset.stop();
      }

      this.queueChunk(data);
    });

    asset.on('end', () => this.bufferNextItem());
    asset.on('error', (e: Error) => {
      console.warn('failed to buffer item:', src, e);
      this.bufferNextItem();
    });

    asset.start();
    this.asset = asset;
  }

  private queueChunk(chunk: Float32Array) {
    if (chunk.length < this.channels) {
      if (this.leftOverChunk == null) {
        this.leftOverChunk = chunk;
      } else {
        const tmp = this.leftOverChunk;
        this.leftOverChunk = new Float32Array(tmp.length + chunk.length);
        this.leftOverChunk.set(tmp, 0);
        this.leftOverChunk.set(chunk, tmp.length);
      }

      return;
    }

    const frameCount = Math.floor(chunk.length / this.channels);
    const audioBuffer = this.context.createBuffer(
      this.channels,
      frameCount,
      this.sampleRate
    );

    for (let channel = 0; channel < this.channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      let offset = channel;
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = chunk[offset];
        offset += this.channels;
      }
    }

    if (this.nextChunkStartTime < this.context.currentTime) {
      this.nextChunkStartTime = this.context.currentTime;
    }

    const sourceNode = this.context.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.gainNode);
    sourceNode.onended = () => {
      sourceNode.disconnect();
      const buffered = this.nextChunkStartTime - this.context.currentTime;
      if (buffered < this.bufferSizeSeconds / 2 && !this.asset?.active) {
        console.log('resume buffering audio', `buffer duration=${buffered}`);
        this.asset?.start();
      }
    };

    sourceNode.start(this.nextChunkStartTime);
    this.nextChunkStartTime += audioBuffer.duration;

    const leftOverStart = frameCount * this.channels;
    const leftOverCount = chunk.length - leftOverStart;
    if (leftOverCount < 1) {
      this.leftOverChunk = undefined;
      return;
    }

    this.leftOverChunk = new Float32Array(leftOverCount);
    let j = 0;
    for (let i = leftOverStart; i < chunk.length; i++) {
      this.leftOverChunk[j++] = chunk[i];
    }
  }
}
