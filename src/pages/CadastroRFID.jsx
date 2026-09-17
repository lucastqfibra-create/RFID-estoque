import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Barcode, Package } from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbwFrFyYOSX7FL8F5CuTurJBVSHUvKKAlCOkxVQO32nAzfCNNJVI1GB0wwYDx9zTyRW8/exec'

const PRODUTOS_CATALOGO = [
  { id: 'TM-120', nome: 'Tanque de Marmofibra 120cm - Branco' },
  { id: 'TM-100', nome: 'Tanque de Marmofibra 100cm - Cinza' },
  { id: 'PIA-80', nome: 'Pia de Marmofibra 80cm - Granitado' },
  { id: 'PIA-120', nome: 'Pia de Marmofibra 120cm com Cuba Dupla' },
]

export default function CadastroRFID() {
  const [produtoSelecionado, setProdutoSelecionado] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const inputRef = useRef(null)

  const focarInput = () => {
    if (inputRef.current) inputRef.current.focus()
  }

  useEffect(() => {
    focarInput()
  }, [])

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const epc = tagInput.trim().toUpperCase()
      if (!epc) return

      if (!produtoSelecionado) {
        setFeedback({
          type: 'error',
          message: 'Selecione um produto antes de bipar a etiqueta.',
        })
        setTagInput('')
        focarInput()
        return
      }

      await registrarAssociacao(epc)
    }
  }

  const registrarAssociacao = async (epc) => {
    setIsSubmitting(true)
    setFeedback(null)
    setTagInput('')

    try {
      const payload = {
        action: 'vincular_etiqueta',
        epc,
        produtoId: produtoSelecionado,
        produtoNome: PRODUTOS_CATALOGO.find((p) => p.id === produtoSelecionado)?.nome,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })

      const data = await response.json()

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Falha ao processar requisição.')
      }

      setFeedback({
        type: 'success',
        message: `EPC ${epc} associado com sucesso!`,
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Erro: ${err.message}`,
      })
    } finally {
      setIsSubmitting(false)
      focarInput()
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Associação de Etiquetas RFID
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Selecione o produto e realize a leitura da etiqueta com o leitor.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <Package className="w-4 h-4 text-slate-500" />
            Produto a Vincular
          </label>
          <select
            value={produtoSelecionado}
            onChange={(e) => {
              setProdutoSelecionado(e.target.value)
              focarInput()
            }}
            disabled={isSubmitting}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-50"
          >
            <option value="">-- Escolha um produto --</option>
            {PRODUTOS_CATALOGO.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nome} ({prod.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-slate-500" />
              Entrada do Leitor RFID (EPC)
            </span>
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Pronto para leitura
            </span>
          </label>

          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={focarInput}
            placeholder="Aguardando bip..."
            disabled={isSubmitting}
            autoComplete="off"
            className="w-full font-mono text-center tracking-widest uppercase px-4 py-3 bg-slate-900 text-emerald-400 placeholder:text-slate-600 rounded-lg border border-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-50 text-base shadow-inner"
          />
        </div>

        {isSubmitting && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 py-2 rounded-lg border border-blue-100">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Gravando vínculo na planilha...</span>
          </div>
        )}

        {feedback && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
          </div>
        )}
      </div>
    </div>
  )
}
