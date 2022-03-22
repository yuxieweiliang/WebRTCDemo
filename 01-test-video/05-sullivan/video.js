import EventEmitter from "events";

import Mp4 from './mp4'
import WebRTCVideo  from "./webrtc/useWebRTC";

export default class VideoPlayer extends EventLister {
  constructor(url, root) {
    super();
    const { useWebRTC, ...option } = root.options;

    if (useWebRTC) {
      this.video = new Mp4()
    } else {
      this.video = new WebRTCVideo()
    }

  }
}
