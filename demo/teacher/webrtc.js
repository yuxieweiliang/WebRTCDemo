var myUsername = 'teacher';
var targetUsername = null;      // To store username of other peer
var myPeerConnection = null;    // RTCPeerConnection
var hasAddTrack = false;

function handleRemoveStreamEvent(event) {
  log("*** Stream removed");
  closeVideoCall();
}

function handleICECandidateEvent(event) {
  if (event.candidate) {
    log("Outgoing ICE candidate: " + event.candidate.candidate);

    sendToServer({
      type: "new-ice-candidate",
      target: targetUsername,
      candidate: event.candidate
    }, connection);
  }
}

function handleICEConnectionStateChangeEvent(event) {
  log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState);

  switch(myPeerConnection.iceConnectionState) {
    case "closed":
    case "failed":
    case "disconnected":
      closeVideoCall();
      break;
  }
}

function handleSignalingStateChangeEvent(event) {
  log("*** WebRTC signaling state changed to: " + myPeerConnection.signalingState);
  switch(myPeerConnection.signalingState) {
    case "closed":
      closeVideoCall();
      break;
  }
}

function handleNegotiationNeededEvent() {
  log("*** Negotiation needed");

  log("---> Creating offer");
  /**
   * 此请求包括支持的连接配置列表，包括有关我们在本地添加到连接的媒体流（即，我们希望发送到呼叫另一端的视频）的信息，以及ICE层已经收集到的任何ICE候选。
   */
  myPeerConnection.createOffer()
    .then(function(offer) {
      log("---> Creating new description object to send to remote peer");
      /**
       * 它为调用方的连接端配置连接和媒体配置状态。
       */
      return myPeerConnection.setLocalDescription(offer);
    })
    .then(function() {
      log("---> Sending offer to remote peer");
      sendToServer({
        name: myUsername,
        target: targetUsername,
        type: "video-offer",
        sdp: myPeerConnection.localDescription
      }, connection);
    })
    .catch(reportError);
}

function createPeerConnection() {
  log("Setting up a connection...");

  // Create an RTCPeerConnection which knows to use our chosen
  // STUN server.

  myPeerConnection = new RTCPeerConnection({
    iceServers: [     // Information about ICE servers - Use your own!
      {
        urls: "turn:" + myHostname,  // A TURN server
        username: "webrtc",
        credential: "turnserver"
      }
    ]
  });

  // Do we have addTrack()? If not, we will use streams instead.

  hasAddTrack = (myPeerConnection.addTrack !== undefined);

  // Set up event handlers for the ICE negotiation process.

  myPeerConnection.onicecandidate = handleICECandidateEvent;

  if (hasAddTrack) {
    /**
     * 如果远程删除磁道，则调用此方法。
     * @type {handleTrackEvent}
     *
     * onaddstream 是新方法
     * ontrack 是旧方法
     */
    myPeerConnection.ontrack = handleTrackEvent;
    console.log('/////////////////////////////////', hasAddTrack);
  } else {
    myPeerConnection.onaddstream = handleAddStreamEvent;
  }

  /**
   * 如果远程删除磁道，则调用此方法。
   * @type {handleRemoveStreamEvent}
   */
  myPeerConnection.onremovestream = handleRemoveStreamEvent;

  /**
   * ICE连接状态的更改，了解连接何时失败或丢失。
   * @type {handleICEConnectionStateChangeEvent}
   */
  myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  /**
   * 当ICE代理收集候选对象的过程从一个状态切换到另一个状态（例如开始收集候选对象或完成协商）时，ICE层将向你发送事件（“ICegulatingStateChange”）事件。
   * @param event
   */
  myPeerConnection.onicegatheringstatechange = (event) => log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
  /**
   * 当信令进程的状态更改时（或如果到信令服务器的连接更改时），WebRTC架构将向你发送 signalingstatechange 消息。
   * @type {handleSignalingStateChangeEvent}
   */
  myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
}

function handleTrackEvent(event) {
  console.log('/////////////////////////////////', hasAddTrack);
  log("*** Track event");
  document.getElementById("received_video").srcObject = event.streams[0];
  // document.getElementById("hangup-button").disabled = false;
}

// Called by the WebRTC layer when a stream starts arriving from the
// remote peer. We use this to update our user interface, in this
// example.

function handleAddStreamEvent(event) {
  log("*** Stream added");
  console.log('///////////////////////////////// Stream added');
  // document.getElementById("received_video").srcObject = event.stream;
  // document.getElementById("hangup-button").disabled = false;
}


function invite(localStream, username) {
  log("Starting to prepare an invitation");
  if (myPeerConnection) {
    console.error("You can't start a call because you already have one open!");
  } else {

    // Don't allow users to call themselves, because weird.

    if (username === myUsername) {
      console.error("I'm afraid I can't let you talk to yourself. That would be weird.");
      return;
    }

    // Record the username being called for future reference

    targetUsername = username;
    log("Inviting user " + targetUsername);

    // Call createPeerConnection() to create the RTCPeerConnection.

    log("Setting up connection to invite user: " + targetUsername);
    createPeerConnection();

    // Now configure and create the local stream, attach it to the
    // "preview" box (id "local_video"), and add it to the
    // RTCPeerConnection.

    log("Requesting webcam access...");

    /**
     * 当读取数据的时候，就会产生 轨道 [ track ]
     */
    if (hasAddTrack) {
      log("-- Adding tracks to the RTCPeerConnection");
      console.log('localStream.getTracks(): => ', localStream.getTracks());

      /**
       * addTrack
       *
       * 会触发 negotiationneeded 事件
       */
      localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    } else {
      log("-- Adding stream to the RTCPeerConnection");

      myPeerConnection.addStream(localStream);
    }
  }
}


function closeVideoCall() {
  log("Closing the call");

  // Close the RTCPeerConnection

  if (myPeerConnection) {
    log("--> Closing the peer connection");

    // Disconnect all our event listeners; we don't want stray events
    // to interfere with the hangup while it's ongoing.

    myPeerConnection.onaddstream = null;  // For older implementations
    myPeerConnection.ontrack = null;      // For newer ones
    myPeerConnection.onremovestream = null;
    myPeerConnection.onnicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    myPeerConnection.onnotificationneeded = null;

    // Close the peer connection

    myPeerConnection.close();
    myPeerConnection = null;
  }
  targetUsername = null;
}
