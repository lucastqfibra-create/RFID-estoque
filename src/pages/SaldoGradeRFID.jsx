import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Search, Table2 } from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbwkbWuN9jyanZ05_icbMl3SnYoS4TKawnPtSz6lsYNoZnWXwJv6MMuZ4a1jdX1b5doC/exec'

// Cores padrão da expedição
const CORES_GRADE = ['BEGE', 'CINZA', 'BRANCO', 'PRETO']

// Identifica o modelo e a cor da peça a partir do nome
function extrairModeloECor(produtoNome) {
  if (!produtoNome) return { modelo: 'Outros', cor: 'OUTROS' }
  const nomeUpper = produtoNome.toUpperCase()

  for (const cor of CORES_GRADE) {
    if (nomeUpper.includes(cor)) {
      const modeloLimpo = produtoNome
        .replace(new RegExp(`\\s*-\\s*${cor}`, 'i'), '')
        .replace(new RegExp(`\\s+${cor}`, 'i'), '')
        .trim()
      return { modelo: modeloLimpo, cor }
    }
  }

  if (produtoNome.includes('-')) {
    const partes = produtoNome.split('-')
    const corPossivel = partes[partes.length - 1].trim().toUpperCase()
    const modelo = partes.slice(0, partes.length - 1).join('-').trim()
    return { modelo, cor: corPossivel }
  }

  return { modelo: produtoNome, cor: 'OUTROS' }
}

export default function SaldoGradeRFID() {
  const [bancoEstoque, setBancoEstoque] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTexto, setFiltroTexto] = useState('')

  const carregarEstoque = async () => {
    setCarregando(true)
    try {
      const res = await fetch(`${API_URL}?action=get_catalogo_estoque`, { redirect: 'follow' })
      const data = await res.json()
      if (data.status === 'success') {
        setBancoEstoque(data.itens || [])
      }
    } catch (err) {
      console.error('Erro ao carregar estoque:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarEstoque()
  }, [])

  // FILTRO ESTRITO: Considera APENAS as peças que foram bipadas e confirmadas no inventário
  const itensBipadosNoInventario = useMemo(() => {
    return bancoEstoque.filter((item) => item.conferido === true)
  }, [bancoEstoque])

  // Montagem da Matriz (Modelo x Cor) exclusivamente com os itens bipados
  const { matriz, listaModelos, totaisColunas, totalGeral, coresDinamicas } = useMemo(() => {
    const agrupamento = {}
    const coresSet = new Set(CORES_GRADE)

    itensBipadosNoInventario.forEach((item) => {
      const { modelo, cor } = extrairModeloECor(item.produtoNome)
      coresSet.add(cor)

      if (!agrupamento[modelo]) {
        agrupamento[modelo] = {}
      }
      agrupamento[modelo][cor] = (agrupamento[modelo][cor] || 0) + 1
    })

    const coresOrdenadas = [
      ...CORES_GRADE,
      ...Array.from(coresSet).filter((c) => !CORES_GRADE.includes(c)),
    ]

    const modelos = Object.keys(agrupamento).sort((a, b) => a.localeCompare(b))

    const totaisCol = {}
    coresOrdenadas.forEach((c) => (totaisCol[c] = 0))
    let somaTotal = 0

    modelos.forEach((mod) => {
      coresOrdenadas.forEach((cor) => {
        const qtd = agrupamento[mod][cor] || 0
        totaisCol[cor] += qtd
        somaTotal += qtd
      })
    })

    return {
      matriz: agrupamento,
      listaModelos: modelos,
      totaisColunas: totaisCol,
      totalGeral: somaTotal,
      coresDinamicas: coresOrdenadas,
    }
  }, [itensBipadosNoInventario])

  const modelosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return listaModelos
    const termo = filtroTexto.toUpperCase()
    return listaModelos.filter((mod) => mod.toUpperCase().includes(termo))
  }, [listaModelos, filtroTexto])

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Controles Superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Table2 className="w-7 h-7 text-emerald-600" />
            Saldo Físico de Expedição
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Exibindo exclusivamente as peças bipadas e confirmadas no inventário físico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar modelo..."
              className="pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none w-48 sm:w-64"
            />
          </div>

          <button
            onClick={carregarEstoque}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Recarregar
          </button>
        </div>
      </div>

      {/* Grade com o Formato Idêntico à Foto */}
      <div className="border-2 border-black rounded-lg overflow-hidden shadow-md bg-white">
        {/* Banner Superior Verde */}
        <div className="bg-[#00FF00] border-b-2 border-black py-2.5 text-center">
          <h2 className="text-lg sm:text-xl font-black text-black tracking-wider uppercase font-sans">
            SALDO FÍSICO EXPEDIÇÃO(+)
          </h2>
        </div>

        {/* Tabela de Produtos x Cores */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#D9E1F2] border-b-2 border-black text-black">
                <th className="py-2.5 px-4 text-left font-black border-r-2 border-black text-base">
                  Produtos (cm)
                </th>
                {coresDinamicas.map((cor) => (
                  <th
                    key={cor}
                    className="py-2 px-3 text-center font-black border-r border-black tracking-wider text-xs sm:text-sm uppercase"
                  >
                    {cor}
                  </th>
                ))}
                <th className="py-2 px-4 text-center font-black bg-slate-200 text-xs sm:text-sm">
                  TOTAL
                </th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={coresDinamicas.length + 2}
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    Carregando saldo físico conferido...
                  </td>
                </tr>
              ) : modelosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={coresDinamicas.length + 2}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    Nenhum tanque bipado no inventário ainda. Realize a contagem na aba{' '}
                    <span className="font-bold text-slate-600">Inventário</span> para alimentar a grade.
                  </td>
                </tr>
              ) : (
                modelosFiltrados.map((modelo, idx) => {
                  let totalLinha = 0

                  return (
                    <tr
                      key={modelo}
                      className={`border-b border-black/30 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      } hover:bg-amber-50/50`}
                    >
                      {/* Nome do Produto / Modelo */}
                      <td className="py-2 px-4 font-bold text-slate-900 border-r-2 border-black text-xs sm:text-sm">
                        {modelo}
                      </td>

                      {/* Quantidades por Cor */}
                      {coresDinamicas.map((cor) => {
                        const qtd = matriz[modelo]?.[cor] || 0
                        totalLinha += qtd
                        return (
                          <td
                            key={cor}
                            className={`py-2 px-3 text-center border-r border-black/30 font-bold text-sm ${
                              qtd > 0 ? 'text-black font-extrabold' : 'text-slate-300 font-normal'
                            }`}
                          >
                            {qtd > 0 ? qtd : '-'}
                          </td>
                        )
                      })}

                      {/* Total da Linha */}
                      <td className="py-2 px-4 text-center font-black text-emerald-800 bg-emerald-50/40 text-sm">
                        {totalLinha}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {/* Rodapé com Totais Gerais */}
            {!carregando && itensBipadosNoInventario.length > 0 && (
              <tfoot>
                <tr className="bg-[#D9E1F2] border-t-2 border-black font-black text-black">
                  <td className="py-3 px-4 text-left font-black border-r-2 border-black text-sm uppercase">
                    TOTAL GERAL
                  </td>
                  {coresDinamicas.map((cor) => (
                    <td
                      key={cor}
                      className="py-3 px-3 text-center border-r border-black font-black text-base text-black"
                    >
                      {totaisColunas[cor] || 0}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-center font-black text-lg bg-emerald-200 text-emerald-950">
                    {totalGeral}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
