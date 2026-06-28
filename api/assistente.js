import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Ferramentas que o Claude pode chamar ──────────────────────────────────────
const tools = [
  {
    name: 'cadastrar_cliente',
    description: 'Cadastra um novo cliente na floricultura.',
    input_schema: {
      type: 'object',
      properties: {
        nome:      { type: 'string',  description: 'Nome completo do cliente' },
        telefone:  { type: 'string',  description: 'Telefone com DDD' },
        email:     { type: 'string',  description: 'E-mail (opcional)' },
        endereco:  { type: 'string',  description: 'Endereço (opcional)' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'cadastrar_produto',
    description: 'Cadastra ou atualiza um produto no estoque.',
    input_schema: {
      type: 'object',
      properties: {
        nome:      { type: 'string',  description: 'Nome do produto' },
        categoria: { type: 'string',  description: 'Categoria (ex: Flores, Vasos)' },
        preco:     { type: 'number',  description: 'Preço de venda em reais' },
        custo:     { type: 'number',  description: 'Custo de aquisição em reais' },
        estoque:   { type: 'number',  description: 'Quantidade em estoque' },
        minimo:    { type: 'number',  description: 'Estoque mínimo antes do alerta' },
        unidade:   { type: 'string',  description: 'Unidade (un, maço, vaso, etc.)' },
      },
      required: ['nome', 'preco'],
    },
  },
  {
    name: 'cadastrar_pedido',
    description: 'Cria uma nova encomenda/pedido para um cliente.',
    input_schema: {
      type: 'object',
      properties: {
        cliente_nome: { type: 'string', description: 'Nome do cliente' },
        descricao:    { type: 'string', description: 'Descrição do pedido / itens' },
        data_entrega: { type: 'string', description: 'Data de entrega no formato YYYY-MM-DD' },
        valor:        { type: 'number', description: 'Valor total do pedido em reais' },
        status:       { type: 'string', description: 'Status inicial (padrão: Pendente)' },
      },
      required: ['cliente_nome', 'descricao', 'data_entrega', 'valor'],
    },
  },
  {
    name: 'ajustar_estoque',
    description: 'Ajusta a quantidade em estoque de um produto existente.',
    input_schema: {
      type: 'object',
      properties: {
        nome_produto:  { type: 'string', description: 'Nome do produto a ajustar' },
        novo_estoque:  { type: 'number', description: 'Nova quantidade em estoque' },
      },
      required: ['nome_produto', 'novo_estoque'],
    },
  },
  {
    name: 'registrar_lancamento',
    description: 'Registra uma entrada ou saída no financeiro.',
    input_schema: {
      type: 'object',
      properties: {
        tipo:      { type: 'string', enum: ['entrada', 'saida'], description: 'Tipo do lançamento' },
        categoria: { type: 'string', description: 'Categoria (ex: Venda, Compra, Aluguel)' },
        descricao: { type: 'string', description: 'Descrição do lançamento' },
        valor:     { type: 'number', description: 'Valor em reais' },
        data:      { type: 'string', description: 'Data no formato YYYY-MM-DD (padrão: hoje)' },
      },
      required: ['tipo', 'descricao', 'valor'],
    },
  },
];

// ── Executa a operação no Supabase ────────────────────────────────────────────
async function executarFerramenta(nome, args) {
  switch (nome) {
    case 'cadastrar_cliente': {
      const { data, error } = await supabase
        .from('clientes')
        .insert({ nome: args.nome, telefone: args.telefone || '', email: args.email || '', endereco: args.endereco || '' })
        .select()
        .single();
      if (error) throw error;
      return { sucesso: true, id: data.id, mensagem: `Cliente "${args.nome}" cadastrado com ID ${data.id}.` };
    }

    case 'cadastrar_produto': {
      const { data, error } = await supabase
        .from('produtos')
        .insert({
          nome: args.nome, categoria: args.categoria || '', preco: args.preco,
          custo: args.custo || 0, estoque: args.estoque || 0,
          minimo: args.minimo || 0, unidade: args.unidade || 'un',
        })
        .select()
        .single();
      if (error) throw error;
      return { sucesso: true, id: data.id, mensagem: `Produto "${args.nome}" cadastrado com ID ${data.id}.` };
    }

    case 'cadastrar_pedido': {
      const { data, error } = await supabase
        .from('pedidos')
        .insert({
          cliente_nome: args.cliente_nome, descricao: args.descricao,
          data_entrega: args.data_entrega, valor: args.valor,
          status: args.status || 'Pendente',
        })
        .select()
        .single();
      if (error) throw error;
      return { sucesso: true, id: data.id, mensagem: `Pedido para "${args.cliente_nome}" criado com ID ${data.id}.` };
    }

    case 'ajustar_estoque': {
      const { data: prod } = await supabase
        .from('produtos')
        .select('id, nome')
        .ilike('nome', `%${args.nome_produto}%`)
        .limit(1)
        .single();
      if (!prod) return { sucesso: false, mensagem: `Produto "${args.nome_produto}" não encontrado.` };
      const { error } = await supabase.from('produtos').update({ estoque: args.novo_estoque }).eq('id', prod.id);
      if (error) throw error;
      return { sucesso: true, mensagem: `Estoque de "${prod.nome}" atualizado para ${args.novo_estoque}.` };
    }

    case 'registrar_lancamento': {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('financeiro')
        .insert({ tipo: args.tipo, categoria: args.categoria || args.tipo, descricao: args.descricao, valor: args.valor, data: args.data || hoje })
        .select()
        .single();
      if (error) throw error;
      return { sucesso: true, id: data.id, mensagem: `Lançamento "${args.descricao}" registrado com ID ${data.id}.` };
    }

    default:
      return { sucesso: false, mensagem: `Ferramenta desconhecida: ${nome}` };
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pergunta, confirmar, operacao_pendente } = req.body;
  if (!pergunta && !confirmar) return res.status(400).json({ erro: 'Requisição inválida' });

  // ── Modo confirmação: usuário confirmou, executa a operação ───────────────
  if (confirmar && operacao_pendente) {
    try {
      const resultado = await executarFerramenta(operacao_pendente.nome, operacao_pendente.args);
      return res.status(200).json({
        resposta: resultado.sucesso
          ? `✅ ${resultado.mensagem}`
          : `❌ ${resultado.mensagem}`,
        executado: true,
      });
    } catch (err) {
      return res.status(500).json({ erro: 'Erro ao executar: ' + err.message });
    }
  }

  // ── Modo pergunta: busca dados + chama Claude ─────────────────────────────
  try {
    const [produtos, clientes, vendas, pedidos, financeiro] = await Promise.all([
      supabase.from('produtos').select('*'),
      supabase.from('clientes').select('*'),
      supabase.from('vendas').select('*').order('data', { ascending: false }).limit(50),
      supabase.from('pedidos').select('*').order('data_entrega', { ascending: true }),
      supabase.from('financeiro').select('*').order('data', { ascending: false }).limit(50),
    ]);

    const contexto = `
Você é Flor, assistente inteligente da floricultura Florido. Responda em português brasileiro de forma direta e amigável. Use emojis quando adequado. Formate valores em reais (R$).

Você pode CONSULTAR dados e também CADASTRAR/EDITAR registros no banco usando as ferramentas disponíveis.

REGRAS OBRIGATÓRIAS:
1. Quando o usuário pedir para cadastrar/criar/registrar algo, SEMPRE chame a ferramenta imediatamente com os dados fornecidos. NUNCA faça perguntas de esclarecimento antes — o sistema mostrará os dados para o usuário confirmar.
2. Se um dado estiver faltando, use um valor padrão razoável ou deixe vazio. Não pergunte antes.
3. NUNCA responda só com texto quando o usuário pedir uma ação de escrita — use sempre a ferramenta.

DATA ATUAL: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

=== DADOS DO BANCO ===
PRODUTOS (${produtos.data?.length || 0}): ${JSON.stringify(produtos.data)}
CLIENTES (${clientes.data?.length || 0}): ${JSON.stringify(clientes.data)}
VENDAS (${vendas.data?.length || 0} recentes): ${JSON.stringify(vendas.data)}
PEDIDOS (${pedidos.data?.length || 0}): ${JSON.stringify(pedidos.data)}
FINANCEIRO (${financeiro.data?.length || 0} recentes): ${JSON.stringify(financeiro.data)}
    `.trim();

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: contexto,
        tools,
        messages: [{ role: 'user', content: pergunta }],
      }),
    });

    const dados = await resposta.json();

    // Verificar se Claude quer usar uma ferramenta
    const toolUse = dados.content?.find((b) => b.type === 'tool_use');
    const textBlock = dados.content?.find((b) => b.type === 'text');

    if (toolUse) {
      // Monta preview legível para o usuário confirmar
      const preview = montarPreview(toolUse.name, toolUse.input);
      return res.status(200).json({
        resposta: textBlock?.text || `Posso ${preview.acao}. Confirmar?`,
        requer_confirmacao: true,
        operacao_pendente: { nome: toolUse.name, args: toolUse.input },
        preview,
      });
    }

    const texto = textBlock?.text || 'Não consegui gerar uma resposta.';
    return res.status(200).json({ resposta: texto });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
}

function montarPreview(nome, args) {
  switch (nome) {
    case 'cadastrar_cliente':
      return {
        acao: `cadastrar o cliente "${args.nome}"`,
        detalhes: [
          { label: 'Nome', valor: args.nome },
          args.telefone && { label: 'Telefone', valor: args.telefone },
          args.email && { label: 'E-mail', valor: args.email },
          args.endereco && { label: 'Endereço', valor: args.endereco },
        ].filter(Boolean),
      };
    case 'cadastrar_produto':
      return {
        acao: `cadastrar o produto "${args.nome}"`,
        detalhes: [
          { label: 'Nome', valor: args.nome },
          args.categoria && { label: 'Categoria', valor: args.categoria },
          { label: 'Preço', valor: `R$ ${Number(args.preco).toFixed(2)}` },
          args.custo && { label: 'Custo', valor: `R$ ${Number(args.custo).toFixed(2)}` },
          { label: 'Estoque', valor: `${args.estoque || 0} ${args.unidade || 'un'}` },
        ].filter(Boolean),
      };
    case 'cadastrar_pedido':
      return {
        acao: `criar pedido para "${args.cliente_nome}"`,
        detalhes: [
          { label: 'Cliente', valor: args.cliente_nome },
          { label: 'Descrição', valor: args.descricao },
          { label: 'Entrega', valor: args.data_entrega },
          { label: 'Valor', valor: `R$ ${Number(args.valor).toFixed(2)}` },
          { label: 'Status', valor: args.status || 'Pendente' },
        ],
      };
    case 'ajustar_estoque':
      return {
        acao: `ajustar estoque de "${args.nome_produto}"`,
        detalhes: [
          { label: 'Produto', valor: args.nome_produto },
          { label: 'Novo estoque', valor: String(args.novo_estoque) },
        ],
      };
    case 'registrar_lancamento':
      return {
        acao: `registrar ${args.tipo} de R$ ${Number(args.valor).toFixed(2)}`,
        detalhes: [
          { label: 'Tipo', valor: args.tipo === 'entrada' ? '💚 Entrada' : '🔴 Saída' },
          { label: 'Descrição', valor: args.descricao },
          args.categoria && { label: 'Categoria', valor: args.categoria },
          { label: 'Valor', valor: `R$ ${Number(args.valor).toFixed(2)}` },
          args.data && { label: 'Data', valor: args.data },
        ].filter(Boolean),
      };
    default:
      return { acao: 'executar operação', detalhes: [] };
  }
}