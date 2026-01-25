// SEI-MCP Bridge - Popup Script com Licenciamento

const API_BASE_URL = 'https://api.iudex.com.br';
const CHECKOUT_URL = 'https://iudex.com.br/checkout';

// Estado
let licenseData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const seiTabEl = document.getElementById('sei-tab');
  const btnConnect = document.getElementById('btn-connect');
  const btnDisconnect = document.getElementById('btn-disconnect');
  const btnOpenSei = document.getElementById('btn-open-sei');

  // License elements
  const licenseLogin = document.getElementById('license-login');
  const licenseInfo = document.getElementById('license-info');
  const emailInput = document.getElementById('email-input');
  const btnCheckLicense = document.getElementById('btn-check-license');
  const planBadge = document.getElementById('plan-badge');
  const licenseMessage = document.getElementById('license-message');
  const btnUpgrade = document.getElementById('btn-upgrade');
  const btnManage = document.getElementById('btn-manage');
  const usageCount = document.getElementById('usage-count');

  // ============================================
  // Licenciamento
  // ============================================

  async function initLicense() {
    const data = await chrome.storage.local.get(['licenseEmail', 'license', 'dailyUsage', 'usageDate']);

    if (data.licenseEmail) {
      emailInput.value = data.licenseEmail;
      await checkLicense(data.licenseEmail);
    }

    // Atualizar contador de uso
    const today = new Date().toISOString().split('T')[0];
    if (data.usageDate !== today) {
      await chrome.storage.local.set({ dailyUsage: 0, usageDate: today });
      data.dailyUsage = 0;
    }

    updateUsageDisplay(data.dailyUsage || 0);
  }

  async function checkLicense(email) {
    if (!email) return;

    btnCheckLicense.textContent = '...';
    btnCheckLicense.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/licenses/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, product: 'sei' }),
      });

      if (response.ok) {
        licenseData = await response.json();
        await chrome.storage.local.set({ license: licenseData, licenseEmail: email });
        showLicenseInfo(licenseData);
      } else {
        // Sem licenca - mostrar trial
        showTrialInfo(email);
      }
    } catch (error) {
      console.error('Erro ao verificar licenca:', error);
      // Usar cache se offline
      const cached = await chrome.storage.local.get(['license']);
      if (cached.license) {
        showLicenseInfo(cached.license);
      } else {
        showTrialInfo(email);
      }
    }

    btnCheckLicense.textContent = 'Verificar';
    btnCheckLicense.disabled = false;
  }

  function showLicenseInfo(license) {
    licenseLogin.classList.add('hidden');
    licenseInfo.classList.remove('hidden');

    const planNames = {
      free: 'Free',
      professional: 'Pro',
      office: 'Office',
      enterprise: 'Enterprise'
    };

    const planClasses = {
      free: '',
      professional: 'pro',
      office: 'office',
      enterprise: 'pro'
    };

    planBadge.textContent = planNames[license.plan] || 'Free';
    planBadge.className = 'plan-badge ' + (planClasses[license.plan] || '');

    if (license.status === 'trialing') {
      planBadge.classList.add('trial');
      const endDate = new Date(license.currentPeriodEnd);
      const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      licenseMessage.textContent = `Teste: ${daysLeft} dias restantes`;
      btnUpgrade.classList.remove('hidden');
      btnManage.classList.add('hidden');
    } else if (license.status === 'active') {
      licenseMessage.textContent = 'Licenca ativa';
      btnUpgrade.classList.add('hidden');
      btnManage.classList.remove('hidden');
    } else {
      licenseMessage.textContent = getStatusMessage(license.status);
      btnUpgrade.classList.remove('hidden');
      btnManage.classList.add('hidden');
    }

    // Atualizar limite de uso
    const limits = { free: 50, professional: 9999, office: 9999, enterprise: 9999 };
    const limit = limits[license.plan] || 50;
    updateUsageDisplay(null, limit);
  }

  function showTrialInfo(email) {
    licenseLogin.classList.add('hidden');
    licenseInfo.classList.remove('hidden');

    planBadge.textContent = 'Trial';
    planBadge.className = 'plan-badge trial';
    licenseMessage.textContent = 'Inicie seu teste gratuito';
    btnUpgrade.classList.remove('hidden');
    btnUpgrade.textContent = 'Comecar Trial';
    btnManage.classList.add('hidden');

    // Salvar email
    chrome.storage.local.set({ licenseEmail: email });
  }

  function getStatusMessage(status) {
    const messages = {
      past_due: 'Pagamento pendente',
      canceled: 'Assinatura cancelada',
      unpaid: 'Pagamento nao realizado',
      incomplete: 'Pagamento incompleto',
      expired: 'Licenca expirada'
    };
    return messages[status] || 'Licenca invalida';
  }

  async function updateUsageDisplay(count, limit) {
    if (count === null) {
      const data = await chrome.storage.local.get(['dailyUsage']);
      count = data.dailyUsage || 0;
    }
    if (!limit) {
      limit = licenseData?.plan === 'free' || !licenseData ? 50 : 9999;
    }

    if (limit >= 9999) {
      usageCount.textContent = `${count} (ilimitado)`;
    } else {
      usageCount.textContent = `${count} / ${limit}`;
    }
  }

  function openCheckout(plan = 'professional') {
    const email = emailInput.value || '';
    const url = `${CHECKOUT_URL}?product=sei&plan=${plan}&email=${encodeURIComponent(email)}`;
    chrome.tabs.create({ url });
  }

  async function openPortal() {
    const email = emailInput.value;
    if (!email) return;

    try {
      const response = await fetch(`${API_BASE_URL}/portal/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const { url } = await response.json();
        chrome.tabs.create({ url });
      }
    } catch (error) {
      console.error('Erro ao abrir portal:', error);
    }
  }

  // ============================================
  // UI de Conexao
  // ============================================

  function updateUI(connected) {
    if (connected) {
      statusEl.className = 'status connected';
      statusText.textContent = 'Conectado';
      btnConnect.classList.add('hidden');
      btnDisconnect.classList.remove('hidden');
    } else {
      statusEl.className = 'status disconnected';
      statusText.textContent = 'Desconectado';
      btnConnect.classList.remove('hidden');
      btnDisconnect.classList.add('hidden');
    }
  }

  async function checkSeiTabs() {
    const tabs = await chrome.tabs.query({ url: '*://*.gov.br/*' });
    const seiTab = tabs.find(t => t.url?.toLowerCase().includes('sei'));
    if (seiTab) {
      seiTabEl.textContent = `Tab #${seiTab.id}`;
    } else {
      seiTabEl.textContent = 'Nao detectada';
    }
  }

  // ============================================
  // Event Listeners
  // ============================================

  btnCheckLicense.addEventListener('click', () => {
    const email = emailInput.value.trim();
    if (email) {
      checkLicense(email);
    }
  });

  emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnCheckLicense.click();
    }
  });

  btnUpgrade.addEventListener('click', () => openCheckout());
  btnManage.addEventListener('click', () => openPortal());

  btnConnect.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'connect' }, (response) => {
      if (response?.success) {
        // Status sera atualizado via mensagem
      }
    });
  });

  btnDisconnect.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'disconnect' }, (response) => {
      if (response?.success) {
        updateUI(false);
      }
    });
  });

  btnOpenSei.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ url: '*://*.gov.br/*' });
    const seiTab = tabs.find(t => t.url?.toLowerCase().includes('sei'));

    if (seiTab) {
      chrome.tabs.update(seiTab.id, { active: true });
      chrome.windows.update(seiTab.windowId, { focused: true });
    } else {
      const url = prompt('Digite a URL do SEI:', 'https://sei.sp.gov.br/sei');
      if (url) {
        chrome.tabs.create({ url });
      }
    }
    window.close();
  });

  // Listener para atualizacoes de status
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'status') {
      updateUI(message.connected);
    }
    if (message.type === 'usage_updated') {
      updateUsageDisplay(message.count);
    }
  });

  // ============================================
  // Inicializacao
  // ============================================

  // Obter status inicial
  chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
    updateUI(response?.connected || false);
  });

  await checkSeiTabs();
  await initLicense();
});
