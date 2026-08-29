/*
  Studio plaque laser tool (owner-only page)
*/
(function () {
  var STEP = 0.1;
  var MAX_W = 8;
  var MAX_H = 11;
  var MIN_DIM = 1;
  var MAX_LINES = 8;
  var MAX_CHARS = 80;
  var INCH_TO_MM = 25.4;
  var FONT_WEIGHTS = {
    Montserrat: '600',
    Oswald: '500',
    'Roboto Slab': '600',
    'Libre Baskerville': '700',
    'Playfair Display': '600',
    'Bebas Neue': '400',
    Lora: '600',
  };
  var measureCanvasEl = null;
  var UNLOCK_KEY = 'kg_plaque_studio_unlocked';

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getMeasureContext() {
    if (!measureCanvasEl) measureCanvasEl = document.createElement('canvas');
    return measureCanvasEl.getContext('2d');
  }

  function fontCssFamily(fontFamily) {
    return '"' + fontFamily + '", sans-serif';
  }

  function measureTextWidth(text, fontPx, fontFamily) {
    var ctx = getMeasureContext();
    ctx.font = fontPx + 'px ' + fontCssFamily(fontFamily);
    return ctx.measureText(text || '').width;
  }

  function snapStep(value) {
    var num = parseFloat(value);
    if (isNaN(num)) return MIN_DIM;
    return Math.round(num / STEP) * STEP;
  }

  function formatInches(value) {
    var snapped = snapStep(value);
    if (Math.abs(snapped - Math.round(snapped)) < 0.001) return String(Math.round(snapped));
    return snapped.toFixed(1);
  }

  function maxLinesForHeight(heightIn) {
    var h = Math.max(MIN_DIM, heightIn);
    if (h < 1.2) return 2;
    if (h < 1.8) return 4;
    if (h < 2.5) return 6;
    if (h < 3.5) return 7;
    return MAX_LINES;
  }

  function loadGoogleFont(fontFamily) {
    var weight = FONT_WEIGHTS[fontFamily] || '600';
    var linkId = 'plaque-studio-gf-' + fontFamily.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(linkId)) return Promise.resolve();
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=' +
        encodeURIComponent(fontFamily) +
        ':wght@' +
        weight +
        '&display=swap';
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }

  function wrapWordsGreedy(words, maxWidthPx, fontPx, fontFamily) {
    var lines = [];
    var i = 0;
    while (i < words.length) {
      var line = words[i++];
      while (i < words.length) {
        var test = line + ' ' + words[i];
        if (measureTextWidth(test, fontPx, fontFamily) <= maxWidthPx) {
          line = test;
          i++;
        } else {
          break;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  function balanceWordLines(words, maxLines, maxWidthPx, fontPx, fontFamily) {
    if (words.length <= 1) return [words.join(' ')];
    var targetLines = Math.min(maxLines, words.length);
    if (targetLines <= 1) return [words.join(' ')];

    var perLine = Math.ceil(words.length / targetLines);
    var lines = [];
    for (var t = 0; t < targetLines; t++) {
      var chunk = words.slice(t * perLine, (t + 1) * perLine);
      if (!chunk.length) continue;
      var line = chunk.join(' ');
      if (measureTextWidth(line, fontPx, fontFamily) <= maxWidthPx) {
        lines.push(line);
      } else {
        return wrapWordsGreedy(words, maxWidthPx, fontPx, fontFamily);
      }
    }
    return lines.length ? lines : wrapWordsGreedy(words, maxWidthPx, fontPx, fontFamily);
  }

  function layoutText(rawText, wIn, hIn, fontFamily) {
    var text = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;

    var maxLines = maxLinesForHeight(hIn);
    var usableW = Math.max(40, wIn * 72 - 18);
    var usableH = Math.max(20, hIn * 72 - 14);
    var words = text.split(' ').filter(Boolean);
    var best = null;

    for (var fontPx = 40; fontPx >= 5; fontPx--) {
      var lines = balanceWordLines(words, maxLines, usableW, fontPx, fontFamily);
      if (lines.length > maxLines) continue;
      var blockH = lines.length * fontPx * 1.12;
      if (blockH > usableH) continue;
      var tooWide = lines.some(function (line) {
        return measureTextWidth(line, fontPx, fontFamily) > usableW;
      });
      if (tooWide) continue;
      best = { lines: lines.map(function (l) { return l.substring(0, MAX_CHARS); }), fontPx: fontPx };
      break;
    }

    if (!best) {
      var fallback = wrapWordsGreedy(words, usableW, 8, fontFamily).slice(0, maxLines);
      best = { lines: fallback.map(function (l) { return l.substring(0, MAX_CHARS); }), fontPx: 8 };
    }
    return best;
  }

  function buildSvg(wIn, hIn, fontFamily, lines) {
    if (!lines || !lines.length) return null;
    var wMm = wIn * INCH_TO_MM;
    var hMm = hIn * INCH_TO_MM;
    var marginMm = Math.min(wMm, hMm) * 0.08;
    var usableW = wMm - marginMm * 2;
    var usableH = hMm - marginMm * 2;
    var best = null;

    for (var fontMm = hMm * 0.4; fontMm >= 1.2; fontMm -= 0.15) {
      var fontPx = fontMm * (96 / INCH_TO_MM);
      var tooWide = lines.some(function (line) {
        return measureTextWidth(line, fontPx, fontFamily) > usableW * (96 / INCH_TO_MM);
      });
      var lineStep = fontMm * 1.15;
      if (tooWide || lines.length * lineStep > usableH) continue;
      best = { fontMm: fontMm, lineStep: lineStep };
      break;
    }
    if (!best) best = { fontMm: 1.6, lineStep: 2 };

    var blockHeight = lines.length * best.lineStep;
    var startY = marginMm + (usableH - blockHeight) / 2 + best.fontMm * 0.85;
    var centerX = wMm / 2;

    var textNodes = lines
      .map(function (line, idx) {
        var y = startY + idx * best.lineStep;
        return (
          '  <text x="' +
          centerX.toFixed(3) +
          '" y="' +
          y.toFixed(3) +
          '" text-anchor="middle" font-family="' +
          escapeXml(fontFamily) +
          ', sans-serif" font-size="' +
          best.fontMm.toFixed(3) +
          '" fill="#000000">' +
          escapeXml(line) +
          '</text>'
        );
      })
      .join('\n');

    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      wMm.toFixed(3) +
      'mm" height="' +
      hMm.toFixed(3) +
      'mm" viewBox="0 0 ' +
      wMm.toFixed(3) +
      ' ' +
      hMm.toFixed(3) +
      '">\n' +
      '  <title>Kinetic Grid plaque — ' +
      escapeXml(fontFamily) +
      '</title>\n' +
      '  <desc>Font: ' +
      escapeXml(fontFamily) +
      ' | Size: ' +
      formatInches(wIn) +
      ' x ' +
      formatInches(hIn) +
      ' in</desc>\n' +
      '  <rect x="0" y="0" width="' +
      wMm.toFixed(3) +
      '" height="' +
      hMm.toFixed(3) +
      '" fill="none" stroke="#000000" stroke-width="0.15"/>\n' +
      textNodes +
      '\n</svg>\n'
    );
  }

  function downloadTextAsSvg(svg, filename) {
    var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename || 'plaque.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function reassembleOrderSvg(raw) {
    var text = String(raw || '').trim();
    if (!text) return null;

    // Already a full SVG
    if (text.indexOf('<svg') !== -1) {
      if (text.indexOf('<?xml') === -1) text = '<?xml version="1.0" encoding="UTF-8"?>\n' + text;
      return text;
    }

    // Pasted order properties dump: extract _Laser design SVG chunks
    var chunks = [];
    var multi = text.match(/_Laser design SVG\s+(\d+)\s*\/\s*(\d+)\s*[:\t]\s*(.+)/gi);
    if (multi && multi.length) {
      var map = {};
      var total = 0;
      multi.forEach(function (row) {
        var m = row.match(/_Laser design SVG\s+(\d+)\s*\/\s*(\d+)\s*[:\t]\s*(.+)/i);
        if (!m) return;
        map[parseInt(m[1], 10)] = m[3].trim();
        total = parseInt(m[2], 10);
      });
      for (var i = 1; i <= total; i++) {
        if (map[i]) chunks.push(map[i]);
      }
    } else {
      var single = text.match(/_Laser design SVG\s*[:\t]\s*(.+)/i);
      if (single) chunks.push(single[1].trim());
      else chunks.push(text);
    }

    var joined = chunks.join('');
    if (joined.indexOf('<svg') === -1 && joined.indexOf('<svg') === -1) {
      // maybe raw compact svg without label
      if (joined.indexOf('svg') !== -1) joined = joined;
      else return null;
    }
    if (joined.indexOf('<?xml') === -1 && joined.indexOf('<svg') !== -1) {
      joined = '<?xml version="1.0" encoding="UTF-8"?>\n' + joined;
    }
    return joined.indexOf('<svg') !== -1 ? joined : null;
  }

  function parseOrderDump(raw) {
    var text = String(raw || '').trim();
    if (!text) return null;

    // If it's an SVG blob, return that path
    var svg = null;
    if (text.indexOf('<svg') !== -1 || /_Laser design SVG/i.test(text)) {
      svg = reassembleOrderSvg(text);
    }

    var result = {
      w: null,
      h: null,
      font: null,
      lines: [],
      layout: null,
      variant: null,
      svg: svg,
    };

    var widthMatch = text.match(/Plaque\s*width\s*\(in\)\s*[:\t]\s*([0-9.]+)/i);
    var heightMatch = text.match(/Plaque\s*height\s*\(in\)\s*[:\t]\s*([0-9.]+)/i);
    if (widthMatch) result.w = parseFloat(widthMatch[1]);
    if (heightMatch) result.h = parseFloat(heightMatch[1]);

    if (result.w == null || result.h == null) {
      var sizeMatch = text.match(
        /Plaque\s*size\s*[:\t]\s*([0-9.]+)\s*[×x]\s*([0-9.]+)/i
      );
      if (sizeMatch) {
        result.w = parseFloat(sizeMatch[1]);
        result.h = parseFloat(sizeMatch[2]);
      }
    }

    // Preset-ish "2×3" / "2x4" in variant title without custom dims
    if (result.w == null || result.h == null) {
      var preset = text.match(/\b([234])\s*[×x]\s*([234])\b/);
      if (preset) {
        // Labels are short×long historically; we store landscape W×H
        var a = parseFloat(preset[1]);
        var b = parseFloat(preset[2]);
        result.w = Math.max(a, b);
        result.h = Math.min(a, b);
      }
    }

    var fontMatch = text.match(/Plaque\s*font\s*[:\t]\s*([^\n\r]+)/i);
    if (fontMatch) result.font = fontMatch[1].trim();

    var layoutMatch = text.match(/Layout\s*mode\s*[:\t]\s*([^\n\r]+)/i);
    if (layoutMatch) result.layout = layoutMatch[1].trim();

    var variantMatch = text.match(/^\s*([^\n]+\/\s*P?\d+[^\n]*)/m);
    if (variantMatch && /P\d+|Custom|Standard/i.test(variantMatch[1])) {
      result.variant = variantMatch[1].trim();
    }

    var lineMap = {};
    var lineRe = /Plaque\s*line\s*(\d+)\s*[:\t]\s*([^\n\r]*)/gi;
    var m;
    while ((m = lineRe.exec(text)) !== null) {
      var num = parseInt(m[1], 10);
      var val = (m[2] || '').trim();
      if (val) lineMap[num] = val;
    }
    var keys = Object.keys(lineMap)
      .map(function (k) {
        return parseInt(k, 10);
      })
      .sort(function (a, b) {
        return a - b;
      });
    keys.forEach(function (k) {
      result.lines.push(lineMap[k]);
    });

    var hasSomething =
      result.lines.length ||
      result.w != null ||
      result.font ||
      result.svg;
    return hasSomething ? result : null;
  }

  function updatePreview(root, lines, fontFamily, wIn, hIn) {
    var plate = root.querySelector('[data-studio-plate]');
    var label = root.querySelector('[data-studio-dims]');
    var wrap = root.querySelector('[data-studio-lines]');
    if (!plate || !wrap) return;

    var maxPx = 420;
    var scale = 72;
    if (wIn * scale > maxPx) scale = maxPx / wIn;
    if (hIn * scale > maxPx * 0.65) scale = Math.min(scale, (maxPx * 0.65) / hIn);

    plate.style.width = Math.round(wIn * scale) + 'px';
    plate.style.height = Math.round(hIn * scale) + 'px';
    plate.style.fontFamily = fontCssFamily(fontFamily);

    var usableW = Math.max(24, wIn * scale - 16);
    var usableH = Math.max(16, hIn * scale - 12);
    var lineCount = Math.max(1, lines.length);
    var lo = 4;
    var hi = 40;
    var best = 4;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var blockH = lineCount * mid * 1.12;
      var widest = 0;
      lines.forEach(function (line) {
        widest = Math.max(widest, measureTextWidth(line, mid, fontFamily));
      });
      if (blockH <= usableH && widest <= usableW) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    plate.style.fontSize = best + 'px';

    wrap.innerHTML = '';
    lines.forEach(function (line) {
      var span = document.createElement('span');
      span.className = 'plaque-preview__line is-filled';
      span.textContent = line;
      wrap.appendChild(span);
    });

    if (label) {
      label.textContent = formatInches(wIn) + ' × ' + formatInches(hIn) + ' in · ' + fontFamily;
    }
  }

  function bindStudio(root) {
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    var gate = root.querySelector('[data-studio-gate]');
    var tool = root.querySelector('[data-studio-tool]');
    var unlockInput = root.querySelector('[data-studio-unlock]');
    var unlockBtn = root.querySelector('[data-studio-unlock-btn]');
    var unlockError = root.querySelector('[data-studio-unlock-error]');
    var expected = (root.dataset.unlockCode || '').trim();

    function showTool() {
      if (gate) gate.hidden = true;
      if (tool) tool.hidden = false;
      try {
        sessionStorage.setItem(UNLOCK_KEY, '1');
      } catch (e) {}
    }

    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === '1') showTool();
    } catch (e) {}

    if (unlockBtn) {
      unlockBtn.addEventListener('click', function () {
        var entered = (unlockInput && unlockInput.value.trim()) || '';
        if (expected && entered === expected) {
          if (unlockError) unlockError.hidden = true;
          showTool();
        } else if (unlockError) {
          unlockError.hidden = false;
        }
      });
    }
    if (unlockInput) {
      unlockInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          unlockBtn && unlockBtn.click();
        }
      });
    }

    var widthInput = root.querySelector('[data-studio-width]');
    var heightInput = root.querySelector('[data-studio-height]');
    var fontSelect = root.querySelector('[data-studio-font]');
    var pasteArea = root.querySelector('[data-studio-paste]');
    var orderPaste = root.querySelector('[data-studio-order-paste]');
    var status = root.querySelector('[data-studio-status]');
    var fitBtn = root.querySelector('[data-studio-fit]');
    var downloadBtn = root.querySelector('[data-studio-download]');
    var loadOrderBtn = root.querySelector('[data-studio-load-order]');

    var state = { lines: ['Your name or title'], font: 'Montserrat', w: 3, h: 2 };

    function setStatus(msg) {
      if (!status) return;
      status.hidden = !msg;
      status.textContent = msg || '';
    }

    function applyParsed(parsed) {
      if (!parsed) {
        setStatus('Could not read that paste. Include Plaque width/height/font/lines from the order.');
        return false;
      }

      if (parsed.svg && !parsed.lines.length) {
        downloadTextAsSvg(parsed.svg, 'order-plaque.svg');
        setStatus('Found SVG in paste — downloaded order-plaque.svg');
        return true;
      }

      if (parsed.w != null) {
        state.w = Math.min(MAX_W, Math.max(MIN_DIM, snapStep(parsed.w)));
        if (widthInput) widthInput.value = state.w.toFixed(1);
      }
      if (parsed.h != null) {
        state.h = Math.min(MAX_H, Math.max(MIN_DIM, snapStep(parsed.h)));
        if (heightInput) heightInput.value = state.h.toFixed(1);
      }
      if (parsed.font) {
        state.font = parsed.font;
        if (fontSelect) {
          var found = false;
          Array.prototype.forEach.call(fontSelect.options, function (opt) {
            if (opt.value.toLowerCase() === parsed.font.toLowerCase()) {
              fontSelect.value = opt.value;
              state.font = opt.value;
              found = true;
            }
          });
          if (!found) {
            var opt = document.createElement('option');
            opt.value = parsed.font;
            opt.textContent = parsed.font;
            fontSelect.appendChild(opt);
            fontSelect.value = parsed.font;
          }
        }
      }
      if (parsed.lines.length) state.lines = parsed.lines;

      loadGoogleFont(state.font).then(function () {
        updatePreview(root, state.lines, state.font, state.w, state.h);
      });

      var bits = [];
      bits.push(formatInches(state.w) + '×' + formatInches(state.h) + ' in');
      bits.push(state.font);
      bits.push(state.lines.length + ' line' + (state.lines.length === 1 ? '' : 's'));
      if (parsed.variant) bits.push(parsed.variant);
      setStatus('Loaded: ' + bits.join(' · ') + '. Click Download SVG.');
      return true;
    }

    function readDims() {
      state.w = Math.min(MAX_W, Math.max(MIN_DIM, snapStep(widthInput && widthInput.value)));
      state.h = Math.min(MAX_H, Math.max(MIN_DIM, snapStep(heightInput && heightInput.value)));
      if (widthInput) widthInput.value = state.w.toFixed(1);
      if (heightInput) heightInput.value = state.h.toFixed(1);
    }

    function refresh() {
      readDims();
      state.font = (fontSelect && fontSelect.value) || 'Montserrat';
      loadGoogleFont(state.font).then(function () {
        updatePreview(root, state.lines, state.font, state.w, state.h);
      });
    }

    if (loadOrderBtn) {
      loadOrderBtn.addEventListener('click', function () {
        var parsed = parseOrderDump(orderPaste && orderPaste.value);
        applyParsed(parsed);
      });
    }

    if (orderPaste) {
      orderPaste.addEventListener('paste', function () {
        setTimeout(function () {
          var parsed = parseOrderDump(orderPaste.value);
          if (parsed && (parsed.lines.length || parsed.svg)) applyParsed(parsed);
        }, 0);
      });
    }

    if (fitBtn) {
      fitBtn.addEventListener('click', function () {
        readDims();
        state.font = (fontSelect && fontSelect.value) || 'Montserrat';
        var text = pasteArea && pasteArea.value.trim();
        if (!text) {
          setStatus('Paste text in the manual box first, or load an order above.');
          return;
        }
        loadGoogleFont(state.font).then(function () {
          var layout = layoutText(text, state.w, state.h, state.font);
          if (!layout) return;
          state.lines = layout.lines;
          updatePreview(root, state.lines, state.font, state.w, state.h);
          setStatus('Fitted into ' + state.lines.length + ' lines. Download SVG when ready.');
        });
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        // If paste still has raw SVG only, download that
        var maybeSvg = reassembleOrderSvg(orderPaste && orderPaste.value);
        if (maybeSvg && orderPaste && /<svg/i.test(orderPaste.value) && !(state.lines && state.lines[0] && state.lines[0] !== 'Your name or title')) {
          downloadTextAsSvg(maybeSvg, 'order-plaque.svg');
          setStatus('Downloaded order-plaque.svg');
          return;
        }

        readDims();
        state.font = (fontSelect && fontSelect.value) || 'Montserrat';

        // Prefer currently loaded lines; if empty try parsing order paste again
        if ((!state.lines || !state.lines.length || (state.lines.length === 1 && state.lines[0] === 'Your name or title')) && orderPaste && orderPaste.value.trim()) {
          var parsed = parseOrderDump(orderPaste.value);
          if (parsed && parsed.lines.length) applyParsed(parsed);
        }

        loadGoogleFont(state.font).then(function () {
          if ((!state.lines || !state.lines.length) && pasteArea && pasteArea.value.trim()) {
            var layout = layoutText(pasteArea.value, state.w, state.h, state.font);
            if (layout) state.lines = layout.lines;
          }
          var svg = buildSvg(state.w, state.h, state.font, state.lines);
          if (!svg) {
            setStatus('Nothing to export yet — paste an order block first.');
            return;
          }
          var name =
            'plaque-' +
            formatInches(state.w).replace(/\s+/g, '') +
            'x' +
            formatInches(state.h).replace(/\s+/g, '') +
            'in-' +
            state.font.replace(/\s+/g, '') +
            '.svg';
          downloadTextAsSvg(svg, name);
          setStatus('Downloaded ' + name);
        });
      });
    }

    [widthInput, heightInput, fontSelect].forEach(function (el) {
      if (!el) return;
      el.addEventListener('change', refresh);
    });

    refresh();
  }

  function init(scope) {
    (scope || document).querySelectorAll('plaque-studio').forEach(bindStudio);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
    });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target);
  });
})();
