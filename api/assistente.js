import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pergunta } = req.body;
  if (!pergunta) return res.status(400).json({ erro: 'Pergunta vazia' });

  try {
    // Busca todos os dados do banco para montar o contexto
    const [produtos, clientes, vendas, pedidos] = await Promise.all([
      supabase.from('produtos').select('*'),
      supabase.from('clientes').select('*'),
      supabase.from('vendas').select('*').order('data', { ascending: false }),
      supabase.from('pedidos').select('*').order('data_entrega', { ascending: true }),
    ]);

    const contexto = `
Você é um assistente de inteligência de negócios para uma floricultura chamada Florido.
Responda perguntas sobre os dados abaixo de forma clara, direta e em português brasileiro.
Se a pergunta não puder ser respondida com os dados, diga isso educadamente.
Use emojis quando adequado para deixar a resposta mais amigável.
Formate valores em reais (R$) corretamente.

=== DADOS ATUAIS ===

PRODUTOS EM ESTOQUE (${produtos.data?.length || 0} itens):
${JSON.stringify(produtos.data, null, 2)}

CLIENTES CADASTRADOS (${clientes.data?.length || 0}):
${JSON.stringify(clientes.data, null, 2)}

VENDAS REALIZADAS (${vendas.data?.length || 0} vendas):
${JSON.stringify(vendas.data, null, 2)}

ENCOMENDAS/PEDIDOS (${pedidos.data?.length || 0} pedidos):
${JSON.stringify(pedidos.data, null, 2)}

DATA ATUAL: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    `.trim();

    // Chama Claude (Anthropic API)
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
        messages: [{ role: 'user', content: pergunta }],
      }),
    });

    const dados = await resposta.json();
    const texto = dados.content?.[0]?.text || 'Não consegui gerar uma resposta.';

    res.status(200).json({ resposta: texto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
}