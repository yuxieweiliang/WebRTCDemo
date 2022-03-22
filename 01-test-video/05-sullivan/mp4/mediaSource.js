import EventEmitter from "../events";
import MP4 from './fmp4-generator'

export default class MediaSource extends EventEmitter {
  constructor() {
    super();
    this.isAvc = true;
    this.sourceBuffer = null;
    this.hasInit = false;
    this.isInitInfo = false;
    this.cacheTrack = {};
    this.timeInit = false;
    // 序列号
    this.sequenceNumber = 0;
    this.mediaSourceOpen = false;
    this.mediaSource = new window.MediaSource();


    this.mediaSource.addEventListener('sourceopen', this.sourceOpen);
    this.mediaSource.addEventListener('sourceclose', this.sourceClose);
  }

  sourceOpen = () => {
    this.mediaSourceOpen = true;
    // this.player.emit(EVENTS.mseSourceOpen)
    console.log('source open')
  };

  sourceClose = () => {
    // this.player.emit(EVENTS.mseSourceClose);
    console.log('source close')
  };

  destroy () {
    this.isAvc = true;
    this.hasInit = false;
    this.isInitInfo = false;
    this.cacheTrack = {};
    this.timeInit = false;
    // 序列号
    this.sequenceNumber = 0;
    this.mediaSourceOpen = false;

    this.mediaSource.removeSourceBuffer(this.sourceBuffer);
    this.sourceBuffer = null;
    this.mediaSource.removeEventListener('sourceopen', this.sourceOpen);
    this.mediaSource.removeEventListener('sourceclose', this.sourceClose);
    this.mediaSource = null;
  }

  /**
   * 解码
   *
   * @param payload 数据源
   * @param ts 时间戳
   * @param isIFrame 是否是关键帧
   */
  decodeVideo(payload, ts, isIFrame) {
    if (!this.hasInit) {
      if (isIFrame && payload[1] === 0) {
        /**
         * videoCodec: { 7: h264 | 12: h265 }
         * @type {number}
         */
        const videoCodec = (payload[0] & 0x0F);

        // 如果解码出来的是
        if (videoCodec === 12) {
          // this.emit(EVENTS_ERROR.mediaSourceH265NotSupport)
          return;
        }

        this._decodeConfigurationRecord(payload, ts, isIFrame, videoCodec);
        this.hasInit = true;
      }
    } else {
      this._decodeVideo(payload, ts, isIFrame);
    }
  }

  // _doDecode() {
  //   const bufferItem = bufferList.shift();
  //   if (bufferItem) {
  //     this._decodeVideo(bufferItem.payload, bufferItem.ts, bufferItem.isIframe);
  //   }
  // },

  _decodeConfigurationRecord(payload, ts, isIframe, videoCodec) {
    let data = payload.slice(5);
    let config = {};

    // 为了获取 config.videoType = "avc"
    if (videoCodec === 7) { // h264
      console.log('这个是： h264');
      // config = parseAVCDecoderConfigurationRecord(data)
      config.videoType = "avc"
    }
    if (videoCodec === 12) { // h265
      console.log('这个是： h265');
      // config = parseHEVCDecoderConfigurationRecord(data);
    }

    const metaData = {
      id: 1, // video tag data
      type: 'video',
      timescale: 1000,
      duration: 0,
      avcc: data,
      codecWidth: config.codecWidth || 704,
      codecHeight: config.codecHeight || 570,
      videoType: config.videoType
    };

    // console.log('这个是： metaData', metaData)
    // ftyp
    const metaBox = MP4.generateInitSegment(metaData);

    if (metaBox.buffer) {
      this.appendBuffer(metaBox.buffer);
    }

    this.sequenceNumber = 0;
    this.cacheTrack = null;
    this.timeInit = false;
  }

  _decodeVideo(payload, ts, isIframe) {
    let arrayBuffer = payload.slice(5);
    let bytes = arrayBuffer.byteLength;
    let cts = 0;
    let dts = ts;
    const $video = this.root.$video;

    // 首个缓冲范围的下标是 0。
    // 用来移除已经缓冲的内容。
    if ($video.buffered.length > 1) {
      this.removeBuffer($video.buffered.start(0), $video.buffered.end(0));
      this.timeInit = false;
    }

    // 如果当前帧 比缓冲区的帧 时间戳 大于 1秒，则跳帧。
    if ($video.drop && dts - this.cacheTrack?.dts > 1000) {
      $video.drop = false;
      this.cacheTrack = {};
    } else if (this.cacheTrack && dts > cacheTrack.dts) {
      // 需要额外加8个size
      let mdatBytes = 8 + this.cacheTrack.size;
      let mdatbox = new Uint8Array(mdatBytes);
      mdatbox[0] = mdatBytes >>> 24 & 255;
      mdatbox[1] = mdatBytes >>> 16 & 255;
      mdatbox[2] = mdatBytes >>> 8 & 255;
      mdatbox[3] = mdatBytes & 255;
      mdatbox.set(MP4.types.mdat, 4);
      mdatbox.set(this.cacheTrack.data, 8);

      this.cacheTrack.duration = dts - this.cacheTrack.dts;
      // moof
      let moofbox = MP4.moof(this.cacheTrack, this.cacheTrack.dts);
      let result = new Uint8Array(moofbox.byteLength + mdatbox.byteLength);
      result.set(moofbox, 0);
      result.set(mdatbox, moofbox.byteLength);
      // appendBuffer
      if (result.buffer) {
        this.appendBuffer(result.buffer)
      }

      // player.handleRender();
      // player.updateStats({fps: true, ts: ts, buf: player.demux.delay})
      // if (!player._times.videoStart) {
      //   player._times.videoStart = now();
      //   player.handlePlayToRenderTimes()
      // }
    } else {
      // !!! 不会走到这里 !!!
      // player.debug.log('MediaSource', 'timeInit set false , cacheTrack = {}');
      this.timeInit = false;
      this.cacheTrack = {};
    }

    if (!this.cacheTrack) {
      this.cacheTrack = {}
    }

    this.cacheTrack.id = 1;
    this.cacheTrack.sequenceNumber = ++sequenceNumber;
    this.cacheTrack.size = bytes;
    this.cacheTrack.dts = dts;
    this.cacheTrack.cts = cts;
    this.cacheTrack.isKeyframe = isIframe;
    this.cacheTrack.data = arrayBuffer;
    //
    this.cacheTrack.flags = {
      isLeading: 0,
      dependsOn: isIframe ? 2 : 1,
      isDependedOn: isIframe ? 1 : 0,
      hasRedundancy: 0,
      isNonSync: isIframe ? 0 : 1
    };

    //
    if (!this.timeInit && $video.buffered.length === 1) {
      // player.debug.log('MediaSource', 'timeInit set true');
      this.timeInit = true;
      $video.currentTime = $video.buffered.end(0);
    }

    if (!this.isInitInfo && $video.videoWidth > 0 && $video.videoHeight > 0) {
      // player.debug.log('MediaSource', `updateVideoInfo: ${$video.videoWidth},${$video.videoHeight}`);
      // player.video.updateVideoInfo({
      //   width: $video.videoWidth,
      //   height: $video.videoHeight
      // })
      // player.video.initCanvasViewSize();
      this.isInitInfo = true;
    }
  }

  appendBuffer(buffer) {
    if (buffer === null) {
      return;
    }

    if (this.sourceBuffer === null) {
      this.sourceBuffer = this.mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64002A"');

      this.sourceBuffer.addEventListener('error', (error) => {
        this.dropSourceBuffer(true)
      })
    }
    this.sourceBuffer.addEventListener('updateend', function (_) {
      // $video.play();
      //console.log(mediaSource.readyState); // ended
    });

    // 上一块数据还在添加中
    if (this.sourceBuffer.updating) {
      return
    }

    // console.log('log: => ', mediaSource.readyState, sourceBuffer.updating)
    if (this.sourceBuffer.updating === false && this.mediaSource.readyState === 'open') {
      try {
        this.sourceBuffer.appendBuffer(buffer);
      } catch (error) {
        console.error('error: => ', error)
      }
      return;
    }

    if (this.mediaSource.readyState === 'closed') {
      console.log('mediaSource is not attached to video or mediaSource is closed')
      // this.player.emit(EVENTS.mseSourceBufferError, 'mediaSource is not attached to video or mediaSource is closed')
    } else if (this.mediaSource.readyState === 'end') {
      console.log('mediaSource is closed')
      // this.player.emit(EVENTS.mseSourceBufferError, 'mediaSource is closed')
    } else {
      if (this.sourceBuffer.updating === true) {
        this.dropSourceBuffer(true);
      }
    }
  }

  /**
   * 跳帧
   */
  dropSourceBuffer() {
    const $video = this.root.$video;
    if ($video.buffered.length > 0) {
      if ($video.buffered.end(0) - $video.currentTime > 1) {
        $video.currentTime = $video.buffered.end(0);
      }
    }
  }

  /**
   * 移除已经播放过的视频缓冲区
   *
   * @param start
   * @param end
   */
  removeBuffer(start, end) {
    if (this.sourceBuffer.updating === false) {
      try {
        this.sourceBuffer.remove(start, end)
      } catch (e) {
        console.error(e)
      }
    }
  }
}
