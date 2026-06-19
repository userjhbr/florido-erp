import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Package, Users, ShoppingCart, ClipboardList,
  Wallet, Plus, Trash2, Edit2, X, Search, TrendingUp, TrendingDown,
  AlertTriangle, Flower2
} from 'lucide-react';
import {
  loadAllData,
  upsertProduto, deleteProduto, ajustarEstoque,
  upsertCliente, deleteCliente,
  inserirVenda, deleteVenda,
  upsertPedido, deletePedido,
  inserirLancamento, deleteLancamento,
} from './db';

// ---------- Helpers ----------
const fmtBRL = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

const todayISO = () => new Date().toISOString().slice(0, 10);


// ---------- Reusable UI ----------
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '1rem 1.25rem',
      ...style
    }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, icon, accent }) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
        {icon}
      </div>
      <span style={{ fontSize: '24px', fontWeight: 500, color: accent || 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-background-primary)',
          borderRadius: 'var(--border-radius-lg)',
          border: '0.5px solid var(--color-border-tertiary)',
          padding: '1.25rem',
          width: '100%',
          maxWidth: width,
          maxHeight: '85vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.75rem' }}>
      <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

function Badge({ children, color = 'gray' }) {
  const map = {
    gray: { bg: 'var(--color-background-secondary)', fg: 'var(--color-text-secondary)' },
    green: { bg: '#EAF3DE', fg: '#27500A' },
    amber: { bg: '#FAEEDA', fg: '#633806' },
    red: { bg: '#FCEBEB', fg: '#791F1F' },
    blue: { bg: '#E6F1FB', fg: '#0C447C' },
    teal: { bg: '#E1F5EE', fg: '#085041' },
  };
  const c = map[color] || map.gray;
  return (
    <span style={{
      background: c.bg, color: c.fg, fontSize: '12px', fontWeight: 500,
      padding: '2px 10px', borderRadius: 'var(--border-radius-md)', whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
}

const STATUS_PEDIDO = ['Pendente', 'Em preparo', 'Pronto', 'Entregue', 'Cancelado'];
const STATUS_COLOR = { Pendente: 'amber', 'Em preparo': 'blue', Pronto: 'teal', Entregue: 'green', Cancelado: 'red' };

// ---------- Main App ----------
export default function FloriculturaERP() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [erro, setErro] = useState(null);

  useEffect(() => {
    loadAllData().then(setData).catch((e) => setErro(e.message || String(e)));
  }, []);

  const update = useCallback((key, fn) => {
    setData((prev) => ({ ...prev, [key]: fn(prev[key]) }));
  }, []);

  if (erro) {
    return (
      <div style={{ fontFamily: 'var(--font-sans)', padding: '2rem', color: 'var(--color-text-danger)' }}>
        Erro ao conectar ao banco de dados: {erro}.<br />
        Confira as credenciais em supabaseClient.js e se o SQL das tabelas foi executado.
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ fontFamily: 'var(--font-sans)', padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Carregando...
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'pedidos', label: 'Encomendas', icon: ClipboardList },
    { id: 'financeiro', label: 'Financeiro', icon: Wallet },
  ];

  return (
    <div style={{ fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--border-radius-md)',
          background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Flower2 size={20} color="#085041" aria-hidden="true" />
        </div>
        <div>
          <h2 style={{ margin: 0 }}>Florido ERP</h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>Gestão da floricultura</p>
        </div>
      </header>

      <nav style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '0.5px solid var(--color-border-tertiary)', paddingBottom: '0.5rem' }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                border: 'none',
                background: active ? 'var(--color-background-secondary)' : 'transparent',
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderRadius: 'var(--border-radius-md)'
              }}
            >
              <Icon size={16} aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div>
        {tab === 'dashboard' && <Dashboard data={data} />}
        {tab === 'estoque' && <Estoque produtos={data.produtos} setProdutos={(fn) => update('produtos', fn)} />}
        {tab === 'clientes' && <Clientes clientes={data.clientes} setClientes={(fn) => update('clientes', fn)} />}
        {tab === 'vendas' && (
          <Vendas
            vendas={data.vendas}
            setVendas={(fn) => update('vendas', fn)}
            produtos={data.produtos}
            setProdutos={(fn) => update('produtos', fn)}
            clientes={data.clientes}
            financeiro={data.financeiro}
            setFinanceiro={(fn) => update('financeiro', fn)}
          />
        )}
        {tab === 'pedidos' && (
          <Pedidos
            pedidos={data.pedidos}
            setPedidos={(fn) => update('pedidos', fn)}
            clientes={data.clientes}
            produtos={data.produtos}
          />
        )}
        {tab === 'financeiro' && (
          <Financeiro financeiro={data.financeiro} setFinanceiro={(fn) => update('financeiro', fn)} />
        )}
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ data }) {
  const { produtos, vendas, pedidos, financeiro } = data;

  const valorEstoque = produtos.reduce((s, p) => s + p.preco * p.estoque, 0);
  const baixoEstoque = produtos.filter((p) => p.estoque <= p.minimo);

  const mesAtual = todayISO().slice(0, 7);
  const vendasMes = vendas.filter((v) => v.data.startsWith(mesAtual));
  const totalVendasMes = vendasMes.reduce((s, v) => s + v.total, 0);

  const entradas = financeiro.filter((f) => f.tipo === 'entrada' && f.data.startsWith(mesAtual)).reduce((s, f) => s + f.valor, 0);
  const saidas = financeiro.filter((f) => f.tipo === 'saida' && f.data.startsWith(mesAtual)).reduce((s, f) => s + f.valor, 0);

  const pedidosAbertos = pedidos.filter((p) => p.status !== 'Entregue' && p.status !== 'Cancelado');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <MetricCard label="Valor em estoque" value={fmtBRL(valorEstoque)} icon={<Package size={16} aria-hidden="true" />} />
        <MetricCard label="Vendas no mês" value={fmtBRL(totalVendasMes)} icon={<ShoppingCart size={16} aria-hidden="true" />} />
        <MetricCard label="Entradas (mês)" value={fmtBRL(entradas)} icon={<TrendingUp size={16} aria-hidden="true" />} accent="#27500A" />
        <MetricCard label="Saídas (mês)" value={fmtBRL(saidas)} icon={<TrendingDown size={16} aria-hidden="true" />} accent="#791F1F" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
            <AlertTriangle size={16} aria-hidden="true" />
            <h3 style={{ margin: 0 }}>Estoque baixo</h3>
          </div>
          {baixoEstoque.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>Nenhum produto abaixo do mínimo.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {baixoEstoque.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>{p.nome}</span>
                  <Badge color="red">{p.estoque} {p.unidade}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
            <ClipboardList size={16} aria-hidden="true" />
            <h3 style={{ margin: 0 }}>Encomendas em aberto</h3>
          </div>
          {pedidosAbertos.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>Nenhuma encomenda pendente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pedidosAbertos.slice(0, 6).map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span>{p.clienteNome} · {p.dataEntrega}</span>
                  <Badge color={STATUS_COLOR[p.status]}>{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------- Estoque ----------
function Estoque({ produtos, setProdutos }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = produtos.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));

  const save = async (form) => {
    const saved = await upsertProduto(form);
    if (form.id) {
      setProdutos((list) => list.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      setProdutos((list) => [...list, saved]);
    }
    setEditing(null);
  };

  const remove = async (id) => {
    await deleteProduto(id);
    setProdutos((list) => list.filter((p) => p.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
          <input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>
        <button onClick={() => setEditing({ nome: '', categoria: '', preco: '', custo: '', estoque: '', minimo: '', unidade: 'un' })}>
          <Plus size={16} aria-hidden="true" /> Novo produto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {filtered.map((p) => (
          <Card key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>{p.nome}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{p.categoria}</p>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setEditing(p)} aria-label="Editar" style={{ width: 28, height: 28, padding: 0 }}>
                  <Edit2 size={14} aria-hidden="true" />
                </button>
                <button onClick={() => remove(p.id)} aria-label="Excluir" style={{ width: 28, height: 28, padding: 0 }}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 500 }}>{fmtBRL(p.preco)}</span>
              <Badge color={p.estoque <= p.minimo ? 'red' : 'green'}>
                {p.estoque} {p.unidade} em estoque
              </Badge>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)' }}>Nenhum produto encontrado.</p>
        )}
      </div>

      {editing && <ProdutoModal produto={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProdutoModal({ produto, onSave, onClose }) {
  const [form, setForm] = useState(produto);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={form.id ? 'Editar produto' : 'Novo produto'} onClose={onClose}>
      <Field label="Nome"><input value={form.nome} onChange={(e) => set('nome', e.target.value)} /></Field>
      <Field label="Categoria"><input value={form.categoria} onChange={(e) => set('categoria', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Field label="Preço de venda (R$)">
          <input type="number" step="0.01" value={form.preco} onChange={(e) => set('preco', e.target.value)} />
        </Field>
        <Field label="Custo (R$)">
          <input type="number" step="0.01" value={form.custo} onChange={(e) => set('custo', e.target.value)} />
        </Field>
        <Field label="Quantidade em estoque">
          <input type="number" value={form.estoque} onChange={(e) => set('estoque', e.target.value)} />
        </Field>
        <Field label="Estoque mínimo">
          <input type="number" value={form.minimo} onChange={(e) => set('minimo', e.target.value)} />
        </Field>
        <Field label="Unidade">
          <input value={form.unidade} onChange={(e) => set('unidade', e.target.value)} placeholder="un, maço, vaso..." />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
        <button onClick={onClose}>Cancelar</button>
        <button
          onClick={() => onSave({
            ...form,
            preco: Number(form.preco) || 0,
            custo: Number(form.custo) || 0,
            estoque: Number(form.estoque) || 0,
            minimo: Number(form.minimo) || 0,
          })}
          disabled={!form.nome}
        >
          Salvar
        </button>
      </div>
    </Modal>
  );
}

// ---------- Clientes ----------
function Clientes({ clientes, setClientes }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = clientes.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()));

  const save = async (form) => {
    const saved = await upsertCliente(form);
    if (form.id) {
      setClientes((list) => list.map((c) => (c.id === saved.id ? saved : c)));
    } else {
      setClientes((list) => [...list, saved]);
    }
    setEditing(null);
  };

  const remove = async (id) => {
    await deleteCliente(id);
    setClientes((list) => list.filter((c) => c.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
          <input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>
        <button onClick={() => setEditing({ nome: '', telefone: '', email: '', endereco: '' })}>
          <Plus size={16} aria-hidden="true" /> Novo cliente
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {filtered.map((c) => (
          <Card key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>{c.nome}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{c.telefone}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{c.email}</p>
                {c.endereco && <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{c.endereco}</p>}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setEditing(c)} aria-label="Editar" style={{ width: 28, height: 28, padding: 0 }}>
                  <Edit2 size={14} aria-hidden="true" />
                </button>
                <button onClick={() => remove(c.id)} aria-label="Excluir" style={{ width: 28, height: 28, padding: 0 }}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>Nenhum cliente encontrado.</p>}
      </div>

      {editing && <ClienteModal cliente={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ClienteModal({ cliente, onSave, onClose }) {
  const [form, setForm] = useState(cliente);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={form.id ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <Field label="Nome"><input value={form.nome} onChange={(e) => set('nome', e.target.value)} /></Field>
      <Field label="Telefone"><input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} /></Field>
      <Field label="E-mail"><input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="Endereço"><input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
        <button onClick={onClose}>Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.nome}>Salvar</button>
      </div>
    </Modal>
  );
}

// ---------- Vendas ----------
function Vendas({ vendas, setVendas, produtos, setProdutos, clientes, financeiro, setFinanceiro }) {
  const [open, setOpen] = useState(false);

  const registrarVenda = async (venda) => {
    const vendaSalva = await inserirVenda(venda);

    // baixa estoque (local + banco)
    const novosEstoques = [];
    setProdutos((list) =>
      list.map((p) => {
        const item = venda.itens.find((i) => i.produtoId === p.id);
        if (!item) return p;
        const novoEstoque = Math.max(0, p.estoque - item.qtd);
        novosEstoques.push({ id: p.id, estoque: novoEstoque });
        return { ...p, estoque: novoEstoque };
      })
    );
    await Promise.all(novosEstoques.map((n) => ajustarEstoque(n.id, n.estoque)));

    setVendas((list) => [vendaSalva, ...list]);

    // lança no financeiro
    const lancamento = await inserirLancamento({
      tipo: 'entrada',
      categoria: 'Venda',
      descricao: `Venda - ${venda.clienteNome || 'Balcão'}`,
      valor: venda.total,
      data: venda.data,
    });
    setFinanceiro((list) => [lancamento, ...list]);

    setOpen(false);
  };

  const remove = async (id) => {
    await deleteVenda(id);
    setVendas((list) => list.filter((v) => v.id !== id));
  };

  const totalGeral = vendas.reduce((s, v) => s + v.total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          {vendas.length} vendas · total {fmtBRL(totalGeral)}
        </span>
        <button onClick={() => setOpen(true)}><Plus size={16} aria-hidden="true" /> Nova venda</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {vendas.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>Nenhuma venda registrada ainda.</p>}
        {vendas.map((v) => (
          <Card key={v.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>{v.clienteNome || 'Cliente balcão'}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{v.data}</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {v.itens.map((i) => `${i.qtd}x ${i.nome}`).join(', ')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 500 }}>{fmtBRL(v.total)}</span>
                <button onClick={() => remove(v.id)} aria-label="Excluir" style={{ width: 28, height: 28, padding: 0 }}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {open && <VendaModal produtos={produtos} clientes={clientes} onSave={registrarVenda} onClose={() => setOpen(false)} />}
    </div>
  );
}

function VendaModal({ produtos, clientes, onSave, onClose }) {
  const [clienteId, setClienteId] = useState('');
  const [data, setData] = useState(todayISO());
  const [itens, setItens] = useState([{ produtoId: '', qtd: 1 }]);

  const addItem = () => setItens((list) => [...list, { produtoId: '', qtd: 1 }]);
  const removeItem = (idx) => setItens((list) => list.filter((_, i) => i !== idx));
  const updateItem = (idx, key, value) => setItens((list) => list.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  const total = itens.reduce((s, it) => {
    const p = produtos.find((p) => p.id === it.produtoId);
    return s + (p ? p.preco * Number(it.qtd || 0) : 0);
  }, 0);

  const podeSalvar = itens.every((it) => it.produtoId && Number(it.qtd) > 0);

  const handleSave = () => {
    const cliente = clientes.find((c) => c.id === clienteId);
    const itensCompletos = itens.map((it) => {
      const p = produtos.find((p) => p.id === it.produtoId);
      return { produtoId: it.produtoId, nome: p.nome, qtd: Number(it.qtd), precoUnit: p.preco };
    });
    onSave({
      clienteId: clienteId || null,
      clienteNome: cliente ? cliente.nome : '',
      data,
      itens: itensCompletos,
      total,
    });
  };

  return (
    <Modal title="Nova venda" onClose={onClose} width={520}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Field label="Cliente (opcional)">
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Balcão</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>Itens</p>
      {itens.map((it, idx) => {
        const p = produtos.find((p) => p.id === it.produtoId);
        return (
          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem', alignItems: 'center' }}>
            <select value={it.produtoId} onChange={(e) => updateItem(idx, 'produtoId', e.target.value)} style={{ flex: 1 }}>
              <option value="">Selecione um produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.estoque <= 0}>
                  {p.nome} ({p.estoque} {p.unidade}) — {fmtBRL(p.preco)}
                </option>
              ))}
            </select>
            <input
              type="number" min="1" max={p ? p.estoque : undefined}
              value={it.qtd}
              onChange={(e) => updateItem(idx, 'qtd', e.target.value)}
              style={{ width: 70 }}
            />
            <button onClick={() => removeItem(idx)} aria-label="Remover item" style={{ width: 32, height: 32, padding: 0 }} disabled={itens.length === 1}>
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <button onClick={addItem} style={{ marginBottom: '0.75rem' }}><Plus size={14} aria-hidden="true" /> Adicionar item</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '0.75rem' }}>
        <span style={{ fontWeight: 500 }}>Total</span>
        <span style={{ fontSize: '20px', fontWeight: 500 }}>{fmtBRL(total)}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.75rem' }}>
        <button onClick={onClose}>Cancelar</button>
        <button onClick={handleSave} disabled={!podeSalvar}>Registrar venda</button>
      </div>
    </Modal>
  );
}

// ---------- Pedidos / Encomendas ----------
function Pedidos({ pedidos, setPedidos, clientes, produtos }) {
  const [editing, setEditing] = useState(null);

  const save = async (form) => {
    const saved = await upsertPedido(form);
    if (form.id) {
      setPedidos((list) => list.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      setPedidos((list) => [saved, ...list]);
    }
    setEditing(null);
  };

  const remove = async (id) => {
    await deletePedido(id);
    setPedidos((list) => list.filter((p) => p.id !== id));
  };

  const setStatus = async (id, status) => {
    const pedido = pedidos.find((p) => p.id === id);
    await upsertPedido({ ...pedido, status });
    setPedidos((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const ordenados = [...pedidos].sort((a, b) => (a.dataEntrega || '').localeCompare(b.dataEntrega || ''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setEditing({ clienteId: '', clienteNome: '', descricao: '', dataEntrega: todayISO(), status: 'Pendente', valor: '' })}>
          <Plus size={16} aria-hidden="true" /> Nova encomenda
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ordenados.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>Nenhuma encomenda cadastrada.</p>}
        {ordenados.map((p) => (
          <Card key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>{p.clienteNome || 'Cliente sem nome'}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{p.descricao}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Entrega: {p.dataEntrega} · {fmtBRL(p.valor)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} style={{ width: 130 }}>
                  {STATUS_PEDIDO.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setEditing(p)} aria-label="Editar" style={{ width: 28, height: 28, padding: 0 }}>
                  <Edit2 size={14} aria-hidden="true" />
                </button>
                <button onClick={() => remove(p.id)} aria-label="Excluir" style={{ width: 28, height: 28, padding: 0 }}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editing && <PedidoModal pedido={editing} clientes={clientes} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PedidoModal({ pedido, clientes, onSave, onClose }) {
  const [form, setForm] = useState(pedido);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onClienteChange = (id) => {
    const c = clientes.find((c) => c.id === id);
    setForm((f) => ({ ...f, clienteId: id, clienteNome: c ? c.nome : f.clienteNome }));
  };

  return (
    <Modal title={form.id ? 'Editar encomenda' : 'Nova encomenda'} onClose={onClose}>
      <Field label="Cliente">
        <select value={form.clienteId} onChange={(e) => onClienteChange(e.target.value)}>
          <option value="">Selecione um cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Descrição (itens, observações)">
        <textarea rows={3} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Field label="Data de entrega">
          <input type="date" value={form.dataEntrega} onChange={(e) => set('dataEntrega', e.target.value)} />
        </Field>
        <Field label="Valor (R$)">
          <input type="number" step="0.01" value={form.valor} onChange={(e) => set('valor', e.target.value)} />
        </Field>
      </div>
      <Field label="Status">
        <select value={form.status} onChange={(e) => set('status', e.target.value)}>
          {STATUS_PEDIDO.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
        <button onClick={onClose}>Cancelar</button>
        <button onClick={() => onSave({ ...form, valor: Number(form.valor) || 0 })} disabled={!form.clienteNome || !form.dataEntrega}>Salvar</button>
      </div>
    </Modal>
  );
}

// ---------- Financeiro ----------
function Financeiro({ financeiro, setFinanceiro }) {
  const [editing, setEditing] = useState(null);
  const [filtroMes, setFiltroMes] = useState(todayISO().slice(0, 7));

  const save = async (form) => {
    const saved = await inserirLancamento(form);
    setFinanceiro((list) => [saved, ...list]);
    setEditing(null);
  };

  const remove = async (id) => {
    await deleteLancamento(id);
    setFinanceiro((list) => list.filter((f) => f.id !== id));
  };

  const doMes = financeiro.filter((f) => f.data.startsWith(filtroMes));
  const entradas = doMes.filter((f) => f.tipo === 'entrada').reduce((s, f) => s + f.valor, 0);
  const saidas = doMes.filter((f) => f.tipo === 'saida').reduce((s, f) => s + f.valor, 0);
  const saldo = entradas - saidas;

  const ordenados = [...doMes].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <Field label="Mês">
          <input type="month" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={{ marginBottom: 0 }} />
        </Field>
        <button onClick={() => setEditing({ tipo: 'entrada', categoria: '', descricao: '', valor: '', data: todayISO() })}>
          <Plus size={16} aria-hidden="true" /> Novo lançamento
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <MetricCard label="Entradas" value={fmtBRL(entradas)} icon={<TrendingUp size={16} aria-hidden="true" />} accent="#27500A" />
        <MetricCard label="Saídas" value={fmtBRL(saidas)} icon={<TrendingDown size={16} aria-hidden="true" />} accent="#791F1F" />
        <MetricCard label="Saldo do mês" value={fmtBRL(saldo)} icon={<Wallet size={16} aria-hidden="true" />} accent={saldo >= 0 ? '#27500A' : '#791F1F'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ordenados.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>Nenhum lançamento neste mês.</p>}
        {ordenados.map((f) => (
          <Card key={f.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>{f.descricao}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{f.categoria} · {f.data}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge color={f.tipo === 'entrada' ? 'green' : 'red'}>
                  {f.tipo === 'entrada' ? '+' : '-'}{fmtBRL(f.valor)}
                </Badge>
                <button onClick={() => remove(f.id)} aria-label="Excluir" style={{ width: 28, height: 28, padding: 0 }}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editing && <LancamentoModal lancamento={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LancamentoModal({ lancamento, onSave, onClose }) {
  const [form, setForm] = useState(lancamento);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title="Novo lançamento" onClose={onClose}>
      <Field label="Tipo">
        <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </Field>
      <Field label="Categoria">
        <input value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Venda, Compra de insumos, Aluguel..." />
      </Field>
      <Field label="Descrição">
        <input value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Field label="Valor (R$)">
          <input type="number" step="0.01" value={form.valor} onChange={(e) => set('valor', e.target.value)} />
        </Field>
        <Field label="Data">
          <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
        <button onClick={onClose}>Cancelar</button>
        <button onClick={() => onSave({ ...form, valor: Number(form.valor) || 0 })} disabled={!form.descricao || !form.valor}>Salvar</button>
      </div>
    </Modal>
  );
}
