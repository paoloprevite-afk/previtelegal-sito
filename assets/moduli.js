(function () {
  var URL = 'https://script.google.com/macros/s/AKfycbx1erbmUB-c50nruU_TXNjQf957s6ZgFKKldtUADCS1dnCcmvzWfhSSDKoIxcfKjFEQ7A/exec';
  var MAX = 30 * 1024 * 1024;

  function post(data) {
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'invio non riuscito');
      return j;
    });
  }
  function val(f, n) { var el = f.elements[n]; return el && el.value ? el.value.trim() : ''; }
  function b64(file) {
    return new Promise(function (ok, ko) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { ko(new Error('lettura del file non riuscita')); };
      r.readAsDataURL(file);
    });
  }
  function fallback(subject) {
    return 'Non siamo riusciti a inviare il messaggio. Riprova tra poco, oppure scrivi a <a href="mailto:paolo@previtelegal.it?subject=' + encodeURIComponent(subject) + '">paolo@previtelegal.it</a>.';
  }

  // Modulo Scrivici
  [].forEach.call(document.querySelectorAll('form.sf2'), function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = f.querySelector('.fst'), btn = f.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Invio in corso…'; st.className = 'fst'; st.textContent = '';
      post({ action: 'scrivici', hp: val(f, 'hp'), nome: val(f, 'Nome'), societa: val(f, 'Societa'), recapito: val(f, 'Recapito'), argomento: val(f, 'Argomento'), messaggio: val(f, 'Messaggio') })
        .then(function () {
          var box = document.createElement('div');
          box.className = 'sent'; box.setAttribute('role', 'status'); box.setAttribute('tabindex', '-1');
          box.innerHTML = '<b>Messaggio inviato.</b>Grazie. Ti ricontattiamo al recapito che hai indicato.';
          f.parentNode.replaceChild(box, f); box.focus();
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Invia'; st.className = 'fst err'; st.innerHTML = fallback('Richiesta dal sito');
        });
    });
  });

  // Prima lettura
  var pl = document.getElementById('pl');
  if (pl) pl.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = pl.querySelector('.status'), btn = pl.querySelector('button[type=submit]');
    var files = [].slice.call((pl.elements.files && pl.elements.files.files) || []);
    var big = files.filter(function (x) { return x.size > MAX; });
    if (big.length) {
      st.className = 'status err';
      st.textContent = big.map(function (x) { return x.name; }).join(', ') + ' supera 30 MB. Riducilo o dividilo, oppure scrivici e ti diamo un altro canale.';
      return;
    }
    btn.disabled = true; btn.textContent = 'Invio in corso…'; st.className = 'status'; st.textContent = 'Invio dei dati…';
    var req;
    post({ action: 'init', hp: val(pl, 'hp'), nome: val(pl, 'nome'), recapito: val(pl, 'recapito'), controparte: val(pl, 'controparte'), avvocato: val(pl, 'avvocato'), note: val(pl, 'note') })
      .then(function (j) {
        req = j;
        if (!j.id) return;  // trappola
        return files.reduce(function (p, file, i) {
          return p.then(function () {
            st.textContent = 'Caricamento del documento ' + (i + 1) + ' di ' + files.length + '…';
            return b64(file).then(function (data) { return post({ action: 'file', id: req.id, token: req.token, name: file.name, type: file.type, data: data }); });
          });
        }, Promise.resolve());
      })
      .then(function () { if (req && req.id) { st.textContent = 'Ultimo passaggio…'; return post({ action: 'done', id: req.id, token: req.token }); } })
      .then(function () {
        var ok = document.getElementById('ok');
        pl.hidden = true; ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus();
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Invia'; st.className = 'status err'; st.innerHTML = fallback('Prima lettura');
      });
  });
})();
