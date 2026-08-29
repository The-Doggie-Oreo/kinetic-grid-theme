(function () {
  var STEP = 0.1;
  var MAX_W = 8;
  var MAX_H = 11;
  var MIN_DIM = 1;
  var PX_PER_IN = 72;
  var MAX_LINES = 8;
  var MAX_CHARS = 80;
  var suppressSizeHandler = false;
  var suppressCustomSync = false;
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

  function getSelectedFont(customizer) {
    var select = customizer.querySelector('[data-plaque-font]');
    return (select && select.value) || customizer.dataset.defaultFont || 'Montserrat';
  }

  function fontCssFamily(fontFamily) {
    return '"' + fontFamily + '", sans-serif';
  }

  function measureTextWidth(text, fontPx, fontFamily) {
    var ctx = getMeasureContext();
    ctx.font = fontPx + 'px ' + fontCssFamily(fontFamily);
    return ctx.measureText(text || '').width;
  }

  function loadGoogleFont(fontFamily) {
    var weight = FONT_WEIGHTS[fontFamily] || '600';
    var linkId = 'plaque-gf-' + fontFamily.replace(/\s+/g, '-').toLowerCase();
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

  function applyPreviewFont(customizer) {
    var plate = customizer.querySelector('[data-plaque-plate]');
    var fontFamily = getSelectedFont(customizer);
    if (plate) plate.style.fontFamily = fontCssFamily(fontFamily);
    customizer.dataset.fontFamily = fontFamily;
  }

  function getPlateUsablePx(customizer) {
    var plate = customizer.querySelector('[data-plaque-plate]');
    if (!plate) return { w: 100, h: 60 };
    var plateW = plate.clientWidth || parseInt(plate.style.width, 10) || 132;
    var plateH = plate.clientHeight || parseInt(plate.style.height, 10) || 88;
    var padX = 18;
    var padY = 14;
    return {
      w: Math.max(24, plateW - padX),
      h: Math.max(16, plateH - padY),
    };
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

  function layoutTextForPlaque(customizer, rawText) {
    var text = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;

    var fontFamily = getSelectedFont(customizer);
    var maxLines = maxLinesForHeight(getCurrentHeight(customizer));
    var usable = getPlateUsablePx(customizer);
    var words = text.split(' ').filter(Boolean);
    var overflow = false;
    var best = null;

    for (var fontPx = 34; fontPx >= 9; fontPx--) {
      var greedy = wrapWordsGreedy(words, usable.w, fontPx, fontFamily);
      var lines = balanceWordLines(words, maxLines, usable.w, fontPx, fontFamily);
      if (lines.length > maxLines) continue;

      var lineHeight = fontPx * 1.22;
      if (lines.length * lineHeight > usable.h) continue;

      best = { lines: lines, fontPx: fontPx };
      if (greedy.length > maxLines) overflow = true;
      break;
    }

    if (!best) {
      overflow = true;
      var fallbackPx = 9;
      var fallbackLines = wrapWordsGreedy(words, usable.w, fallbackPx, fontFamily).slice(0, maxLines);
      if (fallbackLines.length && words.length > fallbackLines.join(' ').split(' ').length) {
        var used = fallbackLines.join(' ').split(' ').length;
        fallbackLines[fallbackLines.length - 1] += ' ' + words.slice(used).join(' ');
        fallbackLines[fallbackLines.length - 1] = fallbackLines[fallbackLines.length - 1].substring(0, MAX_CHARS);
      }
      best = { lines: fallbackLines, fontPx: fallbackPx };
    }

    best.lines = best.lines.map(function (line) { return line.substring(0, MAX_CHARS); });
    best.overflow = overflow || wrapWordsGreedy(words, usable.w, best.fontPx, fontFamily).length > maxLines;
    return best;
  }

  function applyLinesToInputs(customizer, lineTexts, isAuto) {
    var maxLines = maxLinesForHeight(getCurrentHeight(customizer));
    var count = Math.min(lineTexts.length, maxLines);
    setVisibleLineCount(customizer, Math.max(1, count));

    for (var i = 1; i <= MAX_LINES; i++) {
      var input = customizer.querySelector('[data-plaque-input="' + i + '"]');
      if (!input) continue;
      if (i <= count) {
        input.value = lineTexts[i - 1];
        input.disabled = i === 1 ? false : i <= count;
      } else {
        input.value = '';
      }
    }

    var layoutProp = customizer.querySelector('[data-plaque-prop-layout]');
    if (layoutProp) layoutProp.value = isAuto ? 'Auto-formatted' : 'Manual';

    syncLineCapacity(customizer, getCurrentHeight(customizer));
  }

  function computeLaserLayout(customizer) {
    var active = getActivePreviewLines(customizer).filter(function (entry) {
      return !entry.isPlaceholder;
    });
    if (!active.length) return null;

    var fontFamily = getSelectedFont(customizer);
    var lines = active.map(function (entry) { return entry.text; });
    var wIn = parseFloat(customizer.dataset.previewW) || 3;
    var hIn = parseFloat(customizer.dataset.previewH) || 2;
    var wMm = wIn * INCH_TO_MM;
    var hMm = hIn * INCH_TO_MM;
    var marginMm = Math.min(wMm, hMm) * 0.08;
    var usableW = wMm - marginMm * 2;
    var usableH = hMm - marginMm * 2;
    var maxLines = lines.length;
    var best = null;

    for (var fontMm = hMm * 0.35; fontMm >= 1.5; fontMm -= 0.2) {
      var fontPx = fontMm * (96 / INCH_TO_MM);
      var tooWide = lines.some(function (line) {
        return measureTextWidth(line, fontPx, fontFamily) > usableW * (96 / INCH_TO_MM);
      });
      var lineStep = fontMm * 1.22;
      if (tooWide) continue;
      if (maxLines * lineStep > usableH) continue;
      best = { fontMm: fontMm, lineStep: lineStep };
      break;
    }

    if (!best) {
      best = { fontMm: 1.8, lineStep: 2.2 };
    }

    var blockHeight = maxLines * best.lineStep;
    var startY = marginMm + (usableH - blockHeight) / 2 + best.fontMm * 0.85;

    return {
      wMm: wMm,
      hMm: hMm,
      fontFamily: fontFamily,
      fontMm: best.fontMm,
      lineStep: best.lineStep,
      startY: startY,
      centerX: wMm / 2,
      lines: lines,
    };
  }

  function buildLaserSvg(customizer) {
    var layout = computeLaserLayout(customizer);
    if (!layout) return null;

    var textNodes = layout.lines
      .map(function (line, idx) {
        var y = layout.startY + idx * layout.lineStep;
        return (
          '  <text x="' +
          layout.centerX.toFixed(3) +
          '" y="' +
          y.toFixed(3) +
          '" text-anchor="middle" dominant-baseline="alphabetic" font-family="' +
          escapeXml(layout.fontFamily) +
          ', sans-serif" font-size="' +
          layout.fontMm.toFixed(3) +
          '" fill="#000000">' +
          escapeXml(line) +
          '</text>'
        );
      })
      .join('\n');

    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      layout.wMm.toFixed(3) +
      'mm" height="' +
      layout.hMm.toFixed(3) +
      'mm" viewBox="0 0 ' +
      layout.wMm.toFixed(3) +
      ' ' +
      layout.hMm.toFixed(3) +
      '">\n' +
      '  <title>Kinetic Grid plaque — ' +
      escapeXml(layout.fontFamily) +
      '</title>\n' +
      '  <rect x="0" y="0" width="' +
      layout.wMm.toFixed(3) +
      '" height="' +
      layout.hMm.toFixed(3) +
      '" fill="none" stroke="#000000" stroke-width="0.15"/>\n' +
      textNodes +
      '\n</svg>'
    );
  }

  function syncSvgProperty(customizer) {
    var container = customizer.querySelector('[data-plaque-svg-props]');
    if (!container) return;

    container.innerHTML = '';
    var svg = buildLaserSvg(customizer);
    if (!svg) return;

    var compact = svg.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
    var chunkSize = 4000;
    var parts = [];
    for (var i = 0; i < compact.length; i += chunkSize) {
      parts.push(compact.slice(i, i + chunkSize));
    }

    parts.forEach(function (part, idx) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name =
        parts.length === 1
          ? 'properties[_Laser design SVG]'
          : 'properties[_Laser design SVG ' + (idx + 1) + '/' + parts.length + ']';
      input.value = part;
      container.appendChild(input);
    });

    if (parts.length > 1) {
      var meta = document.createElement('input');
      meta.type = 'hidden';
      meta.name = 'properties[_Laser SVG parts]';
      meta.value = String(parts.length);
      container.appendChild(meta);
    }
  }

  function runAutoFormat(customizer) {
    var paste = customizer.querySelector('[data-plaque-paste]');
    var status = customizer.querySelector('[data-plaque-format-status]');
    var text = paste && paste.value.trim();
    if (!text) {
      if (status) {
        status.hidden = false;
        status.textContent = customizer.dataset.autoFormatEmpty || 'Paste some text first.';
      }
      return;
    }

    var layout = layoutTextForPlaque(customizer, text);
    if (!layout) return;

    applyLinesToInputs(customizer, layout.lines, true);
    if (layout.fontPx) {
      var plate = customizer.querySelector('[data-plaque-plate]');
      if (plate) plate.style.fontSize = layout.fontPx + 'px';
    }
    syncSvgProperty(customizer);

    if (status) {
      status.hidden = false;
      var msg = (customizer.dataset.autoFormatSuccess || 'Split into {{ count }} lines.')
        .replace('{{ count }}', String(layout.lines.length));
      if (layout.overflow) {
        msg += ' ' + (customizer.dataset.autoFormatOverflow || '');
      }
      status.textContent = msg;
    }
  }

  function maxLinesForHeight(heightIn) {
    var h = Math.max(MIN_DIM, heightIn);
    if (h < 1.2) return 2;
    if (h < 1.8) return 4;
    if (h < 2.5) return 6;
    if (h < 3.5) return 7;
    return MAX_LINES;
  }

  function getLongestLineLength(customizer, activeLines) {
    var longest = 1;
    activeLines.forEach(function (entry) {
      if (entry.text && entry.text.length > longest) longest = entry.text.length;
    });
    return longest;
  }

  function getActivePreviewLines(customizer) {
    var visible = getVisibleLineCount(customizer);
    var active = [];

    for (var lineNum = 1; lineNum <= visible; lineNum++) {
      var input = customizer.querySelector('[data-plaque-input="' + lineNum + '"]');
      var text = input && input.value.trim();
      if (text) active.push({ sourceLine: lineNum, text: text });
    }

    if (active.length === 0) {
      var input1 = customizer.querySelector('[data-plaque-input="1"]');
      return [
        {
          sourceLine: 1,
          text: (input1 && input1.placeholder) || 'Line 1',
          isPlaceholder: true,
        },
      ];
    }

    return active;
  }

  function getVisibleLineCount(customizer) {
    return parseInt(customizer.dataset.visibleLines || '1', 10);
  }

  function setVisibleLineCount(customizer, count) {
    customizer.dataset.visibleLines = String(Math.max(1, count));
  }

  function getCurrentHeight(customizer) {
    return parseFloat(customizer.dataset.previewH) || 2;
  }

  function applyPreviewFontScale(customizer) {
    var plate = customizer.querySelector('[data-plaque-plate]');
    var linesWrap = customizer.querySelector('[data-plaque-lines]');
    if (!plate) return;

    applyPreviewFont(customizer);
    var fontFamily = getSelectedFont(customizer);
    var active = getActivePreviewLines(customizer);
    var lineCount = Math.max(1, active.length);
    var usable = getPlateUsablePx(customizer);
    var lineHeightRatio = 1.12;
    var gapRatio = 0.02;

    // Prefer filling most of the plaque: start high and shrink until it fits.
    var lo = 4;
    var hi = Math.min(48, Math.floor(usable.h / Math.max(1, lineCount * 0.9)));
    var best = lo;

    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var blockH = lineCount * mid * lineHeightRatio + Math.max(0, lineCount - 1) * mid * gapRatio;
      var widest = 0;
      for (var i = 0; i < active.length; i++) {
        var w = measureTextWidth(active[i].text || '', mid, fontFamily);
        if (w > widest) widest = w;
      }
      if (blockH <= usable.h * 0.98 && widest <= usable.w * 0.98) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    plate.style.fontSize = best + 'px';
    if (linesWrap) linesWrap.style.fontSize = best + 'px';
    customizer.dataset.previewFontPx = String(best);
  }

  function syncLineFieldControls(customizer, heightIn) {
    var maxLines = maxLinesForHeight(heightIn);
    var visible = getVisibleLineCount(customizer);
    if (visible > maxLines) visible = maxLines;
    setVisibleLineCount(customizer, visible);

    customizer.querySelectorAll('[data-plaque-line-field]').forEach(function (field) {
      var lineNum = parseInt(field.getAttribute('data-plaque-line-field'), 10);
      var input = field.querySelector('[data-plaque-input]');
      var show = lineNum === 1 || lineNum <= visible;

      if (lineNum === 1) {
        if (input) input.disabled = false;
        return;
      }

      field.hidden = !show;
      if (input) input.disabled = !show;
    });

    var addBtn = customizer.querySelector('[data-plaque-add-line]');
    if (addBtn) {
      addBtn.hidden = visible >= maxLines;
      addBtn.textContent = customizer.dataset.addLine || 'Add another line';
    }

    var removeLastBtn = customizer.querySelector('[data-plaque-remove-last-line]');
    if (removeLastBtn) {
      removeLastBtn.hidden = visible <= 1;
      removeLastBtn.textContent = customizer.dataset.removeLine || 'Remove last line';
    }

    customizer.querySelectorAll('[data-plaque-remove-line]').forEach(function (btn) {
      var lineNum = parseInt(btn.getAttribute('data-plaque-remove-line'), 10);
      btn.hidden = lineNum !== visible || visible <= 1;
    });

    var addNote = customizer.querySelector('[data-plaque-add-line-note]');
    if (addNote) {
      addNote.hidden = maxLines <= 1;
    }

    var hint = customizer.querySelector('[data-plaque-line-hint]');
    if (hint) {
      var template =
        customizer.dataset.lineCapacityMany ||
        'This size can hold up to {{ count }} lines. Text scales to fit.';
      hint.textContent = template.replace('{{ count }}', String(maxLines));
    }
  }

  function syncLineCapacity(customizer, heightIn) {
    syncLineFieldControls(customizer, heightIn);
    updatePreviewText(customizer);
  }

  function removeLine(customizer, lineNum) {
    var visible = getVisibleLineCount(customizer);
    if (lineNum <= 1 || lineNum > visible) return;

    var input = customizer.querySelector('[data-plaque-input="' + lineNum + '"]');
    if (input) input.value = '';

    if (lineNum === visible) {
      setVisibleLineCount(customizer, visible - 1);
    }

    syncLineCapacity(customizer, getCurrentHeight(customizer));
  }

  // Preset sizes stored as landscape width × height (inches)
  var PRESETS = {
    '2×3': { w: 3, h: 2, label: '2×3' },
    '2×4': { w: 4, h: 2, label: '2×4' },
    '3×4': { w: 4, h: 3, label: '3×4' },
  };

  function normalizeSize(value) {
    if (!value) return '2×3';
    return String(value).replace(/x/gi, '×').trim();
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

  function formatDimensionValue(value) {
    return snapStep(value).toFixed(1);
  }

  function calcCustomPrice(w, h) {
    var area = w * h;
    var base = 2.8 + area * 0.52;
    var withPremium = base * 1.35;
    var price = Math.ceil(withPremium * 2) / 2;
    return Math.min(25, Math.max(6, price));
  }

  function priceToTier(price) {
    return 'P' + Math.round(price * 100);
  }

  function getForm(customizer) {
    return customizer.closest('form');
  }

  function setOptions(form, pairs) {
    suppressSizeHandler = true;
    pairs.forEach(function (pair) {
      var input = form.querySelector('[name="option-' + pair[0] + '"][value="' + pair[1] + '"]');
      if (input) input.checked = true;
    });
    var trigger =
      form.querySelector('[name="option-price-tier"]:checked') ||
      form.querySelector('[name="option-price-tier"]');
    if (trigger) trigger.dispatchEvent(new Event('change', { bubbles: true }));
    suppressSizeHandler = false;
  }

  function applyPlateDimensions(customizer, widthIn, heightIn) {
    var plate = customizer.querySelector('[data-plaque-plate]');
    var label = customizer.querySelector('[data-plaque-dims-label]');
    if (!plate) return;

    var w = Math.max(widthIn, MIN_DIM);
    var h = Math.max(heightIn, MIN_DIM);
    var frame = customizer.querySelector('[data-plaque-frame]');
    var maxPx = frame ? Math.min(480, frame.clientWidth || 480) : 480;
    var scale = PX_PER_IN;
    if (w * scale > maxPx) scale = maxPx / w;
    if (h * scale > maxPx * 0.65) scale = Math.min(scale, (maxPx * 0.65) / h);

    plate.style.width = Math.round(w * scale) + 'px';
    plate.style.height = Math.round(h * scale) + 'px';

    customizer.dataset.previewW = String(w);
    customizer.dataset.previewH = String(h);

    if (label) {
      label.textContent =
        formatInches(w) + ' × ' + formatInches(h) + ' in (landscape)';
    }

    syncLineCapacity(customizer, h);
  }

  function updatePreviewText(customizer) {
    var active = getActivePreviewLines(customizer);
    var activeCount = active.length;

    for (var slot = 1; slot <= MAX_LINES; slot++) {
      var previewLine = customizer.querySelector('[data-plaque-line="' + slot + '"]');
      if (!previewLine) continue;

      if (slot <= activeCount) {
        var entry = active[slot - 1];
        previewLine.hidden = false;
        previewLine.textContent = entry.text;
        previewLine.classList.toggle('is-filled', !entry.isPlaceholder);
      } else {
        previewLine.hidden = true;
        previewLine.innerHTML = '&nbsp;';
        previewLine.classList.remove('is-filled');
      }
    }

    applyPreviewFontScale(customizer);
    syncSvgProperty(customizer);
  }

  function toggleCustomProperties(customizer, enabled, w, h) {
    var propW = customizer.querySelector('[data-plaque-prop-width]');
    var propH = customizer.querySelector('[data-plaque-prop-height]');
    var propSize = customizer.querySelector('[data-plaque-prop-size]');
    [propW, propH, propSize].forEach(function (el) {
      if (!el) return;
      el.disabled = !enabled;
    });
    if (enabled && propW && propH && propSize) {
      propW.value = formatDimensionValue(w);
      propH.value = formatDimensionValue(h);
      propSize.value = formatInches(w) + ' × ' + formatInches(h) + ' in (landscape, custom)';
    }
  }

  function syncPreset(customizer, sizeKey) {
    var form = getForm(customizer);
    var preset = PRESETS[normalizeSize(sizeKey)] || PRESETS['2×3'];
    var panel = customizer.querySelector('[data-plaque-custom-panel]');

    if (panel) panel.hidden = true;
    toggleCustomProperties(customizer, false);

    setOptions(form, [
      ['size', normalizeSize(sizeKey)],
      ['price-tier', 'Standard'],
    ]);

    applyPlateDimensions(customizer, preset.w, preset.h);
  }

  function syncCustom(customizer) {
    if (suppressCustomSync) return;

    var form = getForm(customizer);
    var widthInput = customizer.querySelector('[data-plaque-width]');
    var heightInput = customizer.querySelector('[data-plaque-height]');
    var panel = customizer.querySelector('[data-plaque-custom-panel]');

    if (panel) panel.hidden = false;

    var w = Math.min(MAX_W, Math.max(MIN_DIM, snapStep(widthInput && widthInput.value)));
    var h = Math.min(MAX_H, Math.max(MIN_DIM, snapStep(heightInput && heightInput.value)));

    suppressCustomSync = true;
    try {
      if (widthInput) widthInput.value = formatDimensionValue(w);
      if (heightInput) heightInput.value = formatDimensionValue(h);

      var price = calcCustomPrice(w, h);
      var tier = priceToTier(price);

      setOptions(form, [
        ['size', 'Custom'],
        ['price-tier', tier],
      ]);

      applyPlateDimensions(customizer, w, h);
      toggleCustomProperties(customizer, true, w, h);
    } finally {
      suppressCustomSync = false;
    }
  }

  function getSelectedSize(form) {
    var checked = form.querySelector('[name="option-size"]:checked');
    return checked ? normalizeSize(checked.value) : '2×3';
  }

  function bindCustomizer(customizer) {
    if (!customizer || customizer.dataset.bound === 'true') return;
    customizer.dataset.bound = 'true';

    var form = getForm(customizer);
    if (!form) return;

    updatePreviewText(customizer);
    setVisibleLineCount(customizer, 1);
    applyPreviewFont(customizer);
    loadGoogleFont(getSelectedFont(customizer)).then(function () {
      syncPreset(customizer, getSelectedSize(form));
    });
    requestAnimationFrame(function () {
      var w = parseFloat(customizer.dataset.previewW);
      var h = parseFloat(customizer.dataset.previewH);
      if (!isNaN(w) && !isNaN(h)) applyPlateDimensions(customizer, w, h);
    });

    customizer.querySelectorAll('[data-plaque-input]').forEach(function (input) {
      input.addEventListener('input', function () {
        var layoutProp = customizer.querySelector('[data-plaque-prop-layout]');
        if (layoutProp) layoutProp.value = 'Manual';
        updatePreviewText(customizer);
      });
      input.addEventListener('change', function () {
        var layoutProp = customizer.querySelector('[data-plaque-prop-layout]');
        if (layoutProp) layoutProp.value = 'Manual';
        updatePreviewText(customizer);
      });
    });

    var fontSelect = customizer.querySelector('[data-plaque-font]');
    if (fontSelect) {
      fontSelect.addEventListener('change', function () {
        loadGoogleFont(fontSelect.value).then(function () {
          applyPreviewFont(customizer);
          updatePreviewText(customizer);
        });
      });
    }

    var autoFormatBtn = customizer.querySelector('[data-plaque-auto-format]');
    if (autoFormatBtn) {
      autoFormatBtn.addEventListener('click', function () {
        loadGoogleFont(getSelectedFont(customizer)).then(function () {
          runAutoFormat(customizer);
        });
      });
    }

    var addLineBtn = customizer.querySelector('[data-plaque-add-line]');
    if (addLineBtn) {
      addLineBtn.addEventListener('click', function () {
        var maxLines = maxLinesForHeight(getCurrentHeight(customizer));
        var visible = getVisibleLineCount(customizer);
        if (visible >= maxLines) return;
        setVisibleLineCount(customizer, visible + 1);
        syncLineCapacity(customizer, getCurrentHeight(customizer));
        var nextInput = customizer.querySelector(
          '[data-plaque-input="' + getVisibleLineCount(customizer) + '"]'
        );
        if (nextInput) nextInput.focus();
      });
    }

    var removeLastBtn = customizer.querySelector('[data-plaque-remove-last-line]');
    if (removeLastBtn) {
      removeLastBtn.addEventListener('click', function () {
        removeLine(customizer, getVisibleLineCount(customizer));
      });
    }

    customizer.querySelectorAll('[data-plaque-remove-line]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lineNum = parseInt(btn.getAttribute('data-plaque-remove-line'), 10);
        removeLine(customizer, lineNum);
      });
    });

    form.addEventListener('submit', function () {
      for (var i = 2; i <= MAX_LINES; i++) {
        var lineInput = customizer.querySelector('[data-plaque-input="' + i + '"]');
        if (lineInput && !lineInput.value.trim()) lineInput.disabled = true;
      }
      syncSvgProperty(customizer);
    });

    form.querySelectorAll('[name="option-size"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (suppressSizeHandler) return;
        var size = normalizeSize(input.value);
        if (size === 'Custom') {
          syncCustom(customizer);
        } else {
          syncPreset(customizer, size);
        }
      });
    });

    var widthInput = customizer.querySelector('[data-plaque-width]');
    var heightInput = customizer.querySelector('[data-plaque-height]');
    [widthInput, heightInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () {
        if (suppressCustomSync) return;
        if (getSelectedSize(form) === 'Custom') syncCustom(customizer);
      });
      input.addEventListener('change', function () {
        if (suppressCustomSync) return;
        if (getSelectedSize(form) === 'Custom') syncCustom(customizer);
      });
    });

    // Rename Custom label in size buttons
    var customLabel = form.querySelector('label[for="option-size-custom"]');
    if (customLabel) customLabel.textContent = 'Custom size';
  }

  function init(root) {
    var scope = root || document;
    scope.querySelectorAll('plaque-customizer').forEach(bindCustomizer);
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
