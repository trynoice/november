export class Player {
  private playlist: string[] = [];
  private audioQueue: HTMLAudioElement[] = [];
  private playWhenReady = false;
  private volume = 1.0;

  public play(): void {
    this.playWhenReady = true;
    if (this.audioQueue.length > 0) {
      this.audioQueue[0].play();
    } else if (this.audioQueue.length < 2) {
      this.queueNextItem();
    }
  }

  public pause(): void {
    this.playWhenReady = false;
    if (this.audioQueue.length > 0) {
      this.audioQueue[0].pause();
    }
  }

  public stop(): void {
    this.playWhenReady = false;
    if (this.audioQueue.length > 0) {
      this.audioQueue[0].pause();
      this.audioQueue = [];
    }
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    this.audioQueue.forEach((a) => (a.volume = volume));
  }

  public addMediaItem(src: string): void {
    this.playlist.push(src);
    if (this.audioQueue.length < 2) {
      this.queueNextItem();
    }
  }

  private queueNextItem() {
    const mediaItemUrl = this.playlist.shift();
    if (mediaItemUrl == null) {
      console.log('playlist is empty');
      return;
    }

    console.log('queuing', mediaItemUrl);
    const audio = document.createElement('audio');
    audio.src = mediaItemUrl;
    audio.volume = this.volume;
    audio.preload = 'auto';
    const nextItemPlayer = () => {
      const remaining = audio.duration - audio.currentTime;
      if (remaining > 0.35) {
        return;
      }

      const prevAudio = this.audioQueue.shift();
      if (this.audioQueue.length > 0) {
        this.audioQueue[0]
          .play()
          .then(() => prevAudio?.pause())
          .catch((e) => {
            console.warn('failed to play audio', audio.src, e);
            this.audioQueue.shift();
            this.queueNextItem();
          });
      }

      console.log('transition');
      audio.removeEventListener('timeupdate', nextItemPlayer);
    };

    audio.addEventListener('timeupdate', nextItemPlayer);
    const nextItemQueuer = () => {
      const remaining = audio.duration - audio.currentTime;
      if (remaining < 15 && this.audioQueue.length < 2) {
        this.queueNextItem();
        audio.removeEventListener('timeupdate', nextItemQueuer);
      }
    };

    audio.addEventListener('timeupdate', nextItemQueuer);
    this.audioQueue.push(audio);
    if (this.playWhenReady && this.audioQueue.length < 2) {
      audio.play().catch((e) => {
        console.warn('failed to play audio', audio.src, e);
        this.audioQueue.shift();
        this.queueNextItem();
      });
    }
  }
}
