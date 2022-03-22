let mediaSource = new window.MediaSource();

function createMediaSource() {
  let isAvc = true;
  let sourceBuffer = null;
  let hasInit = false;
  let isInitInfo = false;
  let cacheTrack = {};
  let timeInit = false;
  // 序列号
  let sequenceNumber = 0;
  let mediaSourceOpen = false;

  mediaSource.addEventListener('sourceopen', () => {
    mediaSourceOpen = true;
    // this.player.emit(EVENTS.mseSourceOpen)
    console.log('source open')
  });

  mediaSource.addEventListener('sourceclose', () => {
    // this.player.emit(EVENTS.mseSourceClose);
    console.log('source close')
  });

  const mseDecoder = {
    /**
     * 解码
     *
     * @param payload 数据源
     * @param ts 时间戳
     * @param isIFrame 是否是关键帧
     */
    decodeVideo(payload, ts, isIFrame) {
      if (!hasInit) {
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

          mseDecoder._decodeConfigurationRecord(payload, ts, isIFrame, videoCodec);
          hasInit = true;
        }
      } else {
        mseDecoder._decodeVideo(payload, ts, isIFrame);
      }
    },

    // _doDecode() {
    //   const bufferItem = bufferList.shift();
    //   if (bufferItem) {
    //     mseDecoder._decodeVideo(bufferItem.payload, bufferItem.ts, bufferItem.isIframe);
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
        mseDecoder.appendBuffer(metaBox.buffer);
      }

      sequenceNumber = 0;
      cacheTrack = null;
      timeInit = false;
    },

    _decodeVideo(payload, ts, isIframe) {
      let arrayBuffer = payload.slice(5);
      let bytes = arrayBuffer.byteLength;
      let cts = 0;
      let dts = ts;

      // 首个缓冲范围的下标是 0。
      // 用来移除已经缓冲的内容。
      if ($video.buffered.length > 1) {
        mseDecoder.removeBuffer($video.buffered.start(0), $video.buffered.end(0));
        timeInit = false;
      }

      // 如果当前帧 比缓冲区的帧 时间戳 大于 1秒，则跳帧。
      if ($video.drop && dts - cacheTrack?.dts > 1000) {
        $video.drop = false;
        cacheTrack = {};
      } else if (cacheTrack && dts > cacheTrack.dts) {
        // 需要额外加8个size
        let mdatBytes = 8 + cacheTrack.size;
        let mdatbox = new Uint8Array(mdatBytes);
        mdatbox[0] = mdatBytes >>> 24 & 255;
        mdatbox[1] = mdatBytes >>> 16 & 255;
        mdatbox[2] = mdatBytes >>> 8 & 255;
        mdatbox[3] = mdatBytes & 255;
        mdatbox.set(MP4.types.mdat, 4);
        mdatbox.set(cacheTrack.data, 8);

        cacheTrack.duration = dts - cacheTrack.dts;
        // moof
        let moofbox = MP4.moof(cacheTrack, cacheTrack.dts);
        let result = new Uint8Array(moofbox.byteLength + mdatbox.byteLength);
        result.set(moofbox, 0);
        result.set(mdatbox, moofbox.byteLength);
        // appendBuffer
        if (result.buffer) {
          mseDecoder.appendBuffer(result.buffer)
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
        timeInit = false;
        cacheTrack = {};
      }

      if (!cacheTrack) {
        cacheTrack = {}
      }

      cacheTrack.id = 1;
      cacheTrack.sequenceNumber = ++sequenceNumber;
      cacheTrack.size = bytes;
      cacheTrack.dts = dts;
      cacheTrack.cts = cts;
      cacheTrack.isKeyframe = isIframe;
      cacheTrack.data = arrayBuffer;
      //
      cacheTrack.flags = {
        isLeading: 0,
        dependsOn: isIframe ? 2 : 1,
        isDependedOn: isIframe ? 1 : 0,
        hasRedundancy: 0,
        isNonSync: isIframe ? 0 : 1
      };

      //
      if (!timeInit && $video.buffered.length === 1) {
        // player.debug.log('MediaSource', 'timeInit set true');
        timeInit = true;
        $video.currentTime = $video.buffered.end(0);
      }

      if (!isInitInfo && $video.videoWidth > 0 && $video.videoHeight > 0) {
        // player.debug.log('MediaSource', `updateVideoInfo: ${$video.videoWidth},${$video.videoHeight}`);
        // player.video.updateVideoInfo({
        //   width: $video.videoWidth,
        //   height: $video.videoHeight
        // })
        // player.video.initCanvasViewSize();
        isInitInfo = true;
      }
    },

    appendBuffer(buffer) {
      if (buffer === null) {
        return;
      }

      if (sourceBuffer === null) {
        sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64002A"');

        sourceBuffer.addEventListener('error', (error) => {
          mseDecoder.dropSourceBuffer(true)
        })
      }
      sourceBuffer.addEventListener('updateend', function (_) {
        // $video.play();
        //console.log(mediaSource.readyState); // ended
      });

      // 上一块数据还在添加中
      if (sourceBuffer.updating) {
        return
      }

      // console.log('log: => ', mediaSource.readyState, sourceBuffer.updating)
      if (sourceBuffer.updating === false && mediaSource.readyState === 'open') {
        try {
          sourceBuffer.appendBuffer(buffer);
        } catch (error) {
          console.error('error: => ', error)
        }
        return;
      }

      if (mediaSource.readyState === 'closed') {
        console.log('mediaSource is not attached to video or mediaSource is closed')
        // this.player.emit(EVENTS.mseSourceBufferError, 'mediaSource is not attached to video or mediaSource is closed')
      } else if (mediaSource.readyState === 'end') {
        console.log('mediaSource is closed')
        // this.player.emit(EVENTS.mseSourceBufferError, 'mediaSource is closed')
      } else {
        if (sourceBuffer.updating === true) {
          mseDecoder.dropSourceBuffer(true);
        }
      }
    },

    /**
     * 跳帧
     */
    dropSourceBuffer() {
      if ($video.buffered.length > 0) {
        if ($video.buffered.end(0) - $video.currentTime > 1) {
          $video.currentTime = $video.buffered.end(0);
        }
      }
    },

    /**
     * 移除已经播放过的视频缓冲区
     *
     * @param start
     * @param end
     */
    removeBuffer(start, end) {
      if (sourceBuffer.updating === false) {
        try {
          sourceBuffer.remove(start, end)
        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  return mseDecoder
}
