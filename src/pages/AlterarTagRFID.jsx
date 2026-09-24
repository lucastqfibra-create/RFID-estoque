import { useState, useRef, useEffect } from 'react'
import {
  RotateCcw,
  Barcode,
  Package,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbwkbWuN9jyanZ05_icbMl3SnYoS4TKawnPtSz6lsYNoZnWXwJv6MMuZ4a1jdX1b5doC/exec'

export default function AlterarTagRFID() {
  const [catalogoProdutos, setCatalogoProdutos] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [dadosTag, setDadosTag] = useState(null)
  const [novoProdutoId, setNovoProdutoId] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const inputRef = useRef(null)

  const focarInput = () => {
    if (inputRef.current) inputRef.current.focus()
  }

  useEffect(() => {
    focarInput()
    const carregar = async () => {
      try {
        const res = await fetch(`${API_URL}?action=get_produtos`, { redirect: 'follow' })
        const data = await res.json()
        if (data.status === 'success' && data.produtos) {
          setCatalogoProdutos(data.produtos)
        }
      } catch (err) {}
    }
    carregar()
  }, [])

  const buscarTag = async (epcParaBuscar) => {
    const epc = (epcParaBuscar || tagInput).trim().toUpperCase()
    if (!epc) return

    setBuscando(true)
    setFeedback(null)
    setDadosTag(null)
    setNovoProdutoId('')
    setTagInput('')

    try {
      const res = await fetch(`${API_URL}?action=consultar_epc&epc=${encodeURIComponent(epc)}`, {
        redirect: 'follow',
      })
      const data = await res.json()

      if (data.status === 'success' && data.encontrado) {
        setDadosTag(data.item)
      } else {
        setFeedback({
          type: 'error',
          message: data.message || `Tag ${epc} não encontrada no estoque ativo.`,
        })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Erro na consulta: ${err.message}` })
    } finally {
      setBuscando(false)
      focarInput()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      buscarTag()
    }
  }

  useEffect(() => {
    if (!tagInput.trim()) return
    const timer = setTimeout(() => {
      if (tagInput.trim().length >= 6) {
        buscarTag(tagInput)
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [tagInput])

  const handleSalvarAlteracao = async () => {
    if (!dadosTag || !novoProdutoId) {
      setFeedback({ type: 'error', message: 'Selecione o novo modelo do produto.' })
      return
    }

    if (dadosTag.produtoId === novoProdutoId) {
      setFeedback({
        type: 'warning',
        message: 'A tag já está cadastrada exatamente neste mesmo produto.',
      })
      return
    }

    const novoProduto = catalogoProdutos.find((p) => p.id === novoProdutoId)

    setSalvando(true)
    setFeedback(null)

    try {
      const payload = {
        action: 'alterar_produto_tag',
        epc: dadosTag.epc,
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
        setDadosTag((prev) => ({
          ...prev,
          produtoId: novoProduto.id,
          produtoNome: novoProduto.nome,
        }))
        setNovoProdutoId('')
      } else {
        throw new Error(data.message || 'Falha ao atualizar.')
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Erro ao salvar: ${err.message}` })
    } finally {
      setSalvando(false)
      focarInput()
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <RotateCcw className="w-7 h-7 text-amber-600" />
          Alterar Cadastro da Tag
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Bipe uma etiqueta já existente para transferi-la para outro produto.
        </p>
      </div>

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
            placeholder="Aponte o leitor para a tag que deseja alterar..."
            disabled={buscando || salvando}
            autoComplete="off"
            className="w-full bg-transparent border-none text-amber-400 font-mono focus:outline-none placeholder:text-slate-500 text-sm tracking-wider uppercase"
          />
        </div>
        {buscando && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
      </div>

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

      {dadosTag ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tag Selecionada
            </p>
            <p className="text-base font-mono font-bold text-slate-800 mt-0.5">{dadosTag.epc}</p>

            <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Produto Vinculado Atualmente:
              </span>
              <p className="text-base font-bold text-slate-900">{dadosTag.produtoNome}</p>
              <p className="text-xs font-mono text-slate-500">Código: {dadosTag.produtoId}</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              <Package className="w-4 h-4 text-amber-600" />
              Transferir para o Novo Produto:
            </label>
            <select
              value={novoProdutoId}
              onChange={(e) => setNovoProdutoId(e.target.value)}
              disabled={salvando}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">-- Selecione o novo produto --</option>
              {catalogoProdutos.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.nome} ({prod.id})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSalvarAlteracao}
            disabled={salvando || !novoProdutoId}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {salvando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Atualizando na planilha...
              </>
            ) : (
              <>
                Confirmar Reclassificação
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        !buscando && (
          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-sm">
            Nenhuma tag carregada. Aproxime a pistola da peça e puxe o gatilho.
          </div>
        )
      )}
    </div>
  )
}
