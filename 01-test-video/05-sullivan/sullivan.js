import EventEmitter from './events';
import Video from './video';
import Mp4Player from './mp4';
import WebRTCVideo  from './webrtc';

class Sullivan extends EventEmitter {
  constructor(options) {
    super();
    const { useWebRTC } = options;
    this.options = options;
    this.$video = new Video(this);

    if (useWebRTC) {
      this.player = new Mp4Player(this);
    } else {
      this.player = new WebRTCVideo(this);
    }
  }

  play (url) {
    this.url = url;
    this.player.play()
  }
}
