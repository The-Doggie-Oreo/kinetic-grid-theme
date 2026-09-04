(function () {
  'use strict';

  var STORAGE_KEY = 'kg-season-preview';

  function syncActiveButton() {
    var current = document.documentElement.getAttribute('data-season');
    var preview = localStorage.getItem(STORAGE_KEY);
    var buttons = document.querySelectorAll('[data-kg-season]');

    buttons.forEach(function (btn) {
      var choice = btn.getAttribute('data-kg-season');
      var active = preview
        ? choice === current
        : choice === 'auto';
      btn.classList.toggle('is-active', active);
    });
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-kg-season]');
    if (!btn) return;

    var choice = btn.getAttribute('data-kg-season');
    if (choice === 'auto') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, choice);
    }

    window.location.reload();
  });

  function decodeEntities(str) {
    if (!str || str.indexOf('&') === -1) return str;
    var el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value;
  }

  function syncPromoBar() {
    var promoRoot = document.querySelector('.kg-season-promo');
    var promoData = document.getElementById('kg-season-promos');
    if (!promoRoot || !promoData) return;

    try {
      var promos = JSON.parse(promoData.textContent);
      var season = document.documentElement.getAttribute('data-season');
      var textEl = promoRoot.querySelector('.kg-season-promo__text');
      if (textEl && promos[season]) {
        textEl.textContent = decodeEntities(promos[season]);
        promoRoot.setAttribute('data-season-promo', season);
      }
    } catch (e) {}
  }

  function initSwitcher() {
    syncActiveButton();
    syncPromoBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSwitcher);
  } else {
    initSwitcher();
  }
})();
