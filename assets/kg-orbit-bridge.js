(function () {
  'use strict';

  function cfg() {
    return window.KG_ORBIT || null;
  }

  function enabled() {
    var c = cfg();
    return !!(c && c.enabled && c.url && c.token);
  }

  function field(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || '').trim() : '';
  }

  function buildPayload(form) {
    var isTrophy = form.classList.contains('kg-trophy-request-form');
    var name = field(form, 'contact[name]');
    var email = field(form, 'contact[email]');
    var phone = field(form, 'contact[phone]');
    var body = field(form, 'contact[body]');
    var plaque = field(form, 'contact[plaque_text]');

    if (isTrophy) {
      var eventName = field(form, 'contact[event_or_league]');
      var style = field(form, 'contact[trophy_style]');
      var qty = field(form, 'contact[quantity]');
      var reference = field(form, 'contact[reference_image_link]');
      var details = [
        body,
        plaque ? 'Plaque text: ' + plaque : '',
        qty ? 'Quantity: ' + qty : '',
        reference ? 'Reference: ' + reference : '',
      ]
        .filter(Boolean)
        .join('\n');

      return {
        form_type: 'trophy',
        name: name,
        email: email,
        phone: phone || null,
        subject: eventName || 'Custom Trophy Request',
        service: style || 'Custom Trophy',
        details: details,
        source_url: window.location.href,
        event_or_league: eventName,
        trophy_style: style,
        quantity: qty,
        plaque_text: plaque,
        reference_image_link: reference,
      };
    }

    return {
      form_type: 'quote',
      name: name,
      email: email,
      phone: phone || null,
      subject: field(form, 'contact[service]') || 'Fabrication quote',
      service: field(form, 'contact[service]'),
      details: [body, plaque ? 'Plaque text: ' + plaque : ''].filter(Boolean).join('\n'),
      source_url: window.location.href,
      plaque_text: plaque,
    };
  }

  function postOrbit(payload) {
    if (!enabled()) return Promise.resolve({ skipped: true });
    var c = cfg();
    return fetch(c.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Orbit-Token': c.token,
        // ngrok free tier shows an HTML warning page unless this header is sent
        'ngrok-skip-browser-warning': '1',
      },
      body: JSON.stringify(Object.assign({ token: c.token }, payload)),
      keepalive: true,
      mode: 'cors',
    }).then(function (res) {
      if (!res.ok) throw new Error('Orbit ingest failed');
      return res.json();
    });
  }

  document.addEventListener(
    'submit',
    function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      // Quote form posts explicitly in its own handler; trophy uses native submit.
      if (!form.classList.contains('kg-trophy-request-form')) return;
      if (!enabled()) return;

      postOrbit(buildPayload(form)).catch(function () {});
    },
    true
  );

  window.KGOrbit = {
    post: postOrbit,
    buildPayload: buildPayload,
    enabled: enabled,
  };
})();
