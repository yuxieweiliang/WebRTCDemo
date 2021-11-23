var width = 320;
var height = 0;
var streaming = false;
var video = null;

function startup(stream) {
  video = document.getElementById('video');
  video.srcObject = stream;
  video.play();
  console.log(stream);
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



