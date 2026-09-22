async function carregarCalendario12Meses() {
  const container = document.getElementById('grid-calendario');
  if (!container) return;

  container.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">Carregando projeção dos próximos 6 meses...</div>';

  try {
    // Busca todas as transações
    const { data: transacoes, error } = await _supabase
      .from('transactions')
      .select('*, categories(name), profiles(name)')
      .order('due_date', { ascending: true });

    if (error) throw error;

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth(); // 0-indexed

    // Monta os próximos 6 meses a partir do mês atual
    const proximosMeses = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(anoAtual, mesAtual + i, 1);
      proximosMeses.push({
        ano: d.getFullYear(),
        mes: d.getMonth(),
        chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        nomeMes: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      });
    }

    container.innerHTML = '';

    proximosMeses.forEach(m => {
      // Filtra transações do mês correspondente
      const itensDoMes = (transacoes || []).filter(item => {
        if (!item.due_date) return false;
        return item.due_date.startsWith(m.chave);
      });

      let totalGeralMes = 0;
      let totalCompartilhadoMes = 0;
      const totalPorUsuario = {};

      itensDoMes.forEach(item => {
        const valor = Number(item.amount || 0);
        totalGeralMes += valor;

        if (item.is_shared) {
          totalCompartilhadoMes += valor;
        }

        const nomePessoa = (item.profiles && item.profiles.name) ? item.profiles.name : 'Outros';
        totalPorUsuario[nomePessoa] = (totalPorUsuario[nomePessoa] || 0) + valor;
      });

      // HTML dos lançamentos do mês
      let listaItensHTML = '';
      if (itensDoMes.length === 0) {
        listaItensHTML = '<div class="text-xs text-gray-400 italic py-4 text-center">Nenhum compromisso para este mês.</div>';
      } else {
        listaItensHTML = itensDoMes.map(item => {
          const statusBadge = item.status === 'paid' 
            ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Pago</span>'
            : '<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Pendente</span>';

          const nomePessoa = item.profiles?.name ? `(${item.profiles.name})` : '';

          return `
            <div class="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 last:border-0">
              <div class="truncate pr-2">
                <span class="font-medium text-gray-800">${item.description || 'Sem descrição'}</span>
                <span class="text-[11px] text-gray-400 block">${item.categories?.name || 'Geral'} ${nomePessoa}</span>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="font-semibold text-gray-700">R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="mt-0.5">${statusBadge}</div>
              </div>
            </div>
          `;
        }).join('');
      }

      // HTML do resumo individual por usuário
      const nomesUsuarios = Object.keys(totalPorUsuario);
      let resumoUsuariosHTML = '';

      if (nomesUsuarios.length > 0) {
        resumoUsuariosHTML = nomesUsuarios.map(nome => `
          <div class="flex justify-between items-center text-xs">
            <span class="text-gray-600">${nome}:</span>
            <span class="font-bold text-gray-800">R$ ${totalPorUsuario[nome].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        `).join('');
      } else {
        resumoUsuariosHTML = '<div class="text-xs text-gray-400">Sem lançamentos</div>';
      }

      // Card do Mês
      const card = document.createElement('div');
      card.className = 'bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition';
      
      card.innerHTML = `
        <div>
          <!-- Cabeçalho do Card -->
          <div class="flex justify-between items-center pb-3 border-b border-gray-200">
            <h3 class="font-bold text-gray-800 capitalize text-base">${m.nomeMes}</h3>
            <span class="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-bold">
              ${itensDoMes.length} conta(s)
            </span>
          </div>

          <!-- Lista de Transações -->
          <div class="mt-3 max-h-52 overflow-y-auto pr-1">
            ${listaItensHTML}
          </div>
        </div>

        <!-- Rodapé do Card: Totais e Divisão por Usuário -->
        <div class="pt-3 border-t border-gray-200 space-y-2 bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-xl">
          <div class="flex justify-between items-center text-xs font-bold text-gray-700">
            <span>Total Geral do Mês:</span>
            <span class="text-indigo-600 text-sm">R$ ${totalGeralMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="pt-2 border-t border-gray-200 space-y-1">
            <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Individual (Quem assumiu)</span>
            ${resumoUsuariosHTML}
          </div>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Erro ao gerar calendário:', err);
    container.innerHTML = `<div class="col-span-full text-center text-red-500 py-4">Erro ao carregar calendário: ${err.message || err}</div>`;
  }
}
