var clientID = 0;
var connection;
var myHostname = window.location.hostname;
var protocol = document.location.protocol;
var serverUrl = (protocol === "https:" ? "wss" : "ws" ) + "://" + myHostname + ":6502";
var username = 'teacher';

function handleVideoAnswerMsg(msg) {
  log("Call recipient has accepted our call");

  // Configure the remote description, which is the SDP payload
  // in our "video-answer" message.

  var desc = new RTCSessionDescription(msg.sdp);
  myPeerConnection.setRemoteDescription(desc).catch(reportError);
}

function connect(cb) {
  connection = new WebSocket(serverUrl, "json");

  connection.onopen = function(evt) {
    console.log('onopen: evt ', evt);
    cb()
  };

  connection.onerror = function(evt) {
    console.dir(evt);
  };

  connection.onmessage = function(evt) {
    // var chatFrameDocument = document.getElementById("chatbox").contentDocument;
    var text = "";
    var msg = JSON.parse(evt.data);
    log("Message received: ");
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
        myUsername = msg.name;
        text = "<b>Your username has been set to <em>" + myUsername +
          "</em> because the name you chose is in use.</b><br>";
        break;

      // Signaling messages: these messages are used to trade WebRTC
      // signaling information during negotiations leading up to a video
      // call.

      case "video-answer":  // Callee has answered our offer
        handleVideoAnswerMsg(msg);
        break;
      case "video-offer":  // Invitation and offer to chat
        // handleVideoOfferMsg(msg);
        break;

      case "new-ice-candidate": // A new ICE candidate has been received
        handleNewICECandidateMsg(msg);
        break;

      case "hang-up": // The other peer has hung up the call
        handleHangUpMsg(msg);
        break;

      case "userlist": // The other peer has hung up the call
        break;

      // Unknown message; output to console for debugging.

      default:
        log_error("Unknown message received:");
        log_error(msg);
    }

    // If there's text to insert into the chat buffer, do so now, then
    // scroll the chat panel so that the new text is visible.

    if (text.length) {
      // chatFrameDocument.write(text);
      // document.getElementById("chatbox").contentWindow.scrollByPages(1);
    }
  };
}

function setUsername() {
  console.log("*** SET USERNAME");
  var msg = {
    name: username,
    date: Date.now(),
    id: clientID,
    type: "username"
  };
  connection.send(JSON.stringify(msg));
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
