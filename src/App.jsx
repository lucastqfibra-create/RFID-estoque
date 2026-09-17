import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Home as HomeIcon, PlusCircle, Boxes, Truck } from 'lucide-react'
import CadastroRFID from './pages/CadastroRFID'
import InventarioRFID from './pages/InventarioRFID'
import DespachoRFID from './pages/DespachoRFID'

function Layout({ children }) {
  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-800">
            <Boxes className="w-6 h-6 text-blue-600" />
            <span>RFID StockHub</span>
          </div>
          <nav className="flex items-center gap-1.5 overflow-x-auto">
            <NavLink to="/" className={navClass}>
              <HomeIcon className="w-4 h-4" /> Início
            </NavLink>
            <NavLink to="/cadastro" className={navClass}>
              <PlusCircle className="w-4 h-4" /> Cadastro
            </NavLink>
            <NavLink to="/inventario" className={navClass}>
              <Boxes className="w-4 h-4" /> Inventário
            </NavLink>
            <NavLink to="/despacho" className={navClass}>
              <Truck className="w-4 h-4" /> Despacho
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

function HomePage() {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-6 py-8">
      <h1 className="text-3xl font-extrabold text-slate-900">Controle de Estoque e Expedição RFID</h1>
      <p className="text-slate-600 text-sm leading-relaxed">
        Sistema industrial para rastreabilidade de tanques e pias de marmofibra: associação de etiquetas, conferência em lote com pistola RFID e despacho de cargas com baixa automática na planilha.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cadastro" element={<CadastroRFID />} />
          <Route path="/inventario" element={<InventarioRFID />} />
          <Route path="/despacho" element={<DespachoRFID />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
