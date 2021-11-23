function PeerConnectionFactory(iceServers, socket) {
  const pc = new RTCPeerConnection({
    iceServers
  });
  this.pc = pc;
  this.socket = socket;
  return pc;
}

PeerConnectionFactory.prototype = {

  /**
   * 发送消息
   * @param msg
   */
  sendToServer(msg) {
    var msgJSON = JSON.stringify(msg);

    log("Sending '" + msg.type + "' message: " + msgJSON);
    this.socket.send(msgJSON);
  }
};

