import { Howl } from 'howler';

export class Player {
  private playlist: string[];
  private currentHowl?: Howl;
  private nextHowl?: Howl;
  private playWhenReady = false;
  private volume = 1.0;

  constructor() {
    this.playlist = [];
  }

  public play(): void {
    this.playWhenReady = true;
    if (this.currentHowl == null) {
      this.playNextItem();
    } else {
      this.currentHowl.play();
      this.nextHowl = this.nextHowl ?? this.buildNextHowl();
    }
  }

  public pause(): void {
    this.playWhenReady = false;
    this.currentHowl?.pause();
  }

  public stop(): void {
    this.playWhenReady = false;
    this.currentHowl?.stop();
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    this.currentHowl?.volume(volume);
  }

  public addMediaItem(src: string): void {
    this.playlist.push(src);
    if (!this.playWhenReady) {
      return;
    }

    if (this.currentHowl == null) {
      this.playNextItem();
    } else {
      this.nextHowl = this.nextHowl ?? this.buildNextHowl();
    }
  }

  private playNextItem() {
    const prevHowl = this.currentHowl;
    this.currentHowl = this.nextHowl ?? this.buildNextHowl();
    if (this.currentHowl != null) {
      // this.currentHowl.volume(prevHowl?.volume() ?? this.volume);
      this.currentHowl.play();
      this.nextHowl = this.buildNextHowl();
    }

    if (prevHowl != null) {
      setTimeout(() => prevHowl.unload(), 1000);
    }
  }

  private buildNextHowl(): Howl | undefined {
    const mediaItemUrl = this.playlist.shift();
    if (mediaItemUrl == null) {
      return undefined;
    }

    return new Howl({
      src: [mediaItemUrl],
      pool: 1,
      volume: this.volume,
      onend: () => this.playNextItem(),
    });
  }
}
