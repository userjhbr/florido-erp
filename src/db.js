import { supabase } from './supabaseClient';

// ---------- Mapeamento de colunas (snake_case <-> camelCase) ----------

const toProduto = (r) => ({
  id: r.id, nome: r.nome, categoria: r.categoria, preco: Number(r.preco),
  custo: Number(r.custo), estoque: Number(r.estoque), minimo: Number(r.minimo), unidade: r.unidade,
});

const toCliente = (r) => ({
  id: r.id, nome: r.nome, telefone: r.telefone, email: r.email, endereco: r.endereco,
});

const toVenda = (r) => ({
  id: r.id, clienteId: r.cliente_id, clienteNome: r.cliente_nome,
  data: r.data, itens: r.itens || [], total: Number(r.total),
});

const toPedido = (r) => ({
  id: r.id, clienteId: r.cliente_id, clienteNome: r.cliente_nome,
  descricao: r.descricao, dataEntrega: r.data_entrega, status: r.status, valor: Number(r.valor),
});

const toFinanceiro = (r) => ({
  id: r.id, tipo: r.tipo, categoria: r.categoria, descricao: r.descricao,
  valor: Number(r.valor), data: r.data,
});

// ---------- Carregamento inicial ----------

export async function loadAllData() {
  const [produtos, clientes, vendas, pedidos, financeiro] = await Promise.all([
    supabase.from('produtos').select('*').order('nome'),
    supabase.from('clientes').select('*').order('nome'),
    supabase.from('vendas').select('*').order('data', { ascending: false }),
    supabase.from('pedidos').select('*').order('data_entrega'),
    supabase.from('financeiro').select('*').order('data', { ascending: false }),
  ]);

  for (const r of [produtos, clientes, vendas, pedidos, financeiro]) {
    if (r.error) throw r.error;
  }

  return {
    produtos: produtos.data.map(toProduto),
    clientes: clientes.data.map(toCliente),
    vendas: vendas.data.map(toVenda),
    pedidos: pedidos.data.map(toPedido),
    financeiro: financeiro.data.map(toFinanceiro),
  };
}

// ---------- Produtos ----------

export async function upsertProduto(p) {
  const row = {
    nome: p.nome, categoria: p.categoria, preco: p.preco,
    custo: p.custo, estoque: p.estoque, minimo: p.minimo, unidade: p.unidade,
  };
  if (p.id) row.id = p.id;
  const { data, error } = await supabase.from('produtos').upsert(row).select().single();
  if (error) throw error;
  return toProduto(data);
}

export async function deleteProduto(id) {
  const { error } = await supabase.from('produtos').delete().eq('id', id);
  if (error) throw error;
}

export async function ajustarEstoque(id, novoEstoque) {
  const { error } = await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', id);
  if (error) throw error;
}

// ---------- Clientes ----------

export async function upsertCliente(c) {
  const row = { nome: c.nome, telefone: c.telefone, email: c.email, endereco: c.endereco };
  if (c.id) row.id = c.id;
  const { data, error } = await supabase.from('clientes').upsert(row).select().single();
  if (error) throw error;
  return toCliente(data);
}

export async function deleteCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Vendas ----------

export async function inserirVenda(v) {
  const row = {
    cliente_id: v.clienteId || null,
    cliente_nome: v.clienteNome || '',
    data: v.data,
    itens: v.itens,
    total: v.total,
  };
  const { data, error } = await supabase.from('vendas').insert(row).select().single();
  if (error) throw error;
  return toVenda(data);
}

export async function deleteVenda(id) {
  const { error } = await supabase.from('vendas').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Pedidos / Encomendas ----------

export async function upsertPedido(p) {
  const row = {
    cliente_id: p.clienteId || null,
    cliente_nome: p.clienteNome,
    descricao: p.descricao,
    data_entrega: p.dataEntrega,
    status: p.status,
    valor: p.valor,
  };
  if (p.id) row.id = p.id;
  const { data, error } = await supabase.from('pedidos').upsert(row).select().single();
  if (error) throw error;
  return toPedido(data);
}

export async function deletePedido(id) {
  const { error } = await supabase.from('pedidos').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Financeiro ----------

export async function inserirLancamento(f) {
  const row = { tipo: f.tipo, categoria: f.categoria, descricao: f.descricao, valor: f.valor, data: f.data };
  const { data, error } = await supabase.from('financeiro').insert(row).select().single();
  if (error) throw error;
  return toFinanceiro(data);
}

export async function deleteLancamento(id) {
  const { error } = await supabase.from('financeiro').delete().eq('id', id);
  if (error) throw error;
}
