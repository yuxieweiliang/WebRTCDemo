import EventEmitter from "events";

import VideoPlayer from './video'


class Sullivan extends EventEmitter {
  constructor(url, options) {
    super();
    this.options = options;

    this.video = new VideoPlayer(url, this);
    this.webRTC = new WebRTCVideo(url, this);
  }
}
