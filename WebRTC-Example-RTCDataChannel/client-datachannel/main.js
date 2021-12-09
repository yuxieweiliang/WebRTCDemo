
// Define "global" variables

// UI variables
var connectButton = null;
var disconnectButton = null;
var sendButton = null;
var messageInputBox = null;
var receiveBox = null;

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
    dataChannel = peerConnection.createDataChannel("testChannel");
    dataChannel.onmessage = handleDataChannelReceiveMessage;
    dataChannel.onopen = handleDataChannelStatusChange;
    dataChannel.onclose = handleDataChannelStatusChange;
  } else {
    peerConnection.ondatachannel = handleDataChannelCreated;
  }

  // Kick it off (if we're the caller)
  if (isCaller) {
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => console.log('set local offer description'))
        .then(() => serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid })))
        .then(() => console.log('sent offer description to remote'))
        .catch(errorHandler);
  }
}

// Handle messages from the Websocket signalling server

function gotMessageFromServer(message) {
  // If we haven't started WebRTC, now's the time to do it
  // We must be the receiver then (ie not the caller)
  if (!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  console.log('signal: ' + message.data);

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      .then(() => console.log('set remote description'))
      .then(function () {
        // Only create answers in response to offers
        if (signal.sdp.type == 'offer') {
          console.log('got offer');

          peerConnection.createAnswer()
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => console.log('set local answer description'))
            .then(() => serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid })))
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
  var message = messageInputBox.value;
  console.log("sending: " + message);
  dataChannel.send(message);

  // Clear the input box and re-focus it, so that we're
  // ready for the next message.

  messageInputBox.value = "";
  messageInputBox.focus();
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
  console.log("Message: " + event.data);
  var el = document.createElement("p");
  var txtNode = document.createTextNode(event.data);

  el.appendChild(txtNode);
  receiveBox.appendChild(el);
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