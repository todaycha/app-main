// ChaChahome - App Hub JS

(function () {
  'use strict';

  var overlay = document.getElementById('loadingOverlay');
  var shell = document.getElementById('appShell');
  var userEmailEl = document.getElementById('userEmail');
  var adminLinkEl = document.getElementById('adminLink');
  var logoutBtn = document.getElementById('logoutBtn');
  var appCards = Array.prototype.slice.call(document.querySelectorAll('[data-app-slug]'));
  var emptyStateEl = document.getElementById('emptyState');

  function show() {
    overlay.classList.add('hidden');
    shell.classList.add('visible');
  }

  function redirectToLogin() {
    window.location.href = '/oauth2/sign_in';
  }

  function getPermissions(data) {
    var permissions = (data && data.user && data.user.permissions) || {};
    return {
      isAdmin: permissions.isAdmin === true,
      accessAllApps: permissions.accessAllApps === true,
      allowedApps: Array.isArray(permissions.allowedApps) ? permissions.allowedApps : []
    };
  }

  function canAccessApp(slug, permissions) {
    return permissions.isAdmin || permissions.accessAllApps || permissions.allowedApps.indexOf(slug) !== -1;
  }

  function applyPermissions(permissions) {
    var visibleCount = 0;

    appCards.forEach(function (card) {
      var slug = card.getAttribute('data-app-slug') || '';
      var visible = canAccessApp(slug, permissions);

      card.hidden = !visible;
      card.classList.toggle('is-hidden', !visible);
      if (visible) visibleCount += 1;
    });

    if (adminLinkEl) {
      adminLinkEl.hidden = !permissions.isAdmin;
    }

    if (emptyStateEl) {
      emptyStateEl.hidden = visibleCount > 0;
    }
  }

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

        applyPermissions(getPermissions(data));
        return data;
      });
  }

  loadSession()
    .then(function () {
      show();
      setInterval(function () {
        loadSession().catch(function () {
          redirectToLogin();
        });
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
