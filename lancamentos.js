var todosOsLancamentos = [];

async function carregarLancamentos() {
  const statusBox = document.getElementById('status-box');
  if (statusBox) statusBox.innerText = 'Buscando lançamentos no Supabase...';

  await carregarOpcoesFormulario();

  try {
    const { data, error } = await _supabase
      .from('transactions')
      .select('*, categories(name), profiles(name)')
      .order('due_date', { ascending: false });

    if (error) throw error;

    if (statusBox) {
      statusBox.className = 'bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[11px] text-emerald-300 font-medium shrink-0 whitespace-nowrap';
      statusBox.innerText = '✅ Conectado ao Supabase com sucesso!';
    }

    todosOsLancamentos = data || [];

    preencherOpcoesDeFiltros(todosOsLancamentos);
    atualizarResumoTotais(todosOsLancamentos);
    aplicarFiltrosEClassificacao();

  } catch (err) {
    console.error('Erro ao buscar lançamentos:', err);
    if (statusBox) {
      statusBox.className = 'bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-full text-[11px] text-rose-300 font-medium shrink-0 whitespace-nowrap';
      statusBox.innerText = 'Erro: ' + (err.message || err);
    }
  }
}

async function carregarOpcoesFormulario() {
  const selectCategoria = document.getElementById('lanc-categoria');
  const selectPessoa = document.getElementById('lanc-pessoa');

  if (selectCategoria && selectCategoria.children.length <= 1) {
    const { data: categorias } = await _supabase.from('categories').select('*');
    if (categorias && categorias.length > 0) {
      selectCategoria.innerHTML = categorias.map(c => `<option value="${c.id}" data-shared="${c.is_shared}">${c.name}</option>`).join('');
    }
  }

  if (selectPessoa && selectPessoa.children.length <= 1) {
    const { data: perfis } = await _supabase.from('profiles').select('*');
    if (perfis && perfis.length > 0) {
      selectPessoa.innerHTML = perfis.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
  }
}

async function salvarLancamento(event) {
  event.preventDefault();

  const descricao = document.getElementById('lanc-descricao').value;
  const valorTotalOuParcela = parseFloat(document.getElementById('lanc-valor').value) || 0;
  const dueDateStr = document.getElementById('lanc-data').value;
  const categoryId = document.getElementById('lanc-categoria').value;
  const profileId = document.getElementById('lanc-pessoa') ? document.getElementById('lanc-pessoa').value : null;
  const statusSelect = document.getElementById('lanc-status').value;
  const formaPagamento = document.getElementById('lanc-pagamento') ? document.getElementById('lanc-pagamento').value : 'pix';
  
  const parcelaAtualInicial = parseInt(document.getElementById('lanc-parcela-atual').value) || 1;
  const totalParcelas = parseInt(document.getElementById('lanc-total-parcelas').value) || 1;

  const catOption = document.getElementById('lanc-categoria').selectedOptions[0];
  const isShared = catOption ? catOption.getAttribute('data-shared') === 'true' : true;

  const novosLancamentos = [];
  const partesData = dueDateStr.split('-');
  const dataBase = new Date(parseInt(partesData[0]), parseInt(partesData[1]) - 1, parseInt(partesData[2]));

  for (let i = 0; i <= (totalParcelas - parcelaAtualInicial); i++) {
    const numParcela = parcelaAtualInicial + i;
    const dataVencimento = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate());
    const ano = dataVencimento.getFullYear();
    const mes = String(dataVencimento.getMonth() + 1).padStart(2, '0');
    const dia = String(dataVencimento.getDate()).padStart(2, '0');
    const dataFormatada = `${ano}-${mes}-${dia}`;

    novosLancamentos.push({
      description: totalParcelas > 1 ? `${descricao} (${numParcela}/${totalParcelas})` : descricao,
      amount: valorTotalOuParcela,
      due_date: dataFormatada,
      category_id: categoryId || null,
      profile_id: profileId || null,
      is_shared: isShared,
      payment_method: formaPagamento,
      status: i === 0 ? statusSelect : 'pending',
      current_installment: numParcela,
      total_installments: totalParcelas
    });
  }

  const { error } = await _supabase.from('transactions').insert(novosLancamentos);

  if (error) {
    alert('Erro ao salvar no Supabase: ' + error.message);
    return;
  }

  document.getElementById('form-lancamento').reset();
  carregarLancamentos();
}

// NOVO: ALTERNAR STATUS RÁPIDO (PENDENTE <-> PAGO)
async function alternarStatusLancamento(id, statusAtual) {
  const novoStatus = statusAtual === 'paid' ? 'pending' : 'paid';

  const { error } = await _supabase
    .from('transactions')
    .update({ status: novoStatus })
    .eq('id', id);

  if (error) {
    alert('Erro ao atualizar status: ' + error.message);
    return;
  }

  carregarLancamentos();
}

async function excluirLancamento(id) {
  if (!confirm('Deseja excluir este registro?')) return;

  const { error } = await _supabase.from('transactions').delete().eq('id', id);

  if (error) {
    alert('Erro ao excluir: ' + error.message);
  } else {
    carregarLancamentos();
  }
}

function atualizarResumoTotais(dados) {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth();

  const proximoMesData = new Date(anoAtual, mesAtual + 1, 1);
  const anoProximo = proximoMesData.getFullYear();
  const mesProximo = proximoMesData.getMonth();

  let totalMesAtual = 0;
  let totalDevidoGeral = 0;
  let pendentesContador = 0;

  const gastosMesAtual = {};
  const salariosMesAtual = {};
  const gastosMesProximo = {};

  dados.forEach(item => {
    const valor = Number(item.amount || 0);
    const nomeCategoria = (item.categories && item.categories.name) ? item.categories.name.toLowerCase() : '';
    const isSalario = nomeCategoria.includes('salário') || nomeCategoria.includes('salario') || nomeCategoria.includes('rendimento');

    if (item.status === 'pending' && !isSalario) {
      totalDevidoGeral += valor;
      pendentesContador++;
    }

    if (item.due_date) {
      const p = item.due_date.split('-');
      const itemAno = parseInt(p[0]);
      const itemMes = parseInt(p[1]) - 1;

      const nomePessoa = (item.profiles && item.profiles.name) ? item.profiles.name : 'Outros';

      if (itemAno === anoAtual && itemMes === mesAtual) {
        if (isSalario) {
          salariosMesAtual[nomePessoa] = (salariosMesAtual[nomePessoa] || 0) + valor;
        } else if (item.is_shared) {
          totalMesAtual += valor;
          gastosMesAtual[nomePessoa] = (gastosMesAtual[nomePessoa] || 0) + valor;
        }
      }

      if (itemAno === anoProximo && itemMes === mesProximo && !isSalario && item.is_shared) {
        gastosMesProximo[nomePessoa] = (gastosMesProximo[nomePessoa] || 0) + valor;
      }
    }
  });

  const elTotalMes = document.getElementById('total-shared');
  const elTotalDevido = document.getElementById('total-devido-geral');
  const elPorPessoa = document.getElementById('total-per-person');
  const elPendentes = document.getElementById('pending-count');
  const elResumoUsuarios = document.getElementById('resumo-usuarios-mes');
  const elAcertoContainer = document.getElementById('box-acerto-contas');

  if (elTotalMes) elTotalMes.innerText = `R$ ${totalMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elTotalDevido) elTotalDevido.innerText = `R$ ${totalDevidoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elPorPessoa) elPorPessoa.innerText = `Metade do mês: R$ ${(totalMesAtual / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elPendentes) elPendentes.innerText = `${pendentesContador} conta(s)`;

  // PREENCHE CARD 3 (EXIBINDO SALDO SOBRANDO: SALÁRIO - GASTOS)
  if (elResumoUsuarios) {
    const todosNomes = Array.from(new Set([...Object.keys(gastosMesAtual), ...Object.keys(salariosMesAtual)]));
    if (todosNomes.length === 0) {
      elResumoUsuarios.innerHTML = `<span class="text-xs text-slate-500">Nenhum lançamento no mês.</span>`;
    } else {
      elResumoUsuarios.innerHTML = todosNomes.map(nome => {
        const salario = salariosMesAtual[nome] || 0;
        const gasto = gastosMesAtual[nome] || 0;
        const saldoResta = salario - gasto;

        return `
          <div class="flex justify-between items-center text-xs py-0.5 border-b border-white/5 last:border-0">
            <span class="font-semibold text-slate-300">${nome}:</span>
            <div class="text-right">
              <span class="font-bold ${saldoResta >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                R$ ${saldoResta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div class="text-[10px] text-slate-500">(Sal: R$ ${salario.toLocaleString('pt-BR')} - Gastos: R$ ${gasto.toLocaleString('pt-BR')})</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // MENSAGENS DE TRANSFERÊNCIA
  if (elAcertoContainer) {
    const msgAtual = gerarTextoTransferencia(gastosMesAtual, "💡 <b>Mês Atual</b>");
    const msgProxima = gerarTextoTransferencia(gastosMesProximo, "📅 <b>Previsão Próximo Mês</b>");

    elAcertoContainer.innerHTML = `
      <div class="space-y-1">
        <div>${msgAtual}</div>
        <div class="text-xs text-sky-300 pt-1.5 border-t border-sky-500/20">${msgProxima}</div>
      </div>
    `;
  }
}

function gerarTextoTransferencia(gastosObj, titulo) {
  const pessoas = Object.keys(gastosObj);
  if (pessoas.length < 2) {
    return `${titulo}: Registros insuficientes para calcular acerto entre 2 pessoas.`;
  }

  const p1 = pessoas[0];
  const p2 = pessoas[1];
  const v1 = gastosObj[p1] || 0;
  const v2 = gastosObj[p2] || 0;
  const diferenca = Math.abs(v1 - v2) / 2;

  if (v1 > v2) {
    return `${titulo}: <b>${p2}</b> deve transferir <b>R$ ${diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> para <b>${p1}</b>.`;
  } else if (v2 > v1) {
    return `${titulo}: <b>${p1}</b> deve transferir <b>R$ ${diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> para <b>${p2}</b>.`;
  } else {
    return `${titulo}: Contas divididas igualmente! Ninguém precisa transferir.`;
  }
}

function preencherOpcoesDeFiltros(dados) {
  const selectMes = document.getElementById('filtro-mes');
  const selectPessoa = document.getElementById('filtro-pessoa');

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = String(agora.getMonth() + 1).padStart(2, '0');
  const chaveMesAtual = `${anoAtual}-${mesAtual}`;

  if (selectMes) {
    selectMes.innerHTML = '<option value="todos">Todos os Meses</option>';
    const mesesSet = new Set();
    
    // Garante que o mês atual exista nas opções
    mesesSet.add(chaveMesAtual);

    dados.forEach(d => {
      if (d.due_date) mesesSet.add(d.due_date.substring(0, 7));
    });

    Array.from(mesesSet).sort().reverse().forEach(m => {
      const p = m.split('-');
      const opt = document.createElement('option');
      opt.value = m;
      opt.innerText = `${p[1]}/${p[0]}`;
      selectMes.appendChild(opt);
    });

    // PADRÃO DE VISUALIZAÇÃO: Mês Atual
    selectMes.value = chaveMesAtual;
  }

  if (selectPessoa) {
    selectPessoa.innerHTML = '<option value="todos">Todas as Pessoas</option>';
    const pessoasSet = new Set();
    dados.forEach(d => {
      if (d.profiles && d.profiles.name) pessoasSet.add(d.profiles.name);
    });
    pessoasSet.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.innerText = p;
      selectPessoa.appendChild(opt);
    });
  }
}

function aplicarFiltrosEClassificacao() {
  const mesSel = document.getElementById('filtro-mes') ? document.getElementById('filtro-mes').value : 'todos';
  const pessoaSel = document.getElementById('filtro-pessoa') ? document.getElementById('filtro-pessoa').value : 'todos';
  const statusSel = document.getElementById('filtro-status') ? document.getElementById('filtro-status').value : 'todos';
  const ordemSel = document.getElementById('ordenar-por') ? document.getElementById('ordenar-por').value : 'vencimento-desc';

  let filtrados = Array.from(todosOsLancamentos);

  if (mesSel !== 'todos') {
    filtrados = filtrados.filter(item => item.due_date && item.due_date.startsWith(mesSel));
  }

  if (pessoaSel !== 'todos') {
    filtrados = filtrados.filter(item => item.profiles && item.profiles.name === pessoaSel);
  }

  if (statusSel !== 'todos') {
    filtrados = filtrados.filter(item => item.status === statusSel);
  }

  filtrados.sort((a, b) => {
    if (ordemSel === 'vencimento-desc') return new Date(b.due_date) - new Date(a.due_date);
    if (ordemSel === 'vencimento-asc') return new Date(a.due_date) - new Date(b.due_date);
    if (ordemSel === 'valor-desc') return (b.amount || 0) - (a.amount || 0);
    if (ordemSel === 'valor-asc') return (a.amount || 0) - (b.amount || 0);
    return 0;
  });

  renderizarTabela(filtrados);
}

function renderizarTabela(dados) {
  const tbody = document.getElementById('tbody-lancamentos');
  if (!tbody) return;

  if (!dados || dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-2.5 text-center text-slate-500">Nenhum lançamento encontrado para os filtros selecionados.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  dados.forEach(item => {
    const nomeCategoria = item.categories?.name || (item.is_shared ? 'Compartilhada' : 'Pessoal');
    const nomePessoa = item.profiles?.name || '-';
    
    const isSalario = nomeCategoria.toLowerCase().includes('salário') || nomeCategoria.toLowerCase().includes('salario') || nomeCategoria.toLowerCase().includes('rendimento');

    // BOTÃO CLICÁVEL DE STATUS (Pendente <-> Pago)
    const statusFormatado = item.status === 'paid' ? 'Pago' : 'Pendente';
    const statusClasse = item.status === 'paid' 
      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' 
      : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25';

    const btnStatusHtml = `<button onclick="alternarStatusLancamento('${item.id}', '${item.status}')" class="${statusClasse} text-xs px-2 py-1 rounded font-semibold cursor-pointer transition" title="Clique para alterar status">${statusFormatado}</button>`;

    const numParcela = item.current_installment || item.installment_number || 1;
    const totParcelas = item.total_installments || 1;
    const exibicaoParcela = totParcelas > 1 ? `${numParcela}/${totParcelas}` : 'À vista';

    const tr = document.createElement('tr');
    tr.className = 'border-b border-white/5 hover:bg-white/5';
    tr.innerHTML = `
      <td class="p-2.5 font-medium text-slate-200">${item.description || '-'} ${isSalario ? '<span class="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-1.5 py-0.5 rounded ml-1">Receita</span>' : ''}</td>
      <td class="p-2.5">${nomeCategoria}</td>
      <td class="p-2.5 font-semibold text-slate-300">${nomePessoa}</td>
      <td class="p-2.5 font-semibold text-slate-300">${exibicaoParcela}</td>
      <td class="p-2.5">${item.due_date ? new Date(item.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
      <td class="p-2.5 font-bold ${isSalario ? 'text-emerald-400' : 'text-slate-100'}">R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td class="p-2.5">${btnStatusHtml}</td>
      <td class="p-2.5 text-center">
        <button onclick="excluirLancamento('${item.id}')" title="Excluir" class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="w-4 h-4"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  carregarLancamentos();
});
