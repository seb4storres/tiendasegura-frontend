import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './core/auth/ProtectedRoute';
import LoginPage from './modules/auth/pages/LoginPage';
import PosTerminalPage from './modules/ventas/pages/PosTerminalPage';
import PosLayout from './shared/components/layout/PosLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<PosLayout />}>
            <Route path="/" element={<PosTerminalPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
