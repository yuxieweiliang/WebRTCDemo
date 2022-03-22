import EventEmitter from "events";
import * as utils from './utils'


export default class Video extends EventLister {
  constructor(url, root) {
    super();
    const { useWebRTC, ...option } = root.options;

    this.initVideo();

  }

  initVideo () {
    const $video = utils.createElement('video', { autoPlay: true, mute: false });

    utils.listener($video, 'canPlay', () => {

    });

    this.$video = $video;
  }

  setMediaSourceSrc (mediaSource) {
    this.$video.src = mediaSource
  }
}
