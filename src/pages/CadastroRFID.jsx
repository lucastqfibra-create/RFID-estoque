import { useState, useRef, useEffect } from 'react'
import {
  Package,
  Barcode,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Layers,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbwkbWuN9jyanZ05_icbMl3SnYoS4TKawnPtSz6lsYNoZnWXwJv6MMuZ4a1jdX1b5doC/exec'

const PRODUTOS_CATALOGO = [
  { id: 'TM-120', nome: 'Tanque de Marmofibra 120cm - Branco' },
  { id: 'TM-100', nome: 'Tanque de Marmofibra 100cm - Cinza' },
  { id: 'PIA-80', nome: 'Pia de Marmofibra 80cm - Granitado' },
  { id: 'PIA-120', nome: 'Pia de Marmofibra 120cm com Cuba Dupla' },
]

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
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    }
  } catch (e) {}
}

export default function CadastroRFID() {
  const [produtoSelecionado, setProdutoSelecionado] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tagsCapturadas, setTagsCapturadas] = useState([]) // Array de strings (EPCs)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const inputRef = useRef(null)

  const focarInput = () => {
    if (inputRef.current) inputRef.current.focus()
  }

  useEffect(() => {
    focarInput()
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const epc = tagInput.trim().toUpperCase()
      setTagInput('')

      if (!epc) return

      if (!produtoSelecionado) {
        playSound('error')
        setFeedback({
          type: 'error',
          message: 'Selecione o modelo do produto antes de escanear as etiquetas.',
        })
        focarInput()
        return
      }

      // Evita duplicata dentro da lista atual
      if (tagsCapturadas.includes(epc)) {
        playSound('error')
        setFeedback({
          type: 'warning',
          message: `A tag ${epc} já está na lista atual de captura.`,
        })
        focarInput()
        return
      }

      // Adiciona à lista de captura em memória instantaneamente
      setTagsCapturadas((prev) => [epc, ...prev])
      playSound('success')
      setFeedback(null)
      focarInput()
    }
  }

  const removerTag = (epcParaRemover) => {
    setTagsCapturadas((prev) => prev.filter((t) => t !== epcParaRemover))
    focarInput()
  }

  const limparLista = () => {
    setTagsCapturadas([])
    focarInput()
  }

  const handleSalvarLote = async () => {
    if (!produtoSelecionado) {
      setFeedback({ type: 'error', message: 'Selecione um produto.' })
      return
    }

    if (tagsCapturadas.length === 0) {
      setFeedback({ type: 'error', message: 'Nenhuma tag capturada para salvar.' })
      return
    }

    const produto = PRODUTOS_CATALOGO.find((p) => p.id === produtoSelecionado)

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const payload = {
        action: 'vincular_tags_lote',
        epcs: tagsCapturadas,
        produtoId: produto.id,
        produtoNome: produto.nome,
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
        setTagsCapturadas([]) // Limpa para a próxima remessa
      } else {
        throw new Error(data.message || 'Erro ao gravar lote.')
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Falha ao salvar: ${err.message}` })
    } finally {
      setIsSubmitting(false)
      focarInput()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-7 h-7 text-blue-600" />
            Cadastro de Tags em Lote
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Selecione o produto e passe a pistola RFID continuamente sobre os tanques.
          </p>
        </div>

        <button
          onClick={handleSalvarLote}
          disabled={isSubmitting || tagsCapturadas.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Gravando...' : `Salvar Lote (${tagsCapturadas.length})`}
        </button>
      </div>

      {/* Seleção do Produto */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            <Package className="w-4 h-4 text-blue-600" />
            1. Selecione o Produto que Receberá as Tags
          </label>
          <select
            value={produtoSelecionado}
            onChange={(e) => {
              setProdutoSelecionado(e.target.value)
              focarInput()
            }}
            disabled={isSubmitting}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Escolha o modelo da peça --</option>
            {PRODUTOS_CATALOGO.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nome} ({prod.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Entrada Contínua do Leitor RFID */}
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
            placeholder={
              produtoSelecionado
                ? 'Pronto! Aponte a pistola e puxe o gatilho...'
                : 'Selecione um produto acima primeiro'
            }
            disabled={!produtoSelecionado || isSubmitting}
            autoComplete="off"
            className="w-full bg-transparent border-none text-emerald-400 font-mono focus:outline-none placeholder:text-slate-500 text-sm tracking-wider uppercase disabled:opacity-40"
          />
        </div>
        {produtoSelecionado && (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
        )}
      </div>

      {/* Feedback / Alertas */}
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

      {/* Lista de Tags Capturadas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Tags Lidas Prontas para Vincular ({tagsCapturadas.length})
          </span>

          {tagsCapturadas.length > 0 && (
            <button
              onClick={limparLista}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Limpar Lista
            </button>
          )}
        </div>

        {tagsCapturadas.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhuma tag lida ainda. Selecione o produto acima e acione a pistola RFID.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {tagsCapturadas.map((epc, idx) => (
              <li
                key={epc}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {tagsCapturadas.length - idx}
                  </span>
                  <div>
                    <p className="text-sm font-mono font-bold text-slate-800">{epc}</p>
                    <p className="text-xs text-slate-400">
                      Será associado a:{' '}
                      {PRODUTOS_CATALOGO.find((p) => p.id === produtoSelecionado)?.nome}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removerTag(epc)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Remover tag"
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
