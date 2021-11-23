function createSocket(host, port, protocols = "json") {
  const { hostname, protocol } = window.location;
  const server = `${ protocol === "https:" ? "wss" : "ws" }://${ host || hostname }:${ port }`;
  const socket = new WebSocket(server, protocols);

  /**
   * 错误直接打印
   */
  socket.onerror = function(evt) {
    console.error(evt)
  };

  /**
   * 关闭方法
   */
  socket.onclose = function() {

  };

  /**
   * 打开方法
   */
  socket.onopen = function(evt) {
    console.log('open', evt)
  };

  socket.onmessage = function(evt) {
    try {
      const { type, ...opts } = JSON.parse(evt.data);
      const incident = socketIncident(),
        func = incident[type];

      if(typeof func !== 'function') {
        log_error(`incident[${type}] is not defined`);
        log_error({ type, ...opts });
        return;
      }

      func(opts);
    } catch (e) {
      console.error(e);
    }
  };

  function log_error(text) {
    const time = new Date();

    console.error("[" + time.toLocaleTimeString() + "] " + text);
  }
  return socket;
}



/*
function connect() {
  var serverUrl;
  var scheme = "ws";

  // If this is an HTTPS connection, we have to use a secure WebSocket
  // connection too, so add another "s" to the scheme.

  /!*if (document.location.protocol === "http:") {
    scheme += "s";
  }*!/
  serverUrl = scheme + "://" + myHostname + ":6502";

  console.log(serverUrl);
  connection = new WebSocket(serverUrl, "json");

  connection.onopen = function(evt) {
    document.getElementById("text").disabled = false;
    document.getElementById("send").disabled = false;
  };

  connection.onerror = function(evt) {
    console.dir(evt);
  };

  connection.onmessage = function(evt) {
    var chatFrameDocument = document.getElementById("chatbox").contentDocument;
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

      case "userlist":      // Received an updated user list
        handleUserlistMsg(msg);
        break;

      // Signaling messages: these messages are used to trade WebRTC
      // signaling information during negotiations leading up to a video
      // call.

      case "video-offer":  // Invitation and offer to chat
        handleVideoOfferMsg(msg);
        break;

      case "video-answer":  // Callee has answered our offer
        handleVideoAnswerMsg(msg);
        break;

      case "new-ice-candidate": // A new ICE candidate has been received
        handleNewICECandidateMsg(msg);
        break;

      case "hang-up": // The other peer has hung up the call
        handleHangUpMsg(msg);
        break;

      // Unknown message; output to console for debugging.

      default:
        log_error("Unknown message received:");
        log_error(msg);
    }

    // If there's text to insert into the chat buffer, do so now, then
    // scroll the chat panel so that the new text is visible.

    if (text.length) {
      chatFrameDocument.write(text);
      // document.getElementById("chatbox").contentWindow.scrollByPages(1);
    }
  };
}*/
