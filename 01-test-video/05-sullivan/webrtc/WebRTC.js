import webRTCErrorHandle from './webRTCErrorHandle'
import { WebRtcPeerRecvOnly } from './webRTCUtls'
import Video from "../video";
import {EVENTS} from "../constant";

function assembleUrl (path) {
    const url = new URL(path)
    if (url.origin && url.origin !== 'null') {
        if (path.indexOf('webrtc/play') > -1) {
            return path
        }

        if (path.startsWith('streamPath')) {
            return `${window.location.origin}/webrtc-api/webrtc/play${url.search}`
        }
        return `${window.location.origin}/webrtc-api/webrtc/play?streamPath=${url.pathname.substr(1)}`
    } else {
        let pathname = url.pathname
        let streamPath = ''
        let index = 0
        if (url.pathname.startsWith('//')) {
            pathname = url.pathname.substr(2)
        }

        index = pathname.indexOf('/')
        streamPath = pathname.substring(index + 1)

        if (pathname) {
            return `${window.location.origin}/webrtc-api/webrtc/play?streamPath=${streamPath}`
        } else {
            console.log('url is Error for webRTC！')
        }
    }
}

function getOldVideoKey () {
    return parseInt('' + Math.random() * Math.pow(10, 6)) + '-' + Date.now()
}

const map = new WeakMap();
async function WebRTCVideo(player) {
    const streamPath = assembleUrl(player._opt.url)
    const timeRefresh = player._opt.webRTCRefreshTime
    let $webRTCVideo = player.$container.$videoElement
    let $oldVideo = $webRTCVideo
    map.set($webRTCVideo, new WebRtcPeerRecvOnly())
    let __timer = null
    let __TimerWebRTC = null

    console.log(player._opt)

    function withError(pc) {
        webRTCErrorHandle(pc, {
            connectionStateFailed: () => {
                player.loading = true
                resetWebRTC()
                console.log('-------- webRTCErrorHandle -----------')
            },
            framesDroppedFailed: () => {
                player.loading = true
                resetWebRTC()
                console.log('-------- framesDroppedFailed -----------')
            },
        })
    }

    withError(map.get($webRTCVideo).pc)

    function ontrack (event, __webRTCVideo) {
        clearTimeout(__timer)
        if (event.track.kind === "video") {
            player.$container.appendChild(__webRTCVideo);
            $webRTCVideo.srcObject = event.streams[0];
            $webRTCVideo.play()

            if (!player.playing) {
                player.playing = true;
            }
        }
    }

    function deleteWebRTC() {
        clearTimeout(player.__deleteWebRTCTimer)
        $oldVideo.srcObject = undefined;
        $oldVideo.src = '';
        $oldVideo.load();

        // 把上一个卸载了。
        if ($oldVideo) {
            console.log($oldVideo)
            if (player.video && player.video.destroyVideo) {
                player.video.destroyVideo($oldVideo)
            }

            if (map.has($oldVideo)) {
                map.get($oldVideo).destroy()
                map.delete($oldVideo)
            }
        }

        $oldVideo = $webRTCVideo
    }

    async function resetWebRTC () {
        player.__deleteWebRTCTimer = setTimeout(deleteWebRTC, 1000)
        // 创建新 video
        player.video = new Video(player)
        $webRTCVideo = player.video.$videoElement

        map.set($webRTCVideo, map.get($webRTCVideo))
        map.delete($webRTCVideo)
        // player.video = __newVideo
        map.set($webRTCVideo, new WebRtcPeerRecvOnly())

        clearTimeout(__TimerWebRTC)

        withError(map.get($webRTCVideo).pc)
        map.get($webRTCVideo).pc.ontrack = function(event) {
            ontrack(event, $webRTCVideo)
        }

        // restartVideo(event.streams[0])
        // $video = null;
        await fetchRemoteSDP (map.get($webRTCVideo))

        __TimerWebRTC = setTimeout(resetWebRTC, timeRefresh)
    }

    __TimerWebRTC = setTimeout(resetWebRTC, timeRefresh)

    async function fetchRemoteSDP (webRTC) {
        return new Promise((resolve, reject) => {
            if (webRTC) {
                webRTC.generateOffer(async (sdp) => {
                    try {
                        let result = await fetch(streamPath, {
                            method: "POST",
                            body: JSON.stringify(sdp),
                            headers: {
                                'Content-Type': 'application/json;charset=UTF-8'
                            }
                        }).then(res => res.json());

                        if (result.errmsg) {
                            console.error(result.errmsg);
                            deleteWebRTC()
                            player.emit('connectError', {code: 5015, errorMsg: 'stream not found!'});
                            player.destroy()
                            map.delete($webRTCVideo)
                        } else {
                            await webRTC.pc.setRemoteDescription(new RTCSessionDescription(result));
                        }

                        player.loading = false
                        resolve(result)
                        result = null
                        webRTC = null
                    } catch (e) {
                        clearTimeout(webRTC.restartTimer);
                        console.error(e)
                        webRTC.restartTimer = setTimeout(async () => {
                            const result = await fetchRemoteSDP (webRTC)
                            resolve(result)
                            clearTimeout(webRTC.restartTimer);
                        }, 1000)
                    }
                })
            } else {
                reject()
            }
        })
    }

    map.get($webRTCVideo).pc.ontrack = function(event) {
        ontrack(event, $webRTCVideo)
    }

    fetchRemoteSDP (map.get($webRTCVideo))
}

export default WebRTCVideo;
