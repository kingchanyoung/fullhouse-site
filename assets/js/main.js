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

  /* 입력값을 사람이 읽을 수 있는 메일 본문으로 만든다.
     폼 백엔드가 아직 없거나 장애일 때, 적어놓은 내용이 날아가지 않게 하는 안전망이다.
     name 대신 label 텍스트를 쓰는 이유: 받는 사람이 inquiry_type 이 아니라
     '문의 유형' 으로 읽어야 하기 때문. */
  function formToMail(form) {
    var lines = [];
    var seen = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'button') return;
      if (el.classList.contains('hp')) return;                 // 봇 차단용 숨김칸
      if (el.type === 'hidden') return;                        // 폼 종류·제목 등 내부값 (제목에 이미 들어감)
      if (el.type === 'checkbox' && el.name === 'agree') return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      var v = (el.value || '').trim();
      if (!v) return;

      var label = '';
      var lab = el.id ? form.querySelector('label[for="' + el.id + '"]') : null;
      if (lab) label = lab.textContent.replace(/\*/g, '').trim();
      if (!label) label = el.name;

      if (seen[label]) { lines[seen[label] - 1] += ', ' + v; return; }
      lines.push(label + ': ' + v);
      seen[label] = lines.length;
    });
    return lines.join('\n');
  }

  function mailFallback(form, msg, reason) {
    var to = form.dataset.mail || 'ask@fullhousekorea.com';
    var subjEl = form.querySelector('input[name="subject"]');
    var subject = subjEl ? subjEl.value : '홈페이지 문의';
    var body = formToMail(form);
    var href = 'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body + '\n\n---\n홈페이지 문의 폼에서 작성됨');

    if (msg) {
      msg.className = 'form-msg is-mail';
      msg.innerHTML =
        '<b>메일 앱으로 보내주세요.</b><br>' +
        '작성하신 내용을 그대로 담았습니다. 아래를 누르면 메일이 열리고, 보내기만 누르시면 됩니다.<br>' +
        '<a class="btn btn--sm" href="' + href + '" style="margin-top:.6rem;display:inline-block">메일로 보내기</a> ' +
        '<button type="button" class="btn btn--sm btn--ghost js-copy" style="margin-top:.6rem">내용 복사</button>' +
        '<br><small>직접 보내실 주소: ' + to + '</small>';

      var copyBtn = msg.querySelector('.js-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var text = subject + '\n\n' + body;
          var done = function () { copyBtn.textContent = '복사됨'; };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, done);
          } else {
            var ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta); done();
          }
        });
      }
    }
    if (window.console && reason) console.warn('폼 전송 실패 → 메일 안내로 전환:', reason);
  }

  document.querySelectorAll('form[data-ajax]').forEach(function (form) {
    var msg = form.querySelector('.form-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';

      /* 폼 백엔드가 아직 연결되지 않았으면(키 미발급) 곧바로 메일 안내로 간다.
         빈 키로 요청을 보내봐야 실패만 하고 사용자는 이유를 모른다. */
      var keyEl = form.querySelector('input[name="access_key"]');
      var notWired = !form.getAttribute('action') || (keyEl && !keyEl.value);
      if (notWired) {
        if (!form.reportValidity()) return;
        mailFallback(form, msg, '백엔드 미연결');
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = '전송 중…'; }
      if (msg) msg.className = 'form-msg';

      /* 외부 폼 API 는 JSON 을 기대한다. multipart 로 보내면 서비스에 따라
         JSON 이 아니라 HTML 오류 페이지가 돌아와 성공 판정이 통째로 깨진다.
         자체 PHP 로 되돌릴 때만 폼 인코딩을 쓴다. */
      var fd = new FormData(form);
      var body, headers;
      if (form.dataset.encoding === 'json') {
        var payload = {};
        fd.forEach(function (v, k) {
          if (k in payload) {                       /* 체크박스처럼 같은 이름이 여러 개면 합친다 */
            payload[k] = payload[k] + ', ' + v;
          } else { payload[k] = v; }
        });
        body = JSON.stringify(payload);
        headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      } else {
        body = fd;
        headers = { Accept: 'application/json' };   /* Formspree 는 이게 없으면 리다이렉트로 응답 */
      }

      fetch(form.action, { method: 'POST', body: body, headers: headers })
        .then(function (r) {
          return r.json()
            .catch(function () { return {}; })
            .then(function (j) { j.__status = r.status; return j; });
        })
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
          } else if (data.__status === 429) {
            /* 폼 서비스의 시간당 한도. 문의자 잘못이 아니므로 곧바로 메일 경로를 준다. */
            throw new Error('접수 요청이 일시적으로 몰렸습니다.');
          } else {
            throw new Error(data.message || '전송에 실패했습니다.');
          }
        })
        .catch(function (err) {
          /* 전송이 실패해도 작성한 내용은 잃지 않게 메일 경로로 넘긴다 */
          mailFallback(form, msg, err.message);
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
