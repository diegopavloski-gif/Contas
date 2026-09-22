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
      statusBox.className = 'bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs text-emerald-700';
      statusBox.innerText = '✅ Conectado ao Supabase com sucesso!';
    }

    todosOsLancamentos = data || [];

    preencherOpcoesDeFiltros(todosOsLancamentos);
    atualizarResumoTotais(todosOsLancamentos);
    aplicarFiltrosEClassificacao();

  } catch (err) {
    console.error('Erro ao buscar lançamentos:', err);
    if (statusBox) {
      statusBox.className = 'bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700';
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
  const gastosMesProximo = {};

  dados.forEach(item => {
    const valor = Number(item.amount || 0);

    if (item.status === 'pending') {
      totalDevidoGeral += valor;
      pendentesContador++;
    }

    if (item.due_date && item.is_shared) {
      const p = item.due_date.split('-');
      const itemAno = parseInt(p[0]);
      const itemMes = parseInt(p[1]) - 1;

      const nomePessoa = (item.profiles && item.profiles.name) ? item.profiles.name : 'Outros';

      if (itemAno === anoAtual && itemMes === mesAtual) {
        totalMesAtual += valor;
        gastosMesAtual[nomePessoa] = (gastosMesAtual[nomePessoa] || 0) + valor;
      }

      if (itemAno === anoProximo && itemMes === mesProximo) {
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

  // PREENCHE CARD 3
  if (elResumoUsuarios) {
    const nomes = Object.keys(gastosMesAtual);
    if (nomes.length === 0) {
      elResumoUsuarios.innerHTML = `<span class="text-xs text-gray-400">Nenhum lançamento no mês.</span>`;
    } else {
      elResumoUsuarios.innerHTML = nomes.map(nome => `
        <div class="flex justify-between items-center text-xs">
          <span>${nome}:</span>
          <span class="font-bold text-gray-800">R$ ${gastosMesAtual[nome].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      `).join('');
    }
  }

  // MENSAGENS DE TRANSFERÊNCIA
  if (elAcertoContainer) {
    const msgAtual = gerarTextoTransferencia(gastosMesAtual, "💡 <b>Mês Atual</b>");
    const msgProxima = gerarTextoTransferencia(gastosMesProximo, "📅 <b>Previsão Próximo Mês</b>");

    elAcertoContainer.innerHTML = `
      <div class="space-y-1">
        <div>${msgAtual}</div>
        <div class="text-xs text-indigo-700 pt-1.5 border-t border-indigo-200">${msgProxima}</div>
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

  if (selectMes) {
    selectMes.innerHTML = '<option value="todos">Todos os Meses</option>';
    const mesesSet = new Set();
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
    if (ordemSel === 'vencimento-asc') return new Date(a.due_date) - new Date(a.due_date);
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
    tbody.innerHTML = '<tr><td colspan="8" class="p-3 text-center text-gray-400">Nenhum lançamento encontrado para os filtros selecionados.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  dados.forEach(item => {
    const nomeCategoria = item.categories?.name || (item.is_shared ? 'Compartilhada' : 'Pessoal');
    const nomePessoa = item.profiles?.name || '-';
    const statusFormatado = item.status === 'paid' ? 'Pago' : 'Pendente';
    const statusClasse = item.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

    const numParcela = item.current_installment || item.installment_number || 1;
    const totParcelas = item.total_installments || 1;
    const exibicaoParcela = totParcelas > 1 ? `${numParcela}/${totParcelas}` : 'À vista';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3 font-medium">${item.description || '-'}</td>
      <td class="p-3">${nomeCategoria}</td>
      <td class="p-3 font-semibold text-gray-700">${nomePessoa}</td>
      <td class="p-3 font-semibold text-gray-700">${exibicaoParcela}</td>
      <td class="p-3">${item.due_date ? new Date(item.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
      <td class="p-3 font-semibold">R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td class="p-3"><span class="${statusClasse} text-xs px-2 py-1 rounded font-medium">${statusFormatado}</span></td>
      <td class="p-3 text-center">
        <button onclick="excluirLancamento('${item.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  carregarLancamentos();
});
