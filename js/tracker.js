/* NIS2 Compliance Progress Tracker — tracker.js */
/* Renders a 10-item Art. 21 checklist with localStorage persistence.
   Quiz score auto-marks gaps if quiz was completed this session.        */

(function () {
  var STORAGE_KEY = "nis2_tracker_v1";
  var QUIZ_KEY    = "nis2_quiz_gaps"; // written by quiz.js after score gate

  /* ── Strings (Polish — translated per site by deploy script) ─────────── */
  var S = {
    heading:        "Twój postęp zgodności NIS2",
    subheading:     "Zaznacz środki, które masz już wdrożone. Twój postęp jest zapisywany lokalnie.",
    done_label:     "Wdrożone",
    todo_label:     "Do zrobienia",
    cta_default:    "Dowiedz się więcej →",
    progress_text:  function(done, total) { return done + " z " + total + " środków wdrożonych"; },
    complete_msg:   "🎉 Wszystkie środki wdrożone — gratulacje! Rozważ certyfikację ISO 27001.",
    iso_link_text:  "Dowiedz się o certyfikacji ISO 27001 →",
    reset_label:    "Resetuj postęp",
    last_updated:   "Ostatnia aktualizacja: ",
    art_badge:      "Art. 21",
    free_badge:     "bezpłatny",
    trial_badge:    "trial",
  };

  /* ── Measures (10 Art. 21 NIS2 requirements) ─────────────────────────── */
  var MEASURES = [
    {
      id:       "registration",
      art:      "Rejestracja",
      title:    "Rejestracja w rejestrze podmiotów KSC",
      detail:   "Obowiązek rejestracji w rejestrze podmiotów kluczowych i ważnych prowadzonym przez CERT Polska. Termin: 3 październik 2026.",
      tool:     "Instrukcja rejestracji krok po kroku",
      tool_url: "rejestracja-ksc.html",
      cost:     "bezpłatne",
      quiz_gap: "registration",
    },
    {
      id:       "risk_policy",
      art:      "Art. 21(2)(a)",
      title:    "Analiza ryzyka i polityki bezpieczeństwa",
      detail:   "Udokumentowana polityka bezpieczeństwa informacji i formalny proces zarządzania ryzykiem IT.",
      tool:     "ISMS.online — darmowy plan do 25 pracowników",
      tool_url: "https://isms.online/",
      cost:     "bezpłatny plan",
      quiz_gap: "isms",
    },
    {
      id:       "incident",
      art:      "Art. 21(2)(b)",
      title:    "Procedury obsługi incydentów",
      detail:   "Udokumentowane procedury wykrywania, klasyfikowania i zgłaszania incydentów do CERT Polska w ciągu 24/72h.",
      tool:     "ISMS.online — szablony procedur incydentowych",
      tool_url: "https://isms.online/",
      cost:     "bezpłatny plan",
      quiz_gap: "isms",
    },
    {
      id:       "continuity",
      art:      "Art. 21(2)(c)",
      title:    "Ciągłość działania i zarządzanie kryzysowe",
      detail:   "Plan ciągłości działania (BCP) i odtwarzania po awarii (DR). Backup danych, testy przywracania.",
      tool:     "Acronis Cyber Protect — backup + DR dla MŚP",
      tool_url: "https://www.acronis.com/",
      cost:     "od €59/rok",
      quiz_gap: null,
    },
    {
      id:       "supply_chain",
      art:      "Art. 21(2)(d)",
      title:    "Bezpieczeństwo łańcucha dostaw",
      detail:   "Ocena ryzyk dostawców, klauzule bezpieczeństwa w umowach, rejestr dostawców z dostępem do systemów.",
      tool:     "Przewodnik bezpieczeństwa dostawców NIS2",
      tool_url: "bezpieczenstwo-lancucha-dostaw.html",
      cost:     "bezpłatny",
      quiz_gap: null,
    },
    {
      id:       "network_security",
      art:      "Art. 21(2)(e)",
      title:    "Bezpieczeństwo sieci i systemów",
      detail:   "Segmentacja sieci, firewall, ochrona endpointów, zarządzanie podatnościami i patchami.",
      tool:     "NordLayer — segmentacja sieci dla firm",
      tool_url: "https://nordlayer.com/",
      cost:     "od €8/użytkownik",
      quiz_gap: null,
    },
    {
      id:       "pentest",
      art:      "Art. 21(2)(f)",
      title:    "Ocena skuteczności środków — testy penetracyjne",
      detail:   "Regularne testowanie i audyt wdrożonych środków bezpieczeństwa, w tym testy penetracyjne.",
      tool:     "Cobalt.io — testy penetracyjne na żądanie",
      tool_url: "https://cobalt.io/",
      cost:     "wycena indywidualna",
      quiz_gap: null,
    },
    {
      id:       "training",
      art:      "Art. 21(2)(g)",
      title:    "Szkolenia z cyberbezpieczeństwa",
      detail:   "Regularne szkolenia dla pracowników z cyberhigieny. Szkolenie zarządu jest prawnym obowiązkiem (Art. 20).",
      tool:     "KnowBe4 — 14-dniowy bezpłatny trial",
      tool_url: "https://www.knowbe4.com/",
      cost:     "trial 14 dni",
      quiz_gap: "training",
    },
    {
      id:       "crypto_mfa",
      art:      "Art. 21(2)(h)(i)",
      title:    "Szyfrowanie, MFA i kontrola dostępu",
      detail:   "Szyfrowanie danych w spoczynku i w tranzycie. Wieloskładnikowe uwierzytelnienie (MFA) dla wszystkich kont uprzywilejowanych.",
      tool:     "1Password Business — MFA + menedżer haseł",
      tool_url: "https://1password.com/",
      cost:     "od $7,99/użytkownik",
      quiz_gap: "mfa",
    },
    {
      id:       "insurance",
      art:      "Transfer ryzyka",
      title:    "Ubezpieczenie cyber (transfer ryzyka)",
      detail:   "Nie jest wymogiem Art. 21, ale pokrywa kary UODO/NIS2, koszty incydentu i przerwy w działaniu. Rekomendowane dla podmiotów ważnych i kluczowych.",
      tool:     "Hiscox Cyber — wycena online w 10 minut",
      tool_url: "https://hiscox.pl/",
      cost:     "wycena online",
      quiz_gap: "insurance",
    },
  ];

  /* ── State helpers ───────────────────────────────────────────────────── */
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function saveState(state) {
    state._updated = new Date().toLocaleDateString("pl-PL");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* Read gaps that quiz wrote (array of gap ids like ["isms","training","mfa"]) */
  function getQuizGaps() {
    try { return JSON.parse(sessionStorage.getItem(QUIZ_KEY) || "[]"); }
    catch (e) { return []; }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  function render() {
    var el = document.getElementById("nis2-tracker");
    if (!el) return;

    var state    = loadState();
    var quizGaps = getQuizGaps();
    var total    = MEASURES.length;
    var done     = MEASURES.filter(function(m) { return state[m.id]; }).length;
    var pct      = Math.round((done / total) * 100);

    var progressColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";

    var html = '<section style="background:#f8fafc;padding:3rem 0;" id="tracker-section">';
    html += '<div class="container">';

    /* Header */
    html += '<div class="section-header" style="margin-bottom:1.5rem;">';
    html += '<h2 style="font-size:1.6rem;font-weight:800;color:var(--navy);">' + S.heading + '</h2>';
    html += '<p style="color:var(--gray-600);margin-top:.4rem;">' + S.subheading + '</p>';
    html += '</div>';

    /* Progress bar */
    html += '<div style="background:#e2e8f0;border-radius:99px;height:12px;margin-bottom:.75rem;overflow:hidden;">';
    html += '<div style="background:' + progressColor + ';width:' + pct + '%;height:100%;border-radius:99px;transition:width .4s ease;"></div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">';
    html += '<span style="font-weight:700;color:' + progressColor + ';font-size:.95rem;">' + S.progress_text(done, total) + ' (' + pct + '%)</span>';
    if (state._updated) {
      html += '<span style="font-size:.78rem;color:var(--gray-500);">' + S.last_updated + state._updated + '</span>';
    }
    html += '</div>';

    /* Complete banner */
    if (done === total) {
      html += '<div style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;gap:.75rem;align-items:center;">';
      html += '<span style="font-size:1.1rem;">' + S.complete_msg + '</span>';
      html += '<a href="certyfikacja-iso-27001.html" style="white-space:nowrap;font-size:.82rem;font-weight:700;color:#166534;">' + S.iso_link_text + '</a>';
      html += '</div>';
    }

    /* Measure cards */
    html += '<div style="display:grid;gap:1rem;">';

    MEASURES.forEach(function(m) {
      var checked    = !!state[m.id];
      var isGap      = quizGaps.length > 0 && m.quiz_gap && quizGaps.indexOf(m.quiz_gap) !== -1;
      var borderColor = checked ? "#86efac" : isGap ? "#fca5a5" : "#e2e8f0";
      var bgColor     = checked ? "#f0fdf4" : isGap ? "#fff5f5" : "#ffffff";

      html += '<div style="background:' + bgColor + ';border:1.5px solid ' + borderColor + ';border-radius:10px;padding:1rem 1.25rem;display:flex;gap:1rem;align-items:flex-start;">';

      /* Checkbox */
      html += '<label style="display:flex;align-items:flex-start;gap:.75rem;cursor:pointer;flex:1;min-width:0;">';
      html += '<input type="checkbox" data-id="' + m.id + '" ';
      html += checked ? 'checked ' : '';
      html += 'style="width:20px;height:20px;flex-shrink:0;margin-top:2px;accent-color:#1e3a5f;cursor:pointer;">';
      html += '<div style="min-width:0;">';

      /* Title row */
      html += '<div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-bottom:.25rem;">';
      html += '<span style="font-weight:700;color:var(--navy);font-size:.95rem;">' + m.title + '</span>';
      html += '<span style="font-size:.7rem;background:#e0e7ff;color:#3730a3;padding:.15rem .4rem;border-radius:4px;font-weight:600;">' + m.art + '</span>';
      if (checked) {
        html += '<span style="font-size:.7rem;background:#dcfce7;color:#166534;padding:.15rem .4rem;border-radius:4px;font-weight:700;">✓ ' + S.done_label + '</span>';
      } else if (isGap) {
        html += '<span style="font-size:.7rem;background:#fee2e2;color:#991b1b;padding:.15rem .4rem;border-radius:4px;font-weight:700;">⚠ ' + S.todo_label + '</span>';
      }
      html += '</div>';

      /* Detail */
      html += '<p style="font-size:.82rem;color:var(--gray-600);margin:0 0 .5rem;line-height:1.5;">' + m.detail + '</p>';

      /* CTA (only when not done) */
      if (!checked) {
        var isExternal = m.tool_url.startsWith("http");
        var costBadge  = m.cost === "bezpłatny plan" || m.cost === "bezpłatne" || m.cost === "bezpłatny"
          ? '<span style="font-size:.68rem;background:#dcfce7;color:#166534;padding:.1rem .35rem;border-radius:4px;font-weight:700;margin-left:.35rem;">' + S.free_badge + '</span>'
          : m.cost.indexOf("trial") !== -1
          ? '<span style="font-size:.68rem;background:#dbeafe;color:#1e40af;padding:.1rem .35rem;border-radius:4px;font-weight:700;margin-left:.35rem;">' + S.trial_badge + '</span>'
          : '';
        html += '<a href="' + m.tool_url + '" ';
        html += isExternal ? 'target="_blank" rel="noopener" ' : '';
        html += 'style="display:inline-flex;align-items:center;gap:.3rem;font-size:.8rem;font-weight:700;color:var(--navy);text-decoration:none;border:1px solid var(--navy);border-radius:6px;padding:.3rem .65rem;transition:all .15s;">';
        html += m.tool + costBadge;
        html += '</a>';
      }

      html += '</div></label>';
      html += '</div>';
    });

    html += '</div>'; /* grid */

    /* Reset */
    html += '<div style="margin-top:1.25rem;text-align:right;">';
    html += '<button id="tracker-reset" style="font-size:.75rem;color:var(--gray-500);background:none;border:none;cursor:pointer;text-decoration:underline;">' + S.reset_label + '</button>';
    html += '</div>';

    html += '</div></section>'; /* container, section */

    el.innerHTML = html;

    /* Bind events */
    el.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
      cb.addEventListener("change", function() {
        var s = loadState();
        s[cb.dataset.id] = cb.checked;
        saveState(s);
        render();
      });
    });

    var resetBtn = document.getElementById("tracker-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function() {
        if (confirm(S.reset_label + "?")) {
          localStorage.removeItem(STORAGE_KEY);
          render();
        }
      });
    }
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

})();
