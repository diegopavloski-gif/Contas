let meuGraficoProjecao = null;
let patrimonioAtualReal = 0;

async function carregarInvestimentos() {
  try {
    await carregarSelectsInvestimentos();
    await carregarDadosCDB();
  } catch (err) {
    console.error("Erro ao carregar dados de investimentos:", err);
  }
}

async function carregarSelectsInvestimentos() {
  const selectTitulo = document.getElementById('cdb-titulo-id');
  const selectPerfil = document.getElementById('cdb-perfil-id');

  if (typeof _supabase === 'undefined') return;

  // Carrega Títulos
  if (selectTitulo) {
    let { data: titulos, error } = await _supabase.from('cdb_investments').select('*');
    if ((!titulos || titulos.length === 0) && !error) {
      await _supabase.from('cdb_investments').insert([
        { title_name: 'CDB 100% CDI Liquidez Diária', cdi_percentage: 100 },
        { title_name: 'CDB Promocional 110% CDI', cdi_percentage: 110 }
      ]);
      const res = await _supabase.from('cdb_investments').select('*');
      titulos = res.data;
    }

    if (titulos && titulos.length > 0) {
      selectTitulo.innerHTML = titulos.map(t => `<option value="${t.id}">${t.title_name} (${t.cdi_percentage}%)</option>`).join('');
    } else {
      selectTitulo.innerHTML = '<option value="">Sem títulos cadastrados</option>';
    }
  }

  // Carrega Perfis
  if (selectPerfil) {
    const { data: perfis } = await _supabase.from('profiles').select('*');
    if (perfis && perfis.length > 0) {
      selectPerfil.innerHTML = perfis.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    } else {
      selectPerfil.innerHTML = '<option value="">Sem perfis cadastrados</option>';
    }
  }
}

async function carregarDadosCDB() {
  if (typeof _supabase === 'undefined') return;

  const { data: transacoes, error } = await _supabase
    .from('cdb_transactions')
    .select('*, cdb_investments(title_name), profiles(name)')
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('Erro ao buscar movimentações CDB:', error);
    renderizarTabelaCDB([]);
    return;
  }

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtualStr = `${anoAtual}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

  // Agrupa operações por mês (YYYY-MM)
  const operacoesPorMes = {};
  let rendimentoAno = 0;
  let aporteMesAtual = 0;

  (transacoes || []).forEach(item => {
    if (!item.transaction_date) return;
    const mesChave = item.transaction_date.substring(0, 7);
    const valor = Number(item.amount || 0);
    const nomePerfil = item.profiles?.name || 'Não identificado';

    if (!operacoesPorMes[mesChave]) {
      operacoesPorMes[mesChave] = { fechamento: null, aportes: 0, resgates: 0, rendimentos: 0, porUsuario: {} };
    }

    const mData = operacoesPorMes[mesChave];
    if (!mData.porUsuario[nomePerfil]) mData.porUsuario[nomePerfil] = 0;

    if (item.type === 'closing') {
      mData.fechamento = valor; // Define o saldo absoluto congelado
    } else if (item.type === 'deposit') {
      mData.aportes += valor;
      mData.porUsuario[nomePerfil] += valor;
      if (mesChave === mesAtualStr) aporteMesAtual += valor;
    } else if (item.type === 'yield') {
      mData.rendimentos += valor;
      if (item.transaction_date.startsWith(String(anoAtual))) rendimentoAno += valor;
    } else if (item.type === 'withdrawal') {
      mData.resgates += valor;
      if (item.transaction_date.startsWith(String(anoAtual))) rendimentoAno -= Number(item.ir_discounted || 0);
    }
  });

  // Calcula o Saldo Acumulado Mês a Mês transportando o saldo anterior
  const saldoPorMes = {};
  const aportesPorUsuarioMes = {};
  const mesesOrdenados = Object.keys(operacoesPorMes).sort();

  let saldoAcumuladoAnterior = 0;

  mesesOrdenados.forEach(mChave => {
    const op = operacoesPorMes[mChave];
    aportesPorUsuarioMes[mChave] = op.porUsuario;

    if (op.fechamento !== null) {
      // Se houver Fechamento de Mês, fixa o valor absoluto
      saldoAcumuladoAnterior = op.fechamento;
    } else {
      // Caso contrário, acumula sobre o saldo do mês anterior
      saldoAcumuladoAnterior = saldoAcumuladoAnterior + op.aportes + op.rendimentos - op.resgates;
    }

    saldoPorMes[mChave] = saldoAcumuladoAnterior;
  });

  patrimonioAtualReal = saldoAcumuladoAnterior;

  // Atualiza indicadores do topo
  const elTotal = document.getElementById('inv-total-acumulado');
  const elRend = document.getElementById('inv-rendimento-ano');
  const elAporte = document.getElementById('inv-aporte-mes');

  if (elTotal) elTotal.innerText = `R$ ${patrimonioAtualReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elRend) elRend.innerText = `R$ ${rendimentoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elAporte) elAporte.innerText = `R$ ${aporteMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  renderizarTabelaCDB([...(transacoes || [])].reverse());
  atualizarSimulacao(saldoPorMes, aportesPorUsuarioMes);
}

function alternarCamposOperacao() {
  const selectTipo = document.getElementById('cdb-tipo-op');
  const boxIR = document.getElementById('box-campo-ir');
  if (!selectTipo || !boxIR) return;

  if (selectTipo.value === 'withdrawal') {
    boxIR.classList.remove('hidden');
  } else {
    boxIR.classList.add('hidden');
  }
}

function calcularAliquotaIR(dias) {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
}

async function salvarOperacaoCDB(event) {
  event.preventDefault();

  const cdbId = document.getElementById('cdb-titulo-id').value;
  const profileId = document.getElementById('cdb-perfil-id').value;
  const tipo = document.getElementById('cdb-tipo-op').value;
  const valor = parseFloat(document.getElementById('cdb-valor').value) || 0;
  const data = document.getElementById('cdb-data').value;

  if (!cdbId || !profileId) {
    alert('Selecione o título do CDB e o perfil responsável.');
    return;
  }

  let descontoIR = 0;
  if (tipo === 'withdrawal') {
    const dias = parseInt(document.getElementById('cdb-dias-investido').value) || 30;
    const aliquota = calcularAliquotaIR(dias);
    descontoIR = valor * aliquota * 0.10;
  }

  const { error } = await _supabase.from('cdb_transactions').insert([{
    cdb_id: cdbId,
    profile_id: profileId,
    type: tipo,
    amount: valor,
    transaction_date: data,
    ir_discounted: descontoIR
  }]);

  if (error) {
    alert('Erro ao registrar operação: ' + error.message);
    return;
  }

  document.getElementById('form-cdb-operacao').reset();
  carregarInvestimentos();
}

async function excluirOperacaoCDB(id) {
  if (!confirm('Deseja realmente excluir este apontamento?')) return;

  const { error } = await _supabase.from('cdb_transactions').delete().eq('id', id);
  if (error) {
    alert('Erro ao excluir: ' + error.message);
    return;
  }
  carregarInvestimentos();
}

async function editarOperacaoCDB(id, valorAtual) {
  const novoValor = prompt('Informe o novo valor para este apontamento (R$):', valorAtual);
  if (novoValor === null || novoValor.trim() === '') return;

  const valorNum = parseFloat(novoValor.replace(',', '.'));
  if (isNaN(valorNum)) {
    alert('Valor inválido.');
    return;
  }

  const { error } = await _supabase.from('cdb_transactions').update({ amount: valorNum }).eq('id', id);
  if (error) {
    alert('Erro ao atualizar: ' + error.message);
    return;
  }
  carregarInvestimentos();
}

function renderizarTabelaCDB(dados) {
  const tbody = document.getElementById('tbody-cdb-historico');
  if (!tbody) return;

  if (dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-3 text-center text-gray-400">Nenhuma movimentação registrada.</td></tr>';
    return;
  }

  tbody.innerHTML = dados.map(item => {
    let tipoBadge = '';
    if (item.type === 'deposit') tipoBadge = '<span class="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">Aporte</span>';
    else if (item.type === 'yield') tipoBadge = '<span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">Rendimento</span>';
    else if (item.type === 'closing') tipoBadge = '<span class="text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-bold">Fechamento Mês</span>';
    else tipoBadge = '<span class="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold">Resgate</span>';

    return `
      <tr>
        <td class="p-2">${new Date(item.transaction_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
        <td class="p-2 font-medium text-gray-800">${item.cdb_investments?.title_name || '-'}</td>
        <td class="p-2 font-semibold text-gray-700">${item.profiles?.name || '-'}</td>
        <td class="p-2">${tipoBadge}</td>
        <td class="p-2 font-semibold">R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td class="p-2 text-red-500">R$ ${Number(item.ir_discounted || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td class="p-2 text-center space-x-1">
          <button onclick="editarOperacaoCDB('${item.id}', ${item.amount})" class="text-indigo-600 hover:text-indigo-900 font-semibold px-1">Editar</button>
          <button onclick="excluirOperacaoCDB('${item.id}')" class="text-red-500 hover:text-red-700 font-semibold px-1">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

// PROJEÇÃO HÍBRIDA (HISTÓRICO REAL + PROJEÇÃO FUTURA COM TAGS)
function atualizarSimulacao(saldoPorMes = {}, aportesPorUsuarioMes = {}) {
  const elMetaDiego = document.getElementById('sim-meta-diego');
  const elMetaGise = document.getElementById('sim-meta-gise');
  const elTaxa = document.getElementById('sim-taxa');
  const elMeses = document.getElementById('sim-meses');

  if (!elMetaDiego || !elMetaGise || !elTaxa || !elMeses) return;

  const metaDiego = parseFloat(elMetaDiego.value) || 0;
  const metaGise = parseFloat(elMetaGise.value) || 0;
  const metaCasalTotal = metaDiego + metaGise;
  const taxaAnual = parseFloat(elTaxa.value) || 0;
  const mesesProjecaoFutura = parseInt(elMeses.value) || 12;

  document.getElementById('disp-meta-diego').innerText = `R$ ${metaDiego.toLocaleString('pt-BR')}`;
  document.getElementById('disp-meta-gise').innerText = `R$ ${metaGise.toLocaleString('pt-BR')}`;
  document.getElementById('disp-taxa').innerText = `${taxaAnual}%`;
  document.getElementById('disp-meses').innerText = `${mesesProjecaoFutura} mes(es)`;

  const elMetaCasal = document.getElementById('inv-meta-casal');
  const elMetaIndiv = document.getElementById('inv-meta-individual');
  if (elMetaCasal) elMetaCasal.innerText = `R$ ${metaCasalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elMetaIndiv) elMetaIndiv.innerText = `Diego: R$ ${metaDiego.toLocaleString('pt-BR')} | Gise: R$ ${metaGise.toLocaleString('pt-BR')}`;

  const taxaMensal = Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1;
  const rendimentoMesEsperado = patrimonioAtualReal * taxaMensal;
  const elRendEsperado = document.getElementById('inv-rendimento-esperado-mes');
  if (elRendEsperado) {
    elRendEsperado.innerText = `R$ ${rendimentoMesEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const labels = [];
  const dadosEvolucao = [];
  const tagsDetalhadas = [];

  // 1. Plota Meses Históricos
  const mesesHistoricos = Object.keys(saldoPorMes).sort();
  mesesHistoricos.forEach(mChave => {
    const [ano, mes] = mChave.split('-');
    const nomeMes = mesesNomes[parseInt(mes, 10) - 1];
    labels.push(`${nomeMes}/${ano.substring(2)} (Real)`);
    dadosEvolucao.push(saldoPorMes[mChave]);

    const ap = aportesPorUsuarioMes[mChave] || {};
    const partesAporte = [];
    Object.keys(ap).forEach(usr => {
      if (ap[usr] > 0) partesAporte.push(`${usr}: R$ ${ap[usr].toLocaleString('pt-BR')}`);
    });
    const tagTexto = partesAporte.length > 0 ? partesAporte.join(' | ') : 'Sem aportes diretos';
    tagsDetalhadas.push(tagTexto);
  });

  // 2. Plota Projeção Futura
  let montanteProjetado = patrimonioAtualReal;
  const dataRef = new Date();
  let mIndex = dataRef.getMonth();
  let aIndex = dataRef.getFullYear();

  for (let i = 1; i <= mesesProjecaoFutura; i++) {
    const nomeMes = mesesNomes[(mIndex + i) % 12];
    const anoDoMes = aIndex + Math.floor((mIndex + i) / 12);
    labels.push(`${nomeMes}/${String(anoDoMes).substring(2)} (Proj)`);

    montanteProjetado = (montanteProjetado + metaCasalTotal) * (1 + taxaMensal);
    dadosEvolucao.push(Math.round(montanteProjetado));
    tagsDetalhadas.push(`Projeção Meta: R$ ${metaCasalTotal.toLocaleString('pt-BR')}`);
  }

  const elFinal = document.getElementById('sim-valor-final');
  if (elFinal) elFinal.innerText = `R$ ${Math.round(montanteProjetado).toLocaleString('pt-BR')}`;

  desenharGrafico(labels, dadosEvolucao, tagsDetalhadas);
}

function desenharGrafico(labels, dadosEvolucao, tagsDetalhadas) {
  const ctx = document.getElementById('graficoProjecao');
  if (!ctx || typeof Chart === 'undefined') return;

  if (meuGraficoProjecao) {
    meuGraficoProjecao.destroy();
  }

  meuGraficoProjecao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Evolução Patrimonial (Real x Projetado)',
          data: dadosEvolucao,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#818cf8'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              return ` Patrimônio: R$ ${val.toLocaleString('pt-BR')}`;
            },
            afterLabel: function(context) {
              const index = context.dataIndex;
              return ` Detalhe: ${tagsDetalhadas[index] || ''}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: '#374151' } },
        y: { 
          ticks: { 
            color: '#9ca3af',
            callback: value => 'R$ ' + value.toLocaleString('pt-BR')
          }, 
          grid: { color: '#374151' } 
        }
      }
    }
  });
}
