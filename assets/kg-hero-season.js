(function () {
  'use strict';

  function readCarouselOptions(carousel) {
    var interval = parseInt(carousel.getAttribute('data-bs-interval'), 10);
    var autoplay = carousel.getAttribute('data-bs-ride') === 'carousel' && interval > 0;
    return {
      interval: autoplay ? interval : false,
      pause: carousel.getAttribute('data-bs-pause') === 'true',
      wrap: true,
      touch: true,
      ride: autoplay ? 'carousel' : false,
    };
  }

  function rebuildIndicators(carousel, visibleSlides) {
    var indicators = carousel.querySelector('.carousel-indicators');
    if (!indicators || visibleSlides.length < 2) return;

    indicators.innerHTML = '';
    visibleSlides.forEach(function (_slide, index) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-bs-target', '#' + carousel.id);
      btn.setAttribute('data-bs-slide-to', String(index));
      btn.setAttribute('aria-label', 'Slide ' + (index + 1));
      if (index === 0) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'true');
      }
      var span = document.createElement('span');
      btn.appendChild(span);
      indicators.appendChild(btn);
    });
  }

  function restartCarousel(carousel, visibleSlides) {
    if (typeof bootstrap === 'undefined' || !bootstrap.Carousel) return;

    var existing = bootstrap.Carousel.getInstance(carousel);
    if (existing) existing.dispose();

    rebuildIndicators(carousel, visibleSlides);

    var options = readCarouselOptions(carousel);
    new bootstrap.Carousel(carousel, options);
  }

  function reorderHeroCarousel(hero) {
    var carousel = hero.querySelector('.carousel');
    var inner = carousel && carousel.querySelector('.carousel-inner');
    if (!inner) return;

    var season = document.documentElement.getAttribute('data-season') || '';
    var stash = hero.querySelector('.kg-hero-carousel__stash');
    if (!stash) {
      stash = document.createElement('div');
      stash.className = 'kg-hero-carousel__stash d-none';
      stash.setAttribute('aria-hidden', 'true');
      hero.appendChild(stash);
    }

    var items = Array.from(inner.querySelectorAll('.carousel-item'));
    var pinFirst = null;
    var pinSecond = null;
    var evergreen = [];

    items.forEach(function (item) {
      var tag = item.getAttribute('data-season-tag') || '';
      item.classList.remove('d-none');

      if (tag) {
        if (tag !== season) {
          stash.appendChild(item);
          return;
        }
        var priority = item.getAttribute('data-season-priority') || 'first';
        if (priority === 'second') pinSecond = item;
        else pinFirst = item;
        return;
      }

      evergreen.push(item);
    });

    Array.from(stash.querySelectorAll('.carousel-item')).forEach(function (item) {
      var tag = item.getAttribute('data-season-tag') || '';
      if (tag && tag === season) {
        inner.appendChild(item);
        items.push(item);
        var priority = item.getAttribute('data-season-priority') || 'first';
        if (priority === 'second') pinSecond = item;
        else pinFirst = item;
      }
    });

    items = Array.from(inner.querySelectorAll('.carousel-item'));
    evergreen = items.filter(function (item) {
      return !(item.getAttribute('data-season-tag') || '');
    });

    var ordered = [];

    if (pinFirst && pinSecond) {
      ordered.push(pinFirst, pinSecond);
      evergreen.forEach(function (item) {
        if (item !== pinFirst && item !== pinSecond) ordered.push(item);
      });
    } else if (pinFirst) {
      ordered.push(pinFirst);
      evergreen.forEach(function (item) {
        if (item !== pinFirst) ordered.push(item);
      });
    } else if (pinSecond) {
      if (evergreen.length) ordered.push(evergreen[0]);
      ordered.push(pinSecond);
      evergreen.slice(1).forEach(function (item) {
        if (item !== pinSecond) ordered.push(item);
      });
    } else {
      ordered = evergreen.length ? evergreen.slice() : items.slice();
    }

    if (ordered.length < 2) return;

    ordered.forEach(function (item, index) {
      item.classList.toggle('active', index === 0);
      item.setAttribute('data-index', String(index));
      inner.appendChild(item);
    });

    restartCarousel(carousel, ordered);
  }

  function initHeroSeason() {
    if (!document.documentElement.classList.contains('season-preview')) return;
    document.querySelectorAll('.hero-carousel').forEach(reorderHeroCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroSeason);
  } else {
    initHeroSeason();
  }

  document.addEventListener('shopify:section:load', function (event) {
    if (!document.documentElement.classList.contains('season-preview')) return;
    var hero = event.target && event.target.querySelector('.hero-carousel');
    if (hero) reorderHeroCarousel(hero);
  });
})();
