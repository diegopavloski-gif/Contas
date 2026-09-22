// ==========================================
// MÓDULO DO CALENDÁRIO / PROJEÇÃO 12 MESES
// ==========================================

async function carregarCalendario12Meses() {
  const container = document.getElementById('grid-calendario');
  if (!container) return;

  container.innerHTML = '<div class="col-span-3 text-center py-4 text-gray-500">Calculando projeção dos próximos 12 meses...</div>';

  // 1. Buscar todas as transações no Supabase
  const { data, error } = await _supabase
    .from('transactions')
    .select('*');

  if (error) {
    console.error('Erro ao buscar lançamentos para o calendário:', error);
    container.innerHTML = '<div class="col-span-3 text-center text-red-500">Erro ao carregar dados do calendário.</div>';
    return;
  }

  // 2. Mapear os próximos 12 meses a partir do mês atual
  const mesesProjeção = [];
  const hoje = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    mesesProjeção.push({
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      nomeMes: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      totalCompartilhado: 0,
      totalGeral: 0,
      itens: []
    });
  }

  // 3. Processar lançamentos mapeando pelo due_date
  if (data && data.length > 0) {
    data.forEach(item => {
      // Utiliza a data de vencimento real do banco (due_date)
      const dataStr = item.due_date || item.created_at;
      if (!dataStr) return;

      const partes = dataStr.split('T')[0].split('-');
      const chaveMes = `${partes[0]}-${partes[1]}`;
      const valor = Number(item.amount || 0);

      const mesEncontrado = mesesProjeção.find(m => m.chave === chaveMes);

      if (mesEncontrado) {
        mesEncontrado.totalGeral += valor;
        if (item.is_shared) {
          mesEncontrado.totalCompartilhado += valor;
        }
        mesEncontrado.itens.push({
          descricao: item.description || 'Lançamento',
          valor: valor,
          isShared: item.is_shared
        });
      }
    });
  }

  // 4. Renderizar os cards dos 12 meses
  container.innerHTML = '';

  mesesProjeção.forEach((m, idx) => {
    const card = document.createElement('div');
    const valorCompartilhadoPessoa = m.totalCompartilhado / 2;

    card.className = `p-4 rounded-xl border ${idx === 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'} shadow-sm space-y-2`;

    let htmlItens = '';
    if (m.itens.length === 0) {
      htmlItens = '<p class="text-xs text-gray-400 italic">Sem lançamentos previstos</p>';
    } else {
      htmlItens = m.itens.map(it => `
        <div class="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0">
          <span class="truncate max-w-[150px] text-gray-700" title="${it.descricao}">${it.descricao}</span>
          <span class="font-medium text-gray-900">R$ ${it.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      `).join('');
    }

    card.innerHTML = `
      <div class="flex justify-between items-center pb-2 border-b border-gray-200">
        <h4 class="font-bold text-sm text-gray-800 capitalize">${m.nomeMes}</h4>
        ${idx === 0 ? '<span class="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">Mês Atual</span>' : ''}
      </div>
      <div class="py-1">
        <span class="text-xs text-gray-500 block">Total Contas Casa:</span>
        <span class="text-lg font-extrabold text-gray-900">R$ ${m.totalCompartilhado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        <span class="text-xs text-indigo-600 font-medium block">R$ ${valorCompartilhadoPessoa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / pessoa</span>
      </div>
      <div class="pt-2 border-t border-gray-100">
        <p class="text-[11px] font-semibold text-gray-500 mb-1">Detalhamento:</p>
        <div class="max-h-32 overflow-y-auto pr-1">
          ${htmlItens}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof carregarCalendario12Meses === 'function') {
    carregarCalendario12Meses();
  }
});
