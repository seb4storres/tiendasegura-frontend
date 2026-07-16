import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './core/auth/ProtectedRoute';
import LoginPage from './modules/auth/pages/LoginPage';
import PosTerminalPage from './modules/ventas/pages/PosTerminalPage';
import ProductListPage from './modules/inventario/pages/ProductListPage';
import ProductFormPage from './modules/inventario/pages/ProductFormPage';
import ClientListPage from './modules/fiados/pages/ClientListPage';
import ClientDetailPage from './modules/fiados/pages/ClientDetailPage';
import PosLayout from './shared/components/layout/PosLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<PosLayout />}>
            <Route path="/" element={<PosTerminalPage />} />
            <Route path="/inventario" element={<ProductListPage />} />
            <Route path="/inventario/nuevo" element={<ProductFormPage />} />
            <Route path="/cartera" element={<ClientListPage />} />
            <Route path="/cartera/:id" element={<ClientDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
