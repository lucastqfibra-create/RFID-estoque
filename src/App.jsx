import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Home as HomeIcon, PlusCircle, Boxes } from 'lucide-react'
import CadastroRFID from './pages/CadastroRFID'

function Layout({ children }) {
  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-800">
            <Boxes className="w-6 h-6 text-blue-600" />
            <span>RFID StockHub</span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink to="/" className={navClass}>
              <HomeIcon className="w-4 h-4" /> Início
            </NavLink>
            <NavLink to="/cadastro" className={navClass}>
              <PlusCircle className="w-4 h-4" /> Cadastro de Tags
            </NavLink>
            <NavLink to="/inventario" className={navClass}>
              <Boxes className="w-4 h-4" /> Inventário
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Painel Geral</h1>
      <p className="text-slate-600">Selecione &quot;Cadastro de Tags&quot; para iniciar as associações.</p>
    </div>
  )
}

function InventarioPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inventário</h1>
      <p className="text-slate-600">Módulo de contagem em lote.</p>
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
          <Route path="/inventario" element={<InventarioPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
