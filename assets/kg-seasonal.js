(function () {
  'use strict';

  var root = document.documentElement;
  var season = root.getAttribute('data-season');
  var fxEnabled = root.getAttribute('data-season-fx') === 'true';

  if (!season || !fxEnabled) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function leafSources() {
    var gold = root.getAttribute('data-leaf-gold');
    var orange = root.getAttribute('data-leaf-orange');
    var sources = [];
    if (gold) sources.push(gold);
    if (orange) sources.push(orange);
    return sources;
  }

  function trimImage(source) {
    var w = source.naturalWidth || source.width;
    var h = source.naturalHeight || source.height;
    var off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    var ctx = off.getContext('2d');
    ctx.drawImage(source, 0, 0);
    var data = ctx.getImageData(0, 0, w, h).data;
    var minX = w;
    var minY = h;
    var maxX = 0;
    var maxY = 0;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var a = data[i + 3];
        var rgb = data[i] + data[i + 1] + data[i + 2];
        if (a > 20 && rgb > 70) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX) return Promise.resolve(source);

    var cw = maxX - minX + 1;
    var ch = maxY - minY + 1;
    var trimmed = document.createElement('canvas');
    trimmed.width = cw;
    trimmed.height = ch;
    trimmed.getContext('2d').drawImage(off, minX, minY, cw, ch, 0, 0, cw, ch);

    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        resolve(source);
      };
      img.src = trimmed.toDataURL('image/png');
    });
  }

  function loadImages(urls) {
    return Promise.all(
      urls.map(function (url) {
        return new Promise(function (resolve) {
          var img = new Image();
          img.decoding = 'async';
          img.onload = function () {
            trimImage(img).then(resolve);
          };
          img.onerror = function () {
            resolve(null);
          };
          img.src = url;
        });
      })
    ).then(function (imgs) {
      return imgs.filter(Boolean);
    });
  }

  function leafDrawHeight(leaf) {
    return (leaf.img.height / leaf.img.width) * leaf.size;
  }

  function leafDrawWidth(leaf) {
    return leaf.size;
  }


  /* ── Fall: back-layer fall + footer-front pile ─────────────────────── */
  function initFallLeaves() {
    if (document.querySelector('.kg-leaf-fall')) return;

    var urls = leafSources();
    if (!urls.length) return;

    loadImages(urls).then(function (images) {
      if (!images.length) return;

      var footerEl = document.querySelector('.kg-footer');
      var footerLayer = document.querySelector('[data-leaf-footer]');
      if (!footerEl || !footerLayer) return;

      var fallWrap = document.createElement('div');
      fallWrap.className = 'kg-leaf-fall';
      fallWrap.setAttribute('aria-hidden', 'true');
      var fallCanvas = document.createElement('canvas');
      fallWrap.appendChild(fallCanvas);
      document.body.appendChild(fallWrap);

      var fallCtx = fallCanvas.getContext('2d');
      var fallingBack = [];
      var fallingFront = [];
      var piled = [];
      var mouse = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, active: false };
      var spawnTimer = 0;
      var maxAirborneBack = reducedMotion ? 5 : 8;
      var targetAirborne = reducedMotion ? 3 : 5;
      var maxPiled = 24;
      var pileBand = 96;
      var footerW = 0;
      var footerH = 0;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var usedSizes = new Set();

      function uniqueSize(base) {
        var size;
        var attempts = 0;

        do {
          if (typeof base === 'number') {
            size = base + (Math.random() - 0.5) * 3.5 + Math.random() * 0.999;
          } else {
            size = 24 + Math.random() * 24 + Math.random() * 0.999;
          }
          size = Math.round(Math.max(22, Math.min(54, size)) * 1000) / 1000;
          attempts++;
        } while (usedSizes.has(size) && attempts < 80);

        if (usedSizes.has(size)) {
          size = Math.round((size + usedSizes.size * 0.001 + 0.001) * 1000) / 1000;
        }

        usedSizes.add(size);
        return size;
      }

      function releaseSize(size) {
        usedSizes.delete(size);
      }

      function airOpacity() {
        return 0.62 + Math.random() * 0.18;
      }

      function footerOpacity() {
        return 0.72 + Math.random() * 0.16;
      }

      function footerRect() {
        return footerEl.getBoundingClientRect();
      }

      function groundY(x) {
        var center = footerW * 0.5;
        var norm = Math.min(1, Math.abs(x - center) / Math.max(center, 1));
        var mound = pileBand * 0.48 * (1 - norm * norm);
        return footerH - 4 - mound;
      }

      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        fallCanvas.width = Math.floor(window.innerWidth * dpr);
        fallCanvas.height = Math.floor(window.innerHeight * dpr);
        fallCanvas.style.width = window.innerWidth + 'px';
        fallCanvas.style.height = window.innerHeight + 'px';
        fallCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var fr = footerRect();
        footerW = fr.width || window.innerWidth;
        footerH = fr.height || pileBand + 200;
      }

      function leafToScreen(leaf) {
        var fr = footerRect();
        return {
          x: leaf.x + fr.left,
          y: leaf.y + fr.top,
          rot: leaf.rot,
          size: leaf.size,
          img: leaf.img,
          opacity: leaf.opacity,
        };
      }

      function spawnFall(count) {
        count = count || 1;
        var w = window.innerWidth;

        for (var n = 0; n < count; n++) {
          if (fallingBack.length >= maxAirborneBack) return;

          var size = uniqueSize();
          var h = leafDrawHeight({ img: images[0], size: size });
          var startY = -(h + Math.random() * window.innerHeight * 0.4);

          fallingBack.push({
            x: (Math.random() * 1.12 - 0.06) * w,
            y: startY,
            vx: (Math.random() - 0.5) * 0.65,
            vy: 0.3 + Math.random() * 0.38,
            rot: Math.random() * Math.PI * 2,
            rotV: (Math.random() - 0.5) * 0.02,
            size: size,
            img: images[Math.floor(Math.random() * images.length)],
            opacity: airOpacity(),
            settled: 0,
          });
        }
      }

      function seedAirborne() {
        var fr = footerRect();
        var ceiling = Math.max(240, fr.top * 0.92);
        var count = reducedMotion ? 2 : 3;

        for (var i = 0; i < count; i++) {
          if (fallingBack.length >= maxAirborneBack) return;

          var size = uniqueSize();
          fallingBack.push({
            x: (Math.random() * 1.1 - 0.05) * window.innerWidth,
            y: Math.random() * ceiling,
            vx: (Math.random() - 0.5) * 0.55,
            vy: 0.28 + Math.random() * 0.34,
            rot: Math.random() * Math.PI * 2,
            rotV: (Math.random() - 0.5) * 0.018,
            size: size,
            img: images[Math.floor(Math.random() * images.length)],
            opacity: airOpacity(),
            settled: 0,
          });
        }
      }

      function replenishAirborne() {
        var deficit = targetAirborne - fallingBack.length;
        if (deficit <= 0) return;
        spawnFall(1);
      }

      function findStackY(x, size, img, ignore) {
        var h = (img.height / img.width) * size;
        var y = groundY(x) - h / 2;
        var pad = size * 0.36;
        var maxRise = pileBand * 0.78;

        piled.forEach(function (other) {
          if (other === ignore) return;
          if (Math.abs(other.x - x) > pad) return;
          var oh = leafDrawHeight(other);
          var otherTop = other.y - oh / 2;
          var stackY = otherTop - h / 2 - 1;
          if (stackY < y) y = stackY;
        });

        var floor = groundY(x) - h / 2;
        return Math.max(floor - maxRise + h / 2, y);
      }

      function sleepLeaf(leaf) {
        leaf.vy = 0;
        leaf.vx *= 0.35;
        leaf.rotV = 0;
        leaf.settled = 40;
      }

      function transferToFooter(leaf) {
        var fr = footerRect();
        fallingFront.push({
          x: leaf.x - fr.left,
          y: leaf.y - fr.top,
          vx: leaf.vx * 0.85,
          vy: leaf.vy * 0.9,
          rot: leaf.rot,
          rotV: leaf.rotV * 0.35,
          size: leaf.size,
          img: leaf.img,
          opacity: footerOpacity(),
          settled: 0,
        });
      }

      function settleIntoPile(leaf) {
        var size = uniqueSize(leaf.size);
        var halfW = size * 0.5;
        var x = Math.max(halfW, Math.min(footerW - halfW, leaf.x));
        var y = findStackY(x, size, leaf.img);
        piled.push({
          x: x,
          y: y,
          vx: leaf.vx * 0.12 + (Math.random() - 0.5) * 0.08,
          vy: 0,
          rot: leaf.rot,
          rotV: 0,
          size: size,
          img: leaf.img,
          opacity: leaf.opacity,
          settled: 0,
        });
        if (piled.length > maxPiled) releaseSize(piled.shift().size);
      }

      function drawLeaf(ctx, leaf, softShadow) {
        var w = leafDrawWidth(leaf);
        var h = leafDrawHeight(leaf);
        ctx.save();
        ctx.globalAlpha = leaf.opacity;
        if (softShadow) {
          ctx.shadowColor = 'rgba(40, 32, 24, 0.18)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetY = 1;
        }
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rot);
        ctx.drawImage(leaf.img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      function applyMouseForces(leaf, dt) {
        if (!mouse.active) return;

        var dx = leaf.x - mouse.x;
        var dy = leaf.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 105 || dist < 2) return;

        var t = (105 - dist) / 105;
        t = t * t;
        var nx = dx / dist;
        var ny = dy / dist;
        var px = -ny;
        var py = nx;
        var swirl = t * 0.75;
        var push = t * 0.85;
        var lift = t * 0.45;

        leaf.vx += (nx * push + px * swirl + mouse.vx * 0.02) * dt * 60;
        leaf.vy += (ny * push * 0.15 + py * swirl * 0.2 - lift * 0.35) * dt * 60;
        leaf.rotV += px * swirl * 0.003 * dt * 60;
        leaf.settled = 0;
      }

      function updateLeafPhysics(leaf, dt, width, inPile) {
        if (leaf.settled >= 12) {
          applyMouseForces(leaf, dt);
          if (!mouse.active) {
            leaf.vx *= 0.86;
            leaf.vy *= 0.9;
            if (Math.abs(leaf.vx) < 0.04) leaf.vx = 0;
            if (Math.abs(leaf.vy) < 0.04) leaf.vy = 0;
            leaf.rotV = 0;
            leaf.y = findStackY(leaf.x, leaf.size, leaf.img, leaf);
            return;
          }
          leaf.vy -= 0.04 * dt * 60;
        }

        var halfW = leafDrawWidth(leaf) / 2;
        var halfH = leafDrawHeight(leaf) / 2;

        applyMouseForces(leaf, dt);

        if (leaf.settled < 12) {
          leaf.vy += 0.16 * dt * 60;
          leaf.x += leaf.vx * dt * 60;
          leaf.y += leaf.vy * dt * 60;
          leaf.rot += leaf.rotV * dt * 60;
          leaf.vx += Math.sin(leaf.y * 0.018) * 0.004 * dt * 60;
        } else {
          leaf.x += leaf.vx * dt * 60;
          leaf.y += leaf.vy * dt * 60;
          leaf.rot += leaf.rotV * dt * 60;
        }

        if (leaf.x < halfW) {
          leaf.x = halfW;
          leaf.vx = Math.abs(leaf.vx) * 0.35;
          if (leaf.settled < 8) leaf.rotV *= 0.4;
        }
        if (leaf.x > width - halfW) {
          leaf.x = width - halfW;
          leaf.vx = -Math.abs(leaf.vx) * 0.35;
          if (leaf.settled < 8) leaf.rotV *= 0.4;
        }

        if (inPile) {
          var inAccumZone = leaf.y + halfH >= footerH - pileBand;

          if (inAccumZone) {
            var targetY = findStackY(leaf.x, leaf.size, leaf.img, leaf);
            var bottom = leaf.y + halfH;
            var surface = groundY(leaf.x);
            var speed = Math.sqrt(leaf.vx * leaf.vx + leaf.vy * leaf.vy);

            if (bottom >= surface && speed > 0.35) {
              leaf.y = targetY;
              leaf.vy *= -0.12;
              leaf.vx *= 0.72;
              leaf.rotV *= 0.25;
            } else if (bottom >= surface - 2 || speed < 0.18) {
              if (Math.abs(leaf.y - targetY) < 4 || speed < 0.14) {
                leaf.y = targetY;
                if (speed < 0.22) sleepLeaf(leaf);
                else {
                  leaf.vy = 0;
                  leaf.vx *= 0.68;
                  leaf.rotV *= 0.2;
                  leaf.settled = Math.min(20, (leaf.settled || 0) + 1);
                }
              }
            }

            if (Math.abs(leaf.rotV) > 0.001 && leaf.settled >= 8) {
              leaf.rotV = 0;
            }
          }
        }

        leaf.vx *= 0.978;
        leaf.vy *= 0.972;
        if (leaf.settled >= 8) leaf.rotV *= 0.85;
        else leaf.rotV *= 0.94;
      }

      function updateFallingBack(dt) {
        var fr = footerRect();
        var footerTop = fr.top;

        for (var i = fallingBack.length - 1; i >= 0; i--) {
          var leaf = fallingBack[i];
          var halfH = leafDrawHeight(leaf) / 2;
          var halfW = leafDrawWidth(leaf) / 2;

          leaf.x += leaf.vx * dt * 60;
          leaf.y += leaf.vy * dt * 60;
          leaf.rot += leaf.rotV * dt * 60;
          leaf.vx += Math.sin(leaf.y * 0.014 + leaf.x * 0.008) * 0.006 * dt * 60;
          leaf.vy += 0.012 * dt * 60;
          leaf.vx *= 0.998;
          leaf.rotV *= 0.995;

          if (leaf.x < -halfW - 40 || leaf.x > window.innerWidth + halfW + 40) {
            fallingBack.splice(i, 1);
            spawnFall(1);
            continue;
          }

          if (leaf.y - halfH > window.innerHeight + 24 && footerTop > window.innerHeight) {
            fallingBack.splice(i, 1);
            spawnFall(1);
            continue;
          }

          if (footerTop <= window.innerHeight + 40 && leaf.y + halfH >= footerTop) {
            transferToFooter(leaf);
            fallingBack.splice(i, 1);
            spawnFall(1);
          }
        }
      }

      function updateFallingFront(dt) {
        for (var i = fallingFront.length - 1; i >= 0; i--) {
          var leaf = fallingFront[i];
          updateLeafPhysics(leaf, dt, footerW, true);

          var halfH = leafDrawHeight(leaf) / 2;
          var inAccumZone = leaf.y + halfH >= footerH - pileBand;
          if (
            inAccumZone &&
            leaf.y + halfH >= groundY(leaf.x) - 1 &&
            Math.abs(leaf.vy) < 0.9
          ) {
            settleIntoPile(leaf);
            fallingFront.splice(i, 1);
          } else if (leaf.y - halfH > footerH + 20) {
            settleIntoPile(leaf);
            fallingFront.splice(i, 1);
          }
        }
      }

      function updatePiled(dt) {
        piled.forEach(function (leaf) {
          updateLeafPhysics(leaf, dt, footerW, true);
          if (leaf.settled >= 12 && !mouse.active) {
            leaf.y = findStackY(leaf.x, leaf.size, leaf.img, leaf);
          }
        });
      }

      function render() {
        fallCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        fallingBack.forEach(function (leaf) {
          drawLeaf(fallCtx, leaf, false);
        });

        piled
          .slice()
          .sort(function (a, b) {
            return a.y - b.y;
          })
          .forEach(function (leaf) {
            drawLeaf(fallCtx, leafToScreen(leaf), true);
          });

        fallingFront.forEach(function (leaf) {
          drawLeaf(fallCtx, leafToScreen(leaf), true);
        });
      }

      var last = performance.now();
      function tick(now) {
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        spawnTimer += dt;
        var spawnEvery = reducedMotion ? 2.8 : 2.3;
        while (spawnTimer >= spawnEvery) {
          spawnTimer -= spawnEvery;
          if (Math.random() < 0.62) {
            spawnFall(1);
          }
        }
        replenishAirborne();

        updateFallingBack(dt);
        updateFallingFront(dt);
        updatePiled(dt);
        render();
        requestAnimationFrame(tick);
      }

      function trackPointer(clientX, clientY) {
        var fr = footerRect();
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        mouse.x = clientX - fr.left;
        mouse.y = clientY - fr.top;
        mouse.vx = (mouse.x - mouse.px) * 0.45;
        mouse.vy = (mouse.y - mouse.py) * 0.45;
        mouse.active = mouse.y >= footerH - pileBand && mouse.y <= footerH + 8;
      }

      footerEl.addEventListener('mousemove', function (event) {
        trackPointer(event.clientX, event.clientY);
      });

      footerEl.addEventListener('mouseleave', function () {
        mouse.active = false;
      });

      footerEl.addEventListener(
        'touchmove',
        function (event) {
          if (!event.touches.length) return;
          trackPointer(event.touches[0].clientX, event.touches[0].clientY);
        },
        { passive: true }
      );

      footerEl.addEventListener('touchend', function () {
        mouse.active = false;
      });

      window.addEventListener('resize', resize);
      window.addEventListener('scroll', resize, { passive: true });
      resize();
      seedAirborne();
      replenishAirborne();
      for (var p = 0; p < 8; p++) {
        var seedSize = uniqueSize();
        var seedImg = images[Math.floor(Math.random() * images.length)];
        var seedX = footerW * (0.15 + Math.random() * 0.7);
        piled.push({
          x: seedX,
          y: findStackY(seedX, seedSize, seedImg),
          vx: 0,
          vy: 0,
          rot: Math.random() * Math.PI * 2,
          rotV: 0,
          size: seedSize,
          img: seedImg,
          opacity: footerOpacity(),
          settled: 40,
        });
      }

      requestAnimationFrame(tick);
    });
  }

  /* ── Other seasons: simple CSS particles in footer ─────────────────── */
  var FX = {
    holiday: { type: 'flake', count: 22, colors: ['#dc2626', '#16a34a', '#ffffff', '#fbbf24'] },
    halloween: { type: 'bat', count: 16, colors: ['#fb923c', '#a855f7', '#fbbf24'] },
    winter: { type: 'flake', count: 16, colors: ['#38bdf8', '#0ea5e9', '#7dd3fc'] },
    easter: { type: 'egg', count: 12, colors: ['#d4c4e8', '#e8d4dc', '#c8ddd0', '#e8dfc8'] },
    spring: { type: 'petal', count: 14, colors: ['#c9a8b8', '#a3c4b3', '#b8c9d4', '#d4c4a8'] },
  };

  function createParticle(cfg, colors) {
    var particle = document.createElement('span');
    particle.className = 'kg-season-fx__' + cfg.type;
    particle.style.setProperty('--kg-fx-delay', (Math.random() * 6).toFixed(2) + 's');
    particle.style.setProperty('--kg-fx-duration', (12 + Math.random() * 10).toFixed(2) + 's');
    particle.style.setProperty('--kg-fx-left', (Math.random() * 100).toFixed(1) + '%');
    particle.style.setProperty('--kg-fx-drift', ((Math.random() - 0.5) * 100).toFixed(0) + 'px');
    particle.style.setProperty('--kg-fx-opacity', (0.65 + Math.random() * 0.3).toFixed(2));
    particle.style.setProperty('--kg-fx-rotate', (Math.random() * 360).toFixed(0) + 'deg');
    particle.style.setProperty('--kg-fx-start', (Math.random() * 90).toFixed(0) + 'vh');
    particle.style.setProperty('--kg-fx-size', (8 + Math.random() * 12).toFixed(1) + 'px');
    particle.style.setProperty('--kg-fx-color', colors[Math.floor(Math.random() * colors.length)]);
    return particle;
  }

  function mountFooterFx() {
    var cfg = FX[season];
    if (!cfg) return;

    var footer = document.querySelector('.kg-footer');
    if (!footer || footer.querySelector('.kg-season-fx')) return;

    var layer = document.createElement('div');
    layer.className = 'kg-season-fx';
    layer.setAttribute('aria-hidden', 'true');

    var count = reducedMotion ? Math.max(6, Math.round(cfg.count * 0.5)) : cfg.count;
    for (var i = 0; i < count; i++) {
      layer.appendChild(createParticle(cfg, cfg.colors));
    }
    footer.insertBefore(layer, footer.firstChild);
  }

  function initSummerBeach() {
    var footer = document.querySelector('.kg-footer');
    if (!footer || footer.querySelector('.kg-summer-beach')) return;

    var beach = document.createElement('div');
    beach.className = 'kg-summer-beach';
    beach.setAttribute('aria-hidden', 'true');

    var sky = document.createElement('div');
    sky.className = 'kg-summer-beach__sky';

    var sand = document.createElement('div');
    sand.className = 'kg-summer-beach__sand';

    var setup = document.createElement('div');
    setup.className = 'kg-summer-beach__setup';
    setup.innerHTML =
      '<div class="kg-summer-beach__umbrella" aria-hidden="true"></div>' +
      '<div class="kg-summer-beach__chair" aria-hidden="true"></div>';

    var ball = document.createElement('button');
    ball.type = 'button';
    ball.className = 'kg-summer-beach__ball';
    ball.setAttribute('aria-label', 'Grab and throw the beach ball');

    beach.appendChild(sky);
    beach.appendChild(sand);
    beach.appendChild(setup);
    beach.appendChild(ball);
    footer.insertBefore(beach, footer.firstChild);

    if (reducedMotion) {
      ball.style.left = '35%';
      ball.style.top = '72%';
      return;
    }

    var BALL_R = 22;
    var state = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      rotV: 0,
      dragging: false,
      pointerId: null,
      dragOffX: 0,
      dragOffY: 0,
      lastPx: 0,
      lastPy: 0,
      lastPt: 0,
      flying: false,
    };

    function beachRect() {
      return beach.getBoundingClientRect();
    }

    function sandTop() {
      var r = beachRect();
      return r.height * 0.42;
    }

    function placeBall(x, y) {
      var r = beachRect();
      var sandY = sandTop();
      var minX = BALL_R + 8;
      var maxX = r.width - BALL_R - 8;
      var minY = sandY + BALL_R;
      var maxY = r.height - BALL_R - 6;
      state.x = Math.max(minX, Math.min(maxX, x));
      state.y = Math.max(minY, Math.min(maxY, y));
    }

    function resetBall() {
      var r = beachRect();
      state.vx = 0;
      state.vy = 0;
      state.rotV = 0;
      state.flying = false;
      ball.classList.remove('is-flying');
      ball.style.opacity = '1';
      placeBall(r.width * (0.18 + Math.random() * 0.35), r.height * 0.78);
    }

    function applyBallPos() {
      ball.style.left = state.x + 'px';
      ball.style.top = state.y + 'px';
      ball.style.transform = 'rotate(' + state.rot + 'deg)';
    }

    function pointerToLocal(clientX, clientY) {
      var r = beachRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function onPointerDown(event) {
      if (state.flying) return;
      var p = pointerToLocal(event.clientX, event.clientY);
      var dx = p.x - state.x;
      var dy = p.y - state.y;
      if (dx * dx + dy * dy > BALL_R * BALL_R * 2.5) return;

      state.dragging = true;
      state.pointerId = event.pointerId;
      state.dragOffX = dx;
      state.dragOffY = dy;
      state.vx = 0;
      state.vy = 0;
      state.lastPx = event.clientX;
      state.lastPy = event.clientY;
      state.lastPt = performance.now();
      ball.classList.add('is-dragging');
      ball.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function onPointerMove(event) {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      var p = pointerToLocal(event.clientX, event.clientY);
      placeBall(p.x - state.dragOffX, p.y - state.dragOffY);

      var now = performance.now();
      var dt = Math.max(8, now - state.lastPt);
      state.vx = ((event.clientX - state.lastPx) / dt) * 16;
      state.vy = ((event.clientY - state.lastPy) / dt) * 16;
      state.lastPx = event.clientX;
      state.lastPy = event.clientY;
      state.lastPt = now;
      applyBallPos();
    }

    function onPointerUp(event) {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      state.dragging = false;
      state.pointerId = null;
      ball.classList.remove('is-dragging');
      state.vx *= 1.35;
      state.vy *= 1.35;
      state.rotV = state.vx * 0.08;
    }

    ball.addEventListener('pointerdown', onPointerDown);
    ball.addEventListener('pointermove', onPointerMove);
    ball.addEventListener('pointerup', onPointerUp);
    ball.addEventListener('pointercancel', onPointerUp);

    var lastTick = performance.now();
    function tick(now) {
      var dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;

      if (!state.dragging && !state.flying) {
        var r = beachRect();
        var sandY = sandTop();

        state.vy += 520 * dt;
        state.x += state.vx * dt * 60;
        state.y += state.vy * dt * 60;
        state.rot += state.rotV * dt * 60;
        state.vx *= 0.992;
        state.vy *= 0.998;
        state.rotV *= 0.995;

        var minX = BALL_R + 4;
        var maxX = r.width - BALL_R - 4;
        var floor = r.height - BALL_R - 4;

        if (state.x < minX) {
          state.x = minX;
          state.vx = Math.abs(state.vx) * 0.55;
          state.rotV += state.vx * 0.04;
        }
        if (state.x > maxX) {
          state.x = maxX;
          state.vx = -Math.abs(state.vx) * 0.55;
          state.rotV += state.vx * 0.04;
        }

        if (state.y >= floor) {
          state.y = floor;
          if (Math.abs(state.vy) > 40) {
            state.vy *= -0.62;
            state.vx *= 0.88;
            state.rotV += state.vx * 0.06;
          } else {
            state.vy = 0;
            state.vx *= 0.94;
            state.rotV *= 0.9;
          }
        }

        if (state.y < sandY + BALL_R && state.vy < 0) {
          state.y = sandY + BALL_R;
          state.vy *= -0.35;
        }

        var speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
        if (
          speed > 280 &&
          (state.x < -BALL_R * 2 ||
            state.x > r.width + BALL_R * 2 ||
            state.y < -BALL_R * 3 ||
            state.y > r.height + BALL_R * 2)
        ) {
          state.flying = true;
          ball.classList.add('is-flying');
          ball.style.opacity = '0';
          window.setTimeout(resetBall, 700);
        }
      }

      applyBallPos();
      requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resetBall);
    resetBall();
    requestAnimationFrame(tick);
  }

  function init() {
    if (season === 'fall') {
      initFallLeaves();
    } else if (season === 'summer') {
      initSummerBeach();
    } else {
      mountFooterFx();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (event) {
    if (season === 'fall') {
      initFallLeaves();
    } else if (season === 'summer') {
      initSummerBeach();
    } else if (event.target && event.target.querySelector('.kg-footer')) {
      mountFooterFx();
    }
  });
})();
