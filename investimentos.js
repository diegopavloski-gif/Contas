// ==========================================
// MÓDULO DE INVESTIMENTOS E RENDA FIXA
// ==========================================

// Função principal de inicialização da aba de investimentos
async function carregarInvestimentos() {
    await carregarTabelaInvestimentos();
    calcularSimulacaoRendaFixa();
}

// 1. Buscar investimentos salvos no Supabase
async function carregarTabelaInvestimentos() {
    const tbody = document.getElementById('tbody-investimentos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';

    const { data, error } = await _supabase
        .from('investimentos')
        .select('*')
        .order('data_aplicacao', { ascending: false });

    if (error) {
        console.error('Erro ao buscar investimentos:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhum investimento registrado.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    let totalInvestido = 0;

    data.forEach(item => {
        totalInvestido += Number(item.valor || 0);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.ativo || '-'}</td>
            <td>${item.tipo || 'Renda Fixa'}</td>
            <td>${item.taxa_cdi ? item.taxa_cdi + '% do CDI' : '-'}</td>
            <td>${item.liquidez || 'Diária'}</td>
            <td>R$ ${Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="excluirInvestimento('${item.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Atualiza o card de total
    const elTotal = document.getElementById('total-investido');
    if (elTotal) {
        elTotal.innerText = `R$ ${totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
}

// 2. Salvar novo investimento no Supabase
async function salvarInvestimento(event) {
    event.preventDefault();

    const ativo = document.getElementById('inv-ativo').value;
    const tipo = document.getElementById('inv-tipo').value;
    const taxaCdi = parseFloat(document.getElementById('inv-taxa').value) || 0;
    const liquidez = document.getElementById('inv-liquidez').value;
    const valor = parseFloat(document.getElementById('inv-valor').value) || 0;
    const dataAplicacao = document.getElementById('inv-data').value || new Date().toISOString().split('T')[0];

    const { error } = await _supabase
        .from('investimentos')
        .insert([{ 
            ativo: ativo, 
            tipo: tipo, 
            taxa_cdi: taxaCdi, 
            liquidez: liquidez, 
            valor: valor, 
            data_aplicacao: dataAplicacao 
        }]);

    if (error) {
        alert('Erro ao salvar investimento: ' + error.message);
        return;
    }

    document.getElementById('form-investimento').reset();
    carregarTabelaInvestimentos();
}

// 3. Excluir investimento
async function excluirInvestimento(id) {
    if (!confirm('Deseja realmente remover este ativo?')) return;

    const { error } = await _supabase
        .from('investimentos')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erro ao excluir: ' + error.message);
    } else {
        carregarTabelaInvestimentos();
    }
}

// 4. Simulador de Rentabilidade por Mês (Renda Fixa)
function calcularSimulacaoRendaFixa() {
    const aporteInicial = parseFloat(document.getElementById('sim-inicial')?.value) || 0;
    const aporteMensal = parseFloat(document.getElementById('sim-mensal')?.value) || 0;
    const percCDI = parseFloat(document.getElementById('sim-cdi')?.value) || 100;
    const cdiAnual = parseFloat(document.getElementById('sim-cdi-anual')?.value) || 10.75; // Exemplo de taxa CDI
    const meses = parseInt(document.getElementById('sim-meses')?.value) || 12;

    // CDI mensal aproximado: (1 + cdi_anual)^(1/12) - 1
    const taxaAnualEfetiva = (cdiAnual * (percCDI / 100)) / 100;
    const taxaMensal = Math.pow(1 + taxaAnualEfetiva, 1 / 12) - 1;

    let saldoAcumulado = aporteInicial;
    let totalAportado = aporteInicial;
    let totalJuros = 0;

    for (let i = 1; i <= meses; i++) {
        const jurosMes = saldoAcumulado * taxaMensal;
        saldoAcumulado += jurosMes + aporteMensal;
        totalAportado += aporteMensal;
        totalJuros += jurosMes;
    }

    const elSaldo = document.getElementById('sim-resultado-saldo');
    const elJuros = document.getElementById('sim-resultado-juros');
    const elAportado = document.getElementById('sim-resultado-aportado');

    if (elSaldo) elSaldo.innerText = `R$ ${saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (elJuros) elJuros.innerText = `R$ ${totalJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (elAportado) elAportado.innerText = `R$ ${totalAportado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Disparar o carregamento quando a aba for selecionada ou a página carregar
document.addEventListener('DOMContentLoaded', () => {
    carregarInvestimentos();
});
