// ==========================================
// MÓDULO DE LANÇAMENTOS E APONTAMENTOS DIÁRIOS
// ==========================================

async function carregarLancamentos() {
  const statusBox = document.getElementById('status-box');
  const tbody = document.getElementById('tbody-lancamentos');

  if (statusBox) statusBox.innerText = 'Buscando lançamentos no Supabase...';

  const { data, error } = await _supabase
    .from('transactions')
    .select('*');

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
    tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-gray-400">Nenhum lançamento encontrado.</td></tr>';
    atualizarResumoTotais([]);
    return;
  }

  tbody.innerHTML = '';
  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3 font-medium">${item.description || '-'}</td>
      <td class="p-3">${item.is_shared ? 'Compartilhada (50%)' : 'Pessoal'}</td>
      <td class="p-3">${item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}</td>
      <td class="p-3 font-semibold">R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td class="p-3"><span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">Registrado</span></td>
      <td class="p-3 text-center">
        <button onclick="excluirLancamento('${item.id}')" class="text-red-500 hover:text-red-700 font-bold">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  atualizarResumoTotais(data);
}

// Salvar Lançamento ajustado para as colunas do seu banco
async function salvarLancamento(event) {
  event.preventDefault();

  const descricao = document.getElementById('lanc-descricao').value;
  const valor = parseFloat(document.getElementById('lanc-valor').value) || 0;
  const categoriaSelect = document.getElementById('lanc-categoria').value;
  const isShared = categoriaSelect === 'Casa Compartilhada';

  const { error } = await _supabase
    .from('transactions')
    .insert([{
      description: descricao,
      amount: valor,
      is_shared: isShared,
      payment_method: 'credit_card'
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
  
  dados.forEach(item => {
    if (item.is_shared) {
      totalCompartilhado += Number(item.amount || 0);
    }
  });

  const elTotal = document.getElementById('total-shared');
  const elPorPessoa = document.getElementById('total-per-person');

  if (elTotal) elTotal.innerText = `R$ ${totalCompartilhado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (elPorPessoa) elPorPessoa.innerText = `R$ ${(totalCompartilhado / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por pessoa (50%)`;
}

// Inicializar na carga da página
document.addEventListener('DOMContentLoaded', () => {
  carregarLancamentos();
});
