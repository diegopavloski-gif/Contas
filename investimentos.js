<!-- ABA INVESTIMENTOS -->
<div id="sec-investimentos" class="tab-content hidden space-y-6">
  
  <!-- CARDS DE TOPO -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patrimônio Atual (CDB)</span>
      <div id="inv-total-acumulado" class="text-2xl font-extrabold text-gray-800 mt-1">R$ 0,00</div>
      <span class="text-[11px] text-gray-400">Total alocado</span>
    </div>

    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rendimento no Ano</span>
      <div id="inv-rendimento-ano" class="text-2xl font-extrabold text-emerald-600 mt-1">R$ 0,00</div>
      <span class="text-[11px] text-emerald-700">Lucro líquido acumulado</span>
    </div>

    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aporte do Mês Atual</span>
      <div id="inv-aporte-mes" class="text-2xl font-extrabold text-indigo-600 mt-1">R$ 0,00</div>
      <span id="inv-progresso-meta" class="text-[11px] text-gray-500">Meta: R$ 0,00</span>
    </div>

    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta Mensal do Casal</span>
      <div id="inv-meta-casal" class="text-2xl font-extrabold text-purple-600 mt-1">R$ 0,00</div>
      <span id="inv-metas-individuais" class="text-[11px] text-gray-500">Diego: R$ 0 | Gise: R$ 0</span>
    </div>
  </div>

  <!-- SIMULADOR DINÂMICO E GRÁFICO (ESTILO IMAGEM) -->
  <div class="bg-gray-900 text-white p-6 rounded-2xl shadow-lg space-y-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 class="text-lg font-bold">Simulador de Crescimento de Patrimônio</h3>
        <p class="text-xs text-gray-400">Projeção com juros compostos baseada na taxa do CDB e aportes regulares</p>
      </div>
      <div class="text-right">
        <span class="text-xs text-gray-400 uppercase block">Valor Esperado ao Final</span>
        <span id="sim-valor-final" class="text-2xl font-extrabold text-emerald-400">R$ 0,00</span>
      </div>
    </div>

    <!-- GRÁFICO -->
    <div class="h-64 w-full">
      <canvas id="graficoProjecao"></canvas>
    </div>

    <!-- CONTROLES DO SIMULADOR (SLIDERS) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-gray-800 text-xs">
      <div>
        <label class="flex justify-between font-semibold text-gray-300 mb-2">
          <span>Patrimônio Inicial:</span>
          <span id="disp-patrimonio" class="text-indigo-400 font-bold">R$ 0</span>
        </label>
        <input type="range" id="sim-patrimonio" min="0" max="200000" step="1000" value="0" oninput="atualizarSimulacao()" class="w-full accent-indigo-500">
      </div>

      <div>
        <label class="flex justify-between font-semibold text-gray-300 mb-2">
          <span>Meta Aporte Mensal:</span>
          <span id="disp-aporte" class="text-indigo-400 font-bold">R$ 1.500</span>
        </label>
        <input type="range" id="sim-aporte" min="0" max="20000" step="250" value="1500" oninput="atualizarSimulacao()" class="w-full accent-indigo-500">
      </div>

      <div>
        <label class="flex justify-between font-semibold text-gray-300 mb-2">
          <span>Rendimento (% a.a. do CDI):</span>
          <span id="disp-taxa" class="text-indigo-400 font-bold">10.5%</span>
        </label>
        <input type="range" id="sim-taxa" min="5" max="20" step="0.5" value="10.5" oninput="atualizarSimulacao()" class="w-full accent-indigo-500">
      </div>

      <div>
        <label class="flex justify-between font-semibold text-gray-300 mb-2">
          <span>Horizonte (Anos):</span>
          <span id="disp-anos" class="text-indigo-400 font-bold">5 anos</span>
        </label>
        <input type="range" id="sim-anos" min="1" max="30" step="1" value="5" oninput="atualizarSimulacao()" class="w-full accent-indigo-500">
      </div>
    </div>
  </div>

  <!-- REGISTRO DE APORTES, RENDIMENTOS E RESGATES -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- FORMULÁRIO DE OPERAÇÃO -->
    <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h3 class="font-bold text-gray-800 text-sm">Registrar Operação / Aporte</h3>
      <form id="form-cdb-operacao" onsubmit="salvarOperacaoCDB(event)" class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Título do CDB</label>
          <select id="cdb-titulo-id" required class="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-indigo-500">
            <option value="">Carregando títulos...</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Quem Investiu / Perfil</label>
          <select id="cdb-perfil-id" required class="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-indigo-500">
            <option value="">Carregando perfis...</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Tipo de Operação</label>
          <select id="cdb-tipo-op" onchange="alternarCamposOperacao()" class="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-indigo-500">
            <option value="deposit">Aporte (Investir)</option>
            <option value="yield">Rendimento Fechado do Mês</option>
            <option value="withdrawal">Resgate (Saque)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Valor (R$)</label>
          <input type="number" step="0.01" id="cdb-valor" required placeholder="0.00" class="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-indigo-500">
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Data da Operação</label>
          <input type="date" id="cdb-data" required class="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-indigo-500">
        </div>

        <!-- CAMPO DE IR EXIBIDO APENAS EM RESGATES -->
        <div id="box-campo-ir" class="hidden bg-amber-50 p-2.5 rounded border border-amber-200 space-y-1">
          <label class="block text-[11px] font-semibold text-amber-800">Dias de Permanência para IR:</label>
          <input type="number" id="cdb-dias-investido" placeholder="Ex: 90, 200, 400 dias" class="w-full border border-amber-300 rounded p-1.5 text-xs">
          <span class="text-[10px] text-amber-700 block">O cálculo do desconto da tabela regressiva do IR será feito automaticamente.</span>
        </div>

        <button type="submit" class="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded hover:bg-indigo-700 transition">
          Salvar Operação
        </button>
      </form>
    </div>

    <!-- TABELA DE HISTÓRICO DE MOVIMENTAÇÕES -->
    <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h3 class="font-bold text-gray-800 text-sm">Histórico de Rendimentos e Movimentações</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-gray-600">
          <thead class="bg-gray-50 uppercase text-gray-400 border-b">
            <tr>
              <th class="p-2">Data</th>
              <th class="p-2">Título</th>
              <th class="p-2">Pessoa</th>
              <th class="p-2">Tipo</th>
              <th class="p-2">Valor</th>
              <th class="p-2">IR Retido</th>
            </tr>
          </thead>
          <tbody id="tbody-cdb-historico" class="divide-y divide-gray-100">
            <tr>
              <td colspan="6" class="p-3 text-center text-gray-400">Carregando histórico...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

</div>
