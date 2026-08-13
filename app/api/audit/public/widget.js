(function () {
  const container = document.getElementById("auditpulse-widget");
  if (!container) return;

  const agencyId = container.getAttribute("data-agency-id") || "default-agency";
  const apiUrl = container.getAttribute("data-api-url") || "https://your-domain.vercel.app/api/audit";

  container.innerHTML = `
    <style>
      .ap-card { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 400px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      .ap-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
      .ap-sub { font-size: 14px; color: #64748b; margin-bottom: 16px; }
      .ap-input { width: 100%; padding: 10px 12px; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 14px; }
      .ap-btn { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
      .ap-btn:disabled { background: #94a3b8; cursor: not-allowed; }
      .ap-result { margin-top: 16px; font-size: 14px; }
      .ap-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; text-align: center; }
      .ap-score-box { background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; }
      .ap-score-val { font-size: 18px; font-weight: bold; color: #2563eb; }
    </style>
    <div class="ap-card">
      <div class="ap-title">Free Instant Website Audit</div>
      <div class="ap-sub">Enter your details to generate a performance & SEO report.</div>
      <form id="ap-form">
        <input type="url" id="ap-url" class="ap-input" placeholder="https://yourwebsite.com" required />
        <input type="email" id="ap-email" class="ap-input" placeholder="your@email.com" required />
        <button type="submit" id="ap-btn" class="ap-btn">Run Audit</button>
      </form>
      <div id="ap-status" class="ap-result"></div>
    </div>
  `;

  document.getElementById("ap-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("ap-btn");
    const status = document.getElementById("ap-status");
    const prospectUrl = document.getElementById("ap-url").value;
    const prospectEmail = document.getElementById("ap-email").value;

    btn.disabled = true;
    btn.innerText = "Analyzing Website (10-15s)...";
    status.innerHTML = "";

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId, prospectUrl, prospectEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        status.innerHTML = `
          <div style="color: #16a34a; font-weight: 600;">Audit Complete! Check your email inbox.</div>
          <div class="ap-score-grid">
            <div class="ap-score-box"><div class="ap-score-val">${data.scores.performance}</div><small>Perf</small></div>
            <div class="ap-score-box"><div class="ap-score-val">${data.scores.seo}</div><small>SEO</small></div>
            <div class="ap-score-box"><div class="ap-score-val">${data.scores.accessibility}</div><small>A11y</small></div>
          </div>
        `;
        btn.innerText = "Audit Finished";
      } else {
        throw new Error(data.error || "Failed to generate audit");
      }
    } catch (err) {
      status.innerHTML = `<div style="color: #dc2626;">Error: ${err.message}</div>`;
      btn.disabled = false;
      btn.innerText = "Try Again";
    }
  });
})();
