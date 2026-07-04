export default function LegacyTop() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<!-- ============ DOMAINS ============ -->
<section id="domains" data-screen-label="Domains" style="padding:clamp(72px,9vw,116px) 24px;background:transparent;position:relative;overflow:hidden;">
  <div style="max-width:1200px;margin:0 auto;position:relative;">
    <div data-rv style="text-align:center;max-width:700px;margin:0 auto 60px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(37, 99, 235,.1);border:1px solid rgba(37, 99, 235,.2);border-radius:999px;padding:6px 16px;font-size:12.5px;font-weight:700;color:var(--accent);letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px;">6 active domains</div>
      <h2 style="margin:0;font-family:var(--font-sora),sans-serif;font-weight:700;font-size:clamp(40px,6vw,64px);letter-spacing:-0.03em;line-height:1.04;letter-spacing:-.03em;color:var(--ink);">Pick your industry.<br><span style="color:var(--accent);">Own your stack.</span></h2>
      <p style="margin:18px 0 0;font-size:17px;line-height:1.55;color:var(--muted);">Real domains. Real mentors. Not generic tech — domain-specific code inside the industry you want to work in.</p>
    </div>
    <style>
      .domain-tab {
        padding: 24px; border-radius: 20px; border: 1px solid transparent; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        background: transparent; color: var(--muted); text-align: left; display: flex; flex-direction: column; gap: 8px;
      }
      .domain-tab:hover { background: var(--border); }
      .domain-tab.active {
        background: var(--surface); border-color: var(--border-strong); color: var(--ink); box-shadow: 0 12px 32px -8px rgba(0,0,0,0.06);
      }
      .domain-tab.active .tab-title { color: var(--accent); }
      
      .domain-pane {
        position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateY(20px) scale(0.98); filter: blur(10px);
      }
      .domain-pane.active {
        opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); filter: blur(0);
      }
    </style>
    
    <!-- DOMAIN EXPLORER INTERFACE -->
    <div style="display:grid;grid-template-columns:360px 1fr;gap:60px;align-items:start;margin-top:20px;">
      
      <!-- Left: Tabs -->
      <div style="display:flex;flex-direction:column;gap:12px;" id="domainTabs">
        <button class="domain-tab active" data-target="pane-fintech" data-title="~/promethean/fintech/ledger.ts">
          <div class="tab-title" style="font-size:20px;font-weight:700;font-family:var(--font-sora),sans-serif;transition:color 0.3s;">Fintech</div>
          <div style="font-size:15px;line-height:1.6;font-weight:500;">Build a Stripe integration, a custom ledger service, and a risk-scoring API.</div>
        </button>
        <button class="domain-tab" data-target="pane-health" data-title="~/promethean/health/patient-pipeline.json">
          <div class="tab-title" style="font-size:20px;font-weight:700;font-family:var(--font-sora),sans-serif;transition:color 0.3s;">Healthcare</div>
          <div style="font-size:15px;line-height:1.6;font-weight:500;">Build FHIR-compliant ETL pipelines, patient data models, and analytics.</div>
        </button>
        <button class="domain-tab" data-target="pane-logistics" data-title="~/promethean/logistics/routing.go">
          <div class="tab-title" style="font-size:20px;font-weight:700;font-family:var(--font-sora),sans-serif;transition:color 0.3s;">Logistics</div>
          <div style="font-size:15px;line-height:1.6;font-weight:500;">Optimize real-world delivery using graph algorithms and a live dispatch engine.</div>
        </button>
      </div>

      <!-- Right: Terminal -->
      <div style="position:relative;height:520px;background:color-mix(in srgb, var(--surface) 70%, transparent);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border:1px solid var(--border);border-radius:24px;box-shadow:0 40px 80px -20px rgba(0,0,0,0.08);overflow:hidden;">
        
        <!-- Top Bar -->
        <div style="display:flex;align-items:center;gap:8px;padding:18px 24px;background:var(--surface-2);border-bottom:1px solid var(--border);position:relative;z-index:10;">
          <div style="display:flex;gap:8px;"><span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;border:1px solid #e0443e;"></span><span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;border:1px solid #dea123;"></span><span style="width:12px;height:12px;border-radius:50%;background:#27c93f;border:1px solid #1aab29;"></span></div>
          <div style="margin:0 auto;font-family:monospace;font-size:13px;font-weight:600;color:var(--muted);transition:opacity 0.3s;" id="terminalTitle">~/promethean/fintech/ledger.ts</div>
        </div>

        <div style="position:relative;height:calc(100% - 53px);padding:32px;background:var(--surface);">
          
          <!-- Fintech Pane -->
          <div id="pane-fintech" class="domain-pane active">
            <div style="font-family:monospace;font-size:15px;line-height:1.7;color:var(--ink);">
              <span style="color:#D73A49;font-weight:600;">import</span> { prisma } <span style="color:#D73A49;font-weight:600;">from</span> <span style="color:#032F62;">'./db'</span>;<br><br>
              <span style="color:#D73A49;font-weight:600;">export</span> <span style="color:#D73A49;font-weight:600;">async</span> <span style="color:#D73A49;font-weight:600;">function</span> <span style="color:#795E26;font-weight:600;">processLedgerEntry</span>(tx: <span style="color:#22863A;font-weight:600;">Transaction</span>) {<br>
              <div style="padding-left:32px;">
                <span style="color:#6A737D;">// Ensure double-entry accounting rules</span><br>
                <span style="color:#D73A49;font-weight:600;">if</span> (tx.credit !== tx.debit) {<br>
                   <div style="padding-left:32px;"><span style="color:#D73A49;font-weight:600;">throw</span> <span style="color:#D73A49;font-weight:600;">new</span> <span style="color:#22863A;font-weight:600;">Error</span>(<span style="color:#032F62;">'Imbalanced ledger entry'</span>);</div>
                }<br><br>
                <span style="color:#D73A49;font-weight:600;">await</span> prisma.$transaction([<br>
                   <div style="padding-left:32px;">prisma.account.update({ where: { id: tx.from }, data: { balance: { decrement: tx.amount } } }),</div>
                   <div style="padding-left:32px;">prisma.account.update({ where: { id: tx.to }, data: { balance: { increment: tx.amount } } })</div>
                ]);
              </div>
              }
            </div>
          </div>

          <!-- Healthcare Pane -->
          <div id="pane-health" class="domain-pane">
            <div style="font-family:monospace;font-size:15px;line-height:1.7;color:#c9d1d9;background:#0d1117;padding:32px;border-radius:16px;height:100%;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.1);">
              <span style="color:#ff7b72;">{</span><br>
              <div style="padding-left:32px;">
                <span style="color:#79c0ff;">"resourceType"</span>: <span style="color:#a5d6ff;">"Patient"</span>,<br>
                <span style="color:#79c0ff;">"id"</span>: <span style="color:#a5d6ff;">"hb-fhir-9821"</span>,<br>
                <span style="color:#79c0ff;">"active"</span>: <span style="color:#79c0ff;">true</span>,<br>
                <span style="color:#79c0ff;">"name"</span>: <span style="color:#ff7b72;">[</span><br>
                  <div style="padding-left:32px;">
                    <span style="color:#ff7b72;">{</span><br>
                      <div style="padding-left:32px;">
                        <span style="color:#79c0ff;">"use"</span>: <span style="color:#a5d6ff;">"official"</span>,<br>
                        <span style="color:#79c0ff;">"family"</span>: <span style="color:#a5d6ff;">"Doe"</span>,<br>
                        <span style="color:#79c0ff;">"given"</span>: <span style="color:#ff7b72;">[</span><span style="color:#a5d6ff;">"Jane"</span><span style="color:#ff7b72;">]</span>
                      </div>
                    <span style="color:#ff7b72;">}</span>
                  </div>
                <span style="color:#ff7b72;">]</span>,<br>
                <span style="color:#8b949e;margin-top:16px;display:block;">// PII is redacted by the pipeline before analytics ingestion</span>
              </div>
              <span style="color:#ff7b72;">}</span>
            </div>
          </div>

          <!-- Logistics Pane -->
          <div id="pane-logistics" class="domain-pane">
            <div style="font-family:monospace;font-size:15px;line-height:1.7;color:var(--ink);">
              <span style="color:#D73A49;font-weight:600;">func</span> <span style="color:#795E26;font-weight:600;">CalculateOptimalRoute</span>(graph *<span style="color:#22863A;font-weight:600;">DeliveryGraph</span>, start <span style="color:#22863A;font-weight:600;">Node</span>, stops []<span style="color:#22863A;font-weight:600;">Node</span>) ([]<span style="color:#22863A;font-weight:600;">Node</span>, <span style="color:#22863A;font-weight:600;">error</span>) {<br>
              <div style="padding-left:32px;margin-top:8px;">
                <span style="color:#6A737D;">// Implementation of Travelling Salesperson Approximation</span><br>
                mst := <span style="color:#795E26;font-weight:600;">buildMinimumSpanningTree</span>(graph, append([]<span style="color:#22863A;font-weight:600;">Node</span>{start}, stops...))<br><br>
                
                oddVertices := <span style="color:#795E26;font-weight:600;">findOddDegreeVertices</span>(mst)<br>
                matching := <span style="color:#795E26;font-weight:600;">minimumWeightPerfectMatching</span>(graph, oddVertices)<br><br>
                
                eulerianTour := <span style="color:#795E26;font-weight:600;">findEulerianTour</span>(mst, matching)<br>
                <span style="color:#D73A49;font-weight:600;">return</span> <span style="color:#795E26;font-weight:600;">shortcutTour</span>(eulerianTour), <span style="color:#005CC5;">nil</span>
              </div>
              }
            </div>
          </div>

        </div>
      </div>
    </div>
    
    <script>
      // Domain Explorer Interaction Logic
      const tabs = document.querySelectorAll('.domain-tab');
      const panes = document.querySelectorAll('.domain-pane');
      const title = document.getElementById('terminalTitle');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active classes
          tabs.forEach(t => t.classList.remove('active'));
          panes.forEach(p => p.classList.remove('active'));
          
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Show corresponding pane
          const targetId = tab.getAttribute('data-target');
          document.getElementById(targetId).classList.add('active');
          
          // Update Terminal Title with fade
          title.style.opacity = '0';
          setTimeout(() => {
            title.textContent = tab.getAttribute('data-title');
            title.style.opacity = '1';
          }, 150);
        });
      });
    </script>
    
  </div>

</section>

<!-- ============ SIMULATION PREVIEW ============ -->
<section data-screen-label="Simulation Preview" style="padding:clamp(72px,9vw,116px) 24px;background:transparent;position:relative;overflow:hidden;">
  <div style="max-width:1200px;margin:0 auto;">
    <div data-rv style="text-align:center;max-width:680px;margin:0 auto 60px;">
      <p style="font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:0 0 14px;">Inside a batch</p>
      <h2 style="margin:0;font-family:var(--font-sora),sans-serif;font-weight:700;font-size:clamp(36px,5vw,52px);letter-spacing:-0.03em;line-height:1.08;letter-spacing:-.02em;">Not a course. An actual job sim.</h2>
      <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:var(--muted);">Here's what your screen looks like on any given day inside Promethean.</p>
    </div>

    <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:24px;align-items:start;">

      <!-- LEFT: animated sim panel -->
      <div data-rv style="background:#0f0d1e;border-radius:22px;overflow:hidden;box-shadow:0 40px 80px -40px rgba(20,18,46,.6),0 0 0 1px rgba(255,255,255,.07);">
        <!-- Panel chrome bar -->
        <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.07);">
          <div style="display:flex;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#ff5f57;"></span><span style="width:10px;height:10px;border-radius:50%;background:#febc2e;"></span><span style="width:10px;height:10px;border-radius:50%;background:#28c840;"></span></div>
          <div style="flex:1;background:rgba(255,255,255,.06);border-radius:6px;height:22px;display:flex;align-items:center;padding:0 10px;gap:6px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#7a7690" stroke-width="2"/><path d="M12 8v4l2 2" stroke="#7a7690" stroke-width="2" stroke-linecap="round"/></svg>
            <span style="font-size:11.5px;color:#5d5a74;">promethean.io / fintech-batch-12 / board</span>
          </div>
        </div>

        <!-- Sprint board header -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;padding:16px 18px 10px;border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#46435c;">To Do</div>
          <div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#2563eb;">In Progress</div>
          <div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--success);">Done</div>
        </div>

        <!-- Sprint board rows -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 18px 16px;min-height:200px;">
          <!-- Todo col -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;animation:simRow 9s ease-in-out 0s infinite;">
              <div style="font-size:9.5px;font-weight:700;color:#2563eb;background:rgba(37, 99, 235,.18);display:inline-block;padding:2px 7px;border-radius:5px;margin-bottom:6px;">HB-131</div>
              <div style="font-size:12px;font-weight:600;color:var(--muted);line-height:1.4;">Add idempotency keys to /charge</div>
            </div>
            <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px 12px;animation:simRow 9s ease-in-out .6s infinite;">
              <div style="font-size:9.5px;font-weight:700;color:#5b8cff;background:rgba(91,140,255,.15);display:inline-block;padding:2px 7px;border-radius:5px;margin-bottom:6px;">HB-133</div>
              <div style="font-size:12px;font-weight:600;color:#8a87a2;line-height:1.4;">Write unit tests for ledger service</div>
            </div>
          </div>
          <!-- In Progress col -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="background:rgba(37, 99, 235,.1);border:1.5px solid rgba(37, 99, 235,.35);border-radius:10px;padding:10px 12px;animation:simRow 9s ease-in-out .3s infinite;">
              <div style="font-size:9.5px;font-weight:700;color:#fff;background:var(--accent);display:inline-block;padding:2px 7px;border-radius:5px;margin-bottom:6px;">HB-128</div>
              <div style="font-size:12px;font-weight:600;color:var(--muted);line-height:1.4;">Build payments API</div>
              <div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:8px;overflow:hidden;"><div style="height:100%;background:var(--accent);border-radius:2px;animation:progressBar 7s ease-in-out infinite;"></div></div>
            </div>
          </div>
          <!-- Done col -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="background:rgba(14, 158, 118,.07);border:1px solid rgba(14, 158, 118,.22);border-radius:10px;padding:10px 12px;animation:simRow 9s ease-in-out .9s infinite;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><div style="font-size:12px;font-weight:600;color:#7a7692;line-height:1.4;text-decoration:line-through;">Set up CI pipeline</div><span style="width:16px;height:16px;border-radius:50%;background:var(--success);display:inline-flex;align-items:center;justify-content:center;flex:none;"><svg width="8" height="8" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
            </div>
            <div style="background:rgba(14, 158, 118,.05);border:1px solid rgba(14, 158, 118,.14);border-radius:10px;padding:10px 12px;animation:simRow 9s ease-in-out 1.5s infinite;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><div style="font-size:12px;font-weight:600;color:#7a7692;line-height:1.4;text-decoration:line-through;">Auth middleware</div><span style="width:16px;height:16px;border-radius:50%;background:var(--success);display:inline-flex;align-items:center;justify-content:center;flex:none;"><svg width="8" height="8" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
            </div>
          </div>
        </div>

        <!-- Live terminal strip -->
        <div style="background:#070611;border-top:1px solid rgba(255,255,255,.06);padding:12px 18px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;min-height:88px;overflow:hidden;">
          <div style="color:#46435c;margin-bottom:6px;font-size:10.5px;">LIVE ACTIVITY</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            <div style="color:#7dd3b0;animation:simRow 10s ease-in-out 0s infinite;"><span style="color:#5d5a74;">maya@hb  </span>$ git push origin feat/payments</div>
            <div style="color:#cfcbe6;animation:simRow 10s ease-in-out 1s infinite;"><span style="color:#5d5a74;">ci-bot   </span>✓ build passed · 24 tests green</div>
            <div style="color:#f0b429;animation:simRow 10s ease-in-out 2s infinite;"><span style="color:#5d5a74;">aisha-vr </span>PR #128 reviewed — LGTM ✓ merging</div>
            <div style="color:#7dd3b0;animation:simRow 10s ease-in-out 3s infinite;"><span style="color:#5d5a74;">standup  </span>starts in 4 min · join → meet.hb/fin12</div>
          </div>
        </div>
      </div>

      <!-- RIGHT: structured info panel -->
      <div data-rv style="display:flex;flex-direction:column;gap:20px;">

        <!-- Outcome stats row -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;box-shadow:0 10px 28px -18px rgba(20,18,46,.22);">
            <div style="font-family:var(--font-sora),sans-serif;font-weight:700;font-size:36px;color:var(--accent);letter-spacing:-.02em;">8</div>
            <div style="font-size:13.5px;font-weight:600;color:var(--ink);margin-top:4px;">weeks of live work</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:3px;">Real tickets, every sprint</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;box-shadow:0 10px 28px -18px rgba(20,18,46,.22);">
            <div style="font-family:var(--font-sora),sans-serif;font-weight:700;font-size:36px;color:var(--success);letter-spacing:-.02em;">4+</div>
            <div style="font-size:13.5px;font-weight:600;color:var(--ink);margin-top:4px;">PRs merged to main</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:3px;">Each reviewed by your tech lead</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;box-shadow:0 10px 28px -18px rgba(20,18,46,.22);">
            <div style="font-family:var(--font-sora),sans-serif;font-weight:700;font-size:36px;color:#5b8cff;letter-spacing:-.02em;">1</div>
            <div style="font-size:13.5px;font-weight:600;color:var(--ink);margin-top:4px;">shipped product</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:3px;">On your GitHub, forever</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;box-shadow:0 10px 28px -18px rgba(20,18,46,.22);">
            <div style="font-family:var(--font-sora),sans-serif;font-weight:700;font-size:36px;color:#ff8a3d;letter-spacing:-.02em;">∞</div>
            <div style="font-size:13.5px;font-weight:600;color:var(--ink);margin-top:4px;">career evidence</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:3px;">Not a certificate. Proof of work.</div>
          </div>
        </div>

        <!-- What you walk away with -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:0 10px 28px -18px rgba(20,18,46,.22);">
          <div style="font-family:var(--font-sora),sans-serif;font-weight:600;font-size:16px;color:var(--ink);margin-bottom:16px;">What you walk away with</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:20px;height:20px;border-radius:50%;background:var(--accent-soft);display:inline-flex;align-items:center;justify-content:center;flex:none;margin-top:1px;"><svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5 5-5" stroke="#2563eb" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><div style="font-size:14px;font-weight:600;color:var(--ink);">A live GitHub with real commit history</div><div style="font-size:12.5px;color:var(--muted);margin-top:2px;">Every branch, review &amp; merge recorded</div></div></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:20px;height:20px;border-radius:50%;background:color-mix(in srgb, #0e9e76 14%, var(--surface));display:inline-flex;align-items:center;justify-content:center;flex:none;margin-top:1px;"><svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5 5-5" stroke="#0e9e76" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><div style="font-size:14px;font-weight:600;color:var(--ink);">Written performance review from your mentor</div><div style="font-size:12.5px;color:var(--muted);margin-top:2px;">Signed by a working industry engineer</div></div></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:20px;height:20px;border-radius:50%;background:color-mix(in srgb, #5b8cff 14%, var(--surface));display:inline-flex;align-items:center;justify-content:center;flex:none;margin-top:1px;"><svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5 5-5" stroke="#5b8cff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><div style="font-size:14px;font-weight:600;color:var(--ink);">Domain-specific engineering habits</div><div style="font-size:12.5px;color:var(--muted);margin-top:2px;">Standups, code review, shipping cadence</div></div></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:20px;height:20px;border-radius:50%;background:color-mix(in srgb, #ec6a35 14%, var(--surface));display:inline-flex;align-items:center;justify-content:center;flex:none;margin-top:1px;"><svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5 5-5" stroke="#ec6a35" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><div style="font-size:14px;font-weight:600;color:var(--ink);">Your mentor's direct network</div><div style="font-size:12.5px;color:var(--muted);margin-top:2px;">Referrals go to people who've seen your work</div></div></div>
          </div>
        </div>

        <a href="#batches" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:16px;background:var(--accent);color:#fff;font-weight:700;font-size:15.5px;border-radius:14px;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease;" style-hover="transform:translateY(-3px);">Pick a domain and reserve your seat →</a>
      </div>

    </div>
  </div>
</section>

<!-- ============ PILLARS ============ -->
<section style="padding:clamp(72px,9vw,116px) 24px;">
  <div style="max-width:1200px;margin:0 auto;">
    <div data-rv style="max-width:680px;">
      <p style="font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:0 0 14px;">Why Promethean</p>
      <h2 style="margin:0;font-family:var(--font-sora),sans-serif;font-weight:700;font-size:clamp(36px,5vw,52px);letter-spacing:-0.03em;line-height:1.08;letter-spacing:-.02em;">Three things that make it a job, not a course.</h2>
    </div>
    <div data-pillars style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:48px;">
      <div data-rv data-delay="0" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:30px;box-shadow:0 14px 40px -26px rgba(20,18,46,.22);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;" style-hover="transform:translateY(-6px);box-shadow:0 30px 56px -28px rgba(20,18,46,.28);border-color:rgba(37, 99, 235, .22);">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:var(--accent-soft);">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4-8 4-8-4 8-4z" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 12l8 4 8-4M4 16.5l8 4 8-4" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round"/></svg>
        </span>
        <h3 style="margin:22px 0 0;font-family:var(--font-sora),sans-serif;font-weight:600;font-size:21px;letter-spacing:-.01em;">Domain expertise</h3>
        <p style="margin:12px 0 0;font-size:15.5px;line-height:1.6;color:var(--muted);">Learn a stack inside a real domain — full-stack in finance, data engineering in healthcare — not generic tech in isolation.</p>
      </div>
      <div data-rv data-delay="90" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:30px;box-shadow:0 14px 40px -26px rgba(20,18,46,.22);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;" style-hover="transform:translateY(-6px);box-shadow:0 30px 56px -28px rgba(20,18,46,.28);border-color:rgba(37, 99, 235, .22);">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:color-mix(in srgb, #0e9e76 14%, var(--surface));">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="5" height="16" rx="1.4" stroke="#0e9e76" stroke-width="1.8"/><rect x="9.5" y="4" width="5" height="11" rx="1.4" stroke="#0e9e76" stroke-width="1.8"/><rect x="16" y="4" width="5" height="8" rx="1.4" stroke="#0e9e76" stroke-width="1.8"/></svg>
        </span>
        <h3 style="margin:22px 0 0;font-family:var(--font-sora),sans-serif;font-weight:600;font-size:21px;letter-spacing:-.01em;">Real job simulation</h3>
        <p style="margin:12px 0 0;font-size:15.5px;line-height:1.6;color:var(--muted);">Work real tickets on a real board, push to real GitHub, get real code review. The workplace, not the classroom.</p>
      </div>
      <div data-rv data-delay="180" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:30px;box-shadow:0 14px 40px -26px rgba(20,18,46,.22);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;" style-hover="transform:translateY(-6px);box-shadow:0 30px 56px -28px rgba(20,18,46,.28);border-color:rgba(37, 99, 235, .22);">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:color-mix(in srgb, #ec6a35 14%, var(--surface));">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.6" stroke="#ec6a35" stroke-width="1.8"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke="#ec6a35" stroke-width="1.8" stroke-linecap="round"/></svg>
        </span>
        <h3 style="margin:22px 0 0;font-family:var(--font-sora),sans-serif;font-weight:600;font-size:21px;letter-spacing:-.01em;">Live mentors</h3>
        <p style="margin:12px 0 0;font-size:15.5px;line-height:1.6;color:var(--muted);">A working professional runs your batch and makes the calls. Humans teach, AI assists.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ INSIDE A LIVE BATCH (bento) ============ -->
<section id="inside" style="padding:clamp(72px,9vw,116px) 24px;">
  <div style="max-width:1200px;margin:0 auto;">
    <div data-rv style="text-align:center;max-width:680px;margin:0 auto;">
      <p style="font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:0 0 14px;">Inside a live batch</p>
      <h2 style="margin:0;font-family:var(--font-sora),sans-serif;font-weight:700;font-size:clamp(36px,5vw,52px);letter-spacing:-0.03em;line-height:1.08;letter-spacing:-.02em;">Real work. In real time.</h2>
      <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:var(--muted);">Not screenshots of a product — the actual workflow you'll live in every day.</p>
    </div>
    <div data-bento style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px;">

      <!-- Terminal (wide) -->
      <div data-rv data-delay="0" style="grid-column:span 2;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:0 16px 44px -30px rgba(20,18,46,.28);">
        <div style="font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Push real code</div>
        <p style="margin:6px 0 16px;font-size:14px;color:var(--muted);">Branch, commit, push — straight to GitHub, like any engineer.</p>
        <div style="background:#15132e;border-radius:13px;padding:16px 18px;font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:2;overflow:hidden;">
          <div style="color:#7dd3b0;animation:termRow 9s ease-in-out 0s infinite;">$ git checkout -b feat/payments</div>
          <div style="color:#cfcbe6;animation:termRow 9s ease-in-out .7s infinite;">$ git commit -m "add stripe intents"</div>
          <div style="color:#cfcbe6;animation:termRow 9s ease-in-out 1.4s infinite;">$ git push origin feat/payments</div>
          <div style="color:#7dd3b0;animation:termRow 9s ease-in-out 2.1s infinite;">✓ pushed · PR #128 opened<span style="display:inline-block;width:8px;height:15px;background:#7dd3b0;margin-left:5px;vertical-align:-2px;animation:caretBlink 1s step-end infinite;"></span></div>
        </div>
      </div>

      <!-- Self-building PR -->
      <div data-rv data-delay="100" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:0 16px 44px -30px rgba(20,18,46,.28);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Get it reviewed</div>
          <div style="position:relative;width:78px;height:24px;flex:none;">
            <span style="position:absolute;inset:0;display:inline-flex;align-items:center;justify-content:center;background:var(--surface-2);color:var(--muted);border-radius:999px;font-size:10.5px;font-weight:700;animation:statusFlip 8s ease-in-out infinite;">● Open</span>
            <span style="position:absolute;inset:0;display:inline-flex;align-items:center;justify-content:center;background:var(--success);color:#fff;border-radius:999px;font-size:10.5px;font-weight:700;animation:statusMerged 8s ease-in-out infinite;">✓ Merged</span>
          </div>
        </div>
        <p style="margin:6px 0 16px;font-size:14px;color:var(--muted);">CI runs, your tech lead approves, it merges.</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:9px;font-size:13px;color:#4a4763;"><span style="width:18px;height:18px;border-radius:50%;background:var(--success);display:inline-flex;align-items:center;justify-content:center;flex:none;animation:checkSeq 8s ease-in-out .2s infinite;"><svg width="9" height="9" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>build — passing</div>
          <div style="display:flex;align-items:center;gap:9px;font-size:13px;color:#4a4763;"><span style="width:18px;height:18px;border-radius:50%;background:var(--success);display:inline-flex;align-items:center;justify-content:center;flex:none;animation:checkSeq 8s ease-in-out .9s infinite;"><svg width="9" height="9" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>tests — 24 passed</div>
          <div style="display:flex;align-items:center;gap:9px;font-size:13px;color:#4a4763;"><span style="width:18px;height:18px;border-radius:50%;background:var(--success);display:inline-flex;align-items:center;justify-content:center;flex:none;animation:checkSeq 8s ease-in-out 1.6s infinite;"><svg width="9" height="9" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>lint — clean</div>
        </div>
      </div>

      <!-- Review stream -->
      <div data-rv data-delay="0" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:0 16px 44px -30px rgba(20,18,46,.28);overflow:hidden;">
        <div style="font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Live feedback</div>
        <p style="margin:6px 0 14px;font-size:14px;color:var(--muted);">Mentor notes, one at a time.</p>
        <div style="height:118px;overflow:hidden;">
          <div style="display:flex;flex-direction:column;gap:9px;animation:bubbleStream 10s linear infinite;">
            <div style="display:flex;gap:8px;align-items:flex-start;"><span style="width:22px;height:22px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none;">AV</span><div style="background:var(--soft);border:1px solid var(--border);border-radius:4px 11px 11px 11px;padding:7px 10px;font-size:12px;">Nice — extract this into a hook.</div></div>
            <div style="display:flex;gap:8px;align-items:flex-start;"><span style="width:22px;height:22px;border-radius:50%;background:color-mix(in srgb, #0e9e76 14%, var(--surface));color:#0e9e76;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none;">MC</span><div style="background:var(--soft);border:1px solid var(--border);border-radius:4px 11px 11px 11px;padding:7px 10px;font-size:12px;">Add a test for the edge case 👍</div></div>
            <div style="display:flex;gap:8px;align-items:flex-start;"><span style="width:22px;height:22px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none;">AV</span><div style="background:var(--soft);border:1px solid var(--border);border-radius:4px 11px 11px 11px;padding:7px 10px;font-size:12px;">LGTM — approved &amp; merged ✓</div></div>
            <div style="display:flex;gap:8px;align-items:flex-start;"><span style="width:22px;height:22px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none;">AV</span><div style="background:var(--soft);border:1px solid var(--border);border-radius:4px 11px 11px 11px;padding:7px 10px;font-size:12px;">Nice — extract this into a hook.</div></div>
          </div>
        </div>
      </div>

      <!-- Presence cursor -->
      <div data-rv data-delay="100" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:0 16px 44px -30px rgba(20,18,46,.28);overflow:hidden;">
        <div style="font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Your mentor, on the board</div>
        <p style="margin:6px 0 14px;font-size:14px;color:var(--muted);">They're in the room with you.</p>
        <div style="position:relative;height:128px;background:var(--soft);border:1px solid var(--border);border-radius:13px;">
          <div style="position:absolute;top:14px;left:14px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:8px 10px;font-size:12px;font-weight:600;box-shadow:0 6px 16px -10px rgba(20,18,46,.3);">Build payments API</div>
          <div style="position:absolute;left:168px;top:92px;animation:bubblePop 7s ease-in-out infinite;transform-origin:left top;"><div style="background:#100e24;color:#fff;border-radius:4px 12px 12px 12px;padding:7px 11px;font-size:11px;max-width:150px;box-shadow:0 10px 24px -12px rgba(20,18,46,.5);">Wrap this in try/catch, then ship ✓</div></div>
          <div style="position:absolute;top:0;left:0;animation:curMove 7s ease-in-out infinite;z-index:3;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 3l15 8-6 1.5L11 19 4 3z" fill="#2563eb" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>
            <span style="display:inline-block;margin-top:-2px;margin-left:10px;background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;white-space:nowrap;">Aisha · tech lead</span>
          </div>
        </div>
      </div>

      <!-- Skill meters -->
      <div data-rv data-delay="200" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:0 16px 44px -30px rgba(20,18,46,.28);">
        <div style="font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Watch yourself level up</div>
        <p style="margin:6px 0 16px;font-size:14px;color:var(--muted);">Week 1 → Week 8.</p>
        <div style="display:flex;flex-direction:column;gap:13px;">
          <div><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;margin-bottom:6px;"><span>System design</span><span style="color:var(--muted);">Lvl 4</span></div><div style="height:8px;background:var(--border);border-radius:5px;overflow:hidden;"><div style="height:100%;width:82%;background:var(--accent);border-radius:5px;transform-origin:left;animation:fillX 6s ease-in-out 0s infinite;"></div></div></div>
          <div><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;margin-bottom:6px;"><span>Code review</span><span style="color:var(--muted);">Lvl 3</span></div><div style="height:8px;background:var(--border);border-radius:5px;overflow:hidden;"><div style="height:100%;width:64%;background:var(--success);border-radius:5px;transform-origin:left;animation:fillX 6s ease-in-out .5s infinite;"></div></div></div>
          <div><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;margin-bottom:6px;"><span>Shipping velocity</span><span style="color:var(--muted);">Lvl 5</span></div><div style="height:8px;background:var(--border);border-radius:5px;overflow:hidden;"><div style="height:100%;width:91%;background:#5b8cff;border-radius:5px;transform-origin:left;animation:fillX 6s ease-in-out 1s infinite;"></div></div></div>
        </div>
      </div>

      <!-- Git graph (full width) -->
      <div data-rv data-wide style="grid-column:span 3;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:0 16px 44px -30px rgba(20,18,46,.28);display:grid;grid-template-columns:1fr 1.4fr;gap:24px;align-items:center;">
        <div>
          <div style="font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Leave a real git history</div>
          <p style="margin:8px 0 0;font-size:14.5px;line-height:1.55;color:var(--muted);">Every branch, review and merge is recorded — so you finish with proof of work, not a certificate.</p>
        </div>
        <svg viewBox="0 0 300 120" style="width:100%;height:118px;">
          <path d="M20 88 H130" stroke="#c9c6d8" stroke-width="3" fill="none" stroke-dasharray="240" stroke-dashoffset="240" style="animation:gitDraw 7s ease-in-out infinite;"/>
          <path d="M130 88 C162 88 162 38 196 38 H250" stroke="#1d4ed8" stroke-width="3" fill="none" stroke-dasharray="240" stroke-dashoffset="240" style="animation:gitDraw 7s ease-in-out .4s infinite;"/>
          <path d="M250 38 C276 38 276 88 250 88 H150" stroke="#2563eb" stroke-width="3" fill="none" stroke-dasharray="240" stroke-dashoffset="240" style="animation:gitDraw 7s ease-in-out .9s infinite;"/>
          <circle cx="20" cy="88" r="7" fill="#2563eb" style="transform-box:fill-box;transform-origin:center;animation:nodeIn 7s ease-in-out 0s infinite;"/>
          <circle cx="196" cy="38" r="7" fill="#1d4ed8" style="transform-box:fill-box;transform-origin:center;animation:nodeIn 7s ease-in-out .8s infinite;"/>
          <circle cx="150" cy="88" r="7" fill="#2563eb" style="transform-box:fill-box;transform-origin:center;animation:nodeIn 7s ease-in-out 1.6s infinite;"/>
          <text x="20" y="110" font-family="var(--font-manrope)" font-size="11" fill="#9491a8">main</text>
          <text x="184" y="26" font-family="var(--font-manrope)" font-size="11" fill="#0e9e76">feat/payments</text>
          <text x="132" y="110" font-family="var(--font-manrope)" font-size="11" fill="#2563eb">merge</text>
        </svg>
      </div>

    </div>
  </div>
</section>

<!-- ============ HOW IT WORKS ============ -->
<section id="how" style="padding:clamp(72px,9vw,116px) 24px;">
  <div style="max-width:1200px;margin:0 auto;">
    <div data-rv style="text-align:center;max-width:640px;margin:0 auto;">
      <p style="font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:0 0 14px;">How it works</p>
      <h2 style="margin:0;font-family:var(--font-sora),sans-serif;font-weight:700;font-size:clamp(36px,5vw,52px);letter-spacing:-0.03em;line-height:1.08;letter-spacing:-.02em;">From sign-up to shipped — in one live batch.</h2>
    </div>
    <div style="position:relative;margin-top:56px;">
      <div data-stepline style="position:absolute;top:26px;left:12.5%;right:12.5%;height:2px;background:var(--accent);opacity:.3;"></div>
      <div data-stepline style="position:absolute;top:21px;left:11%;width:12px;height:12px;border-radius:50%;background:#ffffff;border:2px solid var(--accent);animation:lineRun 8s cubic-bezier(.65,0,.35,1) infinite;"></div>
      <div data-steps style="position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:26px;">
        <div data-rv data-delay="0" style="text-align:center;">
          <span style="position:relative;display:inline-flex;"><span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--accent);opacity:0;animation:ringPulse 8s ease-out 0s infinite;"></span><span style="display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:var(--accent);color:#fff;font-family:var(--font-sora),sans-serif;font-weight:700;font-size:20px;">1</span></span>
          <h3 style="margin:20px 0 0;font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Join a batch</h3>
          <p style="margin:10px auto 0;font-size:14.5px;line-height:1.55;color:var(--muted);max-width:220px;">Pick your domain and reserve a seat in an upcoming live cohort.</p>
        </div>
        <div data-rv data-delay="120" style="text-align:center;">
          <span style="position:relative;display:inline-flex;"><span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--accent);opacity:0;animation:ringPulse 8s ease-out 2s infinite;"></span><span style="display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:#ffffff;border:2px solid var(--accent);color:var(--accent);font-family:var(--font-sora),sans-serif;font-weight:700;font-size:20px;">2</span></span>
          <h3 style="margin:20px 0 0;font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Day 1 onboarding</h3>
          <p style="margin:10px auto 0;font-size:14.5px;line-height:1.55;color:var(--muted);max-width:220px;">Meet your tech lead and team, set up your repo and your board.</p>
        </div>
        <div data-rv data-delay="240" style="text-align:center;">
          <span style="position:relative;display:inline-flex;"><span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--accent);opacity:0;animation:ringPulse 8s ease-out 4s infinite;"></span><span style="display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:#ffffff;border:2px solid var(--accent);color:var(--accent);font-family:var(--font-sora),sans-serif;font-weight:700;font-size:20px;">3</span></span>
          <h3 style="margin:20px 0 0;font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Work live with your mentor</h3>
          <p style="margin:10px auto 0;font-size:14.5px;line-height:1.55;color:var(--muted);max-width:220px;">Pull tickets, push code, and get reviewed in real time.</p>
        </div>
        <div data-rv data-delay="360" style="text-align:center;">
          <span style="position:relative;display:inline-flex;"><span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--success);opacity:0;animation:ringPulse 8s ease-out 6s infinite;"></span><span style="display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:var(--success);color:#fff;font-family:var(--font-sora),sans-serif;font-weight:700;font-size:20px;">4</span></span>
          <h3 style="margin:20px 0 0;font-family:var(--font-sora),sans-serif;font-weight:600;font-size:18px;">Ship &amp; build your portfolio</h3>
          <p style="margin:10px auto 0;font-size:14.5px;line-height:1.55;color:var(--muted);max-width:220px;">Merge your work and walk away with a real, reviewed project.</p>
        </div>
      </div>
    </div>
  </div>
</section>

` }} />
  );
}
