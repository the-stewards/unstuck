// Browser source for the embeddable lead form. Served by
// app/embed/lead-widget.js/route.ts as a <script src>, which survives CMS
// sanitizers (Brilliant Directories strips inline <script> bodies but keeps
// src references - see app/embed/checkout-widget.js). Plain ES5 on purpose:
// it runs on arbitrary host pages, unbundled and untranspiled.
//
// Rules for editing this string: no backticks and no "${" (it lives inside a
// JS template literal), and every style is inline so host-page CSS can't
// reach in and break the layout.
export const LEAD_WIDGET_JS = `
(function () {
  var SELECTOR = "[data-unstuck-lead]";
  var DEFAULT_API = "https://unstuck.stewards.loan";

  // API origin = wherever this script was loaded from, so the same file works
  // on production, previews and localhost with no edits.
  var scriptEl = document.currentScript;
  var API = DEFAULT_API;
  try {
    if (scriptEl && scriptEl.src) API = new URL(scriptEl.src).origin;
  } catch (e) {}

  var F_HEAD = "'Barlow Condensed', Arial, sans-serif";
  var F_BODY = "'Frank Ruhl Libre', Georgia, serif";

  function ensureFonts() {
    if (document.getElementById("unstuck-lead-fonts")) return;
    var link = document.createElement("link");
    link.id = "unstuck-lead-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=Frank+Ruhl+Libre:wght@300;400&display=swap";
    document.head.appendChild(link);
    var style = document.createElement("style");
    style.textContent = "@keyframes unstuckLeadPulse{0%,100%{opacity:1}50%{opacity:.35}}";
    document.head.appendChild(style);
  }

  function el(tag, css, text) {
    var node = document.createElement(tag);
    if (css) node.style.cssText = css;
    if (text != null) node.textContent = text;
    return node;
  }

  function field(type, name, placeholder, autocomplete) {
    var input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.placeholder = placeholder;
    input.required = true;
    input.autocomplete = autocomplete;
    input.style.cssText = "display:block;width:100%;box-sizing:border-box;background:#fffae8;border:1px solid #dddddd;padding:14px 16px;font-family:" + F_BODY + ";font-size:16px;color:#403d3d;border-radius:2px;margin:0;";
    return input;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function countUp(node, target) {
    if (reducedMotion() || target < 2) {
      node.textContent = target.toLocaleString();
      return;
    }
    var start = null;
    var duration = 900;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(target * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function build(target, meta) {
    var form = meta.form;
    var minCount = parseInt(target.getAttribute("data-min-count"), 10);
    if (isNaN(minCount)) minCount = meta.minCount;
    var ref = target.getAttribute("data-ref") || "";
    var ctaLabel = target.getAttribute("data-cta") || form.cta;

    var card = el("div", "box-sizing:border-box;max-width:520px;width:100%;margin:0 auto;background:#403d3d;border-left:4px solid #f76732;border-radius:0 3px 3px 0;padding:32px;text-align:left;");

    var submittedEmail = "";
    var H2 = "margin:0 0 10px 0;font-family:" + F_HEAD + ";font-weight:700;font-size:32px;line-height:1.05;text-transform:uppercase;color:#fffae8;";
    var EYEBROW = "margin:0 0 10px 0;font-family:" + F_HEAD + ";font-weight:700;font-size:14px;letter-spacing:0.3em;text-transform:uppercase;color:#f76732;";
    var BODY = "margin:0 0 16px 0;font-family:" + F_BODY + ";font-weight:300;font-size:17px;line-height:1.6;color:rgba(255,250,232,0.85);";
    var BTN = "display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;background:#f76732;color:#fffae8;font-family:" + F_HEAD + ";font-weight:700;font-size:20px;letter-spacing:0.1em;text-transform:uppercase;padding:16px 24px;border:none;border-radius:2px;cursor:pointer;";
    var BTN_GHOST = "display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;background:transparent;color:#fffae8;font-family:" + F_HEAD + ";font-weight:700;font-size:18px;letter-spacing:0.1em;text-transform:uppercase;padding:14px 24px;border:1px solid #f76732;border-radius:2px;cursor:pointer;";

    // Step 3: confirmation + save to calendar.
    function showCalendar() {
      card.innerHTML = "";
      card.appendChild(el("h2", H2, form.successTitle));
      card.appendChild(el("p", BODY, form.successMessage));
      card.appendChild(el("hr", "border:0;border-top:1px solid rgba(255,250,232,0.2);margin:20px 0;"));
      card.appendChild(el("h3", "margin:0 0 8px 0;font-family:" + F_HEAD + ";font-weight:700;font-size:22px;text-transform:uppercase;color:#fffae8;", meta.form.calendarStep.title));
      card.appendChild(el("p", BODY, meta.form.calendarStep.message));
      var google = el("a", BTN + "margin-bottom:10px;", meta.form.calendarStep.googleLabel);
      google.href = meta.form.calendar.google; google.target = "_blank"; google.rel = "noopener noreferrer";
      var ics = el("a", BTN_GHOST, meta.form.calendarStep.icsLabel);
      ics.href = meta.form.calendar.ics;
      card.appendChild(google);
      card.appendChild(ics);
    }

    // Step 2: the $47 offer. Buying goes to Stripe (success page shows the
    // calendar step); declining goes straight to the calendar step.
    function showUpsell() {
      var u = form.upsell;
      card.innerHTML = "";
      card.appendChild(el("p", EYEBROW, u.eyebrow));
      card.appendChild(el("h2", H2, u.headline));
      card.appendChild(el("p", BODY, u.body));
      var list = el("ul", "list-style:none;margin:0 0 16px 0;padding:0;");
      for (var i = 0; i < u.bullets.length; i++) {
        var li = el("li", "margin:0 0 8px 0;padding-left:24px;position:relative;font-family:" + F_BODY + ";font-size:16px;line-height:1.5;color:rgba(255,250,232,0.9);", u.bullets[i]);
        li.insertBefore(el("span", "position:absolute;left:0;color:#f76732;font-weight:700;", "\\u2713"), li.firstChild);
        list.appendChild(li);
      }
      card.appendChild(list);
      card.appendChild(el("p", "margin:0 0 14px 0;font-family:" + F_HEAD + ";font-weight:700;font-size:20px;letter-spacing:0.05em;text-transform:uppercase;color:#f76732;", u.price));

      var buy = el("button", BTN + "margin-bottom:10px;", u.cta);
      buy.type = "button";
      var no = el("button", BTN_GHOST, u.decline);
      no.type = "button";
      var err = el("p", "display:none;margin:12px 0 0 0;font-family:" + F_BODY + ";font-size:15px;color:#ffb199;");
      err.setAttribute("role", "alert");
      var terms = el("p", "margin:14px 0 0 0;font-family:" + F_BODY + ";font-size:12px;line-height:1.5;color:rgba(255,250,232,0.55);", u.terms + " ");
      var t1 = el("a", "color:rgba(255,250,232,0.8);", "Terms");
      t1.href = API + "/terms"; t1.target = "_blank"; t1.rel = "noopener noreferrer";
      var t2 = el("a", "color:rgba(255,250,232,0.8);margin-left:8px;", "Privacy");
      t2.href = API + "/privacy"; t2.target = "_blank"; t2.rel = "noopener noreferrer";
      terms.appendChild(t1); terms.appendChild(t2);

      buy.addEventListener("click", function () {
        err.style.display = "none";
        buy.disabled = true;
        buy.textContent = "Redirecting\\u2026";
        fetch(API + "/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: submittedEmail, from: form.key })
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (data) {
              if (!response.ok || !data.url) throw new Error(data.error || "Could not start checkout. Try again in a moment.");
              // Stripe cannot be framed, so leave the iframe/host page.
              try { (window.top || window).location.href = data.url; } catch (e) { window.location.href = data.url; }
            });
          })
          .catch(function (e) {
            err.textContent = e.message || "Could not start checkout. Try again in a moment.";
            err.style.display = "block";
            buy.disabled = false;
            buy.textContent = u.cta;
          });
      });
      no.addEventListener("click", showCalendar);

      card.appendChild(buy);
      card.appendChild(no);
      card.appendChild(err);
      card.appendChild(terms);
    }


    if (meta.count >= minCount) {
      var pill = el("div", "display:flex;width:fit-content;align-items:center;gap:8px;margin:0 auto 16px auto;padding:6px 12px;border:1px solid rgba(247,103,50,0.5);border-radius:999px;");
      pill.appendChild(el("span", "width:8px;height:8px;border-radius:50%;background:#f76732;animation:unstuckLeadPulse 1.6s ease-in-out infinite;display:inline-block;"));
      var num = el("span", "font-family:" + F_HEAD + ";font-weight:700;font-size:18px;color:#fffae8;", "0");
      pill.appendChild(num);
      pill.appendChild(el("span", "font-family:" + F_BODY + ";font-size:14px;color:rgba(255,250,232,0.85);", form.countLabel));
      card.appendChild(pill);
      countUp(num, meta.count);
    }

    card.appendChild(el("h2", "margin:0 0 10px 0;font-family:" + F_HEAD + ";font-weight:700;font-size:32px;line-height:1.05;text-transform:uppercase;color:#fffae8;", form.title));
    card.appendChild(el("p", "margin:0 0 22px 0;font-family:" + F_BODY + ";font-weight:300;font-size:17px;line-height:1.6;color:rgba(255,250,232,0.85);", form.subtitle));

    var formEl = document.createElement("form");
    formEl.noValidate = false;
    formEl.style.cssText = "margin:0;padding:0;";

    var first = field("text", "firstName", "First name", "given-name");
    var last = field("text", "lastName", "Last name", "family-name");
    var email = field("email", "email", "you@email.com", "email");
    var phone = field("tel", "phone", "Mobile phone", "tel");

    var row = el("div", "display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;");
    first.style.flex = "1 1 160px"; first.style.width = "auto";
    last.style.flex = "1 1 160px"; last.style.width = "auto";
    row.appendChild(first); row.appendChild(last);
    formEl.appendChild(row);
    email.style.marginBottom = "12px"; phone.style.marginBottom = "14px";
    formEl.appendChild(email);
    formEl.appendChild(phone);

    // Honeypot: real users never see or fill this.
    var trap = document.createElement("input");
    trap.type = "text"; trap.name = "website"; trap.tabIndex = -1; trap.autocomplete = "off";
    trap.setAttribute("aria-hidden", "true");
    trap.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
    formEl.appendChild(trap);

    var consentWrap = el("label", "display:flex;gap:10px;align-items:flex-start;margin:0 0 18px 0;cursor:pointer;");
    var consent = document.createElement("input");
    consent.type = "checkbox"; consent.required = true; consent.name = "smsConsent";
    consent.style.cssText = "margin:4px 0 0 0;flex:0 0 auto;width:16px;height:16px;accent-color:#f76732;";
    consentWrap.appendChild(consent);
    consentWrap.appendChild(el("span", "font-family:" + F_BODY + ";font-size:13px;line-height:1.5;color:rgba(255,250,232,0.7);", form.consentText));
    formEl.appendChild(consentWrap);

    var button = el("button", "display:block;width:100%;background:#f76732;color:#fffae8;font-family:" + F_HEAD + ";font-weight:700;font-size:20px;letter-spacing:0.1em;text-transform:uppercase;padding:16px 40px;border:none;border-radius:2px;cursor:pointer;", ctaLabel);
    button.type = "submit";
    formEl.appendChild(button);

    var errorEl = el("p", "display:none;margin:12px 0 0 0;font-family:" + F_BODY + ";font-size:15px;color:#ffb199;");
    errorEl.setAttribute("role", "alert");
    formEl.appendChild(errorEl);

    formEl.addEventListener("submit", function (event) {
      event.preventDefault();
      errorEl.style.display = "none";
      button.disabled = true;
      button.textContent = "Reserving\\u2026";

      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;

      fetch(API + "/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          form: form.key,
          firstName: first.value,
          lastName: last.value,
          email: email.value,
          phone: phone.value,
          smsConsent: consent.checked,
          consentText: form.consentText,
          ref: ref,
          website: trap.value
        })
      })
        .then(function (response) {
          // An edge/proxy error (502, 413) can return HTML; never show a
          // JSON parse error to the visitor.
          return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok) throw new Error(data.error || "Something went wrong. Try again.");
            submittedEmail = email.value.trim();
            if (form.upsell) showUpsell(); else showCalendar();
          });
        })
        .catch(function (err) {
          var aborted = err && err.name === "AbortError";
          errorEl.textContent = aborted ? "That took too long. Check your connection and try again." : (err.message || "Something went wrong. Try again.");
          errorEl.style.display = "block";
          button.disabled = false;
          button.textContent = ctaLabel;
        })
        .then(function () { if (timer) clearTimeout(timer); });
    });

    card.appendChild(formEl);
    target.appendChild(card);
  }

  function init() {
    var targets = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < targets.length; i++) {
      (function (target) {
        // Idempotent: CMS editors can execute an embedded script more than
        // once (preview + live render), and a page may include this script
        // once per widget. Each target is built exactly once.
        if (target.getAttribute("data-unstuck-ready") === "true") return;
        target.setAttribute("data-unstuck-ready", "true");

        var key = target.getAttribute("data-unstuck-lead") || "webinar";
        ensureFonts();
        fetch(API + "/api/leads/count?form=" + encodeURIComponent(key))
          .then(function (r) {
            if (!r.ok) throw new Error("form unavailable");
            return r.json();
          })
          .then(function (meta) { build(target, meta); })
          .catch(function () {
            target.setAttribute("data-unstuck-ready", "false");
            target.appendChild(el("p", "font-family:" + F_BODY + ";font-size:15px;color:#403d3d;", "This form is unavailable right now. Please try again later."));
          });
      })(targets[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;
