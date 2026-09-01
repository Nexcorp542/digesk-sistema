import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Sellos from './pages/Sellos';
import BannerVinil from './pages/BannerVinil';
import Impresiones from './pages/Impresiones';
import Comprobantes from './pages/Comprobantes';
import Tarjetas from './pages/Tarjetas';
import Volantes from './pages/Volantes';
import Tazas from './pages/Tazas';
import Globos from './pages/Globos';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sellos" element={<Sellos />} />
              <Route path="/banner-vinil" element={<BannerVinil />} />
              <Route path="/impresiones" element={<Impresiones />} />
              <Route path="/comprobantes" element={<Comprobantes />} />
              <Route path="/tarjetas" element={<Tarjetas />} />
              <Route path="/volantes" element={<Volantes />} />
              <Route path="/tazas" element={<Tazas />} />
              <Route path="/globos" element={<Globos />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;