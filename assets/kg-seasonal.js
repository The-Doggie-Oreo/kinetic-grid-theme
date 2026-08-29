(function () {
  'use strict';

  var root = document.documentElement;
  var season = root.getAttribute('data-season');
  var fxEnabled = root.getAttribute('data-season-fx') === 'true';

  if (!season || !fxEnabled) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var FX = {
    fall: { type: 'leaf', count: 14, colors: ['#c2703e', '#a34b2b', '#d4a056', '#8b5a2b', '#b45309'] },
    holiday: { type: 'flake', count: 18, colors: ['#ffffff'] },
    winter: { type: 'flake', count: 12, colors: ['#e0f2fe', '#ffffff'] },
    spring: { type: 'petal', count: 10, colors: ['#fda4af', '#fbcfe8', '#bbf7d0', '#fde68a'] },
    summer: { type: 'speck', count: 8, colors: ['#fbbf24', '#fde68a'] },
  };

  var config = FX[season];
  if (!config) return;

  function mountFx() {
    var footer = document.querySelector('.kg-footer');
    if (!footer || footer.querySelector('.kg-season-fx')) return;

    var layer = document.createElement('div');
    layer.className = 'kg-season-fx';
    layer.setAttribute('aria-hidden', 'true');
    footer.insertBefore(layer, footer.firstChild);

    for (var i = 0; i < config.count; i++) {
      var particle = document.createElement('span');
      particle.className = 'kg-season-fx__' + config.type;
      particle.style.setProperty('--kg-fx-delay', (Math.random() * 14).toFixed(2) + 's');
      particle.style.setProperty('--kg-fx-duration', (14 + Math.random() * 12).toFixed(2) + 's');
      particle.style.setProperty('--kg-fx-left', (Math.random() * 100).toFixed(1) + '%');
      particle.style.setProperty('--kg-fx-drift', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
      particle.style.setProperty('--kg-fx-size', (8 + Math.random() * 12).toFixed(1) + 'px');
      particle.style.setProperty('--kg-fx-opacity', (0.25 + Math.random() * 0.35).toFixed(2));
      particle.style.setProperty(
        '--kg-fx-color',
        config.colors[Math.floor(Math.random() * config.colors.length)]
      );
      layer.appendChild(particle);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFx);
  } else {
    mountFx();
  }

  document.addEventListener('shopify:section:load', function (event) {
    if (event.target && event.target.querySelector && event.target.querySelector('.kg-footer')) {
      mountFx();
    }
  });
})();
