export default function webRTCErrorHandle (peerConnection, callbacks = {}, noop = () => {}) {
    const {
        iceCandidateError = noop,
        connectionStateFailed = noop,
        iceConnectionStateFailed = noop,
        framesDroppedFailed = noop,
    } = callbacks;
    /**
     * 当 ICE 候选人收集过程中发生错误时，将触发此事件。
     * errorCode: {
     *     300 ~ 699:
     *     700 ~ 799: 无法连接到服务器；提供了特定的错误号，但尚未指定这些错误号。
     * }
     * @param error
     */
    peerConnection.addEventListener('icecandidateerror', async function () {
        iceCandidateError(error);
        console.error(`iceError: => { \n  errorText: ${error.errorText}, \n  errorCode: ${error.errorCode} \n}`);
    });

    /**
     * 1. new:
     *    至少在连接的一ICE传输（RTCIceTransport或RTCDtlsTransport对象）是在new状态，
     *    他们都不是在以下状态之一： connecting，checking，failed，disconnected，或所有连接的传输都在closed状态。
     *
     * 2. connecting:
     *    一个或多个ICE传输当前正在建立连接；
     *    也就是说，它们iceConnectionState是checking或connected，并且该failed状态下没有传输。
     *
     * 3. connected:
     *    连接使用的 每个ICE传输要么正在使用（状态connected或completed），
     *    要么已关闭（状态closed）；
     *    此外，至少一种传输方式是connected或completed。
     *
     * 4. disconnected:
     *    至少之一ICE传输用于连接处于disconnected状态并且没有其他传输的处于状态 failed，connecting或checking。
     *
     * 5. failed:
     *    连接上的 一个或多个ICE传输处于该failed状态。
     *
     * 6. closed:
     *    将RTCPeerConnection被关闭。
     */
    peerConnection.addEventListener('connectionstatechange', async function () {
        const connectionState = this.connectionState;
        console.debug('connection: => ' + JSON.stringify(connectionState, null, 2));
        if (connectionState === 'failed') {
            connectionStateFailed();
            this.restartIce();
        }
    });

    /**
     * 获取远端 Ice 状态
     * 1. new:
     *    ICE 代理正在收集地址或等待通过调用RTCPeerConnection.addIceCandidate()（或两者）获得远程候选人。
     *
     * 2. checking:
     *    ICE 代理已获得一个或多个远程候选者，并且正在检查一对本地和远程候选者，以尝试找到兼容的匹配项，
     *    但尚未找到允许建立对等连接的对。候选人的收集可能仍在进行中。
     *
     * 3. connected:
     *    已为连接的所有组件找到可用的本地和远程候选配对，并且已建立连接。
     *    收集可能仍在进行中，也可能 ICE 代理仍在检查候选人以寻找更好的连接使用。
     *
     * 4. completed:
     *    ICE 代理已经完成了候选人的收集，已经检查了所有对，并找到了所有组件的连接。
     *
     * 5. failed:
     *    ICE 候选者已将所有候选者对相互检查，但未能为连接的所有组件找到兼容的匹配项。
     *    但是，ICE 代理可能确实为某些组件找到了兼容的连接。
     *
     * 6. disconnected:
     *    检查以确保组件仍然连接失败的RTCPeerConnection. 这是一个较不严格的测试，
     *    failed 并且可能会间歇性触发并在不太可靠的网络上或在临时断开连接期间自发解决。
     *    问题解决后，连接可能会返回到该connected状态。
     *
     * 7. closed:
     *    ICE 代理RTCPeerConnection已关闭，不再处理请求。
     */
    peerConnection.addEventListener('iceconnectionstatechange', async function () {
        const iceConnectionState = peerConnection.iceConnectionState;
        console.debug('iceConnection: => ' + JSON.stringify(iceConnectionState, null, 2));
        if (iceConnectionState === 'failed') {
            iceConnectionStateFailed();
            /*const offer = await peer.createOffer({iceRestart: true });
            logger.log('offer', offer);
            onOfferPresenter(null, offer.sdp);*/
        }
    });

    /**
     * 检测本地 Ice 状态
     * 1. new:
     *    对等连接刚刚创建，尚未完成任何联网。
     *
     * 2. gathering:
     *    ICE 代理正在为连接收集候选人。
     *
     * 3. complete:
     *    ICE 特工已经完成了候选人的收集。
     *    如果发生需要收集新候选者的事情，例如添加新接口或添加新 ICE 服务器，则状态将恢复gathering为收集这些候选者。
     */
    peerConnection.addEventListener('icegatheringstatechange', async function () {
        const iceGatheringState = this.iceGatheringState;
        let label = "Unknown";
        switch(iceGatheringState) {
            case "new":
            case "complete":
                label = "Idle";
                break;
            case "gathering":
                label = "Determining route";
                break;
        }
        console.debug('iceGathering: => ' + label);
    });

    /**
     * 1. stable:
     *    没有正在进行的 SDP 交换。
     *    这种情况出现在：
     *      1） RTCPeerConnection 刚刚创建，还没有开始 SDP 交换；这可能意味着RTCPeerConnection对象是新的，在这种情况下localDescription 和remoteDescription 都是null;
     *      2） 协商已经完成，连接成功建立。协商完成并建立了连接。
     *
     * 2. have-local-offer:
     *    本地peer调用了RTCPeerConnection.setLocalDescription()，
     *    传入代表offer的SDP（通常是调用创建的RTCPeerConnection.createOffer()），
     *    offer申请成功。
     *
     * 3. have-remote-offer:
     *    收到了对等端的提案，并成功调用了 setRemoteDescription() 方法。
     *    远程对等点创建了一个提议并使用信令服务器将其传递给本地对等点，
     *    本地对等点通过调用将提议设置为远程描述RTCPeerConnection.setRemoteDescription()。
     *
     * 4. have-local-pranswer:
     *    远程对等方发送的提议已被应用，
     *    并且已创建答案（通常通过调用RTCPeerConnection.createAnswer()）
     *    并通过调用应用RTCPeerConnection.setLocalDescription()。此临时答案描述了支持的媒体格式等，
     *    但可能没有包含完整的 ICE 候选集。更多的候选人将在稍后单独交付。
     *
     * 5. have-remote-pranswer:
     *    已收到并成功应用临时答复，以响应先前通过调用发送和建立的提议setLocalDescription()。
     *
     * 6. closed:
     *    在RTCPeerConnection已被关闭。
     */
    peerConnection.addEventListener('signalingstatechange', async function () {
        const signalingState = this.signalingState;
        console.debug('signaling: => ' + JSON.stringify(signalingState, null, 2));
    });


    // 获取数据统计
    let restartLength = 0;

    async function getStats () {
        peerConnection.getStats(null).then((statsReport) => {
            statsReport.forEach((report) => {
                // console.log('statsReport: => ', report)
            })
        })

        const rtpVideoReceiver = peerConnection.getReceivers().find(receive => receive.track && receive.track.kind === 'video')
        const rtpVideoSender = peerConnection.getSenders().find(receive => receive.track && receive.track.kind === 'video')

        if (rtpVideoReceiver) {
            const receiveVideoStats = await rtpVideoReceiver.getStats()
            receiveVideoStats.forEach((report) => {
                // console.log('receiveVideoStats: => ', report)
                if (report.type === 'track') {
                    // console.log('track:framesDecoded: => ', report.framesDecoded)
                }
                if (report.type === 'inbound-rtp') {
                    const { framesDecoded, framesDropped, framesPerSecond, framesReceived } = report
                    if (!framesPerSecond) {
                        if (restartLength > 6) {
                            framesDroppedFailed()
                        }
                        restartLength++
                    }
                    // console.log('inbound-rtp: => ', { framesDecoded, framesDropped, framesPerSecond, framesReceived })
                }
            })
            // console.log('receiveVideoStats: => ', receiveVideoStats)
        }

        if (rtpVideoSender) {
            const sendVideoStats = await rtpVideoSender.getStats()
            sendVideoStats.forEach((report) => {
                // console.log('sendVideoStats: => ', report)
            })
        }
        // console.log('setInterval')
    }
    // setInterval(getStats, 6000)
    // setTimeout(getStats, 2000)
    setInterval(getStats, 1000)
}
