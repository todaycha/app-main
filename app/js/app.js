// ChaChahome - App Hub JS

(function () {
  'use strict';

  var overlay = document.getElementById('loadingOverlay');
  var shell = document.getElementById('appShell');
  var userEmailEl = document.getElementById('userEmail');
  var logoutBtn = document.getElementById('logoutBtn');

  function show() {
    overlay.classList.add('hidden');
    shell.classList.add('visible');
  }

  function redirectToLogin() {
    window.location.href = '/oauth2/sign_in';
  }

  // Session check
  fetch('/auth/session', { credentials: 'same-origin' })
    .then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function (data) {
      var email = (data.user && data.user.email) || '';
      if (email && userEmailEl) {
        userEmailEl.textContent = email;
      }
      show();
      // AT 만료 전 주기적 세션 갱신 (AT TTL 15분 → 10분 간격)
      setInterval(function () {
        fetch('/auth/session', { credentials: 'same-origin' })
          .then(function (res) { if (!res.ok) redirectToLogin(); })
          .catch(function () {});
      }, 10 * 60 * 1000);
    })
    .catch(function () {
      redirectToLogin();
    });

  // Logout
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
