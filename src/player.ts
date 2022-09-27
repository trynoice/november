import { Asset, Format } from 'av';
import 'mp3.js';

const AudioContextImpl: typeof AudioContext =
  window.AudioContext || window.webkitAudioContext;

export class Player {
  private readonly context: AudioContext = new AudioContextImpl();
  private readonly gainNode = this.context.createGain();

  private playlist: string[];
  private asset?: Asset;
  private channels = 0;
  private sampleRate = 0;
  private depth = 0;
  private buffer: Float32Array[] = [];
  private bufferSize = 0;
  private maxBufferSize: number;

  private playWhenReady = false;
  private isPlaying = false;

  constructor(maxBufferSize: number) {
    this.playlist = [];
    this.maxBufferSize = maxBufferSize;
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.context.destination);
  }

  public play(): void {
    this.playWhenReady = true;
    if (this.isPlaying) {
      return;
    }

    if (this.bufferSize > 0) {
      this.playNextChunk();
    } else {
      this.bufferNextItem();
    }
  }

  public pause(): void {
    this.playWhenReady = false;
    this.isPlaying = false;
    this.context.suspend();
  }

  public stop(): void {
    this.context.suspend();
    this.asset?.stop();
    this.playWhenReady = false;
    this.isPlaying = false;
    this.asset = undefined;
    this.buffer = [];
    this.bufferSize = 0;
  }

  public setVolume(volume: number): void {
    this.gainNode.gain.value = volume;
  }

  public addMediaItem(src: string): void {
    this.playlist.push(src);
    if (this.asset == null) {
      this.bufferNextItem();
    }
  }

  private playNextChunk() {
    const chunk = this.buffer.shift();
    if (chunk == null) {
      this.isPlaying = false;
      return;
    }

    this.bufferSize -= chunk.length;
    // resume buffering if buffer size is under the given max.
    if (this.bufferSize < this.maxBufferSize) {
      this.asset?.start();
    }

    this.isPlaying = true;
    const chunkBuffer = this.context.createBuffer(
      this.channels,
      chunk.length,
      this.sampleRate
    );

    chunkBuffer.copyToChannel(chunk, 0);
    const sourceNode = this.context.createBufferSource();
    sourceNode.buffer = chunkBuffer;
    sourceNode.connect(this.gainNode);
    sourceNode.addEventListener('ended', () => this.playNextChunk());
    sourceNode.start();
  }

  private bufferNextItem() {
    const src = this.playlist.shift();
    if (src == null) {
      return;
    }

    const asset = Asset.fromURL(src);
    asset.on('format', (format: Format) => {
      console.log('got audio format', format);
      this.channels = format.channelsPerFrame;
      this.sampleRate = format.sampleRate;
      this.depth = format.bitsPerChannel;
    });

    asset.on('data', (data: Float32Array) => {
      console.log('got data; length', data.length);
      this.buffer.push(new Float32Array(data));
      this.bufferSize += data.length;
      if (this.playWhenReady && !this.isPlaying) {
        this.playNextChunk();
      }

      if (asset.buffered >= 100.0 && !asset.active) {
        this.bufferNextItem();
        return;
      }

      if (this.bufferSize > this.maxBufferSize) {
        // pause if buffer size exceed maxBufferSize.
        asset.stop();
      }
    });

    asset.on('error', (e: Error) => {
      console.error('failed to buffer item', e);
      this.bufferNextItem();
    });

    asset.start();
    this.asset = asset;
  }
}
