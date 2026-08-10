import { NextResponse } from "next/server";

// Served as a <script src="..."> for external pages (thank-you pages,
// webinar funnels) that can't keep raw <form>/<script> HTML — most CMS
// content editors (Brilliant Directories included) strip those on paste.
// A script *src* reference survives that sanitization the same way the
// existing Endorsal testimonial widget does. The injected fetch() call
// below is cross-origin from whatever page includes this, which is why
// /api/stripe/checkout has CORS opened up for it.
const WIDGET_JS = `
(function () {
  var API_URL = "https://unstuck.stewards.loan/api/stripe/checkout";
  // Attribute selector, not an id — a page can only ever have one element
  // with a given id, so getElementById would silently only ever find the
  // first of two form cards on the same page. This lets any number of
  // independent copies of the widget live on one page.
  var SELECTOR = "[data-unstuck-checkout]";

  function buildWidget(target) {
    var input = document.createElement("input");
    input.type = "email";
    input.required = true;
    input.placeholder = "you@email.com";
    input.style.cssText = "display:block;width:100%;box-sizing:border-box;background:#fffae8;border:1px solid #dddddd;padding:14px 16px;font-family:'Frank Ruhl Libre',Georgia,serif;font-size:16px;color:#403d3d;margin-bottom:12px;border-radius:2px;";

    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "Get Instant Access \\u2014 $47";
    button.style.cssText = "display:block;width:100%;background:#f76732;color:#fffae8;font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;font-size:20px;letter-spacing:0.1em;text-transform:uppercase;padding:16px 40px;border:none;border-radius:2px;cursor:pointer;";

    var errorEl = document.createElement("p");
    errorEl.style.cssText = "display:none;margin:12px 0 0 0;font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:400;font-size:15px;color:#ffb199;";

    function resetButton() {
      button.disabled = false;
      button.textContent = "Get Instant Access \\u2014 $47";
    }

    button.addEventListener("click", function () {
      errorEl.style.display = "none";
      if (!input.checkValidity()) {
        input.reportValidity();
        return;
      }
      button.disabled = true;
      button.textContent = "Redirecting\\u2026";

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input.value })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) throw new Error(data.error || "Something went wrong. Try again.");
            window.location.href = data.url;
          });
        })
        .catch(function (err) {
          errorEl.textContent = err.message || "Something went wrong. Try again.";
          errorEl.style.display = "block";
          resetButton();
        });
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        button.click();
      }
    });

    target.appendChild(input);
    target.appendChild(button);
    target.appendChild(errorEl);
  }

  function init() {
    var targets = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      // Guards against the widget building twice into the same target —
      // some CMS content editors (Brilliant Directories included) can end
      // up executing an embedded script more than once (preview render +
      // live render, or the block getting duplicated on save), and this
      // script itself may be included multiple times on one page (once per
      // card). Each distinct target still only ever gets built once.
      if (target.dataset.unstuckReady === "true") continue;
      target.dataset.unstuckReady = "true";
      buildWidget(target);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;

export async function GET() {
  return new NextResponse(WIDGET_JS, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
