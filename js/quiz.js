/* KSC/NIS2 Compliance Quiz v2 — quiz.js */

(function () {
  "use strict";

  const REPORT_ENDPOINT    = "/generate-report";
  const SUBSCRIBE_ENDPOINT = "/subscribe";

  // ── Affiliate + tool links ──────────────────────────────────────────────────
  const LINKS = {
    reglyze:      { name: "Reglyze",      url: "https://reglyze.com",         review: "instrumenti/reglyze.html" },
    secfix:       { name: "Secfix",       url: "https://secfix.com",          review: "instrumenti/secfix.html" },
    isms_online:  { name: "ISMS.online",  url: "https://isms.online",         review: "instrumenti/isms-online.html" },
    knowbe4:      { name: "KnowBe4",      url: "https://knowbe4.com",         review: "szkolenia-nis2.html" },
    hiscox:       { name: "Hiscox Cyber", url: "https://hiscox.com",          review: "ubezpieczenie-cyber.html" },
    onepassword:  { name: "1Password",    url: "https://1password.com",       review: "instrumenti/1password.html" },
    nordlayer:    { name: "NordLayer",    url: "https://nordlayer.com",       review: "instrumenti/nordlayer.html" },
    cobalt:       { name: "Cobalt.io",    url: "https://cobalt.io",           review: "testy-penetracyjne.html" },
    bsi:          { name: "BSI ISO 27001",url: "https://bsigroup.com/pl-PL/", review: "iso-27001-instrumenti.html" },
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
      title: "В какъв сектор работи вашата фирма?",
      hint: "Изберете сектора, който най-добре описва основната дейност.",
      options: [
        { value: "annex1", icon: "⚡", label: "Ключов сектор (Annexe I)",
          sub: "Енергетика, транспорт, банкиране, финанси, здравеопазване, вода, цифрова инфраструктура, публична администрация" },
        { value: "annex2", icon: "📦", label: "Важен сектор (Annexe II)",
          sub: "Поща, управление на отпадъци, химия, храни, промишлено производство, доставчици на цифрови услуги, МСП/ИТ" },
        { value: "other", icon: "🏗️", label: "Друг сектор",
          sub: "Строителство, търговия на дребно, ресторантьорство, частно образование, други" },
      ]
    },
    {
      id: "size",
      title: "Колко служители има вашата фирма?",
      hint: "Включително всички служители и сътрудници.",
      options: [
        { value: "micro",  icon: "👤", label: "По-малко от 50 служители",  sub: "Микро / малка фирма" },
        { value: "medium", icon: "👥", label: "50–249 служители",           sub: "Средно предприятие" },
        { value: "large",  icon: "🏢", label: "250 или повече служители",   sub: "Голямо предприятие" },
      ]
    },
    {
      id: "revenue",
      title: "Какъв е годишният оборот на вашата фирма?",
      hint: "Годишни приходи или балансова сума.",
      options: [
        { value: "small",  icon: "💶", label: "Под 10 млн. EUR годишно",   sub: "Микро / малка фирма" },
        { value: "medium", icon: "💰", label: "10–50 млн. EUR годишно",     sub: "Средно предприятие" },
        { value: "large",  icon: "💎", label: "Над 50 млн. EUR годишно",    sub: "Голямо предприятие" },
      ]
    },
    {
      id: "budget",
      title: "Какъв годишен бюджет имате за съответствие с NIS2/Закон за киберсигурност?",
      hint: "Ще съобразим инструментите с вашите финансови възможности.",
      options: [
        { value: "free", icon: "🆓", label: "Търся безплатно решение", sub: "Безплатен план или еднократни разходи за внедряване" },
        { value: "low",  icon: "💵", label: "До 400 лв. годишно (~€200)",  sub: "Основен SaaS инструмент" },
        { value: "mid",  icon: "💳", label: "400–2 400 лв. годишно",       sub: "Пълна compliance платформа" },
        { value: "high", icon: "🏦", label: "Над 2 400 лв. годишно",       sub: "Enterprise решение" },
      ]
    },
    {
      id: "registered",
      title: "Регистрирана ли е вашата фирма вече в регистъра по Закона за киберсигурност?",
      hint: "Краен срок за регистрация: по Закона за киберсигурност (в сила от февруари 2026, регистър до 2027). Това е първото задължение.",
      options: [
        { value: "yes",  icon: "✅", label: "Да, вече се регистрирахме", sub: "Самоидентификацията е направена" },
        { value: "no",   icon: "❌", label: "Не, още не сме го направили", sub: "Приоритет №1 — краен срок: по Закона за киберсигурност (в сила от февруари 2026, регистър до 2027)" },
        { value: "unknown", icon: "❓", label: "Не знам / не съм сигурен", sub: "Ще го проверим заедно" },
      ]
    },
    {
      id: "has_isms",
      title: "Имате ли внедрена система за управление на сигурността (ISMS)?",
      hint: "ISMS е съвкупност от политики, процедури и контроли за киберсигурност — изисква се от Art. 21 NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Да, имаме работеща ISMS",          sub: "Документирани политики и процедури за сигурност" },
        { value: "partial", icon: "🔄", label: "Работим по внедряването",          sub: "В процес е — но все още не е завършено" },
        { value: "no",      icon: "❌", label: "Не, нямаме нищо в тази насока",    sub: "Липсва система за управление на сигурността" },
      ]
    },
    {
      id: "has_training",
      title: "Преминали ли са служителите и ръководството обучение по киберсигурност?",
      hint: "Обучението на ръководството е законово задължение съгласно Art. 20 NIS2.",
      options: [
        { value: "yes", icon: "✅", label: "Да, провеждаме редовни обучения",        sub: "Служителите и ръководството са обучени" },
        { value: "no",  icon: "❌", label: "Не, нямаме обучения в тази насока",      sub: "Обучението на ръководството е законово задължение по Закона за киберсигурност (транспониране на NIS2)" },
      ]
    },
    {
      id: "has_insurance",
      title: "Има ли вашата фирма застраховка срещу киберзаплахи?",
      hint: "Кибер застраховката прехвърля остатъчния риск и е елемент от управлението на риска по NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Да, имаме кибер застраховка",          sub: "Рискът е обезпечен" },
        { value: "no",      icon: "❌", label: "Не, нямаме застраховка",               sub: "Онлайн оценката отнема 20 минути" },
        { value: "unknown", icon: "❓", label: "Не знам / не съм чувал за това",       sub: "Ще обясним какво представлява и колко струва" },
      ]
    },
    {
      id: "role",
      title: "Каква роля изпълнявате във фирмата?",
      hint: "Ще съобразим плана с вашите задължения и правомощия за вземане на решения.",
      options: [
        { value: "ceo",        icon: "👔", label: "Собственик / CEO / Ръководство", sub: "Отговаряте за решенията и бюджета" },
        { value: "it",         icon: "💻", label: "IT мениджър / CTO / CISO",        sub: "Отговаряте за техническото внедряване" },
        { value: "compliance", icon: "📋", label: "Съответствие / Юрист",            sub: "Отговаряте за правното съответствие" },
        { value: "cfo",        icon: "💰", label: "CFO / Финансов директор",          sub: "Отговаряте за бюджета и финансовия риск" },
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
        time: "30 мин · безплатно",
        title: "Регистрирайте фирмата в регистъра по Закона за киберсигурност",
        desc:  "Краен срок: по Закона за киберсигурност (в сила от февруари 2026, регистър до 2027). Онлайн формуляр за самоидентификация. Това е вашият приоритет #1.",
        cta:   "Инструкция стъпка по стъпка →",
        url:   "registraciya.html",
        affiliate: false,
      });
    }

    if (missing.includes("isms")) {
      actions.push({
        step: actions.length + 1,
        time: "20 мин · безплатен план",
        title: "Стартирайте ISMS система — " + ismsTool.name,
        desc:  "Безплатният план покрива пълна оценка на пропуските по NIS2. След регистрация: попълнете вградения въпросник по Закона за киберсигурност — AI генерира политиките автоматично.",
        cta:   "Започнете за €0 → " + ismsTool.name,
        url:   ismsTool.url,
        affiliate: true,
        badge: "Препоръка #1",
      });
    }

    if (missing.includes("insurance")) {
      actions.push({
        step: actions.length + 1,
        time: "20 мин · онлайн оценка",
        title: "Получете оферта за кибер застраховка",
        desc:  "Прехвърлянето на риска е елемент от управлението на риска по NIS2. Оценка от Hiscox: 20 минути онлайн, без разговор с агент.",
        cta:   "Вижте офертата на Hiscox →",
        url:   LINKS.hiscox.url,
        affiliate: true,
      });
    }

    if (missing.includes("training")) {
      actions.push({
        step: actions.length + 1,
        time: "30 мин · 14-дневен безплатен trial",
        title: "Стартирайте обучения по киберсигурност — KnowBe4",
        desc:  "Обучението на ръководството е законово задължение (Art. 20 Закон за киберсигурност (транспониране на NIS2)). KnowBe4: онлайн платформа, първият модул изпратен до екипа в рамките на 24 часа.",
        cta:   "Започнете безплатен trial →",
        url:   LINKS.knowbe4.url,
        affiliate: true,
      });
    }

    // Always suggest 1Password if no training (implies basics missing)
    if (missing.includes("isms") && actions.length < 5) {
      actions.push({
        step: actions.length + 1,
        time: "30 мин · 14-дневен безплатен trial",
        title: "Внедрете мениджър на пароли + MFA — 1Password",
        desc:  "Многофакторното удостоверяване (MFA) се изисква от Art. 21(j) Закон за киберсигурност (транспониране на NIS2). 1Password Business: настройка 30 минути, разгръщане до екипа същия ден.",
        cta:   "Започнете безплатен trial →",
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
        <p class="text-sm text-gray" style="margin-bottom:.25rem;">Въпрос ${state.step + 1} от ${TOTAL}</p>
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
            ? `<button class="btn btn--outline btn--sm" id="quiz-back">← Назад</button>`
            : `<span></span>`}
          <button class="btn btn--primary btn--sm" id="quiz-next"
                  ${state.answers[q.id] ? "" : "disabled"}>
            ${isLast ? "Изчисли моя резултат →" : "Напред →"}
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
      essential: "Вашата фирма е <strong>ключов субект по Закона за киберсигурност</strong> — най-високо ниво на изисквания.",
      important:  "Вашата фирма е <strong>важен субект по Закона за киберсигурност</strong> — трябва да изпълните изискванията на NIS2.",
      check:      "Вашата фирма може да попада под Закона за киберсигурност — проверете изключенията за малки фирми.",
      out:        "Вашата фирма вероятно не попада под Закона за киберсигурност — въпреки това е препоръчително да внедрите основите.",
    }[scope] || "";

    const gapText = missing.length === 0
      ? "Поздравления — имате внедрени всички ключови мерки!"
      : `Липсват ви <strong>${missing.length}</strong> ключови мерки за сигурност. Повечето можете да внедрите в рамките на 3 дни.`;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:100%"></div>
        </div>

        <div style="text-align:center;padding:1rem 0 .5rem;">
          <div style="font-size:.8rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;">
            Вашият резултат за съответствие с NIS2
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
            📬 Получете своя 3-дневен план за действие
          </p>
          <p style="font-size:.82rem;color:#555;margin:0 0 .75rem;">
            Вашият персонализиран план: какво да направите днес, утре и тази седмица.
            Готови препоръки за инструменти + AI промпт за Claude / ChatGPT / Gemini.
          </p>
          <form id="score-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <input type="email" name="email" placeholder="вашия@email.bg" required
                   style="flex:1;min-width:180px;padding:.6rem .9rem;border:1px solid #d1d5db;border-radius:8px;font-size:.95rem;">
            <button type="submit" class="btn btn--primary">Изпрати ми плана →</button>
          </form>
          <p style="font-size:.75rem;color:#9ca3af;margin:.5rem 0 0;">Без спам. Един имейл с плана + незадължителни напомняния.</p>
        </div>

        <button id="quiz-skip-email" type="button"
                style="background:none;border:none;color:var(--gray-400);font-size:.8rem;cursor:pointer;width:100%;text-align:center;padding:.25rem 0;">
          Покажи само резултата, без план →
        </button>
      </div>`;

    track("quiz_score_shown", { score, missing: missing.join(","), scope });

    document.getElementById("score-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Изпращане...";
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
        lang:   document.documentElement.lang || "bg",
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
      essential: { text: "🚨 Ключов субект",                   color: "#fee2e2", tc: "#991b1b" },
      important:  { text: "⚠️ Важен субект",                   color: "#fefce8", tc: "#854d0e" },
      check:      { text: "🔍 Проверете изключенията",          color: "#fefce8", tc: "#854d0e" },
      out:        { text: "✅ Вероятно извън обхвата на ЗКС",   color: "#dcfce7", tc: "#166534" },
    }[scope] || { text: "ЗКС", color: "#e5e7eb", tc: "#374151" };

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
           <strong>🎉 Вашата фирма е в добро състояние!</strong><br>
           <span style="font-size:.85rem;">Имате внедрени всички ключови мерки по NIS2. Обмислете сертификация ISO 27001 като доказателство за съответствие.</span>
           <br><a href="iso-27001-instrumenti.html" style="font-size:.82rem;color:var(--navy);font-weight:700;">Научете повече за ISO 27001 →</a>
         </div>`
      : actions.map(actionCard).join("");

    el.innerHTML = `
      <div class="quiz-card">

        ${emailCaptured
          ? `<div style="background:#dcfce7;border-radius:8px;padding:.6rem 1rem;font-size:.82rem;color:#166534;font-weight:600;margin-bottom:1rem;text-align:center;">
               ✅ Планът е изпратен на ${state.email || "вашия имейл"} — проверете пощата си
             </div>`
          : ""}

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:2.5rem;font-weight:800;color:${scoreColor};line-height:1;">
              ${score}<span style="font-size:1rem;color:var(--gray-400);font-weight:500;">/10</span>
            </div>
            <div style="font-size:.7rem;color:var(--gray-500);">Резултат NIS2</div>
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
            ? `🏃 Направете ДНЕС — общо ~${Math.min(120, missing.length * 30)} минути`
            : "Вашият статус по NIS2"}
        </h3>
        <p style="font-size:.82rem;color:var(--gray-500);margin-bottom:1rem;">
          ${missing.length > 0
            ? `${missing.length} липсващи стъпки. Следните можете да изпълните днес.`
            : "Всички ключови мерки са на място."}
        </p>

        ${reskipBlock}

        ${missing.length > 0 ? `
          <div style="border-top:1px solid #e5e7eb;padding-top:1rem;margin-top:.5rem;">
            <p style="font-size:.78rem;color:var(--gray-500);margin-bottom:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">
              Следващи стъпки (запазете дати)
            </p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <a href="testy-penetracyjne.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔍 Тест за проникване
              </a>
              <a href="iso-27001-instrumenti.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🏅 Сертификация ISO 27001
              </a>
              <a href="bezpieczenstwo-lancucha-dostaw.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔗 Сигурност на веригата на доставки
              </a>
            </div>
          </div>` : ""}

        <div style="margin-top:1.25rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn--outline btn--sm" id="quiz-restart">← Започни отначало</button>
          <a href="sravnenie.html" class="btn btn--primary btn--sm">Сравни инструменти за NIS2 →</a>
        </div>

        ${!emailCaptured ? `
          <div style="margin-top:1rem;background:#f0f7ff;border-radius:8px;padding:.85rem;text-align:center;">
            <p style="font-size:.82rem;margin:0 0 .5rem;"><strong>Получете пълния план на имейл</strong> с AI промпт и препоръки за инструменти</p>
            <form id="late-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
              <input type="email" placeholder="вашия@email.bg" required
                     style="flex:1;min-width:160px;padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;">
              <button type="submit" class="btn btn--primary btn--sm">Изпрати →</button>
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
      btn.disabled = true; btn.textContent = "Изпращане...";
      state.email = email;
      _submitEmailAndReport(email, () => {
        e.target.parentElement.innerHTML =
          `<p style="font-size:.82rem;color:#166534;font-weight:700;">✅ Изпратено на ${email}</p>`;
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