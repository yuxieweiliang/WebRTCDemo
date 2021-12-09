
// Define "global" variables

// UI variables
var connectButton = null;
var disconnectButton = null;
var sendButton = null;
var messageInputBox = null;
var receiveBox = null;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};
// Signalling Variables (used to communicate via server)
var uuid;
var serverConnection;

// RTC Variables!!
var peerConnection = null;  // RTCPeerConnection
var dataChannel = null;     // RTCDataChannel

var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};
var mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
};
var dataChannelConfig = {
  ordered: true,
  maxRetransmits: 10,
};
var videoHere = document.querySelector('#video_here');

// Functions

// Set things up, connect event listeners, etc.

function startup() {
  // Get the local UI elements ready
  connectButton = document.getElementById('connectButton');
  disconnectButton = document.getElementById('disconnectButton');
  sendButton = document.getElementById('sendButton');
  messageInputBox = document.getElementById('message');
  receiveBox = document.getElementById('receivebox');

  // Set event listeners for user interface widgets

  connectButton.addEventListener('click', connect, false);
  disconnectButton.addEventListener('click', disconnectPeers, false);
  sendButton.addEventListener('click', sendMessageThroughDataChannel, false);

  // And set up connection to our websocket signalling server

  uuid = createUUID();

  serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
  serverConnection.onmessage = gotMessageFromServer;
  // navigator.mediaDevices.getUserMedia(mediaConstraints)
}

// Called when we initiate the connection

function connect() {
  console.log('connect');
  start(true);
}

// Start the WebRTC Connection
// We're either the caller (when we click 'connect' on our page)
// Or the receiver (when the other page clicks 'connect' and we recieve a signalling message through the websocket server)

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;

  // If we're the caller, we create the Data Channel
  // Otherwise, it opens for us and we receive an event as soon as the peerConnection opens
  if (isCaller) {
    call();
    videoHere.play();
    console.log('isCaller', isCaller)
    // dataChannel = peerConnection.createDataChannel("testChannel", dataChannelConfig);
    // dataChannel.onmessage = handleDataChannelReceiveMessage;
    // dataChannel.onopen = handleDataChannelStatusChange;
    // dataChannel.onclose = handleDataChannelStatusChange;
  } else {
    peerConnection.ontrack = gotRemoteStream;
    // peerConnection.onaddstream = gotRemoteStream;
    // peerConnection.addEventListener('track', gotRemoteStream);
    console.log('加入视频轨道！');
    // peerConnection.ondatachannel = handleDataChannelCreated;
  }

  // Kick it off (if we're the caller)
  if (isCaller) {

    peerConnection.createOffer(offerOptions)
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => console.log('set local offer description'))
        .then(() => {
          return serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }))
        })
        .then(() => console.log('sent offer description to remote'))
        .catch(errorHandler);
  }
}

// Handle messages from the Websocket signalling server
var remoteFile = {};

function gotMessageFromServer(message) {
  // If we haven't started WebRTC, now's the time to do it
  // We must be the receiver then (ie not the caller)
  if (!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  if (signal.type === 'fileInfo') {
    remoteFile = signal.data;
  }

  if (signal.type === 'fileRenderEnd') {
    loadFileToLocation();
  }

  // console.log('signal: ' + message.data);

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          return console.log('set remote description', signal)
        })
        .then(function () {
          // Only create answers in response to offers
          if (signal.sdp.type === 'offer') {
            console.log('got offer');

            peerConnection.createAnswer()
                .then(answer => peerConnection.setLocalDescription(answer))
                .then((answer) => console.log('set local answer description', answer))
                .then(() => {
                  return serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }))
                })
                .then(() => console.log('sent answer description to remote'))
                .catch(errorHandler);
          }
        })
        .catch(errorHandler);
  } else if (signal.ice) {
    console.log('received ice candidate from remote');
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice))
        .then(() => console.log('added ice candidate'))
        .catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    console.log('got ice candidate');
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }))
    console.log('sent ice candiate to remote');
  }
}

// Called when we are not the caller (ie we are the receiver)
// and the data channel has been opened
function handleDataChannelCreated(event) {
  console.log('dataChannel opened');

  dataChannel = event.channel;
  dataChannel.onmessage = handleDataChannelReceiveMessage;
  dataChannel.onopen = handleDataChannelStatusChange;
  dataChannel.onclose = handleDataChannelStatusChange;
}

// Handles clicks on the "Send" button by transmitting

// a message to the remote peer.

function sendMessageThroughDataChannel() {
  // var canvasElt = document.createElement('canvas');
  // var stream = canvasElt.captureStream(25);
  // peerConnection.addStream(stream);
  // dataChannel.send(message);
  // console.log(messageInputBox);
  sendData(messageInputBox)
}

function gotRemoteStream(event) {
  const rightVideo = document.querySelector('#rightVideo');
  console.log('gotRemoteStream', event);
  if (Array.isArray(event.streams)) {
    if (rightVideo.srcObject !== event.streams[0]) {
      rightVideo.srcObject = event.streams[0];
      console.log('pc2 received remote stream', event);
    }
  } else {
    if (rightVideo.srcObject !== event.streams) {
      rightVideo.srcObject = event.streams;
      console.log('pc2 received remote stream', event);
    }
  }

  rightVideo.play();
  // rightVideo.load();
  setTimeout(() => {
    rightVideo.muted = false;
    rightVideo.setAttribute('muted', false)
  }, 1000)
}



let stream = null;

function call() {
  stream.getTracks().forEach(track => {
    if (track.kind === 'audio') {
      track.label = "默认 - 麦克风 (Conexant SmartAudio HD)"
    }
    if (track.kind === 'video') {
      track.label = "USB2.0 VGA UVC WebCam (04f2:b52b)"
    }
    console.log('---- call =>', track, stream);
    peerConnection.addTrack(track, stream)
  });
}

function createLeftVideoStream(leftVideo) {
  // console.log(leftVideo);

  leftVideo.load();

  function maybeCreateStream() {
    if (stream) {
      return;
    }
    // console.log(leftVideo.captureStream, leftVideo.mozCaptureStream);
    if (leftVideo.captureStream) {
      stream = leftVideo.captureStream();
      // call();
    } else if (leftVideo.mozCaptureStream) {
      stream = leftVideo.mozCaptureStream();
      // call();
    } else {
      console.log('captureStream() not supported');
    }
  }

// Video tag capture must be set up after video tracks are enumerated.
  leftVideo.oncanplay = maybeCreateStream;
  if (leftVideo.readyState >= 3) { // HAVE_FUTURE_DATA
    // Video is already ready to play, call maybeCreateStream in case oncanplay
    // fired before we registered the event handler.
    maybeCreateStream();
  }
}


function sendData(fileInput) {
  var offset = 0;
  var chunkSize = 16384;
  var file = fileInput.files[0];
  var fileReader = new FileReader();

  videoHere.src = URL.createObjectURL(file);

  createLeftVideoStream(videoHere);

  // videoHere.play();
  // getFileInfo(file);

  /*fileReader.onload = (e) => {
    dataChannel.send(e.target.result);
    offset += e.target.result.byteLength;
    if (offset < file.size) {
      readSlice(offset);
    } else {
      serverConnection.send(JSON.stringify({ type: 'fileRenderEnd' }))
    }
  };

  function readSlice(o) {
    const slice = file.slice(offset, o + chunkSize);

    fileReader.readAsArrayBuffer(slice);
  }*/
  // readSlice(0)
}

function getFileInfo(file) {
  var fileName = file.name;
  var fileSize = file.size;
  var fileType = file.type;
  var lastModifyTime = file.lastModified;
  // console.log('getFileInfo: => ', file);

  serverConnection.send(JSON.stringify({
    type: 'fileInfo',
    data: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }
  }))
}

// Handle status changes on the local end of the data
// channel; this is the end doing the sending of data
// in this example.

function handleDataChannelStatusChange(event) {
  if (dataChannel) {
    console.log("dataChannel status: " + dataChannel.readyState);

    var state = dataChannel.readyState;

    if (state === "open") {
      messageInputBox.disabled = false;
      messageInputBox.focus();
      sendButton.disabled = false;
      disconnectButton.disabled = false;
      connectButton.disabled = true;
    } else {
      messageInputBox.disabled = true;
      sendButton.disabled = true;
      connectButton.disabled = false;
      disconnectButton.disabled = true;
    }
  }
}

// Handle onmessage events for the data channel.
// These are the data messages sent by the remote channel.

function handleDataChannelReceiveMessage(event) {
  console.log("Message: " + event.data, remoteFile);
  onMessage(event)
}

function onMessage(event) {
  var downloadAnchor = document.createElement('a');
  receiveBuffer.push(event.data);
  receiveSize += event.data.byteLength;

  console.log('传输完成！', receiveSize, remoteFile.size);
  if (receiveSize === remoteFile.size) {
    var received = new Blob(receiveBuffer, { type: 'application/octet-stream'});
    receiveBuffer = [];
    receiveSize = 0;

    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = remoteFile.name;
    downloadAnchor.textContent = '点击下载。';

    document.body.appendChild(downloadAnchor)
  }
}
var receiveBuffer = [];
var receiveSize = 0;
function loadFileToLocation() {
  console.log('传输完成！')

}
// Close the connection, including data channels if it's open.
// Also update the UI to reflect the disconnected status.

function disconnectPeers() {

  // Close the RTCDataChannel if it's open.

  dataChannel.close();

  // Close the RTCPeerConnection

  peerConnection.close();

  dataChannel = null;
  peerConnection = null;

  // Update user interface elements

  connectButton.disabled = false;
  disconnectButton.disabled = true;
  sendButton.disabled = true;

  messageInputBox.value = "";
  messageInputBox.disabled = true;
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
