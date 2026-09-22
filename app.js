// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = "https://yfzurdvlqmdtbkyeglam.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmenVyZHZscW1kdGJreWVnbGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODk2NzgsImV4cCI6MjEwNTY2NTY3OH0.xMBnyGmbBFt9NLriCJLQtoKymEWuqE0nEjw8SfhHGZQ";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis de estado local
let profiles = [];
let categories = [];

document.addEventListener("DOMContentLoaded", async () => {
  const statusBox = document.getElementById("status-box");
  
  try {
    // Carrega perfis e categorias iniciais
    const { data: profData, error: profErr } = await _supabase.from("profiles").select("*");
    if (profErr) throw profErr;
    profiles = profData || [];

    const { data: catData, error: catErr } = await _supabase.from("categories").select("*");
    if (catErr) throw catErr;
    categories = catData || [];

    statusBox.className = "bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-sm text-emerald-800 font-medium";
    statusBox.innerHTML = "✅ Conectado ao Supabase com sucesso!";
    
    // Inicia na aba de lançamentos
    switchTab('lancamentos');
  } catch (err) {
    statusBox.className = "bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-sm text-rose-800";
    statusBox.innerHTML = "❌ Erro ao conectar no Supabase: " + err.message;
  }
});

// Alternar entre abas
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = "tab-btn font-medium py-3 px-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700";
  });
  
  const activeBtn = document.getElementById(`tab-${tabName}`);
  if (activeBtn) {
    activeBtn.className = "tab-btn font-medium py-3 px-4 border-b-2 border-indigo-600 text-indigo-600";
  }

  if (tabName === 'lancamentos') {
    renderLancamentosTab();
  } else if (tabName === 'calendario') {
    renderCalendarioTab();
  } else if (tabName === 'investimentos') {
    renderInvestimentosTab();
  }
}

// -------------------------------------------------------------
// MÓDULO 1: APONTAMENTOS & LANÇAMENTOS DIÁRIOS
// -------------------------------------------------------------
async function renderLancamentosTab() {
  const content = document.getElementById("content-area");
  
  content.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- FORMULÁRIO DE CADASTRO -->
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-200">
        <h3 class="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📝</span> Novo Apontamento
        </h3>
        <form id="transaction-form" onsubmit="saveTransaction(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Quem está apontando?</label>
            <select id="field-profile" required class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
              ${profiles.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Descrição</label>
            <input type="text" id="field-description" placeholder="Ex: Mercado Semanal, Padaria, Conta de Água" required class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Valor (R$)</label>
              <input type="number" step="0.01" id="field-amount" placeholder="0,00" required class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Vencimento / Data</label>
              <input type="date" id="field-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Categoria</label>
              <select id="field-category" required class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Pagamento</label>
              <select id="field-payment" required class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Divisão da Conta</label>
              <select id="field-shared" class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="true">Divisão 50/50 (Casa)</option>
                <option value="false">Individual (Própria)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Nº de Parcelas</label>
              <input type="number" min="1" max="60" id="field-installments" value="1" class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition shadow-md">
            + Cadastrar Apontamento
          </button>
        </form>
      </div>

      <!-- LISTA DE LANÇAMENTOS DO MÊS -->
      <div class="lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-md font-bold text-gray-900">📋 Lançamentos do Mês</h3>
          <span class="text-xs text-gray-500">Atualizado em tempo real</span>
        </div>
        <div id="transactions-list-container" class="space-y-3">
          <p class="text-sm text-gray-500">Carregando lista...</p>
        </div>
      </div>
    </div>
  `;

  // Carrega os lançamentos salva
  fetchTransactions();
}

// Buscar apontamentos no Supabase
async function fetchTransactions() {
  const container = document.getElementById("transactions-list-container");
  
  try {
    const { data, error } = await _supabase
      .from("transactions")
      .select(`
        *,
        profiles (name),
        categories (name)
      `)
      .order("due_date", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="bg-gray-50 border border-dashed border-gray-300 p-8 text-center rounded-xl text-gray-500 text-sm">
          Nenhum apontamento cadastrado até o momento.
        </div>
      `;
      updateDashboardSummary([]);
      return;
    }

    updateDashboardSummary(data);

    // Mapeamento visual das formas de pagamento
    const paymentBadges = {
      pix: '<span class="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">PIX</span>',
      boleto: '<span class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">Boleto</span>',
      credit_card: '<span class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">Cartão Crédito</span>',
      debit_card: '<span class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Cartão Débito</span>',
      cash: '<span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">Dinheiro</span>'
    };

    container.innerHTML = data.map(item => {
      const halfValue = item.is_shared ? (item.amount / 2) : item.amount;
      const isPaid = item.status === 'paid';

      return `
        <div class="bg-white p-4 rounded-xl border ${isPaid ? 'border-gray-200 opacity-75' : 'border-indigo-100 shadow-sm'} flex justify-between items-center">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-900">${item.description}</span>
              ${paymentBadges[item.payment_method] || ''}
              ${item.is_shared ? '<span class="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded font-semibold">50/50 Casa</span>' : ''}
              ${item.installment_total > 1 ? `<span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">Parc ${item.installment_current}/${item.installment_total}</span>` : ''}
            </div>
            <div class="text-xs text-gray-500 flex gap-4">
              <span>Por: <b>${item.profiles?.name || 'Casal'}</b></span>
              <span>Cat: <b>${item.categories?.name || 'Geral'}</b></span>
              <span>Vencimento: <b>${new Date(item.due_date).toLocaleDateString('pt-BR')}</b></span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-lg font-black text-gray-900">R$ ${Number(item.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            ${item.is_shared ? `<div class="text-xs text-indigo-600 font-semibold">R$ ${halfValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})} p/ cada</div>` : ''}
            <button onclick="toggleTransactionStatus('${item.id}', '${item.status}')" class="mt-1 text-xs font-bold underline ${isPaid ? 'text-emerald-600' : 'text-amber-600 hover:text-amber-700'}">
              ${isPaid ? '✓ Pago' : '⏳ Marcar Pago'}
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<p class="text-rose-600 text-sm">Erro ao carregar lançamentos: ${err.message}</p>`;
  }
}

// Atualiza o resumo no topo da tela
function updateDashboardSummary(transactions) {
  const sharedTotal = transactions
    .filter(t => t.is_shared)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  document.getElementById("total-shared").innerText = `R$ ${sharedTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
  document.getElementById("pending-count").innerText = `${pendingCount} conta(s)`;
  
  const halfContainer = document.querySelector("#total-shared + p");
  if (halfContainer) {
    halfContainer.innerText = `R$ ${(sharedTotal / 2).toLocaleString('pt-BR', {minimumFractionDigits: 2})} por pessoa (50%)`;
  }
}

// Salvar Novo Apontamento (Tratando compras parceladas)
async function saveTransaction(e) {
  e.preventDefault();
  
  const profileId = document.getElementById("field-profile").value;
  const description = document.getElementById("field-description").value;
  const amount = parseFloat(document.getElementById("field-amount").value);
  const baseDate = new Date(document.getElementById("field-date").value);
  const categoryId = document.getElementById("field-category").value;
  const paymentMethod = document.getElementById("field-payment").value;
  const isShared = document.getElementById("field-shared").value === 'true';
  const installments = parseInt(document.getElementById("field-installments").value) || 1;

  const installmentGroupId = installments > 1 ? crypto.randomUUID() : null;
  const monthlyAmount = installments > 1 ? (amount / installments) : amount;

  const recordsToInsert = [];

  for (let i = 0; i < installments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    recordsToInsert.push({
      profile_id: profileId,
      category_id: categoryId,
      description: installments > 1 ? `${description} (${i + 1}/${installments})` : description,
      amount: monthlyAmount,
      payment_method: paymentMethod,
      is_shared: isShared,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      installment_current: i + 1,
      installment_total: installments,
      installment_group_id: installmentGroupId
    });
  }

  try {
    const { error } = await _supabase.from("transactions").insert(recordsToInsert);
    if (error) throw error;

    document.getElementById("transaction-form").reset();
    document.getElementById("field-date").value = new Date().toISOString().split('T')[0];
    
    // Atualiza a lista
    fetchTransactions();
  } catch (err) {
    alert("Erro ao salvar apontamento: " + err.message);
  }
}

// Alternar status PAGO / PENDENTE
async function toggleTransactionStatus(id, currentStatus) {
  const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
  
  try {
    const { error } = await _supabase
      .from("transactions")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) throw error;
    fetchTransactions();
  } catch (err) {
    alert("Erro ao alterar status: " + err.message);
  }
}

// Placeholders das outras abas
function renderCalendarioTab() {
  document.getElementById("content-area").innerHTML = `
    <h2 class="text-lg font-bold mb-2">🗓️ Previsão de Gastos (Próximos 12 Meses)</h2>
    <p class="text-sm text-gray-600">Este módulo exibirá o calendário consolidado de compras parceladas e contas fixas projetadas para os próximos 12 meses.</p>
  `;
}

function renderInvestimentosTab() {
  document.getElementById("content-area").innerHTML = `
    <h2 class="text-lg font-bold mb-2">📈 Investimentos em Renda Fixa & Simulação</h2>
    <p class="text-sm text-gray-600">Este módulo exibirá seus aportes, rendimentos baseados no % do CDI, liquidez e a curva de retorno em meses.</p>
  `;
}
