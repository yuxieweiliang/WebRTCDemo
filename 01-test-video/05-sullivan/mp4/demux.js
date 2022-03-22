import EventEmitter from "../events";

export default class Demux extends EventEmitter {
  constructor() {
    super();

    // 延迟 200 毫秒后播放
    this.videoBuffer = 200;
    this.disposeLoopTimer = null;
    // 第一个时间戳
    this.firstTimestamp = null;
    // 开始时间戳
    this.startTimestamp = null;
    // 延迟
    this.delay = -1;
    this.bufferList = [];
    this.dropping = false;


  }

  start () {
    this.disposeLoopBuffer();
    this.disposeLoopTimer = setInterval(this.disposeLoopBuffer, 10)
  }

  getDelay(timestamp) {
    if (!timestamp) {
      return -1
    }
    /**
     * 第一个时间戳: 视频最初时间戳
     * 开始时间戳: 本地最初时间
     * 延迟: 没有
     */
    if (!this.firstTimestamp) {
      this.firstTimestamp = timestamp;
      this.startTimestamp = Date.now();
      this.delay = -1;
    } else {
      /**
       * 延迟 = (本地当前时间 - 本地最初时间) - (视频当前时间戳 - 视频最初时间戳)
       */
      if (timestamp) {
        this.delay = (Date.now() - this.startTimestamp) - (timestamp - this.firstTimestamp)
      }
    }
    return this.delay
  }

  resetDelay() {
    this.firstTimestamp = null;
    this.startTimestamp = null;
    this.delay = -1;
    this.dropping = false;
  }

  disposeLoopBuffer = () => {
    let data;
    // console.log(videoBuffer, this.delay)
    if (this.bufferList.length) {
      if (this.dropping) {
        // this.player.debug.log('common dumex', `is dropping`);
        data = this.bufferList.shift();

        while (!data.isIFrame && this.bufferList.length) {
          data = this.bufferList.shift();
          // type === 1 audio
          if (data.type === 1 && data.payload[1] === 0) {
            mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
          }
        }

        // 如果是关键帧，则播放。
        // i frame
        if (data.isIFrame) {
          this.dropping = false;
          mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
        }
      } else {
        data = this.bufferList[0];
        if (this.getDelay(data.ts) === -1) {
          // this.player.debug.log('common dumex', `delay is -1`);
          this.bufferList.shift();
          mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
        } else if (this.delay > this.videoBuffer + 1000) {
          // 延迟大于1秒的时候，重置时间戳，并且跳帧
          // this.player.debug.log('common dumex', `delay is ${this.delay}, set dropping is true`);
          this.resetDelay();
          this.dropping = true
        } else {
          while (this.bufferList.length) {
            data = this.bufferList[0];

            if (this.getDelay(data.ts) > this.videoBuffer) {
              // drop frame
              this.bufferList.shift();
              mseDecoder.decodeVideo(data.payload, data.ts, data.isIFrame);
            } else {
              // this.player.debug.log('common dumex', `delay is ${this.delay}`);
              break;
            }
          }
        }
      }
    }
  }

  _doDecode(payload, type, ts, isIFrame) {
    let options = {
      ts: ts,
      type: type,
      isIFrame: false
    };
    // use offscreen
    options.isIFrame = isIFrame;

    this.bufferList.push({
      ts: options.ts,
      payload: payload,
      type: 2,
      isIFrame: options.isIFrame
    });

    payload = null
  }
}

