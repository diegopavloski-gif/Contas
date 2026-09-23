async function carregarCalendario12Meses() {
  const container = document.getElementById('grid-calendario');
  if (!container) return;

  container.innerHTML = '<div class="col-span-full text-center text-slate-500 py-8">Carregando projeção dos próximos 6 meses...</div>';

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

      let totalDespesasMes = 0;
      let totalCompartilhadoMes = 0;
      const totalDespesasPorUsuario = {};

      itensDoMes.forEach(item => {
        const valor = Number(item.amount || 0);
        const nomeCategoria = (item.categories && item.categories.name) ? item.categories.name.toLowerCase() : '';
        const isSalario = nomeCategoria.includes('salário') || nomeCategoria.includes('salario') || nomeCategoria.includes('rendimento');

        // Soma nos totais apenas se NÃO for salário/rendimento (Apenas Despesas)
        if (!isSalario) {
          totalDespesasMes += valor;

          if (item.is_shared) {
            totalCompartilhadoMes += valor;
          }

          const nomePessoa = (item.profiles && item.profiles.name) ? item.profiles.name : 'Outros';
          totalDespesasPorUsuario[nomePessoa] = (totalDespesasPorUsuario[nomePessoa] || 0) + valor;
        }
      });

      // HTML dos lançamentos do mês
      let listaItensHTML = '';
      if (itensDoMes.length === 0) {
        listaItensHTML = '<div class="text-xs text-slate-500 italic py-4 text-center">Nenhum compromisso para este mês.</div>';
      } else {
        listaItensHTML = itensDoMes.map(item => {
          const nomeCategoria = item.categories?.name || '';
          const isSalario = nomeCategoria.toLowerCase().includes('salário') || 
                            nomeCategoria.toLowerCase().includes('salario') || 
                            nomeCategoria.toLowerCase().includes('rendimento');

          const statusBadge = item.status === 'paid' 
            ? '<span class="text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded font-medium">Pago</span>'
            : '<span class="text-[10px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded font-medium">Pendente</span>';

          const nomePessoa = item.profiles?.name ? `(${item.profiles.name})` : '';
          const valorClasse = isSalario ? 'text-emerald-400' : 'text-slate-300';

          return `
            <div class="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-0">
              <div class="truncate pr-2">
                <span class="font-medium text-slate-200">${item.description || 'Sem descrição'}</span>
                ${isSalario ? '<span class="text-[9px] bg-emerald-500/15 text-emerald-300 font-bold px-1 py-0.2 rounded ml-1">Receita</span>' : ''}
                <span class="text-[11px] text-slate-500 block">${nomeCategoria || 'Geral'} ${nomePessoa}</span>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="font-semibold ${valorClasse}">R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="mt-0.5">${statusBadge}</div>
              </div>
            </div>
          `;
        }).join('');
      }

      // HTML do resumo individual por usuário (Despesas Apenas)
      const nomesUsuarios = Object.keys(totalDespesasPorUsuario);
      let resumoUsuariosHTML = '';

      if (nomesUsuarios.length > 0) {
        resumoUsuariosHTML = nomesUsuarios.map(nome => `
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400">${nome}:</span>
            <span class="font-bold text-slate-200">R$ ${totalDespesasPorUsuario[nome].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        `).join('');
      } else {
        resumoUsuariosHTML = '<div class="text-xs text-slate-500">Sem despesas no mês</div>';
      }

      // Card do Mês
      const card = document.createElement('div');
      card.className = 'bg-panel border border-white/5 rounded-2xl p-3.5 shadow-lg shadow-black/20 flex flex-col justify-between space-y-3 hover:border-blue-500/40 transition';
      
      card.innerHTML = `
        <div>
          <!-- Cabeçalho do Card -->
          <div class="flex justify-between items-center pb-3 border-b border-white/10">
            <h3 class="font-bold text-slate-100 capitalize text-base">${m.nomeMes}</h3>
            <span class="text-xs bg-blue-500/15 text-blue-300 px-2 py-1 rounded-full font-bold">
              ${itensDoMes.length} conta(s)
            </span>
          </div>

          <!-- Lista de Transações -->
          <div class="mt-3 max-h-52 overflow-y-auto pr-1">
            ${listaItensHTML}
          </div>
        </div>

        <!-- Rodapé do Card: Totais e Divisão por Usuário -->
        <div class="pt-3 border-t border-white/10 space-y-2 bg-panel2 -mx-4 -mb-4 p-4 rounded-b-2xl">
          <div class="flex justify-between items-center text-xs font-bold text-slate-300">
            <span>Total Geral do Mês:</span>
            <span class="text-blue-300 text-sm">R$ ${totalDespesasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="pt-2 border-t border-white/10 space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Total Individual (Quem assumiu)</span>
            ${resumoUsuariosHTML}
          </div>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Erro ao gerar calendário:', err);
    container.innerHTML = `<div class="col-span-full text-center text-rose-400 py-4">Erro ao carregar calendário: ${err.message || err}</div>`;
  }
}
