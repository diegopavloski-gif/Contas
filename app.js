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
    const { data: profData, error: profErr } = await _supabase.from("profiles").select("*");
    if (profErr) throw profErr;
    profiles = profData || [];

    const { data: catData, error: catErr } = await _supabase.from("categories").select("*");
    if (catErr) throw catErr;
    categories = catData || [];

    statusBox.className = "bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-sm text-emerald-800 font-medium";
    statusBox.innerHTML = "✅ Conectado ao Supabase com sucesso!";
    
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

  fetchTransactions();
}

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
    
    fetchTransactions();
  } catch (err) {
    alert("Erro ao salvar apontamento: " + err.message);
  }
}

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

// -------------------------------------------------------------
// MÓDULO 2: PREVISÃO DOS PRÓXIMOS 12 MESES
// -------------------------------------------------------------
async function renderCalendarioTab() {
  const content = document.getElementById("content-area");
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex justify-between items-center border-b pb-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900">🗓️ Projeção de Gastos dos Próximos 12 Meses</h2>
          <p class="text-xs text-gray-500 mt-0.5">Acompanhamento consolidado de compras parceladas e contas futuras</p>
        </div>
      </div>
      
      <div id="calendar-months-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <p class="text-sm text-gray-500">Calculando projeção dos próximos meses...</p>
      </div>
    </div>
  `;

  try {
    // Busca todas as transações cadastradas
    const { data, error } = await _supabase
      .from("transactions")
      .select(`*, profiles(name)`)
      .order("due_date", { ascending: true });

    if (error) throw error;

    const calendarContainer = document.getElementById("calendar-months-container");
    
    // Gera os próximos 12 meses a partir do mês atual
    const today = new Date();
    const monthsGrouped = {};

    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      monthsGrouped[key] = {
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        items: [],
        totalShared: 0,
        totalIndividual: 0
      };
    }

    // Agrupa os lançamentos nos respectivos meses
    (data || []).forEach(item => {
      const itemDate = new Date(item.due_date);
      const key = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthsGrouped[key]) {
        monthsGrouped[key].items.push(item);
        if (item.is_shared) {
          monthsGrouped[key].totalShared += Number(item.amount);
        } else {
          monthsGrouped[key].totalIndividual += Number(item.amount);
        }
      }
    });

    // Renderiza cada mês na tela
    calendarContainer.innerHTML = Object.keys(monthsGrouped).map(key => {
      const m = monthsGrouped[key];
      const perPersonShared = m.totalShared / 2;

      return `
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-indigo-300 transition">
          <div>
            <div class="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
              <h3 class="font-bold text-gray-900 text-sm">${m.label}</h3>
              <span class="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded">${m.items.length} conta(s)</span>
            </div>

            ${m.items.length === 0 ? `
              <p class="text-xs text-gray-400 italic py-4 text-center">Nenhum compromisso para este mês.</p>
            ` : `
              <div class="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                ${m.items.map(it => `
                  <div class="bg-white p-2 rounded border border-gray-200 text-xs flex justify-between items-center">
                    <div>
                      <div class="font-medium text-gray-800">${it.description}</div>
                      <div class="text-gray-400 text-[10px]">${it.is_shared ? '50/50 Casa' : 'Individual'} • Venc: ${new Date(it.due_date).getDate()}</div>
                    </div>
                    <div class="font-bold text-gray-900">R$ ${Number(it.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Resumo Financeiro do Mês -->
          <div class="border-t border-gray-200 pt-3 mt-2 bg-white p-3 rounded-lg">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Total Casa (100%):</span>
              <span class="font-bold text-gray-900">R$ ${m.totalShared.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            <div class="flex justify-between text-xs text-indigo-700 font-bold bg-indigo-50 p-1.5 rounded">
              <span>50% para cada:</span>
              <span>R$ ${perPersonShared.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    document.getElementById("calendar-months-container").innerHTML = `<p class="text-rose-600 text-sm">Erro ao gerar calendário: ${err.message}</p>`;
  }
}

function renderInvestimentosTab() {
  document.getElementById("content-area").innerHTML = `
    <h2 class="text-lg font-bold mb-2">📈 Investimentos em Renda Fixa & Simulação</h2>
    <p class="text-sm text-gray-600">Este módulo exibirá seus aportes, rendimentos baseados no % do CDI, liquidez e a curva de retorno em meses.</p>
  `;
}
