import { useState, useRef, useEffect, useMemo } from 'react'
import {
  RotateCcw,
  Barcode,
  Package,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Trash2,
  Layers,
  RefreshCw,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbwkbWuN9jyanZ05_icbMl3SnYoS4TKawnPtSz6lsYNoZnWXwJv6MMuZ4a1jdX1b5doC/exec'

const playSound = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      osc.start()
      osc.stop(ctx.currentTime + 0.1)
    } else {
      osc.frequency.setValueAtTime(280, ctx.currentTime)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    }
  } catch (e) {}
}

export default function AlterarTagRFID() {
  const [catalogoProdutos, setCatalogoProdutos] = useState([])
  const [bancoEstoque, setBancoEstoque] = useState([])
  const [novoProdutoId, setNovoProdutoId] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tagsParaAlterar, setTagsParaAlterar] = useState([]) // Array de objetos { epc, produtoAtualNome, produtoAtualId }
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const inputRef = useRef(null)

  const focarInput = () => {
    if (inputRef.current) inputRef.current.focus()
  }

  const carregarDadosIniciais = async () => {
    setCarregando(true)
    setFeedback(null)
    try {
      const [resProd, resEstoque] = await Promise.all([
        fetch(`${API_URL}?action=get_produtos`, { redirect: 'follow' }),
        fetch(`${API_URL}?action=get_catalogo_estoque`, { redirect: 'follow' }),
      ])

      const dataProd = await resProd.json()
      const dataEstoque = await resEstoque.json()

      if (dataProd.status === 'success' && dataProd.produtos) {
        setCatalogoProdutos(dataProd.produtos)
      }
      if (dataEstoque.status === 'success' && dataEstoque.itens) {
        setBancoEstoque(dataEstoque.itens)
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Erro ao sincronizar dados: ${err.message}` })
    } finally {
      setCarregando(false)
      setTimeout(focarInput, 100)
    }
  }

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  // Mapa rápido de busca EPC -> Dados do Item
  const mapaEstoque = useMemo(() => {
    const map = new Map()
    bancoEstoque.forEach((item) => {
      map.set(item.epc.toUpperCase(), item)
    })
    return map
  }, [bancoEstoque])

  const processarTag = (epcBruto) => {
    const epc = (epcBruto || '').trim().toUpperCase()
    if (!epc) return

    if (!novoProdutoId) {
      playSound('error')
      setFeedback({
        type: 'error',
        message: 'Selecione primeiro o novo produto de destino acima.',
      })
      setTagInput('')
      focarInput()
      return
    }

    // Verifica se a tag existe no estoque ativo
    const itemEstoque = mapaEstoque.get(epc)
    if (!itemEstoque) {
      playSound('error')
      setFeedback({
        type: 'error',
        message: `Tag ${epc} não encontrada no estoque ativo.`,
      })
      setTagInput('')
      focarInput()
      return
    }

    // Verifica se já está cadastrada no mesmo produto
    if (itemEstoque.produtoId === novoProdutoId) {
      playSound('error')
      setFeedback({
        type: 'warning',
        message: `A tag ${epc} já pertence a este mesmo produto (${itemEstoque.produtoNome}).`,
      })
      setTagInput('')
      focarInput()
      return
    }

    // Evita duplicata na lista da sessão atual
    if (tagsParaAlterar.some((t) => t.epc === epc)) {
      playSound('error')
      setFeedback({
        type: 'warning',
        message: `A tag ${epc} já foi incluída na lista de alteração.`,
      })
      setTagInput('')
      focarInput()
      return
    }

    // Adiciona à lista de alteração em massa
    setTagsParaAlterar((prev) => [
      {
        epc: itemEstoque.epc,
        produtoAtualNome: itemEstoque.produtoNome,
        produtoAtualId: itemEstoque.produtoId,
      },
      ...prev,
    ])

    playSound('success')
    setFeedback(null)
    setTagInput('')
    focarInput()
  }

  // Auto-Burst para capturar disparos da pistola RFD8500
  useEffect(() => {
    if (!tagInput.trim()) return
    const timer = setTimeout(() => {
      if (tagInput.trim().length >= 6) {
        processarTag(tagInput)
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [tagInput, novoProdutoId, tagsParaAlterar])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      processarTag(tagInput)
    }
  }

  const removerTag = (epc) => {
    setTagsParaAlterar((prev) => prev.filter((t) => t.epc !== epc))
    focarInput()
  }

  const limparLista = () => {
    setTagsParaAlterar([])
    focarInput()
  }

  const handleConfirmarReclassificacao = async () => {
    if (!novoProdutoId) {
      setFeedback({ type: 'error', message: 'Selecione o novo produto de destino.' })
      return
    }

    if (tagsParaAlterar.length === 0) {
      setFeedback({ type: 'error', message: 'Nenhuma tag foi bipada para reclassificar.' })
      return
    }

    const novoProduto = catalogoProdutos.find((p) => p.id === novoProdutoId)

    if (
      !window.confirm(
        `Confirma reclassificar ${tagsParaAlterar.length} peças para "${novoProduto.nome}"?`,
      )
    ) {
      return
    }

    setSalvando(true)
    setFeedback(null)

    try {
      const payload = {
        action: 'alterar_tags_lote',
        epcs: tagsParaAlterar.map((t) => t.epc),
        novoProdutoId: novoProduto.id,
        novoProdutoNome: novoProduto.nome,
        timestamp: new Date().toISOString(),
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
        setTagsParaAlterar([])
        // Recarrega banco atualizado
        await carregarDadosIniciais()
      } else {
        throw new Error(data.message || 'Falha ao reclassificar lote.')
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Erro ao salvar: ${err.message}` })
    } finally {
      setSalvando(false)
      focarInput()
    }
  }

  const novoProdutoObj = catalogoProdutos.find((p) => p.id === novoProdutoId)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-amber-600" />
            Alteração de Tags em Massa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Selecione o novo produto de destino e passe a pistola nas peças para reclassificar em lote.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarDadosIniciais}
            disabled={carregando || salvando}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Recarregar
          </button>

          <button
            onClick={handleConfirmarReclassificacao}
            disabled={salvando || carregando || tagsParaAlterar.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {salvando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gravando...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Reclassificar Lote ({tagsParaAlterar.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Seleção do Novo Produto */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Package className="w-4 h-4 text-amber-600" />
          1. Selecione o Novo Modelo de Destino
        </label>
        <select
          value={novoProdutoId}
          onChange={(e) => {
            setNovoProdutoId(e.target.value)
            focarInput()
          }}
          disabled={salvando}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        >
          <option value="">-- Escolha o novo produto para onde as tags irão --</option>
          {catalogoProdutos.map((prod) => (
            <option key={prod.id} value={prod.id}>
              {prod.nome} ({prod.id})
            </option>
          ))}
        </select>
      </div>

      {/* Input de Leitura da Pistola */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl flex items-center gap-3 border border-slate-800 shadow-md">
        <Barcode className="w-6 h-6 text-amber-400 shrink-0" />
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={focarInput}
            placeholder={
              novoProdutoId
                ? 'Pronto! Aponte a pistola RFD8500 e aperte o gatilho...'
                : 'Selecione o novo produto acima primeiro'
            }
            disabled={!novoProdutoId || salvando || carregando}
            autoComplete="off"
            className="w-full bg-transparent border-none text-amber-400 font-mono focus:outline-none placeholder:text-slate-500 text-sm tracking-wider uppercase disabled:opacity-40"
          />
        </div>
        {novoProdutoId && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
        )}
      </div>

      {/* Alertas */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
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

      {/* Lista de Peças Escaneadas para Reclassificar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            Peças Prontas para Reclassificar ({tagsParaAlterar.length})
          </span>

          {tagsParaAlterar.length > 0 && (
            <button
              onClick={limparLista}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Limpar Lista
            </button>
          )}
        </div>

        {tagsParaAlterar.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhuma peça lida ainda. Selecione o produto de destino e passe a pistola nas peças que deseja reclassificar.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {tagsParaAlterar.map((item, idx) => (
              <li
                key={item.epc}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                      {tagsParaAlterar.length - idx}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      EPC: {item.epc}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 pl-7">
                    <span className="line-through text-slate-400">{item.produtoAtualNome}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold text-amber-700">
                      {novoProdutoObj?.nome || 'Novo Produto'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removerTag(item.epc)}
                  className="self-end sm:self-center text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50"
                  title="Remover da lista"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
