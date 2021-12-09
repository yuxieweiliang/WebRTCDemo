
function handleRemoveStreamEvent(event) {
  log("*** Stream removed");
  // closeVideoCall();
}

function handleICECandidateEvent(event) {
  if (event.candidate) {
    log("Outgoing ICE candidate: " + event.candidate.candidate);

    console.log('handleICECandidateEvent//////////////////////////////', targetUsername);
    sendToServer({
      type: "new-ice-candidate",
      target: targetUsername,
      name: 'student',
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
  myPeerConnection.createOffer()
    .then(function(offer) {
      log("---> Creating new description object to send to remote peer");
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

  console.log("*** hasAddTrack -----------------------------------------", myPeerConnection.addTrack !== undefined);
  // Set up event handlers for the ICE negotiation process.

  myPeerConnection.onicecandidate = handleICECandidateEvent;
  myPeerConnection.onremovestream = handleRemoveStreamEvent;
  myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  myPeerConnection.onicegatheringstatechange =  (event) => log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
  myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

  // Because the deprecation of addStream() and the addstream event is recent,
  // we need to use those if addTrack() and track aren't available.


  log("*** hasAddTrack -----------------------------------------", hasAddTrack);
  if (hasAddTrack) {
    myPeerConnection.ontrack = handleTrackEvent;
  } else {
    myPeerConnection.onaddstream = handleAddStreamEvent;
  }
}


function handleTrackEvent(event) {
  const video = document.getElementById("received_video");
  log("*** Track event -----------------------------------------", event.streams[0]);
  console.log(event);
  video.srcObject = event.streams[0];
  video.play();
}

// Called by the WebRTC layer when a stream starts arriving from the
// remote peer. We use this to update our user interface, in this
// example.

function handleAddStreamEvent(event) {
  log("*** Stream added -----------------------------------------");
  document.getElementById("received_video").srcObject = event.stream;
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

createPeerConnection();
