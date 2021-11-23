;(function() {
  var width = 320;
  var height = 0;
  var streaming = false;
  var video = null;
  var username = 'student';

  var mediaConstraints = {
    audio: false,            // We want an audio track
    video: true             // ...and we want a video track
  };

  function startup() {
    video = document.getElementById('video');

    navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream) {
      video.srcObject = stream;
      video.play();
      // console.log(stream);
      connect(() => invite(stream, username));
      // send(stream);
    })
    .catch(function(err) {
      log_error("An error occurred: " + err);
    });

    video.addEventListener('canplay', function(ev){
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth/width);

        console.log(streaming);
        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(height)) {
          height = width / (4/3);
        }

        video.setAttribute('width', width);
        video.setAttribute('height', height);
        streaming = true;
      }
    }, false);
  }
  window.addEventListener('load', startup, false);







})();



