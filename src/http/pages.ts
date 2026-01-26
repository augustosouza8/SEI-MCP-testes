import type { AuthUser } from './auth.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderPricingPage(params: {
  baseUrl: string;
  user: AuthUser | null;
  query: URLSearchParams;
}): string {
  const { user, baseUrl, query } = params;
  const loggedIn = user && user.type === 'google';
  const email = loggedIn ? user.email : null;
  const name = loggedIn ? (user.name ?? user.email) : null;
  const success = query.get('success') === '1';
  const canceled = query.get('canceled') === '1';

  const notice = success
    ? '<div class="notice ok">Pagamento concluído. Você já pode voltar ao Claude/MCP.</div>'
    : canceled
      ? '<div class="notice warn">Checkout cancelado.</div>'
      : '';

  const authBlock = loggedIn
    ? `<div class="auth">Logado como <strong>${escapeHtml(name!)}</strong> (${escapeHtml(email!)}) · <a href="/logout">Sair</a></div>`
    : `<div class="auth"><a class="btn" href="/auth/google/start">Entrar com Google</a></div>`;

  const actions = loggedIn
    ? `
      <div class="actions">
        <form method="POST" action="/checkout/create">
          <input type="hidden" name="plan" value="starter" />
          <button class="btn primary" type="submit">Assinar Starter</button>
        </form>
        <form method="POST" action="/checkout/create">
          <input type="hidden" name="plan" value="pro" />
          <button class="btn primary" type="submit">Assinar Pro</button>
        </form>
        <form method="POST" action="/portal/create">
          <button class="btn" type="submit">Gerenciar assinatura</button>
        </form>
      </div>
    `
    : `
      <div class="actions">
        <div class="hint">Faça login para assinar e gerenciar cobrança.</div>
      </div>
    `;

  return `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>SEI-MCP · Planos</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; background: #0b1220; color: #e5e7eb; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 28px 16px; }
    .card { background: #0f172a; border: 1px solid rgba(148,163,184,.2); border-radius: 14px; padding: 18px; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .sub { color: #94a3b8; margin-bottom: 16px; }
    .auth { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin: 12px 0 18px; color: #cbd5e1; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } .auth { flex-direction: column; align-items: flex-start; } }
    .plan { background: rgba(15,23,42,.6); border: 1px solid rgba(148,163,184,.2); border-radius: 14px; padding: 14px; }
    .name { font-weight: 700; font-size: 16px; }
    .price { margin-top: 6px; font-size: 22px; font-weight: 800; }
    .muted { color: #94a3b8; font-size: 12px; margin-top: 6px; }
    .btn { display: inline-block; border: 1px solid rgba(148,163,184,.35); background: rgba(2,6,23,.35); color: #e5e7eb; border-radius: 10px; padding: 10px 12px; cursor: pointer; text-decoration: none; }
    .btn.primary { background: #2563eb; border-color: #2563eb; }
    .actions { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; }
    form { margin: 0; }
    .hint { color: #94a3b8; font-size: 12px; }
    .notice { margin: 12px 0; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(148,163,184,.2); }
    .notice.ok { background: rgba(34,197,94,.12); border-color: rgba(34,197,94,.3); }
    .notice.warn { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); }
    code { background: rgba(2,6,23,.5); padding: 2px 6px; border-radius: 8px; }
    .footer { margin-top: 16px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>SEI‑MCP · Planos</h1>
      <div class="sub">Cobrança via Stripe. Depois de assinar, volte ao Claude e use o MCP via HTTP.</div>
      ${notice}
      ${authBlock}

      <div class="grid">
        <div class="plan">
          <div class="name">Starter</div>
          <div class="price">R$ 29,90<span style="font-size:12px; font-weight:600; color:#94a3b8"> / mês</span></div>
          <div class="muted">Uso moderado · Ideal para 1 usuário</div>
        </div>
        <div class="plan">
          <div class="name">Pro</div>
          <div class="price">R$ 49,90<span style="font-size:12px; font-weight:600; color:#94a3b8"> / mês</span></div>
          <div class="muted">Ilimitado · Melhor para uso intenso</div>
        </div>
      </div>

      ${actions}

      <div class="footer">
        Dica: para proteger o MCP, configure <code>SEI_MCP_BEARER_TOKEN</code> ou use login Google.
      </div>
    </div>
  </div>
</body>
</html>`;
}

