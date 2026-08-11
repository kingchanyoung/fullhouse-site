/* FULLHOUSE ENTERTAINMENT — site behaviour (no dependencies) */
(function () {
  'use strict';

  /* ---------------------------------------------------- mobile nav ---- */
  var burger = document.querySelector('.hdr__burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
      mnav.hidden = open;
      document.body.style.overflow = open ? '' : 'hidden';
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        mnav.hidden = true;
        document.body.style.overflow = '';
      }
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mnav.hidden) burger.click();
    });
  }

  /* ------------------------------------------------- sticky header ---- */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------- reveal ----- */
  var rv = document.querySelectorAll('.rv');
  if (rv.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --------------------------------------------- marquee duplication -- */
  document.querySelectorAll('.mq__track[data-loop]').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ------------------------------------------------ creator filters --- */
  var board = document.getElementById('crew-board');
  if (board) {
    var cards = Array.prototype.slice.call(board.querySelectorAll('[data-crew]'));
    var countEl = document.getElementById('crew-count');
    var emptyEl = document.getElementById('crew-empty');
    var state = { tag: 'all', plat: 'all', q: '' };

    function apply() {
      var shown = 0;
      cards.forEach(function (el) {
        var okTag = state.tag === 'all' || (el.dataset.tags || '').split('|').indexOf(state.tag) > -1;
        var okPlat = state.plat === 'all' || (el.dataset.plat || '').split('|').indexOf(state.plat) > -1;
        var okQ = !state.q || (el.dataset.search || '').indexOf(state.q) > -1;
        var ok = okTag && okPlat && okQ;
        // [hidden] 이 무시되는 브라우저/스타일 충돌에 대비해 인라인으로도 지정
        el.hidden = !ok;
        el.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = String(shown);
      if (emptyEl) emptyEl.hidden = shown > 0;
      var p = new URLSearchParams();
      if (state.tag !== 'all') p.set('tag', state.tag);
      if (state.plat !== 'all') p.set('platform', state.plat);
      if (state.q) p.set('q', state.q);
      var qs = p.toString();
      history.replaceState(null, '', qs ? location.pathname + '?' + qs : location.pathname);
    }

    document.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.dataset.filter;
        var val = btn.dataset.value;
        state[group] = val;
        document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        apply();
      });
    });

    var search = document.getElementById('crew-search');
    if (search) {
      var t;
      search.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          state.q = search.value.trim().toLowerCase();
          apply();
        }, 160);
      });
    }

    // hydrate from URL
    var qp = new URLSearchParams(location.search);
    ['tag', 'platform', 'q'].forEach(function (k) {
      var v = qp.get(k);
      if (!v) return;
      if (k === 'q') {
        state.q = v.toLowerCase();
        if (search) search.value = v;
        return;
      }
      var group = k === 'platform' ? 'plat' : k;
      var btn = document.querySelector('[data-filter="' + group + '"][data-value="' + CSS.escape(v) + '"]');
      if (btn) {
        state[group] = v;
        document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
      }
    });
    apply();
  }

  /* ------------------------------------------------------- forms ------ */
  document.querySelectorAll('form[data-ajax]').forEach(function (form) {
    var msg = form.querySelector('.form-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '전송 중…'; }
      if (msg) msg.className = 'form-msg';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }   /* Formspree 는 이게 없으면 리다이렉트로 응답 */
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          /* 반드시 서버가 명시적으로 성공을 말해야만 성공으로 친다.
             HTTP 200 만 보고 판단하면, 엔드포인트가 없는 정적 호스팅에서
             아무 데도 안 갔는데 "접수 완료" 가 뜨는 사고가 난다.
             자체 PHP → ok / Web3Forms → success / Formspree → ok */
          if (data.ok === true || data.success === true) {
            if (msg) {
              msg.className = 'form-msg is-ok';
              /* 외부 폼 서비스는 영문 메시지를 주므로 우리 문구를 쓴다 */
              msg.textContent = '문의가 정상적으로 접수되었습니다. 영업일 기준 1일 내 회신드리겠습니다.';
            }
            form.reset();
          } else {
            throw new Error(data.message || '전송에 실패했습니다.');
          }
        })
        .catch(function (err) {
          if (msg) {
            msg.className = 'form-msg is-err';
            msg.innerHTML =
              (err.message || '전송에 실패했습니다.') +
              ' 잠시 후 다시 시도하시거나 <a href="mailto:' +
              (form.dataset.mail || 'ask@fullhousekorea.com') +
              '">메일로 문의</a>해 주세요.';
          }
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
    });
  });

  /* --------------------------------------------------- count-up ------- */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        nio.unobserve(el);
        var target = parseFloat(el.dataset.count);
        var dec = (el.dataset.count.split('.')[1] || '').length;
        var start = performance.now();
        var dur = 1100;
        var fmt = function (v) {
          return dec === 0
            ? Math.round(v).toLocaleString('ko-KR')
            : v.toFixed(dec);
        };
        function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(target * e);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = fmt(target);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { nio.observe(n); });
  }
})();
