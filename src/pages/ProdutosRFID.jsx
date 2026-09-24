import { useState, useEffect } from 'react'
import { Plus, Package, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbwkbWuN9jyanZ05_icbMl3SnYoS4TKawnPtSz6lsYNoZnWXwJv6MMuZ4a1jdX1b5doC/exec'

export default function ProdutosRFID() {
  const [produtos, setProdutos] = useState([])
  const [sku, setSku] = useState('')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('Tanques')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const carregarProdutos = async () => {
    setCarregando(true)
    setFeedback(null)
    try {
      const res = await fetch(`${API_URL}?action=get_produtos`, { redirect: 'follow' })
      const data = await res.json()
      if (data.status === 'success') {
        setProdutos(data.produtos || [])
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Erro ao carregar catálogo: ${err.message}` })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarProdutos()
  }, [])

  const handleCadastrar = async (e) => {
    e.preventDefault()

    if (!sku.trim() || !nome.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o Código/SKU e o Nome do produto.' })
      return
    }

    setSalvando(true)
    setFeedback(null)

    try {
      const payload = {
        action: 'cadastrar_produto',
        id: sku.trim().toUpperCase(),
        nome: nome.trim(),
        categoria: categoria.trim(),
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })

      const data = await res.json()

      if (data.status === 'success') {
        setFeedback({ type: 'success', message: data.message })
        setSku('')
        setNome('')
        await carregarProdutos()
      } else {
        throw new Error(data.message || 'Falha ao cadastrar produto.')
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Erro: ${err.message}` })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            Catálogo de Modelos e Produtos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre novos tanques, pias e lavatórios para que fiquem disponíveis para etiquetagem.
          </p>
        </div>

        <button
          onClick={carregarProdutos}
          disabled={carregando}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          Recarregar
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Formulário de Cadastro de Novo Produto */}
      <form
        onSubmit={handleCadastrar}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Novo Modelo de Produto
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Código / SKU
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Ex: TM-140 ou PIA-100"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={salvando}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={salvando}
            >
              <option value="Tanques">Tanques</option>
              <option value="Pias">Pias</option>
              <option value="Lavatórios">Lavatórios</option>
              <option value="Acessórios">Acessórios</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nome Completo do Produto
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Tanque de Marmofibra 140cm com Duas Cubas - Branco"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={salvando}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gravando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Cadastrar Produto no Catálogo
            </>
          )}
        </button>
      </form>

      {/* Tabela de Produtos Já Cadastrados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Produtos Cadastrados ({produtos.length})
          </span>
        </div>

        {carregando ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando catálogo...</div>
        ) : produtos.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum produto cadastrado.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {produtos.map((prod) => (
              <li key={prod.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="text-sm font-bold text-slate-900">{prod.nome}</p>
                  <p className="text-xs font-mono text-slate-500">
                    SKU: {prod.id} • Categoria: {prod.categoria}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-full">
                  Ativo
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
