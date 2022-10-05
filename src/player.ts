import MediaItem from './media-item';

export class Player {
  private readonly mediaSource = new MediaSource();
  private readonly audio = new Audio(URL.createObjectURL(this.mediaSource));

  private playlist: MediaItem[] = [];
  private buffering = false;
  private isReady = false;
  private playWhenReady = false;
  private sourceBuffer?: SourceBuffer;
  private bufferTicker?: number;
  private bufferSizeSeconds: number;

  constructor(bufferSizeSeconds: number) {
    this.bufferSizeSeconds = bufferSizeSeconds;
    this.mediaSource.addEventListener('sourceopen', () => {
      this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
    });
  }

  public play(): void {
    if (!this.buffering) {
      this.buffer();
    }

    this.playWhenReady = true;
    if (this.isReady) {
      this.audio.play();
    }
  }

  public pause(): void {
    this.playWhenReady = false;
    this.audio.pause();
  }

  public stop(): void {
    this.playWhenReady = false;
    this.audio.pause();
    URL.revokeObjectURL(this.audio.src);
    clearTimeout(this.bufferTicker);
  }

  public setVolume(volume: number): void {
    this.audio.volume = volume;
  }

  public addMediaItem(src: string): void {
    this.playlist.push(new MediaItem(src));
    if (this.playWhenReady && !this.buffering) {
      this.buffer();
    }
  }

  private async buffer() {
    this.buffering = true;
    if (
      this.mediaSource.readyState !== 'open' ||
      this.sourceBuffer == null ||
      this.sourceBuffer.updating
    ) {
      console.log('source buffer is not initialized or is updating');
      this.scheduleBufferTicker();
      return;
    }

    if (this.playlist.length < 1) {
      this.buffering = false;
      console.log('all media items in the playlist have finished buffering');
      return;
    }

    const totalBufferedDuration =
      this.sourceBuffer.buffered.length > 0
        ? this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1)
        : 0;

    const remaining = totalBufferedDuration - this.audio.currentTime;
    if (remaining > this.bufferSizeSeconds) {
      console.log('buffered duration exceeds the requested buffer size');
      this.scheduleBufferTicker();
      return;
    }

    if (!this.playlist[0].isInitialized()) {
      console.log('init media item');
      await this.playlist[0].initialize();
    }

    if (!this.playlist[0].hasNextChunk()) {
      console.log('finished media item');
      this.playlist.shift();
      this.scheduleBufferTicker();
      return;
    }

    const chunk = await this.playlist[0].getNextChunk();
    this.sourceBuffer.appendBuffer(chunk);
    console.log('appended to source buffer');

    this.isReady = true;
    if (this.playWhenReady && this.audio.paused) {
      this.audio.play();
    }

    this.scheduleBufferTicker();
  }

  private scheduleBufferTicker() {
    this.bufferTicker = setTimeout(() => this.buffer(), 500);
  }
}
