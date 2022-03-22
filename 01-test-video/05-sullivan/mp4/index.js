import EventEmitter from "../events";
import Stream from './stream'
import Demux from './demux'
import MediaSource from './mediaSource'

export default class Mp4Player extends EventEmitter {
  constructor(root) {
    super();
    this.root = root;
    this.player = new WeakMap();

    this.player.set(root.player, {
      demux: new Demux(this),
      media: new MediaSource(this),
    });

    // 将 mediaSource 添加到 video 上
    this.setMediaSourceForVideo();
  }

  play (url, options) {
    const { demux, media } = this.player.get(this.root.player);
    this.player.set(this.root.player, {
      demux,
      media,
      stream: new Stream(url, options),
    });
  }

  /**
   * 将 mediaSource 添加到 video 上
   */
  setMediaSourceForVideo () {
    const { media } = this.player.get(this.root.player);
    this.root.$video.setMediaSourceSrc(media.mediaSource)
  }

  destroy () {
    const { demux, media, stream } = this.player.get(this.root.player);

    demux.destroy();
    media.destroy();
    stream.destroy();
  }
}
