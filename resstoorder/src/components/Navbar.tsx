import { useState, useRef, useEffect } from 'react';
import { ShoppingBag, User, Menu, X, Settings, ChevronDown, Shield, LogOut, Star, CalendarDays, Database } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ReservationModal from './ReservationModal';
import ThemeSwitcher from './ThemeSwitcher';
import { useFirebaseConnection } from '../hooks/useFirebaseConnection';

export default function Navbar() {
  const { totalItems, setIsCartOpen } = useCart();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isConnected } = useFirebaseConnection();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-surface border-b border-subtle shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-content-inverted font-bold text-xl">R</span>
                </div>
                <span className="font-bold text-xl tracking-tight text-content">
                  RESTO<span className="text-primary">ORDER</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-content-muted hover:text-primary font-medium transition-colors">
                Menu
              </Link>
              <Link to="/fidelite" className="text-content-muted hover:text-primary font-medium transition-colors">
                Fidélité
              </Link>
              <button 
                onClick={() => setIsReservationOpen(true)}
                className="text-content-muted hover:text-primary font-medium transition-colors flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                Réserver
              </button>
              <div className="flex items-center space-x-4 border-l pl-6 border-subtle">
                
                {/* User Profile Dropdown */}
                {isAuthenticated && user ? (
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-3 p-1 pr-2 rounded-full border border-subtle hover:bg-background transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-hover flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden md:flex flex-col items-start">
                        <span className="text-sm font-semibold text-content leading-none">{user.name}</span>
                        <span className="text-xs text-content-muted mt-0.5">{isAdmin ? 'Admin' : 'Client'}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-content-muted transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-lg border border-subtle py-2 z-50">
                        <div className="px-4 py-3 border-b border-subtle mb-2">
                          <p className="text-sm font-semibold text-content">{user.name}</p>
                          <p className="text-xs text-content-muted truncate">{user.email}</p>
                        </div>

                        {isAdmin && (
                          <Link 
                            to="/admin" 
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-content hover:bg-primary-50 hover:text-primary-hover transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            Tableau de bord
                          </Link>
                        )}
                        
                        <Link 
                          to="/fidelite" 
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-content hover:bg-primary-50 hover:text-primary-hover transition-colors"
                        >
                          <Star className="w-4 h-4" />
                          Ma Fidélité
                        </Link>

                        <div className="h-px bg-surface-hover my-2"></div>

                        <button 
                          onClick={() => {
                            logout();
                            setIsProfileOpen(false);
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Déconnexion
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/login" className="text-content-muted hover:text-primary transition-colors flex items-center gap-2 font-medium">
                    <User className="w-5 h-5" />
                    <span className="text-sm">Connexion</span>
                  </Link>
                )}

                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="bg-inverted hover:opacity-90 text-content-inverted px-5 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Panier ({totalItems})</span>
                </button>
                <ThemeSwitcher />
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-4">
              <ThemeSwitcher />
              <button 
                onClick={() => setIsReservationOpen(true)}
                className="text-content-muted hover:text-primary p-2"
              >
                <CalendarDays className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="bg-inverted text-content-inverted p-2 rounded-full flex items-center justify-center relative shadow-sm"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-content-inverted text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-content-muted hover:text-content p-2"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-surface border-t border-subtle">
            <div className="px-4 pt-2 pb-6 space-y-1">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3 px-3 py-4 mb-2 border-b border-subtle">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-hover font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-content">{user.name}</div>
                    <div className="text-sm text-content-muted">{user.email}</div>
                    {isAdmin && (
                      <div className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1 mt-1">
                        <Shield className="w-3 h-3" /> Administrateur
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              
              <Link 
                to="/" 
                className="block px-3 py-2 text-base font-medium text-content hover:bg-background rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Menu
              </Link>
              <Link 
                to="/fidelite" 
                className="block px-3 py-2 text-base font-medium text-content hover:bg-background rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Fidélité
              </Link>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsReservationOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-base font-medium text-content hover:bg-background rounded-lg flex items-center gap-2"
              >
                <CalendarDays className="w-5 h-5 text-content-muted" />
                Réserver une table
              </button>
              
              {isAuthenticated && user ? (
                <>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="block px-3 py-2 text-base font-medium text-content hover:bg-background rounded-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard Admin
                    </Link>
                  )}
                  <button 
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    Se déconnecter
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="block px-3 py-2 text-base font-medium text-content hover:bg-background rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <ReservationModal 
        isOpen={isReservationOpen} 
        onClose={() => setIsReservationOpen(false)} 
      />
    </>
  );
}
