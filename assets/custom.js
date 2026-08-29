/*
  Product card hover media: play muted video on hover, pause on leave.
  Uses bubbling pointer events so Swiper/AJAX-loaded cards work without rebinding.
*/
(function () {
  function getHoverHost(node) {
    if (!(node instanceof Element)) return null;
    return node.closest('[data-product-card-hover]');
  }

  function getHoverVideo(host) {
    if (!host) return null;
    return host.querySelector('video.product-card-hover-video, [data-product-card-hover-video] video, video');
  }

  function playHoverVideo(video) {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {});
    }
  }

  function pauseHoverVideo(video) {
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch (e) {}
  }

  document.addEventListener(
    'pointerover',
    function (event) {
      var host = getHoverHost(event.target);
      if (!host) return;
      if (event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return;
      playHoverVideo(getHoverVideo(host));
    },
    true
  );

  document.addEventListener(
    'pointerout',
    function (event) {
      var host = getHoverHost(event.target);
      if (!host) return;
      if (event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return;
      pauseHoverVideo(getHoverVideo(host));
    },
    true
  );

  document.addEventListener(
    'focusin',
    function (event) {
      var host = getHoverHost(event.target);
      if (!host) return;
      playHoverVideo(getHoverVideo(host));
    },
    true
  );

  document.addEventListener(
    'focusout',
    function (event) {
      var host = getHoverHost(event.target);
      if (!host) return;
      if (event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return;
      pauseHoverVideo(getHoverVideo(host));
    },
    true
  );
})();
