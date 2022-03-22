function WebRtcPeer(option) {
    this.pc = new RTCPeerConnection(option);
    this.time = {
        // 开始时间
        __start: Date.now(),
        // 持续时间
        __duration: null,
        // 1小时
        __interval: 1000 * 60 * 60,
        // 上次清理的时间
        __prevClear: null,
    }
}

export function WebRtcPeerRecvOnly(option) {
    WebRtcPeer.call(this, option);

    this.pc.addTransceiver('video',{
        direction: 'recvonly'
    });
}

WebRtcPeerRecvOnly.prototype.generateOffer = async function generateOffer (option, callback) {
    if (typeof option === 'function') {
        callback = option
        option = undefined
    }
    await  this.pc.setLocalDescription(await  this.pc.createOffer(option));

    if (callback) {
        callback(this.pc.localDescription)
    }

    return this.pc.localDescription
}

WebRtcPeerRecvOnly.prototype.processAnswer = async function processAnswer (sdp, callback) {
    if (typeof sdp === 'string') {
        sdp = { sdp }
    }

    if (!sdp.sdp) {
        throw new Error('sdp 不能为空！')
    }

    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));

    if (callback) {
        callback(true)
    }

    return true
}

WebRtcPeerRecvOnly.prototype.destroy = function () {
    this.pc.close()
    this.pc = null
}

export function webRtcRecvOnly(option, callback) {
    const webRtc = new WebRtcPeerRecvOnly(option)

    if (callback) {
        callback(webRtc)
    }

    return webRtc
}
