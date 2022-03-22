import EventEmitter from "events";

function dispatch(data) {
  // 转化为 可操作数据
  let dv = new DataView(data);
  // 视频类型 { 1: audio | 2: video }
  const type = dv.getUint8(0);
  // 视频每一帧的时间戳
  const ts = dv.getUint32(1, false);

  if (dv.byteLength > 5) {
    // 8位无符号整型数组
    // data = [2, 0, 0, 6, 84, 39, 1, 0, 0, 0, 0, 0, 16, 200]
    // new Uint8Array(data) => [2, 0, 0, 6, 84, 39, 1, 0, 0, 0, 0, 0, 16, 200]
    // new Uint8Array(data, 5) => [39, 1, 0, 0, 0, 0, 0, 16, 200]
    let payload = new Uint8Array(data, 5);
    // 查看是否是片段 - 关键帧
    // 23 >> 4 = 1
    // 39 >> 4 = 2
    const isIframe = dv.getUint8(5) >> 4 === 1;

    if (payload.byteLength > 0) {
      /**
       * payload 当前帧的数据
       * type video | audio
       * ts 每次 +30
       * isIframe true | false
       */
      demux._doDecode(payload, type, ts, isIframe);

      if (dv) {
        dv = null
      }
      if (payload) {
        payload = null
      }
      if (data) {
        data = null
      }
    }
  }
}

function createSocketLoader() {
  let socket = new WebSocket('ws://192.168.1.70:8081/jessica/34020000001420000123/34020000001320000001');

  function message (event) {
    dispatch(event.data)
  }
  socket.binaryType = 'arraybuffer';
  socket.addEventListener('message', message);

  setTimeout(() => {
    socket.removeEventListener('message', message);

    socket.close();
    socket = null
  }, 100)
}

class Stream extends EventEmitter {
  constructor(url, video) {
    super();
    this.url = url;
    this.video = video;
    this.socket = new WeakMap();
  }

  pull () {
    this.socket.set(this.video.stream, new WebSocket(this.url));
  }

  destroy () {
    if (this.socket.has(this.video.stream)) {
      const socket = this.socket.get(this.video.stream);

      socket.close();
      this.socket.delete(this.video.stream);
    }
  }
}
