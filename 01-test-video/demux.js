const demux = {
  // 延迟 200 毫秒后播放
  videoBuffer: 200,
  stopId: null,
  // 第一个时间戳
  firstTimestamp: null,
  // 开始时间戳
  startTimestamp: null,
  // 延迟
  delay: -1,
  bufferList: [],
  dropping: null,
  getDelay(timestamp) {
    if (!timestamp) {
      return -1
    }
    /**
     * 第一个时间戳: 视频最初时间戳
     * 开始时间戳: 本地最初时间
     * 延迟: 没有
     */
    if (!demux.firstTimestamp) {
      demux.firstTimestamp = timestamp;
      demux.startTimestamp = Date.now();
      demux.delay = -1;
    } else {
      /**
       * 延迟 = (本地当前时间 - 本地最初时间) - (视频当前时间戳 - 视频最初时间戳)
       */
      if (timestamp) {
        demux.delay = (Date.now() - demux.startTimestamp) - (timestamp - demux.firstTimestamp)
      }
    }
    return demux.delay
  },
  resetDelay() {
    demux.firstTimestamp = null;
    demux.startTimestamp = null;
    demux.delay = -1;
    demux.dropping = false;
  },
  initInterval() {
    let _loop = () => {
      let data;
      // console.log(videoBuffer, this.delay)
      if (demux.bufferList.length) {
        if (demux.dropping) {
          // this.player.debug.log('common dumex', `is dropping`);
          data = demux.bufferList.shift();

          while (!data.isIFrame && demux.bufferList.length) {
            data = demux.bufferList.shift();
            // type === 1 audio
            if (data.type === 1 && data.payload[1] === 0) {
              mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
            }
          }

          // 如果是关键帧，则播放。
          // i frame
          if (data.isIFrame) {
            demux.dropping = false;
            mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
          }
        } else {
          data = demux.bufferList[0];
          if (demux.getDelay(data.ts) === -1) {
            // this.player.debug.log('common dumex', `delay is -1`);
            demux.bufferList.shift();
            mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
          } else if (demux.delay > demux.videoBuffer + 1000) {
            // 延迟大于1秒的时候，重置时间戳，并且跳帧
            // this.player.debug.log('common dumex', `delay is ${this.delay}, set dropping is true`);
            demux.resetDelay();
            demux.dropping = true
          } else {
            while (demux.bufferList.length) {
              data = demux.bufferList[0];

              if (demux.getDelay(data.ts) > demux.videoBuffer) {
                // drop frame
                demux.bufferList.shift();
                mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
              } else {
                // this.player.debug.log('common dumex', `delay is ${this.delay}`);
                break;
              }
            }
          }
        }
      }
    };
    _loop();
    demux.stopId = setInterval(_loop, 10)
  },

  _doDecode(payload, type, ts, isIFrame) {
    let options = {
      ts: ts,
      type: type,
      isIFrame: false
    };
    // use offscreen
    options.isIFrame = isIFrame;

    demux.bufferList.push({
      ts: options.ts,
      payload: payload,
      type: 2,
      isIFrame: options.isIFrame
    });

    payload = null
  },
};


demux.initInterval();
