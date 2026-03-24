import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Utensils, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Veuillez entrer votre adresse email pour réinitialiser votre mot de passe.");
      return;
    }
    
    try {
      await resetPassword(email);
      toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'email.");
    }
  };

  const handleSuccess = (emailAddress: string) => {
    toast.success(isLogin ? 'Connexion réussie' : 'Inscription réussie');
    const from = (location.state as any)?.from?.pathname || '/';
    
    const isAdminEmail = emailAddress.includes('@resto.com') || 
                        emailAddress === 'dimitriaceman614@gmail.com' || 
                        emailAddress === 'milo@gmail.com';
    
    if (isAdminEmail) {
      navigate('/admin');
    } else {
      navigate(from);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) {
          throw new Error("Le nom est requis pour l'inscription.");
        }
        await signup(name, email, password);
      }
      handleSuccess(email);
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
      if (isLogin) setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    try {
      const email = await loginWithGoogle();
      handleSuccess(email);
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion avec Google");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex bg-surface">
      {/* CÔTÉ GAUCHE - Image (Caché sur mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-inverted">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
          alt="Plats de restaurant appétissants"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col justify-between p-12 h-full w-full text-content-inverted">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Utensils className="w-7 h-7 text-content-inverted" />
            </div>
            <span className="text-3xl font-bold tracking-tight">RestoOrder</span>
          </Link>
          
          <div className="max-w-md">
            <blockquote className="text-4xl font-medium leading-tight mb-4">
              "La bonne cuisine, livrée à votre porte."
            </blockquote>
            <p className="text-content-muted text-lg">
              Découvrez les meilleurs plats de nos chefs, préparés avec passion et livrés rapidement.
            </p>
          </div>
        </div>
      </div>

      {/* CÔTÉ DROIT - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 lg:px-16 py-12 bg-background lg:bg-surface">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 bg-surface lg:bg-transparent p-8 lg:p-0 rounded-2xl shadow-xl lg:shadow-none"
        >
          <div>
            <h1 className="text-4xl font-bold text-content tracking-tight">
              {isLogin ? 'Bon retour 👋' : 'Créer un compte ✨'}
            </h1>
            <p className="mt-3 text-lg text-content-muted">
              {isLogin ? 'Connectez-vous pour commander' : 'Rejoignez-nous pour commander'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label htmlFor="name" className="block text-sm font-medium text-content mb-2">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-subtle focus:outline-none focus:ring-2 focus:ring-primary transition-shadow bg-background focus:bg-surface"
                      placeholder="Jean Dupont"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-content mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-subtle focus:outline-none focus:ring-2 focus:ring-primary transition-shadow bg-background focus:bg-surface"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-content mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-subtle focus:outline-none focus:ring-2 focus:ring-primary transition-shadow bg-background focus:bg-surface"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-content-muted mt-2">Le mot de passe doit contenir au moins 6 caractères.</p>
              )}
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary border-default rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-content cursor-pointer">
                    Se souvenir de moi
                  </label>
                </div>
                <div className="text-sm">
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-content-inverted font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-subtle" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface lg:bg-transparent text-content-muted">ou</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-subtle rounded-xl shadow-sm bg-surface hover:bg-background text-content font-medium transition-colors disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuer avec Google
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-content-muted">
            {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
            {' '}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword('');
              }}
              className="font-medium text-primary hover:text-primary-hover transition-colors"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
