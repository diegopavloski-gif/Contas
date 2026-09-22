// ==========================================
// MÓDULO DE LANÇAMENTOS E APONTAMENTOS DIÁRIOS
// ==========================================

async function carregarLancamentos() {
  const statusBox = document.getElementById('status-box');
  const tbody = document.getElementById('tbody-lancamentos');

  if (statusBox) statusBox.innerText = 'Buscando lançamentos no Supabase...';

  await carregarOpcoesFormulario();

  const { data, error } = await _supabase
    .from('transactions')
    .select('*, categories(name), profiles(name)')
    .order('due_date', { ascending: false });

  if (error) {
    console.error('Erro ao buscar transações:', error);
    if (statusBox) {
      statusBox.className = 'bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700';
      statusBox.innerText = 'Erro ao conectar ao banco de dados: ' + error.message;
    }
    return;
  }

  if (statusBox) {
    statusBox.className = 'bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-sm text-emerald-700';
    statusBox.innerText = '✅ Conectado ao Supabase com sucesso!';
  }

  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-3 text-center text-gray-400">Nenhum lançamento encontrado.</td></tr>';
    atualizarResumoTotais([]);
    return;
  }

  tbody.innerHTML = '';
  data.forEach(item => {
    const nomeCategoria = item.categories?.name || (item.is_shared ? 'Compartilhada' : 'Pessoal');
    const nomePessoa = item.profiles?.name || 'Não informado';
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

  atualizarResumoTotais(data);
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

// 2. CORREÇÃO DAS PARCELAS: Salva automaticamente N parcelas nos meses subsequentes
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

  // Se o valor for parcelado, calcula o valor de cada parcela (caso o usuario tenha digitado o total) ou assume o valor fixo
  const valorPorParcela = valorTotalOuParcela; 

  const novosLancamentos = [];
  const dataBase = new Date(dueDateStr + 'T00:00:00');

  for (let i = 0; i <= (totalParcelas - parcelaAtualInicial); i++) {
    const numParcela = parcelaAtualInicial + i;
    
    // Projeta o vencimento para os meses seguintes
    const dataVencimento = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate());
    const dataFormatada = dataVencimento.toISOString().split('T')[0];

    novosLancamentos.push({
      description: totalParcelas > 1 ? `${descricao} (${numParcela}/${totalParcelas})` : descricao,
      amount: valorPorParcela,
      due_date: dataFormatada,
      category_id: categoryId || null,
      profile_id: profileId || null,
      is_shared: isShared,
      payment_method: formaPagamento,
      status: i === 0 ? statusSelect : 'pending', // Apenas a primeira parcela herda o status digitado
      current_installment: numParcela,
      total_installments: totalParcelas
    });
  }

  const { error } = await _supabase
    .from('transactions')
    .insert(novosLancamentos);

  if (error) {
    alert('Erro ao salvar no Supabase: ' + error.message);
    return;
  }

  document.getElementById('form-lancamento').reset();
  carregarLancamentos();
}

async function excluirLancamento(id) {
  if (!confirm('Deseja excluir este registro?')) return;

  const { error } = await _supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Erro ao excluir: ' + error.message);
  } else {
    carregarLancamentos();
  }
}

// CÁLCULO MÊS ATUAL, MÊS SEGUINTE E TRANSFERÊNCIA ENTRE PESSOAS
function atualizarResumoTotais(dados) {
  const agora = new Date();
  
  // Chave do Mês Atual (Ex: "2026-09")
  const mesAtualChave = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  
  // Chave do Mês Seguinte (Ex: "2026-10")
  const dataMesSeguinte = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const mesSeguinteChave = `${dataMesSeguinte.getFullYear()}-${String(dataMesSeguinte.getMonth() + 1).padStart(2, '0')}`;

  let totalMesAtual = 0;
  let totalDevidoGeral = 0;
  let pendentesContador = 0;

  // Mapeamento de quem pagou/assumiu contas compartilhadas
  const gastosMesAtual = {};
  const gastosMesSeguinte = {};
  let totalMesSeguinte = 0;

  dados.forEach(item => {
    const valor = Number(item.amount || 0);
    const itemDataChave = item.due_date ? item.due_date.substring(0, 7) : '';

    // Total Devido Geral (Contas pendentes de qualquer mês)
    if (item.status === 'pending') {
      totalDevidoGeral += valor;
      pendentesContador++;
    }

    // Contas do MÊS ATUAL
    if (itemDataChave === mesAtualChave && item.is_shared) {
      totalMesAtual += valor;
      if (item.profiles?.name) {
        const nomePessoa = item.profiles.name;
        gastosMesAtual[nomePessoa] = (gastosMesAtual[nomePessoa] || 0) + valor;
      }
    }

    // Contas do MÊS SEGUINTE
    if (itemDataChave === mesSeguinteChave && item.is_shared) {
      totalMesSeguinte += valor;
      if (item.profiles?.name) {
        const nomePessoa = item.profiles.name;
        gastosMesSeguinte[nomePessoa] = (gastosMesSeguinte[nomePessoa] || 0) + valor;
      }
    }
  });

  // Atualizar cards do topo
  const elTotalMes = document.getElementById('total-shared');
  const elTotalDevido = document.getElementById('total-devido-geral');
  const elPorPessoa = document.getElementById('total-per-person');
  const elPendentes = document.getElementById('pending-count');
  const elAcertoContainer = document.getElementById('box-acerto-contas');

  if (elTotalMes) elTotalMes.innerText = `R$ ${totalMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elTotalDevido) elTotalDevido.innerText = `R$ ${totalDevidoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elPorPessoa) elPorPessoa.innerText = `Metade do mês: R$ ${(totalMesAtual / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elPendentes) elPendentes.innerText = `${pendentesContador} conta(s)`;

  // FUNÇÃO AUXILIAR PARA GERAR O TEXTO DE TRANSFERÊNCIA
  function calcularTextoTransferencia(gastosObj, totalDoMes, prefixoTexto) {
    const pessoas = Object.keys(gastosObj);
    if (pessoas.length < 2) return `${prefixoTexto}: Nenhuma conta cadastrada ou sem divisão de 2 pessoas.`;

    const p1 = pessoas[0];
    const p2 = pessoas[1];
    const v1 = gastosObj[p1] || 0;
    const v2 = gastosObj[p2] || 0;
    const diferenca = Math.abs(v1 - v2) / 2;

    if (v1 > v2) {
      return `${prefixoTexto}: <b>${p2}</b> deve transferir <b>R$ ${diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> para <b>${p1}</b>.`;
    } else if (v2 > v1) {
      return `${prefixoTexto}: <b>${p1}</b> deve transferir <b>R$ ${diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> para <b>${p2}</b>.`;
    } else {
      return `${prefixoTexto}: Contas divididas igualmente! Ninguém precisa transferir.`;
    }
  }

  // EXIBIÇÃO NO CARD DE TRANSFERÊNCIAS (MÊS ATUAL + MÊS SEGUINTE)
  if (elAcertoContainer) {
    const textoAtual = calcularTextoTransferencia(gastosMesAtual, totalMesAtual, "💡 <b>Mês Atual</b>");
    const textoProximo = calcularTextoTransferencia(gastosMesSeguinte, totalMesSeguinte, "📅 <b>Previsão Mês Seguinte</b>");

    elAcertoContainer.innerHTML = `
      <div class="space-y-1">
        <div>${textoAtual}</div>
        <div class="text-xs text-indigo-700 pt-1 border-t border-indigo-200 mt-1">${textoProximo}</div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarLancamentos();
});
