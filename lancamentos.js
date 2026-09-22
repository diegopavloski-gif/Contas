// ==========================================
// MÓDULO DE LANÇAMENTOS E APONTAMENTOS DIÁRIOS
// ==========================================

async function carregarLancamentos() {
  const statusBox = document.getElementById('status-box');
  const tbody = document.getElementById('tbody-lancamentos');

  if (statusBox) statusBox.innerText = 'Buscando lançamentos no Supabase...';

  // Carregar Categorias e Perfis nos selects do formulário
  await carregarOpcoesFormulario();

  // Buscar transações unindo com as tabelas de Categoria e Perfil
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
    tbody.innerHTML = '<tr><td colspan="7" class="p-3 text-center text-gray-400">Nenhum lançamento encontrado.</td></tr>';
    atualizarResumoTotais([]);
    return;
  }

  tbody.innerHTML = '';
  data.forEach(item => {
    const nomeCategoria = item.categories?.name || (item.is_shared ? 'Compartilhada' : 'Pessoal');
    const nomePessoa = item.profiles?.name || '-';
    const statusFormatado = item.status === 'paid' ? 'Pago' : 'Pendente';
    const statusClasse = item.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3 font-medium">${item.description || '-'}</td>
      <td class="p-3">${nomeCategoria}</td>
      <td class="p-3">${nomePessoa}</td>
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

// Preenche os seletores de Categoria e Pessoa dinamicamente a partir do Supabase
async function carregarOpcoesFormulario() {
  const selectCategoria = document.getElementById('lanc-categoria');
  const selectPessoa = document.getElementById('lanc-pessoa');

  // Buscar Categorias
  if (selectCategoria && selectCategoria.children.length <= 1) {
    const { data: categorias } = await _supabase.from('categories').select('*');
    if (categorias && categorias.length > 0) {
      selectCategoria.innerHTML = categorias.map(c => `<option value="${c.id}" data-shared="${c.is_shared}">${c.name}</option>`).join('');
    }
  }

  // Buscar Perfis/Pessoas
  if (selectPessoa && selectPessoa.children.length <= 1) {
    const { data: perfis } = await _supabase.from('profiles').select('*');
    if (perfis && perfis.length > 0) {
      selectPessoa.innerHTML = perfis.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
  }
}

// Salvar Lançamento ajustado para os campos reais do banco (due_date, category_id, profile_id)
async function salvarLancamento(event) {
  event.preventDefault();

  const descricao = document.getElementById('lanc-descricao').value;
  const valor = parseFloat(document.getElementById('lanc-valor').value) || 0;
  const dueDate = document.getElementById('lanc-data').value;
  const categoryId = document.getElementById('lanc-categoria').value;
  const profileId = document.getElementById('lanc-pessoa') ? document.getElementById('lanc-pessoa').value : null;
  const statusSelect = document.getElementById('lanc-status').value; // 'pending' ou 'paid'
  const formaPagamento = document.getElementById('lanc-pagamento') ? document.getElementById('lanc-pagamento').value : 'pix';

  // Obter informacao de compartilhamento a partir da categoria selecionada
  const catOption = document.getElementById('lanc-categoria').selectedOptions[0];
  const isShared = catOption ? catOption.getAttribute('data-shared') === 'true' : true;

  const { error } = await _supabase
    .from('transactions')
    .insert([{
      description: descricao,
      amount: valor,
      due_date: dueDate,
      category_id: categoryId || null,
      profile_id: profileId || null,
      is_shared: isShared,
      payment_method: formaPagamento,
      status: statusSelect
    }]);

  if (error) {
    alert('Erro ao salvar no Supabase: ' + error.message);
    return;
  }

  document.getElementById('form-lancamento').reset();
  carregarLancamentos();
}

// Excluir Lançamento
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

// Atualizar os três cards do topo
function atualizarResumoTotais(dados) {
  let totalCompartilhado = 0;
  let pendentesContador = 0;

  dados.forEach(item => {
    if (item.is_shared) {
      totalCompartilhado += Number(item.amount || 0);
    }
    if (item.status === 'pending') {
      pendentesContador++;
    }
  });

  const elTotal = document.getElementById('total-shared');
  const elPorPessoa = document.getElementById('total-per-person');
  const elPendentes = document.getElementById('pending-count');

  if (elTotal) elTotal.innerText = `R$ ${totalCompartilhado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elPorPessoa) elPorPessoa.innerText = `R$ ${(totalCompartilhado / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por pessoa (50%)`;
  if (elPendentes) elPendentes.innerText = `${pendentesContador} conta(s)`;
}

// Inicializar na carga da página
document.addEventListener('DOMContentLoaded', () => {
  carregarLancamentos();
});
