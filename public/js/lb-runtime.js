/*
 * iSchool static-shell runtime (Task 4 migration — zero CF Workers).
 *
 * The dashboard, portal and admin surfaces are 100% static pages. This
 * runtime provides the dynamic layer entirely against lightbase:
 *
 *   - Auth: lightbase Auth (signup/login/refresh/logout/MFA) with JWT
 *     access/refresh tokens. Access token lives in sessionStorage (short
 *     TTL, 900 s by default); refresh token lives in localStorage and is
 *     rotated on every refresh. No httpOnly cookies are possible on a
 *     purely static host — the security model is documented in
 *     DEPLOYMENT.md section 5.
 *   - Data: school-scoped CRUD via the `school-crud` Edge Function
 *     (auth mode `user`), platform-admin ops via `platform-admin`,
 *     onboarding via `onboarding-create`, public form/submit endpoints
 *     via public Edge Functions.
 *
 * Configuration is baked at build time into window.LB_CONFIG by the shell
 * layouts (PUBLIC_LIGHTBASE_BASE_URL / PUBLIC_LIGHTBASE_PROJECT).
 */
(function () {
  'use strict';

  var CFG = window.LB_CONFIG || {};
  var BASE = (CFG.baseUrl || '').replace(/\/$/, '');
  var PROJECT = CFG.project || 'ischool';
  var API = BASE + '/api/v1';

  // ------------------------------------------------------------------
  // Token storage + session
  // ------------------------------------------------------------------

  var ACCESS_KEY = 'lb_access_token';
  var REFRESH_KEY = 'lb_refresh_token';

  function getAccess() {
    try { return sessionStorage.getItem(ACCESS_KEY) || ''; } catch (e) { return ''; }
  }
  function setAccess(token) {
    try { token ? sessionStorage.setItem(ACCESS_KEY, token) : sessionStorage.removeItem(ACCESS_KEY); } catch (e) { /* ignore */ }
  }
  function getRefresh() {
    try { return localStorage.getItem(REFRESH_KEY) || ''; } catch (e) { return ''; }
  }
  function setRefresh(token) {
    try { token ? localStorage.setItem(REFRESH_KEY, token) : localStorage.removeItem(REFRESH_KEY); } catch (e) { /* ignore */ }
  }

  function b64urlDecode(seg) {
    var s = seg.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }
  function tokenPayload(token) {
    try {
      var parts = String(token).split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(b64urlDecode(parts[1]));
    } catch (e) { return null; }
  }
  function accessExpired() {
    var t = getAccess();
    if (!t) return true;
    var p = tokenPayload(t);
    if (!p || !p.exp) return true;
    return Date.now() / 1000 > p.exp - 15; // 15 s skew
  }

  var refreshPromise = null;
  function refreshSession() {
    if (refreshPromise) return refreshPromise;
    var rt = getRefresh();
    if (!rt) return Promise.resolve(false);
    refreshPromise = fetch(API + '/auth/refresh?project=' + encodeURIComponent(PROJECT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    }).then(function (res) {
      if (!res.ok) return false;
      return res.json().then(function (data) {
        if (!data || !data.accessToken) return false;
        setAccess(data.accessToken);
        if (data.refreshToken) setRefresh(data.refreshToken);
        return true;
      });
    }).catch(function () { return false; }).then(function (ok) {
      refreshPromise = null;
      if (!ok) clearSession();
      return ok;
    });
    return refreshPromise;
  }

  function clearSession() {
    setAccess('');
    setRefresh('');
    window.LB_SESSION = null;
  }

  // ------------------------------------------------------------------
  // HTTP helpers
  // ------------------------------------------------------------------

  function authHeaders() {
    var h = {};
    var t = getAccess();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders(), opts.headers || {});
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      if (res.status === 401 && getRefresh()) {
        return refreshSession().then(function (ok) {
          if (!ok) throw new Error('session expired');
          return api(path, opts);
        });
      }
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var msg = (data && data.error && data.error.message) || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  /**
   * Invoke an Edge Function. User-mode functions need only the session
   * bearer token (no apikey from the browser, ever).
   */
  function invoke(name, body) {
    return api('/projects/' + encodeURIComponent(PROJECT) + '/functions/' + encodeURIComponent(name) + '/invoke', {
      method: 'POST',
      body: { body: body || {} },
    }).then(function (res) {
      if (res && res.ok === false) throw new Error(res.error || 'function failed');
      return res ? (res.result !== undefined ? res.result : res) : null;
    });
  }

  /**
   * School-scoped CRUD through the `school-crud` Edge Function.
   * ops: list | get | create | update | delete | count
   */
  function crud(op, collection, payload) {
    payload = payload || {};
    return invoke('school-crud', {
      action: op,
      collection: collection,
      id: payload.id,
      data: payload.data,
      filter: payload.filter,
      sort: payload.sort,
      limit: payload.limit,
      schoolId: payload.schoolId,
      search: payload.search,
    }).then(function (res) {
      if (res && res.ok === false) throw new Error(res.error || 'crud failed');
      return res;
    });
  }

  // ------------------------------------------------------------------
  // Session bootstrap for shells
  // ------------------------------------------------------------------

  function login(email, password, mfaCode) {
    var body = { email: email, password: password };
    if (mfaCode) body.mfaCode = mfaCode;
    return api('/auth/login?project=' + encodeURIComponent(PROJECT), { method: 'POST', body: body })
      .then(function (data) {
        if (data && data.mfaRequired) return data;
        setAccess(data.accessToken);
        setRefresh(data.refreshToken);
        return loadProfile().then(function (profile) {
          return { user: profile, data: data };
        });
      });
  }

  function signup(email, password, name, customFields) {
    return api('/auth/signup?project=' + encodeURIComponent(PROJECT), {
      method: 'POST',
      body: { email: email, password: password, name: name, customFields: customFields || {} },
    }).then(function (data) {
      setAccess(data.accessToken);
      setRefresh(data.refreshToken);
      return data;
    });
  }

  function loadProfile() {
    return api('/auth/me?project=' + encodeURIComponent(PROJECT)).then(function (me) {
      return (me && me.user) ? me.user : me;
    });
  }

  function logout() {
    var t = getAccess();
    var done = t
      ? api('/auth/logout?project=' + encodeURIComponent(PROJECT), { method: 'POST', body: {} }).catch(function () {})
      : Promise.resolve();
    return done.then(function () {
      clearSession();
      window.location.href = '/auth/login';
    });
  }

  function handleUnauthenticated() {
    var here = window.location.pathname + window.location.search;
    window.location.href = '/auth/login?redirect=' + encodeURIComponent(here);
  }

  /**
   * ensureSession(roles): resolves the session or redirects to login.
   * Returns a promise with { user, school, memberships, stats } from
   * dashboard-bootstrap (falls back to /auth/me only for admin mode).
   */
  function ensureSession(opts) {
    opts = opts || {};
    var ready = accessExpired() ? refreshSession() : Promise.resolve(true);
    return ready.then(function (ok) {
      if (!ok && !getAccess()) return handleUnauthenticated();
      var fn = opts.bootstrap === false
        ? loadProfile().then(function (user) { return { user: user }; })
        : invoke('dashboard-bootstrap', {}).catch(function (e) {
            if (e && e.status === 401) return handleUnauthenticated();
            // Bootstrap failed (function missing / engine down): fall back to profile only.
            return loadProfile().then(function (user) { return { user: user, degraded: true }; });
          });
      return fn.then(function (session) {
        var role = sessionRole(session);
        if (opts.roles && opts.roles.indexOf(role) === -1) {
          window.location.href = roleHome(role);
          throw new Error('forbidden');
        }
        window.LB_SESSION = session;
        fillChrome(session);
        return session;
      });
    });
  }

  function sessionRole(session) {
    if (!session || !session.user) return null;
    var u = session.user;
    return (u.customFields && u.customFields.role) || u.role || 'member';
  }

  function roleHome(role) {
    if (role === 'student') return '/portal/student';
    if (role === 'teacher') return '/portal/teacher';
    if (role === 'parent') return '/portal/parent';
    if (role === 'super_admin') return '/admin';
    return '/dashboard';
  }

  function fillChrome(session) {
    var u = session && session.user;
    if (!u) return;
    var school = session.school;
    var set = function (id, val) {
      var el = document.getElementById(id);
      if (el && val) el.textContent = val;
    };
    set('lb-user-initial', (u.name || u.email || 'U').charAt(0).toUpperCase());
    set('lb-user-name', u.name || u.email);
    set('lb-user-email', u.email);
    set('lb-school-name', (school && school.name) || 'iSchool');
  }

  // ------------------------------------------------------------------
  // Generic shell workspace (list / create / edit / detail / stats)
  // ------------------------------------------------------------------

  var FIELD_MAP = {
    announcements: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'content', label: 'Content', type: 'textarea' },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea' },
      { name: 'banner_image_url', label: 'Banner image URL', type: 'text' },
      { name: 'cta_text', label: 'CTA text', type: 'text' },
      { name: 'cta_url', label: 'CTA URL', type: 'text' },
      { name: 'is_pinned', label: 'Pinned', type: 'checkbox' },
      { name: 'published', label: 'Published', type: 'checkbox', default: true },
    ],
    blog_posts: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'content', label: 'Content', type: 'textarea' },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea' },
      { name: 'cover_image_url', label: 'Cover image URL', type: 'text' },
      { name: 'author', label: 'Author', type: 'text' },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['published', 'draft'], default: 'published' },
    ],
    programs: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'content', label: 'Content', type: 'textarea' },
      { name: 'is_published', label: 'Published', type: 'checkbox', default: true },
      { name: 'sort_order', label: 'Sort order', type: 'number' },
    ],
    classes: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'grade_level', label: 'Grade level', type: 'text' },
      { name: 'section', label: 'Section', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'teacher_name', label: 'Homeroom teacher', type: 'text' },
      { name: 'capacity', label: 'Capacity', type: 'number' },
      { name: 'has_detail_page', label: 'Has detail page', type: 'checkbox', default: true },
    ],
    faqs: [
      { name: 'question', label: 'Question', type: 'text', required: true },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'sort_order', label: 'Sort order', type: 'number' },
      { name: 'is_published', label: 'Published', type: 'checkbox', default: true },
    ],
    students: [
      { name: 'first_name', label: 'First name', type: 'text', required: true },
      { name: 'last_name', label: 'Last name', type: 'text', required: true },
      { name: 'student_id', label: 'Student ID', type: 'text' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['', 'male', 'female'] },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'date_of_birth', label: 'Date of birth', type: 'text' },
      { name: 'parent_name', label: 'Parent name', type: 'text' },
      { name: 'parent_phone', label: 'Parent phone', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'graduated'], default: 'active' },
    ],
    contact_info: [
      { name: 'label', label: 'Label', type: 'text', required: true },
      { name: 'value', label: 'Value', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text' },
      { name: 'sort_order', label: 'Sort order', type: 'number' },
    ],
    navigation_items: [
      { name: 'label', label: 'Label', type: 'text', required: true },
      { name: 'url', label: 'URL', type: 'text', required: true },
      { name: 'sort_order', label: 'Sort order', type: 'number' },
      { name: 'is_external', label: 'External', type: 'checkbox' },
    ],
    gallery_items: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'image_url', label: 'Image URL', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'sort_order', label: 'Sort order', type: 'number' },
      { name: 'is_published', label: 'Published', type: 'checkbox', default: true },
    ],
    admission_periods: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'open_date', label: 'Open date (YYYY-MM-DD)', type: 'text' },
      { name: 'close_date', label: 'Close date (YYYY-MM-DD)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'is_active', label: 'Active', type: 'checkbox' },
    ],
    forms: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'fields', label: 'Fields (JSON array)', type: 'textarea', json: true },
      { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
    ],
    banners: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'image_url', label: 'Image URL', type: 'text' },
      { name: 'link_url', label: 'Link URL', type: 'text' },
      { name: 'position', label: 'Position', type: 'text' },
      { name: 'start_date', label: 'Start date', type: 'text' },
      { name: 'end_date', label: 'End date', type: 'text' },
      { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
    ],
    popups: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'content', label: 'Content', type: 'textarea' },
      { name: 'image_url', label: 'Image URL', type: 'text' },
      { name: 'button_text', label: 'Button text', type: 'text' },
      { name: 'button_url', label: 'Button URL', type: 'text' },
      { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
    ],
  };

  var TITLE_KEYS = ['title', 'name', 'question', 'first_name', 'label', 'student_id', 'subject'];
  var SUB_KEYS = ['excerpt', 'description', 'answer', 'content', 'value', 'email'];

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fieldsFor(collection) {
    return FIELD_MAP[collection] || null;
  }

  function itemTitle(item) {
    for (var i = 0; i < TITLE_KEYS.length; i++) {
      if (item[TITLE_KEYS[i]]) return String(item[TITLE_KEYS[i]]);
    }
    return item.id || '(untitled)';
  }
  function itemSub(item) {
    for (var i = 0; i < SUB_KEYS.length; i++) {
      if (item[SUB_KEYS[i]]) return String(item[SUB_KEYS[i]]).slice(0, 120);
    }
    return '';
  }

  function banner(kind, msg) {
    var el = document.getElementById('lb-shell-banner');
    if (!el) return;
    el.className = 'mb-4 p-4 rounded-xl text-sm ' + (kind === 'error'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-green-50 text-green-700 border border-green-200');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('hidden'); }, 5000);
  }

  function renderList(host, cfg) {
    host.innerHTML = '<div class="mb-6 flex items-center justify-between">' +
      '<div><h1 class="text-2xl font-bold" style="font-family:\'Space Grotesk\',sans-serif;color:var(--mosaic-text)">' + esc(cfg.title) + '</h1>' +
      '<p class="text-sm" style="color:var(--mosaic-text-muted)">Managed via lightbase (school-crud Edge Function).</p></div>' +
      (cfg.readOnly ? '' : '<a href="?mode=new" class="mosaic-btn-primary inline-block px-5 py-2.5 text-sm">+ New</a>') +
      '</div><div id="lb-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>';
    var listEl = document.getElementById('lb-list');
    listEl.innerHTML = '<p class="text-sm p-6" style="color:var(--mosaic-text-muted)">Loading…</p>';
    crud('list', cfg.collection, { limit: 200 }).then(function (res) {
      var items = (res && (res.data || res.items)) || [];
      if (!items.length) {
        listEl.innerHTML = '<div class="col-span-full mosaic-card p-12 text-center"><h3 class="text-base font-semibold mb-1" style="color:var(--mosaic-text)">No records yet</h3>' +
          (cfg.readOnly ? '' : '<a href="?mode=new" class="mosaic-btn-primary inline-block px-6 py-2.5 text-sm mt-2">+ New</a>') + '</div>';
        return;
      }
      listEl.innerHTML = items.map(function (item) {
        return '<div class="mosaic-card p-5 group">' +
          '<h3 class="text-sm font-bold mb-1" style="color:var(--mosaic-text)">' + esc(itemTitle(item)) + '</h3>' +
          '<p class="text-xs line-clamp-2 mb-3" style="color:var(--mosaic-text-muted)">' + esc(itemSub(item)) + '</p>' +
          '<div class="flex items-center justify-between">' +
          '<span class="text-[11px]" style="color:var(--mosaic-text-subtle)">' + esc(String(item.created_at || item.createdAt || '').slice(0, 10)) + '</span>' +
          (cfg.readOnly ? '' :
            '<span class="flex gap-2">' +
            '<a href="?mode=edit&id=' + encodeURIComponent(item.id) + '" class="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-100" style="color:var(--mosaic-text-muted)">Edit</a>' +
            '<button type="button" data-del="' + esc(item.id) + '" class="text-xs font-semibold px-2 py-1 rounded-lg text-red-600 hover:bg-red-50">Delete</button>' +
            '</span>') +
          '</div></div>';
      }).join('');
      listEl.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!window.confirm('Delete this record?')) return;
          crud('delete', cfg.collection, { id: btn.getAttribute('data-del') }).then(function () {
            banner('ok', 'Deleted.');
            renderList(host, cfg);
          }, function (e) { banner('error', 'Delete failed: ' + e.message); });
        });
      });
    }, function (e) {
      listEl.innerHTML = '<div class="col-span-full mosaic-card p-8 text-center text-sm text-red-600">Failed to load ' + esc(cfg.collection) + ': ' + esc(e.message) + '</div>';
    });
  }

  function renderForm(host, cfg, existing) {
    var fields = cfg.fields || fieldsFor(cfg.collection) || null;
    var isEdit = !!(existing && existing.id);
    if (!fields) {
      // Generic JSON editor fallback for collections without a baked schema.
      fields = [{ name: '__json', label: 'Document (JSON)', type: 'textarea', json: true, full: true }];
    }
    host.innerHTML = '<div class="mb-6"><h1 class="text-2xl font-bold" style="font-family:\'Space Grotesk\',sans-serif;color:var(--mosaic-text)">' +
      esc((isEdit ? 'Edit ' : 'New ') + cfg.title) + '</h1>' +
      '<p class="text-sm" style="color:var(--mosaic-text-muted)">Saved through lightbase (school-crud Edge Function).</p></div>' +
      '<form id="lb-form" class="mosaic-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">' +
      fields.map(function (f) {
        var val = existing ? existing[f.name] : (f.default !== undefined ? f.default : '');
        if (f.json && val && typeof val === 'object') val = JSON.stringify(val, null, 2);
        var input;
        if (f.type === 'textarea') {
          input = '<textarea name="' + esc(f.name) + '" rows="5" class="w-full px-3 py-2 border rounded-xl text-sm" style="border-color:var(--mosaic-border);background:var(--mosaic-surface);color:var(--mosaic-text)">' + esc(val) + '</textarea>';
        } else if (f.type === 'checkbox') {
          input = '<input type="checkbox" name="' + esc(f.name) + '"' + (val === true || val === 1 ? ' checked' : '') + ' class="w-4 h-4">';
        } else if (f.type === 'select') {
          input = '<select name="' + esc(f.name) + '" class="w-full px-3 py-2 border rounded-xl text-sm" style="border-color:var(--mosaic-border);background:var(--mosaic-surface);color:var(--mosaic-text)">' +
            (f.options || []).map(function (o) { return '<option value="' + esc(o) + '"' + (val === o ? ' selected' : '') + '>' + esc(o || '-') + '</option>'; }).join('') + '</select>';
        } else {
          input = '<input type="' + (f.type === 'number' ? 'number' : 'text') + '" name="' + esc(f.name) + '" value="' + esc(val) + '" class="w-full px-3 py-2 border rounded-xl text-sm" style="border-color:var(--mosaic-border);background:var(--mosaic-surface);color:var(--mosaic-text)">';
        }
        return '<div class="' + (f.type === 'textarea' || f.full ? 'md:col-span-2' : '') + '">' +
          '<label class="block text-xs font-semibold mb-1" style="color:var(--mosaic-text-muted)">' + esc(f.label) + '</label>' + input + '</div>';
      }).join('') +
      '<div class="md:col-span-2 flex gap-3">' +
      '<button type="submit" class="mosaic-btn-primary px-6 py-2.5 text-sm">' + (isEdit ? 'Save changes' : 'Create') + '</button>' +
      '<a href="' + esc(cfg.backHref || ('/dashboard/' + cfg.collection).replace('_posts', '/blog').replace('_items', '')) + '" class="px-6 py-2.5 text-sm rounded-xl border" style="border-color:var(--mosaic-border);color:var(--mosaic-text-muted)">Cancel</a>' +
      '</div></form>';

    document.getElementById('lb-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = {};
      var form = ev.target;
      if (fields.length === 1 && fields[0].json) {
        try { data = JSON.parse(form.elements['__json'].value || '{}'); }
        catch (e) { banner('error', 'Invalid JSON: ' + e.message); return; }
      } else {
        fields.forEach(function (f) {
          var v;
          if (f.type === 'checkbox') v = form.elements[f.name].checked;
          else if (f.type === 'number') v = form.elements[f.name].value === '' ? null : Number(form.elements[f.name].value);
          else v = form.elements[f.name].value;
          if (f.json && typeof v === 'string' && v.trim()) {
            try { v = JSON.parse(v); } catch (e) { banner('error', f.label + ' must be valid JSON'); throw e; }
          }
          if (v !== '' && v !== null || f.required) data[f.name] = v;
        });
      }
      var req;
      if (isEdit) req = crud('update', cfg.collection, { id: existing.id, data: data });
      else req = crud('create', cfg.collection, { data: data });
      req.then(function () {
        window.location.href = cfg.backHref || ('/dashboard/' + cfg.collection).replace('_posts', '/blog').replace('_items', '');
      }, function (e) { banner('error', 'Save failed: ' + e.message); });
    });
  }

  function renderStats(host, session) {
    host.innerHTML = '<div class="mb-6"><h1 class="text-2xl font-bold" style="font-family:\'Space Grotesk\',sans-serif;color:var(--mosaic-text)">Overview</h1>' +
      '<p class="text-sm" style="color:var(--mosaic-text-muted)">Live counts from lightbase (dashboard-bootstrap Edge Function).</p></div>' +
      '<div id="lb-stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4"><p class="text-sm p-6" style="color:var(--mosaic-text-muted)">Loading…</p></div>' +
      '<div id="lb-recent" class="mt-8"></div>';
    var stats = session && session.stats;
    var el = document.getElementById('lb-stats');
    if (session && session.degraded) {
      el.innerHTML = '<div class="col-span-full mosaic-card p-6 text-sm" style="color:var(--mosaic-text-muted)">Session loaded, but live stats are unavailable (dashboard-bootstrap function unreachable).</div>';
    } else if (stats) {
      var cards = [
        ['Students', stats.students], ['Staff', stats.staff], ['Announcements', stats.announcements],
        ['Blog posts', stats.posts], ['Classes', stats.classes], ['Programs', stats.programs],
        ['Gallery items', stats.gallery], ['FAQs', stats.faqs], ['Admissions', stats.applications],
      ];
      el.innerHTML = cards.map(function (c) {
        return '<div class="mosaic-card p-5"><p class="text-[11px] font-bold uppercase tracking-wider" style="color:var(--mosaic-text-subtle)">' + esc(c[0]) + '</p>' +
          '<p class="text-3xl font-black mt-1" style="color:var(--mosaic-text)">' + esc(String(c[1] === undefined ? '-' : c[1])) + '</p></div>';
      }).join('');
    } else {
      el.innerHTML = '<div class="col-span-full mosaic-card p-6 text-sm" style="color:var(--mosaic-text-muted)">No school linked to this account yet. Complete onboarding to create one.</div>';
    }
  }

  function mountWorkspace() {
    var host = document.getElementById('lb-workspace');
    if (!host) return;
    var cfg = window.LB_SHELL || {};
    var mode = cfg.mode || 'list';
    var params = new URLSearchParams(window.location.search);

    if (mode === 'stats') {
      ensureSession({ roles: cfg.roles }).then(function (session) { renderStats(host, session); });
      return;
    }
    if (mode && mode.indexOf('admin') === 0) {
      ensureSession({ roles: cfg.roles || ['super_admin'] }).then(function () { mountAdmin(host, cfg, mode, params); });
      return;
    }
    if (mode === 'portal') {
      ensureSession({ roles: cfg.roles }).then(function (session) { renderPortal(host, session); });
      return;
    }
    ensureSession({ roles: cfg.roles }).then(function (session) {
      var schoolId = session && session.school ? session.school.id : (session && session.schoolId);
      cfg.schoolId = schoolId;
      var editId = params.get('id');
      var qmode = params.get('mode');
      if (mode === 'create') { renderForm(host, cfg, null); return; }
      if (mode === 'list' && qmode === 'new' && !cfg.readOnly) { renderForm(host, cfg, null); return; }
      if ((mode === 'list' && qmode === 'edit' && editId) || mode === 'edit') {
        crud('get', cfg.collection, { id: editId }).then(function (res) {
          var doc = res && (res.document || res.data);
          renderForm(host, cfg, doc);
        }, function (e) { banner('error', 'Load failed: ' + e.message); renderList(host, cfg); });
        return;
      }
      if (mode === 'detail' && editId) {
        crud('get', cfg.collection, { id: editId }).then(function (res) {
          var doc = res && (res.document || res.data);
          host.innerHTML = '<div class="mosaic-card p-6 max-w-3xl"><pre class="text-xs overflow-auto" style="color:var(--mosaic-text)">' + esc(JSON.stringify(doc, null, 2)) + '</pre></div>';
        }, function (e) { banner('error', 'Load failed: ' + e.message); });
        return;
      }
      renderList(host, cfg);
    });
  }

  // ------------------------------------------------------------------
  // Admin workspaces (platform-admin Edge Function)
  // ------------------------------------------------------------------

  function mountAdmin(host, cfg, mode, params) {
    if (mode === 'admin-overview' || !cfg.collection || cfg.collection === 'index') {
      host.innerHTML = '<div class="mb-6"><h1 class="text-2xl font-bold text-gray-900">Platform Admin</h1>' +
        '<p class="text-sm text-gray-500">Managed via the platform-admin lightbase Edge Function.</p></div>' +
        '<div id="lb-admin" class="grid grid-cols-1 lg:grid-cols-3 gap-6"><p class="text-sm p-6 text-gray-500">Loading…</p></div>';
      invoke('platform-admin', { action: 'overview' }).then(function (res) {
        var el = document.getElementById('lb-admin');
        var o = res || {};
        var cards = [
          ['Schools', o.schools], ['Users', o.users], ['Plans', o.plans],
          ['Coupons', o.coupons], ['Blog posts', o.posts], ['Docs', o.docs],
        ];
        el.innerHTML = cards.map(function (c) {
          return '<div class="bg-white rounded-2xl border border-gray-200 p-6"><p class="text-xs font-bold uppercase tracking-wider text-gray-400">' + esc(c[0]) + '</p>' +
            '<p class="text-3xl font-black text-gray-900 mt-1">' + esc(String(c[1] === undefined ? '-' : c[1])) + '</p></div>';
        }).join('');
      }, function (e) {
        document.getElementById('lb-admin').innerHTML = '<div class="col-span-full bg-white rounded-2xl border border-gray-200 p-6 text-sm text-red-600">' + esc(e.message) + '</div>';
      });
      return;
    }

    // Generic admin collection list (read) with JSON create/edit.
    host.innerHTML = '<div class="mb-6 flex items-center justify-between">' +
      '<div><h1 class="text-2xl font-bold text-gray-900">' + esc(cfg.title) + '</h1>' +
      '<p class="text-sm text-gray-500">Collection: ' + esc(cfg.collection) + ' (platform-admin Edge Function).</p></div>' +
      '<button type="button" id="lb-admin-create" class="px-5 py-2.5 text-sm text-white bg-primary-600 rounded-xl hover:bg-primary-700">+ New (JSON)</button></div>' +
      '<div id="lb-admin-list" class="bg-white rounded-2xl border border-gray-200 overflow-hidden"><p class="text-sm p-6 text-gray-500">Loading…</p></div>';
    var listEl = document.getElementById('lb-admin-list');
    function loadAdminList() {
      invoke('platform-admin', { action: 'list', collection: cfg.collection, limit: 200 }).then(function (res) {
        var items = (res && (res.data || res.items)) || [];
        if (!items.length) { listEl.innerHTML = '<p class="text-sm p-6 text-gray-500">No records.</p>'; return; }
        listEl.innerHTML = '<table class="w-full text-sm"><thead><tr class="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">' +
          '<th class="px-5 py-3">Record</th><th class="px-5 py-3">ID</th><th class="px-5 py-3"></th></tr></thead><tbody>' +
          items.map(function (item) {
            return '<tr class="border-b border-gray-50"><td class="px-5 py-3 font-medium text-gray-900">' + esc(itemTitle(item)) + '</td>' +
              '<td class="px-5 py-3 text-gray-400 text-xs">' + esc(item.id || '') + '</td>' +
              '<td class="px-5 py-3 text-right"><button type="button" data-edit="' + esc(item.id) + '" class="text-xs font-semibold text-primary-600 hover:underline">Edit (JSON)</button></td></tr>';
          }).join('') + '</tbody></table>';
        listEl.querySelectorAll('[data-edit]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var item = items.find(function (x) { return String(x.id) === btn.getAttribute('data-edit'); });
            var raw = window.prompt('Edit document JSON:', JSON.stringify(item, null, 2));
            if (!raw) return;
            var patch;
            try { patch = JSON.parse(raw); } catch (e) { alert('Invalid JSON'); return; }
            invoke('platform-admin', { action: 'update', collection: cfg.collection, id: item.id, data: patch }).then(function () {
              banner('ok', 'Saved.'); loadAdminList();
            }, function (e) { banner('error', 'Save failed: ' + e.message); });
          });
        });
      }, function (e) {
        listEl.innerHTML = '<p class="text-sm p-6 text-red-600">' + esc(e.message) + '</p>';
      });
    }
    document.getElementById('lb-admin-create').addEventListener('click', function () {
      var raw = window.prompt('New document JSON ({}):', '{}');
      if (!raw) return;
      var doc;
      try { doc = JSON.parse(raw); } catch (e) { alert('Invalid JSON'); return; }
      invoke('platform-admin', { action: 'create', collection: cfg.collection, data: doc }).then(function () {
        banner('ok', 'Created.'); loadAdminList();
      }, function (e) { banner('error', 'Create failed: ' + e.message); });
    });
    loadAdminList();
  }

  function renderPortal(host, session) {
    var u = session && session.user ? session.user : {};
    var role = sessionRole(session) || 'member';
    host.innerHTML = '<div class="mb-6"><h1 class="text-2xl font-bold" style="color:var(--text)">My Portal</h1>' +
      '<p class="text-sm" style="color:var(--muted)">Signed in as ' + esc(u.name || u.email || '') + ' (' + esc(role) + ')</p></div>' +
      '<div id="lb-portal" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
      ['Assignments', 'Quizzes', 'Grades', 'Attendance', 'Fees', 'Timetable'].map(function (m) {
        return '<div class="rounded-2xl border p-6" style="border-color:var(--border);background:var(--surface)">' +
          '<p class="font-bold text-sm" style="color:var(--text)">' + esc(m) + '</p>' +
          '<p class="text-xs mt-1" style="color:var(--muted)">Module data loads through the lightbase school-crud Edge Function.</p></div>';
      }).join('') + '</div>';
  }

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------

  window.LbRuntime = {
    api: api,
    invoke: invoke,
    crud: crud,
    login: login,
    signup: signup,
    logout: logout,
    refresh: refreshSession,
    me: loadProfile,
    ensureSession: ensureSession,
    sessionRole: sessionRole,
    roleHome: roleHome,
    mountWorkspace: mountWorkspace,
    banner: banner,
    tokenPayload: tokenPayload,
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('lb-workspace')) mountWorkspace();
  });
})();
