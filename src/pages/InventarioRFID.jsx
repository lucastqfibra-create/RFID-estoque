import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Boxes,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Barcode,
  Search,
  Check,
} from 'lucide-react'

// Sintetizador de áudio nativo para feedback imediato no galpão
const playAudioFeedback = (type = 'match') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'match') {
      // Bip agudo de sucesso (880Hz - Lá 5)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } else if (type === 'unknown') {
      // Bip grave de alerta (tag não cadastrada - 280Hz)
      osc.frequency.setValueAtTime(280, ctx.currentTime)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    }
  } catch (e) {
    // Ignora restrições de autoplay de navegadores antigos
  }
}

export default function InventarioRFID() {
  const [bancoEstoque, setBancoEstoque] = useState([]) // Itens baixados da planilha
  const [lidosSet, setLidosSet] = useState(new Set()) // EPCs conferidos nesta sessão
  const [desconhecidosSet, setDesconhecidosSet] = useState(new Set()) // Tags não cadastradas
  const [tagInput, setTagInput] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [filtroTab, setFiltroTab] = useState('todos') // 'todos' | 'conferidos' | 'pendentes'

  const inputRef = useRef(null)
  const apiUrl = import.meta.env.VITE_API_URL

  const focarInput = () => {
    if (inputRef.current) inputRef.current.focus()
  }

  // Carrega snapshot da planilha ao abrir a página
  const carregarEstoque = async () => {
    setCarregando(true)
    setFeedback(null)
    try {
      if (!apiUrl) throw new Error('VITE_API_URL não configurada.')
      const res = await fetch(`${apiUrl}?action=get_catalogo_estoque`, {
        redirect: 'follow',
      })
      const data = await res.json()
      if (data.status === 'success') {
        setBancoEstoque(data.itens || [])
      } else {
        throw new Error(data.message || 'Erro ao carregar dados.')
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Erro ao baixar estoque: ${err.message}` })
    } finally {
      setCarregando(false)
      setTimeout(focarInput, 100)
    }
  }

  useEffect(() => {
    carregarEstoque()
  }, [])

  // Mapa rápido em memória O(1) de EPC -> Dados do Produto
  const mapaEstoque = useMemo(() => {
    const map = new Map()
    bancoEstoque.forEach((item) => {
      map.set(item.epc.toUpperCase(), item)
    })
    return map
  }, [bancoEstoque])

  // Processa o bip do leitor instantaneamente em memória
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const epc = tagInput.trim().toUpperCase()
      setTagInput('')

      if (!epc) return

      if (mapaEstoque.has(epc)) {
        if (!lidosSet.has(epc)) {
          setLidosSet((prev) => new Set(prev).add(epc))
          playAudioFeedback('match')
        }
      } else {
        if (!desconhecidosSet.has(epc)) {
          setDesconhecidosSet((prev) => new Set(prev).add(epc))
          playAudioFeedback('unknown')
        }
      }
      focarInput()
    }
  }

  // Sincroniza todas as leituras em lote com a planilha
  const handleSincronizar = async () => {
    if (lidosSet.size === 0) {
      setFeedback({ type: 'error', text: 'Nenhum item foi conferido ainda.' })
      return
    }

    setSincronizando(true)
    setFeedback(null)

    try {
      const payload = {
        action: 'sincronizar_inventario',
        epcs: Array.from(lidosSet),
        timestamp: new Date().toISOString(),
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })

      const data = await res.json()
      if (data.status === 'success') {
        setFeedback({ type: 'success', text: data.message })
      } else {
        throw new Error(data.message || 'Falha ao sincronizar.')
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Erro: ${err.message}` })
    } finally {
      setSincronizando(false)
      focarInput()
    }
  }

  // Estatísticas do Inventário
  const totalCadastrado = bancoEstoque.length
  const totalConferido = lidosSet.size
  const totalPendentes = Math.max(0, totalCadastrado - totalConferido)
  const percentual = totalCadastrado > 0 ? Math.round((totalConferido / totalCadastrado) * 100) : 0

  // Lista filtrada
  const itensExibidos = useMemo(() => {
    return bancoEstoque.filter((item) => {
      const foiLido = lidosSet.has(item.epc)
      if (filtroTab === 'conferidos') return foiLido
      if (filtroTab === 'pendentes') return !foiLido
      return true
    })
  }, [bancoEstoque, lidosSet, filtroTab])

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-blue-600" />
            Conferência e Inventário RFID
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Passe a pistola RFID pelos produtos para conferência em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarEstoque}
            disabled={carregando || sincronizando}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Recarregar
          </button>

          <button
            onClick={handleSincronizar}
            disabled={sincronizando || carregando || lidosSet.size === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {sincronizando ? 'Salvando...' : 'Salvar Inventário'}
          </button>
        </div>
      </div>

      {/* Input Oculto de Captura do Leitor */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl flex items-center gap-3 border border-slate-800 shadow-md">
        <Barcode className="w-6 h-6 text-emerald-400 shrink-0" />
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={focarInput}
            placeholder="Pistola pronta: aperte o gatilho para ler..."
            disabled={carregando}
            autoComplete="off"
            className="w-full bg-transparent border-none text-emerald-400 font-mono focus:outline-none placeholder:text-slate-500 text-sm tracking-wider uppercase"
          />
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total em Banco</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCadastrado}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/40">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Conferidos</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {totalConferido}{' '}
            <span className="text-xs font-normal text-emerald-700">({percentual}%)</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/40">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Pendentes</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalPendentes}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/40">
          <p className="text-xs font-medium text-rose-700 uppercase tracking-wider">Tags Avulsas</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{desconhecidosSet.size}</p>
        </div>
      </div>

      {/* Tabs de Filtro */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFiltroTab('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filtroTab === 'todos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todos ({bancoEstoque.length})
        </button>
        <button
          onClick={() => setFiltroTab('conferidos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filtroTab === 'conferidos'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Conferidos ({lidosSet.size})
        </button>
        <button
          onClick={() => setFiltroTab('pendentes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filtroTab === 'pendentes' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pendentes ({totalPendentes})
        </button>
      </div>

      {/* Lista de Peças */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-slate-500 text-sm">Carregando estoque da nuvem...</div>
        ) : itensExibidos.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum item nesta lista.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {itensExibidos.map((item) => {
              const conferido = lidosSet.has(item.epc)
              return (
                <li
                  key={item.epc}
                  className={`p-4 flex items-center justify-between transition-colors ${
                    conferido ? 'bg-emerald-50/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">{item.produtoNome}</p>
                    <p className="text-xs font-mono text-slate-500 tracking-wider">
                      EPC: {item.epc}
                    </p>
                  </div>

                  <div>
                    {conferido ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" /> Conferido
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Pendente
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
