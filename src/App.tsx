import { Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import CreateLock from './pages/CreateLock'

function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateLock />} />
          </Routes>
        </main>
      </div>
    </WalletProvider>
  )
}

export default App
