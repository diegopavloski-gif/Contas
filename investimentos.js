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
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Erro ao buscar movimentações CDB:', error);
    renderizarTabelaCDB([]);
    return;
  }

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesChaveAtual = `${anoAtual}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

  let totalAcumulado = 0;
  let rendimentoAno = 0;
  let aporteMesAtual = 0;

  (transacoes || []).forEach(item => {
    const valor = Number(item.amount || 0);

    if (item.type === 'deposit' || item.type === 'yield') {
      totalAcumulado += valor;
    } else if (item.type === 'withdrawal') {
      totalAcumulado -= valor;
    } else if (item.type === 'closing') {
      // Se for fechamento de mês, consolida o saldo fechado
      totalAcumulado = valor; 
    }

    if (item.transaction_date && item.transaction_date.startsWith(String(anoAtual))) {
      if (item.type === 'yield') rendimentoAno += valor;
      if (item.type === 'withdrawal') rendimentoAno -= Number(item.ir_discounted || 0);
    }

    if (item.transaction_date && item.transaction_date.startsWith(mesChaveAtual) && item.type === 'deposit') {
      aporteMesAtual += valor;
    }
  });

  patrimonioAtualReal = Math.max(0, totalAcumulado);

  // Atualiza indicadores de topo
  const elTotal = document.getElementById('inv-total-acumulado');
  const elRend = document.getElementById('inv-rendimento-ano');
  const elAporte = document.getElementById('inv-aporte-mes');

  if (elTotal) elTotal.innerText = `R$ ${patrimonioAtualReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elRend) elRend.innerText = `R$ ${rendimentoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elAporte) elAporte.innerText = `R$ ${aporteMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  renderizarTabelaCDB(transacoes || []);
  atualizarSimulacao();
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
        <td class="p-2">${item.profiles?.name || '-'}</td>
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

// SIMULADOR & PROJEÇÃO
function atualizarSimulacao() {
  const elMetaDiego = document.getElementById('sim-meta-diego');
  const elMetaGise = document.getElementById('sim-meta-gise');
  const elTaxa = document.getElementById('sim-taxa');
  const elMeses = document.getElementById('sim-meses');

  if (!elMetaDiego || !elMetaGise || !elTaxa || !elMeses) return;

  const metaDiego = parseFloat(elMetaDiego.value) || 0;
  const metaGise = parseFloat(elMetaGise.value) || 0;
  const aporteMensalCasal = metaDiego + metaGise;
  const taxaAnual = parseFloat(elTaxa.value) || 0;
  const totalMeses = parseInt(elMeses.value) || 12;

  // Atualiza textos na interface
  document.getElementById('disp-meta-diego').innerText = `R$ ${metaDiego.toLocaleString('pt-BR')}`;
  document.getElementById('disp-meta-gise').innerText = `R$ ${metaGise.toLocaleString('pt-BR')}`;
  document.getElementById('disp-taxa').innerText = `${taxaAnual}%`;
  document.getElementById('disp-meses').innerText = `${totalMeses} mes(es)`;

  const elMetaCasal = document.getElementById('inv-meta-casal');
  const elMetaIndiv = document.getElementById('inv-meta-individual');
  if (elMetaCasal) elMetaCasal.innerText = `R$ ${aporteMensalCasal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elMetaIndiv) elMetaIndiv.innerText = `Diego: R$ ${metaDiego.toLocaleString('pt-BR')} | Gise: R$ ${metaGise.toLocaleString('pt-BR')}`;

  // Calculo de Rendimento Mensal Esperado (Renda Fixa Mês)
  const taxaMensal = Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1;
  const rendimentoMesEsperado = patrimonioAtualReal * taxaMensal;
  const elRendEsperado = document.getElementById('inv-rendimento-esperado-mes');
  if (elRendEsperado) {
    elRendEsperado.innerText = `R$ ${rendimentoMesEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Monta Labels com Nomes dos Meses Reais
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const dataAtual = new Date();
  let mesAtualIndex = dataAtual.getMonth();
  let anoAtualIndex = dataAtual.getFullYear();

  const labels = [];
  const dadosAportes = [];
  const dadosTotalComJuros = [];

  let montanteComJuros = patrimonioAtualReal;
  let totalSoAportes = patrimonioAtualReal;

  for (let m = 0; m <= totalMeses; m++) {
    const nomeMes = mesesNomes[(mesAtualIndex + m) % 12];
    const anoDoMes = anoAtualIndex + Math.floor((mesAtualIndex + m) / 12);
    labels.push(`${nomeMes}/${String(anoDoMes).substring(2)}`);

    dadosAportes.push(Math.round(totalSoAportes));
    dadosTotalComJuros.push(Math.round(montanteComJuros));

    montanteComJuros = (montanteComJuros + aporteMensalCasal) * (1 + taxaMensal);
    totalSoAportes += aporteMensalCasal;
  }

  const elFinal = document.getElementById('sim-valor-final');
  if (elFinal) elFinal.innerText = `R$ ${Math.round(montanteComJuros).toLocaleString('pt-BR')}`;

  desenharGrafico(labels, dadosAportes, dadosTotalComJuros);
}

function desenharGrafico(labels, dadosAportes, dadosTotalComJuros) {
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
          label: 'Total Acumulado (Juros + Aportes)',
          data: dadosTotalComJuros,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Total Aportado',
          data: dadosAportes,
          borderColor: '#4ade80',
          borderDash: [5, 5],
          fill: false,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca3af', font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
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
