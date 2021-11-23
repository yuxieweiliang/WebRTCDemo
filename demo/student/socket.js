var myHostname = window.location.hostname;
var protocol = document.location.protocol;
var serverUrl = (protocol === "https:" ? "wss" : "ws" ) + "://" + myHostname + ":6502";
var myUsername = 'student';
var connection = null;      // To store username of other peer
var targetUsername = null;      // To store username of other peer
var myPeerConnection = null;    // RTCPeerConnection
var hasAddTrack = false;
const mediaConstraints = {
  audio:  false,
  video:  true
};

function connect() {

  connection = new WebSocket(serverUrl, "json");
  console.log("***CREATED WEBSOCKET");

  connection.onopen = function(evt) { console.log("***ONOPEN"); };
  console.log("***CREATED ONOPEN");

  connection.onmessage = function(evt) {
    console.log("***ONMESSAGE");
    var text = "";
    var msg = JSON.parse(evt.data);
    console.log("Message received: ");
    console.dir(msg);
    var time = new Date(msg.date);
    var timeStr = time.toLocaleTimeString();

    switch(msg.type) {
      case "id":
        clientID = msg.id;
        setUsername();
        break;
      case "username":
        text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
        break;
      case "message":
        text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
        break;
      case "rejectusername":
        text = "<b>Your username has been set to <em>" + msg.name + "</em> because the name you chose is in use.</b><br>";
        break;
      case "userlist":
        var ul = "";
        var i;

        for (i=0; i < msg.users.length; i++) {
          ul += msg.users[i] + "<br>";
        }
        break;
      case "video-offer":  // Invitation and offer to chat
        handleVideoOfferMsg(msg);
        break;
      case "new-ice-candidate": // A new ICE candidate has been received
        handleNewICECandidateMsg(msg);
        break;

      case "hang-up": // The other peer has hung up the call
        handleHangUpMsg(msg);
        break;
    }
  };
  console.log("***CREATED ONMESSAGE");
}


connect();

function setUsername() {
  console.log("***SETUSERNAME");
  var msg = {
    name: myUsername,
    date: Date.now(),
    id: clientID,
    type: "username"
  };
  connection.send(JSON.stringify(msg));
}

function handleVideoOfferMsg(msg) {
  targetUsername = msg.name;

  // Call createPeerConnection() to create the RTCPeerConnection.

  log("Starting to accept invitation from " + targetUsername);

  // We need to set the remote description to the received SDP offer
  // so that our local WebRTC layer knows how to talk to the caller.

  console.log('handleVideoOfferMsg: ', msg);

  var desc = new RTCSessionDescription(msg.sdp);

  console.log('RTCSessionDescription: ', desc);
  myPeerConnection.setRemoteDescription(desc).then(function () {
    log("Setting up the local media stream...");
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  })
    .then(function(stream) {
      const video = document.getElementById("local_video");
      log("-- Local video stream obtained");
      localStream = stream;
      video.srcObject = localStream;
      video.play();
      if (hasAddTrack) {
        log("-- Adding tracks to the RTCPeerConnection");

        console.log('///////////////////////////////////////');
        console.log(localStream.getTracks());
        localStream.getTracks().forEach(track =>
          myPeerConnection.addTrack(track, localStream)
        );
      } else {
        log("-- Adding stream to the RTCPeerConnection");
        myPeerConnection.addStream(localStream);
      }
    })
    .then(function() {
      log("------> Creating answer");
      // Now that we've successfully set the remote description, we need to
      // start our stream up locally then create an SDP answer. This SDP
      // data describes the local end of our call, including the codec
      // information, options agreed upon, and so forth.
      return myPeerConnection.createAnswer();
    })
    .then(function(answer) {
      log("------> Setting local description after creating answer");
      // We now have our answer, so establish that as the local description.
      // This actually configures our end of the call to match the settings
      // specified in the SDP.
      return myPeerConnection.setLocalDescription(answer);
    })
    .then(function() {
      var msg = {
        name: myUsername,
        target: targetUsername,
        type: "video-answer",
        sdp: myPeerConnection.localDescription
      };

      // We've configured our end of the call now. Time to send our
      // answer back to the caller so they know that we want to talk
      // and how to talk to us.

      log("Sending answer packet back to other peer");
      sendToServer(msg, connection);
    })
    .catch(handleGetUserMediaError);
}

function handleNewICECandidateMsg(msg) {
  var candidate = new RTCIceCandidate(msg.candidate);

  log("Adding received ICE candidate: " + JSON.stringify(candidate));
  myPeerConnection.addIceCandidate(candidate)
    .catch(reportError);
}

function handleHangUpMsg(msg) {
  log("*** Received hang up notification from other peer");

  closeVideoCall();
}

