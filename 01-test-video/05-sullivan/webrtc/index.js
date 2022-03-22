import EventEmitter from "events";
import WebRTCVideo from './WebRTC'

export default class WebRTCVideo extends EventEmitter {
  constructor(url, options) {
    super();
    this.webRTC = new WebRTCVideo(url, this)
  }
}
