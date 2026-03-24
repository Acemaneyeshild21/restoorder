/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import MenuPage from './pages/MenuPage';
import LoyaltyPage from './pages/LoyaltyPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import TrackingPage from './pages/TrackingPage';
import Presentation from './pages/Presentation';
import ProtectedRoute from './components/ProtectedRoute';
import CartDrawer from './components/CartDrawer';
import { CartProvider } from './context/CartContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RestaurantProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-background font-sans text-content">
                <Toaster position="bottom-right" richColors />
                <Navbar />
                <CartDrawer />
                <Routes>
                  <Route path="/" element={<MenuPage />} />
                  <Route 
                    path="/fidelite" 
                    element={
                      <ProtectedRoute>
                        <LoyaltyPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/tracking/:orderId" element={<TrackingPage />} />
                  <Route path="/presentation" element={<Presentation />} />
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
              </div>
            </Router>
          </CartProvider>
        </RestaurantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
