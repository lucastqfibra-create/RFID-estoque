import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Barcode,
  Trash2,
  PackageCheck,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbwFrFyYOSX7FL8F5CuTurJBVSHUvKKAlCOkxVQO32nAzfCNNJVI1GB0wwYDx9zTyRW8/exec'

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
      osc.frequency.setValueAtTime(750, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    }
  } catch (e) {}
}

export default function DespachoRFID() {
  const [bancoEstoque, setBancoEstoque] = useState([])
  const [itensCarga, setItensCarga] = useState([])
  const [identificadorCarga, setIdentificadorCarga] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [despachando, setDespachando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const inputRef = useRef(null)

  const focarInput = () => {
    if (inputRef.current) inputRef.current.focus()
  }

  const carregarEstoque = async () => {
    setCarregando(true)
    try {
      const res = await fetch(`${API_URL}?action=get_catalogo_estoque`, { redirect: 'follow' })
      const data = await res.json()
      if (data.status === 'success') {
        setBancoEstoque(data.itens || [])
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Falha ao carregar estoque: ${err.message}` })
    } finally {
      setCarregando(false)
      setTimeout(focarInput, 100)
    }
  }

  useEffect(() => {
    carregarEstoque()
  }, [])

  const mapaEstoque = useMemo(() => {
    const map = new Map()
    bancoEstoque.forEach((item) => map.set(item.epc.toUpperCase(), item))
    return map
  }, [bancoEstoque])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const epc = tagInput.trim().toUpperCase()
      setTagInput('')

      if (!epc) return

      const itemEstoque = mapaEstoque.get(epc)

      if (!itemEstoque) {
        playSound('error')
        setFeedback({
          type: 'error',
          text: `A tag ${epc} NÃO está disponível no estoque ativo.`,
        })
        focarInput()
        return
      }

      const jaBipado = itensCarga.some((it) => it.epc === epc)
      if (jaBipado) {
        playSound('error')
        setFeedback({
          type: 'warning',
          text: `Atenção: A peça ${itemEstoque.produtoNome} (${epc}) já foi adicionada à carga.`,
        })
        focarInput()
        return
      }

      setItensCarga((prev) => [
        {
          epc: itemEstoque.epc,
          produtoNome: itemEstoque.produtoNome,
          produtoId: itemEstoque.produtoId,
          horaLeitura: new Date().toLocaleTimeString('pt-BR'),
        },
        ...prev,
      ])
      playSound('success')
      setFeedback(null)
      focarInput()
    }
  }

  const removerItemCarga = (epc) => {
    setItensCarga((prev) => prev.filter((it) => it.epc !== epc))
    focarInput()
  }

  const handleConfirmarDespacho = async () => {
    if (itensCarga.length === 0) {
      setFeedback({ type: 'error', text: 'Nenhum item adicionado à carga.' })
      return
    }

    const cargaNome =
      identificadorCarga.trim() ||
      `CARGA-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '')}`

    if (
      !window.confirm(
        `Confirma o despacho de ${itensCarga.length} itens para a carga "${cargaNome}"? As peças serão removidas do estoque ativo.`,
      )
    ) {
      return
    }

    setDespachando(true)
    setFeedback(null)

    try {
      const payload = {
        action: 'despachar_carga',
        cargaId: cargaNome,
        epcs: itensCarga.map((i) => i.epc),
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
        setFeedback({ type: 'success', text: data.message })
        setItensCarga([])
        setIdentificadorCarga('')
        await carregarEstoque()
      } else {
        throw new Error(data.message || 'Falha no despacho.')
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Erro: ${err.message}` })
    } finally {
      setDespachando(false)
      focarInput()
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-600" />
            Despacho e Expedição de Carga
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Biper os tanques que estão sendo embarcados. Ao confirmar, eles serão removidos do inventário ativo.
          </p>
        </div>

        <button
          onClick={handleConfirmarDespacho}
          disabled={despachando || carregando || itensCarga.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {despachando ? 'Processando...' : `Confirmar Despacho (${itensCarga.length})`}
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Identificador da Carga / Placa / Romaneio
          </label>
          <input
            type="text"
            value={identificadorCarga}
            onChange={(e) => setIdentificadorCarga(e.target.value)}
            placeholder="Ex: ROTA-BH-01 ou PLACA-ABC1234"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Itens Prontos na Carga</p>
            <p className="text-2xl font-bold text-indigo-600 mt-0.5">{itensCarga.length}</p>
          </div>

          <button
            onClick={carregarEstoque}
            disabled={carregando}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar Estoque
          </button>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl flex items-center gap-3 border border-slate-800 shadow-md">
        <Barcode className="w-6 h-6 text-indigo-400 shrink-0" />
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={focarInput}
            placeholder="Aguardando bip do tanque sendo embarcado..."
            disabled={carregando || despachando}
            autoComplete="off"
            className="w-full bg-transparent border-none text-indigo-300 font-mono focus:outline-none placeholder:text-slate-500 text-sm tracking-wider uppercase"
          />
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            Peças no Caminhão ({itensCarga.length})
          </span>
          {itensCarga.length > 0 && (
            <button
              onClick={() => setItensCarga([])}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Limpar Carga
            </button>
          )}
        </div>

        {itensCarga.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhum tanque escaneado ainda. Aponte a pistola RFID para as peças durante o carregamento.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {itensCarga.map((item, index) => (
              <li key={item.epc} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {itensCarga.length - index}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.produtoNome}</p>
                    <p className="text-xs font-mono text-slate-400">EPC: {item.epc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{item.horaLeitura}</span>
                  <button
                    onClick={() => removerItemCarga(item.epc)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Remover da carga"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
