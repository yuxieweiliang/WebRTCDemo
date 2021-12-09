var MediaStream = window.webkitMediaStream || window.MediaStream;

firstPeer.onaddstream = function(remoteSteam) {
      remoteStream = new MediaStream(remoteSteam.audioTracks, remoteSteam.videoTracks);
      otherPeer.addStream(remoteStream);  /* attaching remote stream */
};
