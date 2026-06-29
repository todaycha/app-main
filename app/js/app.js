// ChaChahome - App Hub JS

(function () {
  'use strict';

  var overlay = document.getElementById('loadingOverlay');
  var shell = document.getElementById('appShell');
  var userEmailEl = document.getElementById('userEmail');
  var adminLinkEl = document.getElementById('adminLink');
  var logoutBtn = document.getElementById('logoutBtn');
  var themeToggle = document.getElementById('themeToggle');
  var bandsEl = document.getElementById('appBands');
  var emptyStateEl = document.getElementById('emptyState');

  // --- Presentation registries (the backend owns access + content) ---
  var CATEGORIES = {
    monitor: { label: '모니터링', order: 1 },
    docs: { label: '문서·도구', order: 2 },
    read: { label: '읽을거리', order: 3 }
  };

  var ICONS = {
    thermometer: '<path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>',
    'file-text': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    'file-form': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
    pulse: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM18 14h3v2h-3zM14 18h2v3h-2zM18 18h3v3h-3z"/>',
    feed: '<path d="M4 6h16M4 12h16M4 18h12"/><circle cx="20" cy="18" r="2" fill="currentColor" stroke="none"/>',
    comments: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h7"/>',
    speaker: '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12.01" y2="6"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="6 11 9 11 11 7 13 14 15 10 18 10"/>',
    'default': '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>'
  };

  var ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function iconSvg(key) {
    var inner = ICONS[key] || ICONS['default'];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }

  function show() {
    overlay.classList.add('hidden');
    shell.classList.add('visible');
  }

  function redirectToLogin() {
    window.location.href = '/oauth2/sign_in';
  }

  // --- Rendering ---
  function renderApps(apps) {
    bandsEl.innerHTML = '';

    if (!apps.length) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    // Group by category, then order the bands.
    var groups = {};
    apps.forEach(function (app) {
      var cat = CATEGORIES[app.category] ? app.category : 'docs';
      (groups[cat] = groups[cat] || []).push(app);
    });

    var orderedCats = Object.keys(groups).sort(function (a, b) {
      return (CATEGORIES[a].order || 99) - (CATEGORIES[b].order || 99);
    });

    var html = orderedCats.map(function (cat) {
      var meta = CATEGORIES[cat];
      var cards = groups[cat].map(function (app) {
        return '' +
          '<a class="app-card" href="' + escapeHtml(app.path) + '" ' +
          'data-app-slug="' + escapeHtml(app.slug) + '" data-cat="' + escapeHtml(cat) + '">' +
            '<div class="app-card-top">' +
              '<span class="app-card-icon">' + iconSvg(app.icon) + '</span>' +
              '<span class="app-card-arrow">' + ARROW + '</span>' +
            '</div>' +
            '<h2 class="app-card-title">' + escapeHtml(app.displayName) + '</h2>' +
            '<p class="app-card-desc">' + escapeHtml(app.tagline) + '</p>' +
          '</a>';
      }).join('');

      return '' +
        '<section class="cat" data-cat="' + escapeHtml(cat) + '">' +
          '<div class="cat-head">' +
            '<span class="cat-dot"></span>' +
            '<span class="cat-name">' + escapeHtml(meta.label) + '</span>' +
            '<span class="cat-count">' + groups[cat].length + '</span>' +
            '<span class="cat-rule"></span>' +
          '</div>' +
          '<div class="apps-grid">' + cards + '</div>' +
        '</section>';
    }).join('');

    bandsEl.innerHTML = html;
  }

  // --- Theme ---
  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function showingDark() {
    var cur = document.documentElement.getAttribute('data-theme');
    return cur === 'dark' || (cur !== 'light' && prefersDark());
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = showingDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // --- Data loading ---
  function loadSession() {
    return fetch('/auth/session', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) {
        var email = (data.user && data.user.email) || '';
        if (email && userEmailEl) {
          userEmailEl.textContent = email;
          userEmailEl.title = email;
        }
        var perms = (data.user && data.user.permissions) || {};
        if (adminLinkEl) adminLinkEl.hidden = perms.isAdmin !== true;
        return data;
      });
  }

  function loadApps() {
    return fetch('/auth/apps', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (payload) {
        renderApps(Array.isArray(payload.data) ? payload.data : []);
      });
  }

  Promise.all([loadSession(), loadApps()])
    .then(function () {
      show();
      setInterval(function () {
        loadSession().catch(function () { redirectToLogin(); });
      }, 10 * 60 * 1000);
    })
    .catch(function () {
      redirectToLogin();
    });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch('/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      }).finally(function () {
        window.location.href = '/';
      });
    });
  }
})();
