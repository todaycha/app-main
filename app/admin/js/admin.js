// ChaChahome - Admin Console JS

(function () {
  'use strict';

  var overlay = document.getElementById('loadingOverlay');
  var shell = document.getElementById('appShell');
  var userEmailEl = document.getElementById('userEmail');
  var logoutBtn = document.getElementById('logoutBtn');
  var flashMessageEl = document.getElementById('flashMessage');
  var addUserForm = document.getElementById('addUserForm');
  var addUserEmailEl = document.getElementById('addUserEmail');
  var addAccessAllAppsEl = document.getElementById('addAccessAllApps');
  var addAppListEl = document.getElementById('addAppList');
  var userListEl = document.getElementById('userList');
  var loginAttemptListEl = document.getElementById('loginAttemptList');

  var state = {
    apps: [],
    users: [],
    loginAttempts: []
  };

  function show() {
    overlay.classList.add('hidden');
    shell.classList.add('visible');
  }

  function redirectToLogin() {
    window.location.href = '/oauth2/sign_in';
  }

  function redirectToAppHub() {
    window.location.href = '/app/';
  }

  function setFlash(kind, message) {
    if (!flashMessageEl) return;
    flashMessageEl.hidden = !message;
    flashMessageEl.className = 'flash-message anim-entry ' + (kind || 'success');
    flashMessageEl.textContent = message || '';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '없음';
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return value;
    }
  }

  function getPermissions(sessionData) {
    var permissions = (sessionData && sessionData.user && sessionData.user.permissions) || {};
    return {
      isAdmin: permissions.isAdmin === true,
      accessAllApps: permissions.accessAllApps === true,
      allowedApps: Array.isArray(permissions.allowedApps) ? permissions.allowedApps : []
    };
  }

  function requestJson(url, options) {
    var requestOptions = options || {};
    requestOptions.credentials = 'same-origin';
    requestOptions.headers = requestOptions.headers || {};

    if (requestOptions.body && !requestOptions.headers['Content-Type']) {
      requestOptions.headers['Content-Type'] = 'application/json';
    }

    return fetch(url, requestOptions).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (error) {
            data = {};
          }
        }

        if (!res.ok) {
          var requestError = new Error((data.error && data.error.message) || ('요청 실패 (' + res.status + ')'));
          requestError.status = res.status;
          requestError.code = data.error && data.error.code;
          throw requestError;
        }

        return data;
      });
    });
  }

  function handleRequestError(error) {
    if (error && error.status === 401) {
      redirectToLogin();
      return;
    }

    if (error && error.status === 403) {
      redirectToAppHub();
      return;
    }

    setFlash('error', error && error.message ? error.message : '요청에 실패했습니다.');
  }

  function loadSession() {
    return requestJson('/auth/session').then(function (sessionData) {
      var email = (sessionData.user && sessionData.user.email) || '';
      var permissions = getPermissions(sessionData);

      if (!permissions.isAdmin) {
        redirectToAppHub();
        throw new Error('관리자 권한이 필요합니다.');
      }

      if (userEmailEl) {
        userEmailEl.textContent = email;
        userEmailEl.title = email;
      }

      return sessionData;
    });
  }

  function renderAddAppList() {
    if (!addAppListEl) return;

    addAppListEl.innerHTML = state.apps.map(function (app) {
      return '' +
        '<label class="checkbox-row">' +
          '<input type="checkbox" data-app-slug="' + escapeHtml(app.slug) + '">' +
          '<span>' + escapeHtml(app.name) + '</span>' +
        '</label>';
    }).join('');

    syncChecklistDisabledState(addAppListEl, addAccessAllAppsEl && addAccessAllAppsEl.checked);
  }

  function renderChecklist(selectedApps, accessAllApps, disabled) {
    return state.apps.map(function (app) {
      var checked = selectedApps.indexOf(app.slug) !== -1;
      return '' +
        '<label class="checkbox-row">' +
          '<input type="checkbox" data-role="app-toggle" data-app-slug="' + escapeHtml(app.slug) + '"' +
            (checked ? ' checked' : '') +
            ((accessAllApps || disabled) ? ' disabled' : '') + '>' +
          '<span>' + escapeHtml(app.name) + '</span>' +
        '</label>';
    }).join('');
  }

  function renderUsers() {
    if (!userListEl) return;

    if (!state.users.length) {
      userListEl.innerHTML = '' +
        '<div class="empty-state">' +
          '<h3 class="empty-state-title">등록된 계정이 없습니다</h3>' +
          '<p class="empty-state-desc">왼쪽 양식을 사용하여 첫 번째 로그인 계정을 추가하세요.</p>' +
        '</div>';
      return;
    }

    userListEl.innerHTML = state.users.map(function (user) {
      var badgeClass = user.isAdmin ? 'admin' : 'user';
      var badgeLabel = user.isAdmin ? 'ADMIN' : 'USER';
      var selectedApps = Array.isArray(user.allowedApps) ? user.allowedApps : [];
      var lockedNote = user.isAdmin
        ? '<p class="inline-note">기본 관리자 계정입니다. 전체 접근 권한이 항상 적용됩니다.</p>'
        : '';
      var controls = user.isAdmin
        ? ''
        : '' +
          '<div class="account-section">' +
            '<label class="checkbox-row">' +
              '<input type="checkbox" data-role="access-all"' + (user.accessAllApps ? ' checked' : '') + '>' +
              '<span>모든 앱 허용</span>' +
            '</label>' +
            '<div class="checklist compact">' + renderChecklist(selectedApps, user.accessAllApps, false) + '</div>' +
          '</div>' +
          '<div class="account-actions">' +
            '<button class="secondary-btn" type="button" data-action="save">저장</button>' +
            '<button class="danger-btn" type="button" data-action="delete">삭제</button>' +
          '</div>';

      return '' +
        '<article class="account-card" data-user-id="' + escapeHtml(user.userId) + '">' +
          '<div class="account-head">' +
            '<div>' +
              '<h3 class="account-title">' + escapeHtml(user.email) + '</h3>' +
              '<p class="account-meta">마지막 로그인: ' + escapeHtml(formatDate(user.lastLoginAt)) + '</p>' +
            '</div>' +
            '<span class="account-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
          '</div>' +
          '<div class="account-section">' +
            '<p class="inline-note">생성일: ' + escapeHtml(formatDate(user.createdAt)) + '</p>' +
            lockedNote +
          '</div>' +
          controls +
        '</article>';
    }).join('');
  }

  function renderLoginAttempts() {
    if (!loginAttemptListEl) return;

    if (!state.loginAttempts.length) {
      loginAttemptListEl.innerHTML = '' +
        '<div class="empty-state">' +
          '<h3 class="empty-state-title">기록 없음</h3>' +
          '<p class="empty-state-desc">미등록 계정의 로그인 시도가 없습니다.</p>' +
        '</div>';
      return;
    }

    loginAttemptListEl.innerHTML = state.loginAttempts.map(function (attempt) {
      return '' +
        '<div class="attempt-row">' +
          '<div class="attempt-info">' +
            '<span class="attempt-email">' + escapeHtml(attempt.email) + '</span>' +
            '<span class="attempt-meta">' + escapeHtml(formatDate(attempt.lastAttemptAt)) +
              ' · ' + attempt.attemptCount + '회</span>' +
          '</div>' +
          '<button class="secondary-btn compact-btn" type="button" data-action="fill-email" data-email="' + escapeHtml(attempt.email) + '">추가</button>' +
        '</div>';
    }).join('');
  }

  function syncChecklistDisabledState(scope, disabled) {
    var checkboxes = scope.querySelectorAll('input[data-role="app-toggle"], input[data-app-slug]');
    Array.prototype.forEach.call(checkboxes, function (checkbox) {
      checkbox.disabled = !!disabled;
    });
  }

  function collectSelectedApps(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll('input[data-role="app-toggle"]:checked, input[data-app-slug]:checked'))
      .map(function (checkbox) {
        return checkbox.getAttribute('data-app-slug');
      })
      .filter(Boolean);
  }

  function refreshData() {
    return Promise.all([
      requestJson('/auth/admin/apps'),
      requestJson('/auth/admin/users'),
      requestJson('/auth/admin/login-attempts')
    ]).then(function (results) {
      state.apps = results[0].data || [];
      state.users = results[1].data || [];
      state.loginAttempts = results[2].data || [];
      renderAddAppList();
      renderUsers();
      renderLoginAttempts();
      setFlash('', '');
    });
  }

  function handleAddUser(event) {
    event.preventDefault();

    requestJson('/auth/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: addUserEmailEl.value,
        accessAllApps: !!(addAccessAllAppsEl && addAccessAllAppsEl.checked),
        appSlugs: collectSelectedApps(addAppListEl)
      })
    }).then(function () {
      addUserForm.reset();
      renderAddAppList();
      setFlash('success', '계정이 추가되었습니다.');
      return refreshData();
    }).catch(handleRequestError);
  }

  function handleSaveUser(card) {
    var userId = card.getAttribute('data-user-id');
    var accessAll = !!card.querySelector('input[data-role="access-all"]:checked');

    requestJson('/auth/admin/users/' + encodeURIComponent(userId), {
      method: 'PUT',
      body: JSON.stringify({
        accessAllApps: accessAll,
        appSlugs: collectSelectedApps(card)
      })
    }).then(function () {
      setFlash('success', '계정이 수정되었습니다.');
      return refreshData();
    }).catch(handleRequestError);
  }

  function handleDeleteUser(card) {
    var userId = card.getAttribute('data-user-id');
    var emailEl = card.querySelector('.account-title');
    var email = emailEl ? emailEl.textContent : '이 계정';

    if (!window.confirm(email + '의 접근 권한을 삭제하시겠습니까?')) {
      return;
    }

    requestJson('/auth/admin/users/' + encodeURIComponent(userId), {
      method: 'DELETE'
    }).then(function () {
      setFlash('success', '계정이 삭제되었습니다.');
      return refreshData();
    }).catch(handleRequestError);
  }

  if (addAccessAllAppsEl) {
    addAccessAllAppsEl.addEventListener('change', function () {
      syncChecklistDisabledState(addAppListEl, addAccessAllAppsEl.checked);
    });
  }

  if (addUserForm) {
    addUserForm.addEventListener('submit', handleAddUser);
  }

  if (userListEl) {
    userListEl.addEventListener('change', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.getAttribute('data-role') !== 'access-all') return;

      var card = target.closest('.account-card');
      if (!card) return;
      syncChecklistDisabledState(card, target.checked);
    });

    userListEl.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;

      var button = target.closest('button[data-action]');
      if (!button) return;

      var card = button.closest('.account-card');
      if (!card) return;

      var action = button.getAttribute('data-action');
      if (action === 'save') {
        handleSaveUser(card);
      } else if (action === 'delete') {
        handleDeleteUser(card);
      }
    });
  }

  if (loginAttemptListEl) {
    loginAttemptListEl.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;

      var button = target.closest('button[data-action="fill-email"]');
      if (!button) return;

      var email = button.getAttribute('data-email');
      if (!email || !addUserEmailEl) return;

      addUserEmailEl.value = email;
      addUserEmailEl.focus();
      addUserEmailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

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

  loadSession()
    .then(function () {
      return refreshData();
    })
    .then(function () {
      show();
      setInterval(function () {
        loadSession().catch(function () {
          redirectToLogin();
        });
      }, 10 * 60 * 1000);
    })
    .catch(handleRequestError);
})();
