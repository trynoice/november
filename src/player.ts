const AudioContextImpl: typeof AudioContext =
  window.AudioContext || window.webkitAudioContext;

export class Player {
  private readonly context: AudioContext = new AudioContextImpl();
  private readonly gainNode = this.context.createGain();

  private playlist: string[];
  private currentAudio?: HTMLMediaElement;
  private nextAudio?: HTMLMediaElement;

  constructor() {
    this.playlist = [];
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.context.destination);
  }

  public play(): void {
    this.playNextItem();
  }

  public setVolume(volume: number): void {
    this.gainNode.gain.value = volume;
  }

  public addMediaItem(src: string): void {
    this.playlist.push(src);
  }

  private playNextItem() {
    this.currentAudio = this.nextAudio ?? this.buildNextAudio();
    if (this.currentAudio == null) {
      return;
    }

    this.nextAudio = undefined;
    const sourceNode = this.context.createMediaElementSource(this.currentAudio);
    sourceNode.connect(this.gainNode);
    sourceNode.addEventListener('ended', () => this.playNextItem());
  }

  private buildNextAudio(): HTMLAudioElement | undefined {
    const mediaItemUrl = this.playlist.shift();
    if (mediaItemUrl == null) {
      return undefined;
    }

    const audio = new Audio(mediaItemUrl);
    audio.preload = 'auto';
    const onTimeUpdate = () => {
      if (audio.currentTime < audio.duration - 15) {
        return;
      }

      this.nextAudio = this.nextAudio ?? this.buildNextAudio();
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    return audio;
  }
}
