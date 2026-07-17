/* KSC/NIS2 Compliance Quiz v2 — quiz.js */

(function () {
  "use strict";

  const REPORT_ENDPOINT    = "/generate-report";
  const SUBSCRIBE_ENDPOINT = "/subscribe";

  // ── Affiliate + tool links ──────────────────────────────────────────────────
  const LINKS = {
    reglyze:      { name: "Reglyze",      url: "https://reglyze.com",         review: "narzedzia/reglyze.html" },
    secfix:       { name: "Secfix",       url: "https://secfix.com",          review: "narzedzia/secfix.html" },
    isms_online:  { name: "ISMS.online",  url: "https://isms.online",         review: "narzedzia/isms-online.html" },
    knowbe4:      { name: "KnowBe4",      url: "https://knowbe4.com",         review: "szkolenia-nis2.html" },
    hiscox:       { name: "Hiscox Cyber", url: "https://hiscox.pl",           review: "ubezpieczenie-cyber.html" },
    onepassword:  { name: "1Password",    url: "https://1password.com",       review: "narzedzia/1password.html" },
    nordlayer:    { name: "NordLayer",    url: "https://nordlayer.com",       review: "narzedzia/nordlayer.html" },
    cobalt:       { name: "Cobalt.io",    url: "https://cobalt.io",           review: "testy-penetracyjne.html" },
    bsi:          { name: "BSI ISO 27001",url: "https://bsigroup.com/pl-PL/", review: "certyfikacja-iso-27001.html" },
  };

  // ── Tool recommendation by sector + budget ─────────────────────────────────
  const ISMS_RECS = {
    "annex1:free":  "reglyze",   "annex1:low":   "isms_online",
    "annex1:mid":   "secfix",    "annex1:high":  "secfix",
    "annex2:free":  "reglyze",   "annex2:low":   "reglyze",
    "annex2:mid":   "isms_online","annex2:high":  "secfix",
    "other:free":   "reglyze",   "other:low":    "reglyze",
    "other:mid":    "reglyze",   "other:high":   "isms_online",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 0,
    answers: {},
    score: 0,
    missing: [],
    email: null,
  };

  // ── Questions ──────────────────────────────────────────────────────────────
  const questions = [
    {
      id: "sector",
      title: "W jakim sektorze działa Twoja firma?",
      hint: "Wybierz sektor, który najlepiej opisuje główną działalność.",
      options: [
        { value: "annex1", icon: "⚡", label: "Sektor kluczowy (Załącznik I)",
          sub: "Energia, transport, bankowość, finanse, zdrowie, woda, infrastruktura cyfrowa, administracja publiczna" },
        { value: "annex2", icon: "📦", label: "Sektor ważny (Załącznik II)",
          sub: "Poczta, gospodarka odpadami, chemia, żywność, produkcja przemysłowa, dostawcy usług cyfrowych, MSP/IT" },
        { value: "other", icon: "🏗️", label: "Inny sektor",
          sub: "Budownictwo, handel detaliczny, gastronomia, edukacja prywatna, inne" },
      ]
    },
    {
      id: "size",
      title: "Ile osób zatrudnia Twoja firma?",
      hint: "Łącznie ze wszystkimi pracownikami i współpracownikami.",
      options: [
        { value: "micro",  icon: "👤", label: "Mniej niż 50 pracowników",  sub: "Mikro / mała firma" },
        { value: "medium", icon: "👥", label: "50–249 pracowników",         sub: "Średnie przedsiębiorstwo" },
        { value: "large",  icon: "🏢", label: "250 lub więcej pracowników", sub: "Duże przedsiębiorstwo" },
      ]
    },
    {
      id: "revenue",
      title: "Jaki jest roczny obrót Twojej firmy?",
      hint: "Roczne przychody lub suma bilansowa.",
      options: [
        { value: "small",  icon: "💶", label: "Poniżej 10 mln EUR rocznie",  sub: "Mikro / mała firma" },
        { value: "medium", icon: "💰", label: "10–50 mln EUR rocznie",        sub: "Średnie przedsiębiorstwo" },
        { value: "large",  icon: "💎", label: "Powyżej 50 mln EUR rocznie",   sub: "Duże przedsiębiorstwo" },
      ]
    },
    {
      id: "budget",
      title: "Jaki budżet roczny masz na zgodność z NIS2/KSC?",
      hint: "Dopasujemy narzędzia do Twoich możliwości finansowych.",
      options: [
        { value: "free", icon: "🆓", label: "Szukam darmowego rozwiązania", sub: "Bezpłatny plan lub jednorazowy koszt wdrożenia" },
        { value: "low",  icon: "💵", label: "Do 1 000 PLN rocznie (~€200)",  sub: "Podstawowe narzędzie SaaS" },
        { value: "mid",  icon: "💳", label: "1 000–6 000 PLN rocznie",       sub: "Pełna platforma compliance" },
        { value: "high", icon: "🏦", label: "Powyżej 6 000 PLN rocznie",     sub: "Rozwiązanie enterprise" },
      ]
    },
    {
      id: "registered",
      title: "Czy Twoja firma jest już zarejestrowana w rejestrze KSC?",
      hint: "Termin rejestracji: 3 październik 2026. To pierwszy obowiązek.",
      options: [
        { value: "yes",  icon: "✅", label: "Tak, już się zarejestrowaliśmy", sub: "Samoidentyfikacja dokonana" },
        { value: "no",   icon: "❌", label: "Nie, jeszcze tego nie zrobiliśmy", sub: "Priorytet nr 1 — termin: 3.10.2026" },
        { value: "unknown", icon: "❓", label: "Nie wiem / nie jestem pewny", sub: "Sprawdzimy to razem" },
      ]
    },
    {
      id: "has_isms",
      title: "Czy masz wdrożony system zarządzania bezpieczeństwem (ISMS)?",
      hint: "ISMS to zbiór polityk, procedur i kontroli cyberbezpieczeństwa — wymagany przez Art. 21 NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Tak, mamy działający ISMS",        sub: "Udokumentowane polityki i procedury bezpieczeństwa" },
        { value: "partial", icon: "🔄", label: "Pracujemy nad wdrożeniem",         sub: "Jest w trakcie — ale nie jest jeszcze ukończone" },
        { value: "no",      icon: "❌", label: "Nie, nie mamy nic w tym zakresie", sub: "Brak systemu zarządzania bezpieczeństwem" },
      ]
    },
    {
      id: "has_training",
      title: "Czy pracownicy i zarząd przeszli szkolenia z cyberbezpieczeństwa?",
      hint: "Szkolenie zarządu jest prawnym obowiązkiem na podstawie Art. 20 NIS2.",
      options: [
        { value: "yes", icon: "✅", label: "Tak, mamy regularne szkolenia",      sub: "Pracownicy i zarząd są przeszkoleni" },
        { value: "no",  icon: "❌", label: "Nie, nie mamy szkoleń w tym zakresie", sub: "Szkolenie zarządu jest prawnym obowiązkiem KSC" },
      ]
    },
    {
      id: "has_insurance",
      title: "Czy Twoja firma posiada ubezpieczenie od zagrożeń cybernetycznych?",
      hint: "Ubezpieczenie cyber przenosi ryzyko rezydualne i jest elementem zarządzania ryzykiem NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Tak, mamy ubezpieczenie cyber",     sub: "Ryzyko jest zabezpieczone" },
        { value: "no",      icon: "❌", label: "Nie, nie mamy ubezpieczenia",       sub: "Wycena online zajmuje 20 minut" },
        { value: "unknown", icon: "❓", label: "Nie wiem / nie słyszałem o tym",    sub: "Wyjaśnimy czym jest i ile kosztuje" },
      ]
    },
    {
      id: "role",
      title: "Jaką rolę pełnisz w firmie?",
      hint: "Dopasujemy plan do Twoich obowiązków i uprawnień decyzyjnych.",
      options: [
        { value: "ceo",        icon: "👔", label: "Właściciel / CEO / Zarząd", sub: "Odpowiadasz za decyzje i budżet" },
        { value: "it",         icon: "💻", label: "IT Manager / CTO / CISO",    sub: "Odpowiadasz za wdrożenie techniczne" },
        { value: "compliance", icon: "📋", label: "Compliance / Prawnik",       sub: "Odpowiadasz za zgodność prawną" },
        { value: "cfo",        icon: "💰", label: "CFO / Dyrektor Finansowy",   sub: "Odpowiadasz za budżet i ryzyko finansowe" },
      ]
    },
  ];

  const TOTAL = questions.length;

  // ── Score calculation ──────────────────────────────────────────────────────
  function computeScore() {
    const a = state.answers;
    let score = 2; // base: everyone has some basics
    const missing = [];

    if (a.registered === "yes")        { score += 2; }
    else                               { missing.push("registration"); }

    if (a.has_isms === "yes")          { score += 3; }
    else if (a.has_isms === "partial") { score += 1; missing.push("isms"); }
    else                               { missing.push("isms"); }

    if (a.has_training === "yes")      { score += 2; }
    else                               { missing.push("training"); }

    if (a.has_insurance === "yes")     { score += 1; }
    else                               { missing.push("insurance"); }

    score = Math.min(10, Math.max(1, score));
    state.score   = score;
    state.missing = missing;
    try { sessionStorage.setItem("nis2_quiz_gaps", JSON.stringify(missing)); } catch(e) {}
    return { score, missing };
  }

  function computeScope() {
    const { sector, size, revenue } = state.answers;
    if (sector === "other") return "out";
    const isLarge  = size === "large"  || revenue === "large";
    const isMedium = !isLarge && (size === "medium" || revenue === "medium");
    if (sector === "annex1" && isLarge)           return "essential";
    if (sector === "annex1" && isMedium)          return "important";
    if (sector === "annex2" && (isLarge||isMedium)) return "important";
    return "check"; // small companies in scope sectors
  }

  // ── Today actions (client-side, shown on result screen immediately) ────────
  function buildTodayActions() {
    const missing   = state.missing;
    const sector    = state.answers.sector  || "annex2";
    const budget    = state.answers.budget  || "low";
    const ismsTool  = LINKS[ISMS_RECS[sector+":"+budget] || "reglyze"];
    const actions   = [];

    if (missing.includes("registration")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · bezpłatne",
        title: "Zarejestruj firmę w rejestrze KSC",
        desc:  "Termin: 3 październik 2026. Formularz samoidentyfikacji online. To Twój priorytet #1.",
        cta:   "Instrukcja krok po kroku →",
        url:   "rejestracja-ksc.html",
        affiliate: false,
      });
    }

    if (missing.includes("isms")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · bezpłatny plan",
        title: "Uruchom system ISMS — " + ismsTool.name,
        desc:  "Darmowy plan pokrywa pełną ocenę luk NIS2. Po rejestracji: wypełnij wbudowany kwestionariusz KSC — AI generuje polityki automatycznie.",
        cta:   "Zacznij za €0 → " + ismsTool.name,
        url:   ismsTool.url,
        affiliate: true,
        badge: "Rekomendacja #1",
      });
    }

    if (missing.includes("insurance")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · wycena online",
        title: "Uzyskaj ofertę ubezpieczenia cyber",
        desc:  "Przeniesienie ryzyka to element zarządzania ryzykiem NIS2. Wycena Hiscox: 20 minut online, bez rozmowy z agentem.",
        cta:   "Sprawdź ofertę Hiscox →",
        url:   LINKS.hiscox.url,
        affiliate: true,
      });
    }

    if (missing.includes("training")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · 14-dniowy bezpłatny trial",
        title: "Uruchom szkolenia cyberbezpieczeństwa — KnowBe4",
        desc:  "Szkolenie zarządu jest prawnym obowiązkiem (Art. 20 KSC). KnowBe4: platforma online, pierwszy moduł wysłany do zespołu w ciągu 24h.",
        cta:   "Zacznij bezpłatny trial →",
        url:   LINKS.knowbe4.url,
        affiliate: true,
      });
    }

    // Always suggest 1Password if no training (implies basics missing)
    if (missing.includes("isms") && actions.length < 5) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · 14-dniowy bezpłatny trial",
        title: "Wdróż menedżer haseł + MFA — 1Password",
        desc:  "Wieloczynnikowe uwierzytelnienie (MFA) jest wymagane przez Art. 21(j) KSC. 1Password Business: setup 30 minut, rollout do zespołu tego samego dnia.",
        cta:   "Zacznij bezpłatny trial →",
        url:   LINKS.onepassword.url,
        affiliate: true,
      });
    }

    return actions.slice(0, 4); // max 4 today actions
  }

  // ── GA4 helper ─────────────────────────────────────────────────────────────
  function track(event, params) {
    if (typeof gtag === "function") gtag("event", event, params || {});
  }

  // ── Render: question step ──────────────────────────────────────────────────
  function renderStep() {
    const q   = questions[state.step];
    const el  = document.getElementById("quiz-container");
    if (!el) return;

    const pct    = Math.round((state.step / TOTAL) * 100);
    const isLast = state.step === TOTAL - 1;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:${pct}%"></div>
        </div>
        <p class="text-sm text-gray" style="margin-bottom:.25rem;">Pytanie ${state.step + 1} z ${TOTAL}</p>
        <h3>${q.title}</h3>
        <p style="color:var(--gray-500);font-size:.9rem;margin-bottom:1rem;">${q.hint}</p>
        <div class="quiz-options">
          ${q.options.map(opt => `
            <button class="quiz-option${state.answers[q.id] === opt.value ? " selected" : ""}"
                    data-value="${opt.value}" type="button">
              <span class="quiz-option__icon">${opt.icon}</span>
              <span>
                <span class="quiz-option__text">${opt.label}</span>
                <span class="quiz-option__sub">${opt.sub}</span>
              </span>
            </button>
          `).join("")}
        </div>
        <div class="quiz-nav">
          ${state.step > 0
            ? `<button class="btn btn--outline btn--sm" id="quiz-back">← Wstecz</button>`
            : `<span></span>`}
          <button class="btn btn--primary btn--sm" id="quiz-next"
                  ${state.answers[q.id] ? "" : "disabled"}>
            ${isLast ? "Oblicz mój wynik →" : "Dalej →"}
          </button>
        </div>
      </div>`;

    el.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => {
        state.answers[q.id] = btn.dataset.value;
        el.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        el.querySelector("#quiz-next").removeAttribute("disabled");
        track("quiz_answer", { question: q.id, answer: btn.dataset.value });
        // Auto-advance on click for faster UX
        setTimeout(() => {
          if (isLast) { computeScore(); renderScoreGate(); }
          else { state.step++; renderStep(); }
        }, 280);
      });
    });

    el.querySelector("#quiz-back")?.addEventListener("click", () => {
      state.step--;
      renderStep();
    });

    el.querySelector("#quiz-next")?.addEventListener("click", () => {
      if (!state.answers[q.id]) return;
      if (isLast) { computeScore(); renderScoreGate(); }
      else { state.step++; renderStep(); }
    });
  }

  // ── Render: score + email gate ─────────────────────────────────────────────
  function renderScoreGate() {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing } = state;
    const pct    = Math.round((score / 10) * 100);
    const scope  = computeScope();

    const scoreColor = score <= 3 ? "#dc2626"
                     : score <= 6 ? "#d97706"
                     : "#16a34a";

    const scopeMsg = {
      essential: "Twoja firma to <strong>podmiot kluczowy KSC</strong> — najwyższy poziom wymagań.",
      important:  "Twoja firma to <strong>podmiot ważny KSC</strong> — musisz spełnić wymagania NIS2.",
      check:      "Twoja firma może podlegać KSC — sprawdź wyjątki dla małych firm.",
      out:        "Twoja firma prawdopodobnie nie podlega KSC — warto jednak wdrożyć podstawy.",
    }[scope] || "";

    const gapText = missing.length === 0
      ? "Gratulacje — masz wdrożone wszystkie kluczowe środki!"
      : `Brakuje Ci <strong>${missing.length}</strong> kluczowych środków bezpieczeństwa. Możesz wdrożyć większość w ciągu 3 dni.`;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:100%"></div>
        </div>

        <div style="text-align:center;padding:1rem 0 .5rem;">
          <div style="font-size:.8rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;">
            Twój wynik zgodności NIS2
          </div>
          <div style="font-size:3.5rem;font-weight:800;color:${scoreColor};line-height:1;">
            ${score}<span style="font-size:1.5rem;color:var(--gray-400);font-weight:500;">/10</span>
          </div>
          <div style="margin:.75rem auto;max-width:280px;height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;transition:width 1s;"></div>
          </div>
          <p style="font-size:.9rem;color:var(--gray-600);">${scopeMsg}</p>
          <p style="font-size:.92rem;">${gapText}</p>
        </div>

        <div style="background:#f0f7ff;border-radius:12px;padding:1.25rem;margin:1rem 0;">
          <p style="font-size:.95rem;font-weight:700;color:#1a1a2e;margin:0 0 .35rem;">
            📬 Otrzymaj swój 3-dniowy plan działania
          </p>
          <p style="font-size:.82rem;color:#555;margin:0 0 .75rem;">
            Twój spersonalizowany plan: co zrobić dziś, jutro i w tym tygodniu.
            Gotowe linki afiliacyjne do narzędzi + prompt AI dla Claude / ChatGPT / Gemini.
          </p>
          <form id="score-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <input type="email" name="email" placeholder="twoj@email.pl" required
                   style="flex:1;min-width:180px;padding:.6rem .9rem;border:1px solid #d1d5db;border-radius:8px;font-size:.95rem;">
            <button type="submit" class="btn btn--primary">Wyślij mi plan →</button>
          </form>
          <p style="font-size:.75rem;color:#9ca3af;margin:.5rem 0 0;">Bez spamu. Jeden e-mail z planem + opcjonalne przypomnienia.</p>
        </div>

        <button id="quiz-skip-email" type="button"
                style="background:none;border:none;color:var(--gray-400);font-size:.8rem;cursor:pointer;width:100%;text-align:center;padding:.25rem 0;">
          Pokaż tylko wynik, bez planu →
        </button>
      </div>`;

    track("quiz_score_shown", { score, missing: missing.join(","), scope });

    document.getElementById("score-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Wysyłanie...";
      state.email = email;
      _submitEmailAndReport(email, () => renderResult(true));
    });

    document.getElementById("quiz-skip-email")?.addEventListener("click", () => {
      track("quiz_email_skipped");
      renderResult(false);
    });
  }

  // ── Submit email to Beehiiv + trigger report ───────────────────────────────
  function _submitEmailAndReport(email, onDone) {
    const { score, missing, answers } = state;

    // Score tier tag
    const scoreTier = score <= 3 ? "score_low" : score <= 6 ? "score_mid" : "score_high";
    const tags = [scoreTier,
      "sector_" + (answers.sector || "unknown"),
      "role_"   + (answers.role   || "unknown"),
      ...(missing.includes("registration") ? ["missing_registration"] : []),
      ...(missing.includes("isms")         ? ["missing_isms"]         : []),
      ...(missing.includes("training")     ? ["missing_training"]     : []),
      ...(missing.includes("insurance")    ? ["missing_insurance"]    : []),
    ];

    // Call both endpoints in parallel
    const subscribeCall = fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "quiz_score_gate",
        tags,
        quiz_answers: {
          sector: answers.sector, size: answers.size, revenue: answers.revenue,
          budget: answers.budget, registered: answers.registered,
          has_isms: answers.has_isms, has_training: answers.has_training,
          has_insurance: answers.has_insurance, role: answers.role,
          score,
        },
      }),
    }).catch(() => {});

    const reportCall = fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector:        answers.sector,
        size:          answers.size,
        revenue:       answers.revenue,
        budget:        answers.budget,
        registered:    answers.registered,
        has_isms:      answers.has_isms,
        has_training:  answers.has_training,
        has_insurance: answers.has_insurance,
        role:          answers.role,
        score,
        missing,
        email,
        lang:   document.documentElement.lang || "pl",
        domain: window.location.hostname,
      }),
    }).catch(() => {});

    Promise.allSettled([subscribeCall, reportCall]).then(() => {
      track("quiz_completed", { score, sector: answers.sector, email_captured: true });
      if (onDone) onDone();
    });
  }

  // ── Render: result with today-actions ──────────────────────────────────────
  function renderResult(emailCaptured) {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing, answers } = state;
    const scope    = computeScope();
    const actions  = buildTodayActions();
    const pct      = Math.round((score / 10) * 100);
    const scoreColor = score <= 3 ? "#dc2626" : score <= 6 ? "#d97706" : "#16a34a";

    const scopeBadge = {
      essential: { text: "🚨 Podmiot kluczowy",  color: "#fee2e2", tc: "#991b1b" },
      important:  { text: "⚠️ Podmiot ważny",    color: "#fefce8", tc: "#854d0e" },
      check:      { text: "🔍 Sprawdź wyjątki",  color: "#fefce8", tc: "#854d0e" },
      out:        { text: "✅ Prawdopodobnie poza KSC", color: "#dcfce7", tc: "#166534" },
    }[scope] || { text: "KSC", color: "#e5e7eb", tc: "#374151" };

    function actionCard(a) {
      const isAffiliate = a.affiliate;
      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem 1.1rem;margin-bottom:.75rem;${isAffiliate ? "border-left:3px solid var(--navy);" : ""}">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;">
            <span style="background:var(--navy);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">${a.step}</span>
            <span style="font-size:.75rem;color:var(--gray-500);">${a.time}</span>
            ${isAffiliate && a.badge ? `<span style="background:#dcfce7;color:#166534;font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:4px;">${a.badge}</span>` : ""}
          </div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:.3rem;">${a.title}</div>
          <div style="font-size:.82rem;color:#555;margin-bottom:.6rem;">${a.desc}</div>
          <a href="${a.url}" ${isAffiliate ? 'target="_blank" rel="nofollow noopener"' : ''}
             style="display:inline-block;padding:.45rem .9rem;background:var(--navy);color:#fff;border-radius:6px;font-size:.82rem;font-weight:600;text-decoration:none;">
            ${a.cta}
          </a>
        </div>`;
    }

    const reskipBlock = missing.length === 0
      ? `<div style="background:#dcfce7;border-radius:10px;padding:1rem;text-align:center;margin-bottom:1rem;">
           <strong>🎉 Twoja firma jest w dobrej kondycji!</strong><br>
           <span style="font-size:.85rem;">Masz wdrożone wszystkie kluczowe środki NIS2. Rozważ certyfikację ISO 27001 jako dowód zgodności.</span>
           <br><a href="certyfikacja-iso-27001.html" style="font-size:.82rem;color:var(--navy);font-weight:700;">Dowiedz się więcej o ISO 27001 →</a>
         </div>`
      : actions.map(actionCard).join("");

    el.innerHTML = `
      <div class="quiz-card">

        ${emailCaptured
          ? `<div style="background:#dcfce7;border-radius:8px;padding:.6rem 1rem;font-size:.82rem;color:#166534;font-weight:600;margin-bottom:1rem;text-align:center;">
               ✅ Plan wysłany na ${state.email || "Twój e-mail"} — sprawdź skrzynkę
             </div>`
          : ""}

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:2.5rem;font-weight:800;color:${scoreColor};line-height:1;">
              ${score}<span style="font-size:1rem;color:var(--gray-400);font-weight:500;">/10</span>
            </div>
            <div style="font-size:.7rem;color:var(--gray-500);">Wynik NIS2</div>
          </div>
          <div style="flex:1;min-width:140px;">
            <div style="height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-bottom:.35rem;">
              <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;"></div>
            </div>
            <span style="display:inline-block;padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:700;background:${scopeBadge.color};color:${scopeBadge.tc};">
              ${scopeBadge.text}
            </span>
          </div>
        </div>

        <h3 style="font-size:1.05rem;margin-bottom:.35rem;">
          ${missing.length > 0
            ? `🏃 Zrób DZIŚ — łącznie ~${Math.min(120, missing.length * 30)} minut`
            : "Twój status NIS2"}
        </h3>
        <p style="font-size:.82rem;color:var(--gray-500);margin-bottom:1rem;">
          ${missing.length > 0
            ? `${missing.length} brakujących kroków. Poniższe możesz ukończyć dziś.`
            : "Wszystkie kluczowe środki są na miejscu."}
        </p>

        ${reskipBlock}

        ${missing.length > 0 ? `
          <div style="border-top:1px solid #e5e7eb;padding-top:1rem;margin-top:.5rem;">
            <p style="font-size:.78rem;color:var(--gray-500);margin-bottom:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">
              Kolejne kroki (zarezerwuj terminy)
            </p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <a href="testy-penetracyjne.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔍 Test penetracyjny
              </a>
              <a href="certyfikacja-iso-27001.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🏅 Certyfikacja ISO 27001
              </a>
              <a href="bezpieczenstwo-lancucha-dostaw.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔗 Bezpieczeństwo dostawców
              </a>
            </div>
          </div>` : ""}

        <div style="margin-top:1.25rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn--outline btn--sm" id="quiz-restart">← Zacznij od nowa</button>
          <a href="porownanie.html" class="btn btn--primary btn--sm">Porównaj narzędzia NIS2 →</a>
        </div>

        ${!emailCaptured ? `
          <div style="margin-top:1rem;background:#f0f7ff;border-radius:8px;padding:.85rem;text-align:center;">
            <p style="font-size:.82rem;margin:0 0 .5rem;"><strong>Otrzymaj pełny plan na e-mail</strong> z AI-promptem i linkami do narzędzi</p>
            <form id="late-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
              <input type="email" placeholder="twoj@email.pl" required
                     style="flex:1;min-width:160px;padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;">
              <button type="submit" class="btn btn--primary btn--sm">Wyślij →</button>
            </form>
          </div>` : ""}
      </div>`;

    document.getElementById("quiz-restart")?.addEventListener("click", () => {
      state.step = 0; state.answers = {}; state.score = 0;
      state.missing = []; state.email = null;
      try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      renderStep();
    });

    document.getElementById("late-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true; btn.textContent = "Wysyłanie...";
      state.email = email;
      _submitEmailAndReport(email, () => {
        e.target.parentElement.innerHTML =
          `<p style="font-size:.82rem;color:#166534;font-weight:700;">✅ Wysłano na ${email}</p>`;
      });
    });

    track("quiz_result_shown", { score, scope, email_captured: emailCaptured });
  }

  // ── FAQ accordion ──────────────────────────────────────────────────────────
  function initFaq() {
    document.querySelectorAll(".faq-question").forEach(btn => {
      btn.addEventListener("click", () => {
        const item   = btn.closest(".faq-item");
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("quiz-container");
    if (container) renderStep();
    initFaq();
  });

})();
