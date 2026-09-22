// CONFIGURAÇÃO DO SUPABASE
// Substitua os textos entre aspas com os valores do seu Supabase
const SUPABASE_URL = "https://yfzurdvlqmdtbkyeglam.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmenVyZHZscW1kdGJreWVnbGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODk2NzgsImV4cCI6MjEwNTY2NTY3OH0.xMBnyGmbBFt9NLriCJLQtoKymEWuqE0nEjw8SfhHGZQ";

// Inicializa a conexão com o Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const statusBox = document.getElementById("status-box");
  
  try {
    // Testa a conexão lendo a tabela de categorias criada no banco
    const { data, error } = await _supabase.from("categories").select("*");
    
    if (error) throw error;

    statusBox.className = "bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-sm text-emerald-800 font-medium";
    statusBox.innerHTML = "✅ Conectado ao Supabase com sucesso!";
    
    // Carrega a tela inicial por padrão
    switchTab('lancamentos');
  } catch (err) {
    statusBox.className = "bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-sm text-rose-800";
    statusBox.innerHTML = "❌ Erro ao conectar no Supabase: " + err.message + ". Verifique as chaves no arquivo app.js.";
  }
});

// Navegação entre abas
function switchTab(tabName) {
  const content = document.getElementById("content-area");
  
  // Atualiza cores dos botões das abas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = "tab-btn font-medium py-3 px-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700";
  });
  
  const activeBtn = document.getElementById(`tab-${tabName}`);
  if (activeBtn) {
    activeBtn.className = "tab-btn font-medium py-3 px-4 border-b-2 border-indigo-600 text-indigo-600";
  }

  if (tabName === 'lancamentos') {
    content.innerHTML = `
      <h2 class="text-lg font-bold mb-4">Novo Apontamento de Conta</h2>
      <p class="text-sm text-gray-600 mb-4">Módulo de lançamentos diários, boletos, PIX e cartão de crédito em construção.</p>
    `;
  } else if (tabName === 'calendario') {
    content.innerHTML = `
      <h2 class="text-lg font-bold mb-4">Previsão dos Próximos 12 Meses</h2>
      <p class="text-sm text-gray-600 mb-4">Visualização de gastos fixos e compras parceladas nos próximos meses.</p>
    `;
  } else if (tabName === 'investimentos') {
    content.innerHTML = `
      <h2 class="text-lg font-bold mb-4">Renda Fixa & Simulação de Aportes</h2>
      <p class="text-sm text-gray-600 mb-4">Acompanhamento das metas e simulador de rendimento baseado no % do CDI.</p>
    `;
  }
}
