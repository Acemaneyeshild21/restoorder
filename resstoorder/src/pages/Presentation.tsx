import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Layout, Users, ShieldCheck, Zap, QrCode, BarChart3, ChefHat, Smartphone, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const slides = [
  {
    title: "RestoOrder",
    subtitle: "Système Moderne de Gestion de Restaurant & Fidélité",
    content: "Une solution full-stack pour digitaliser l'expérience client et optimiser les opérations en cuisine.",
    icon: <ChefHat className="w-20 h-20 text-primary" />,
    bg: "bg-surface"
  },
  {
    title: "Le Problème",
    subtitle: "Les défis des restaurants traditionnels",
    content: "Prise de commande lente, manque d'engagement client, difficulté de suivi des stocks et absence de données analytiques exploitables.",
    icon: <Clock className="w-20 h-20 text-red-500" />,
    bg: "bg-red-50"
  },
  {
    title: "La Solution",
    subtitle: "Une plateforme unifiée et temps réel",
    content: "Une application web responsive permettant une gestion fluide depuis la commande client jusqu'à la livraison, avec un système de fidélité intégré.",
    icon: <Zap className="w-20 h-20 text-amber-500" />,
    bg: "bg-amber-50"
  },
  {
    title: "Expérience Client",
    subtitle: "Simplicité et Engagement",
    list: [
      "Menu digital interactif avec allergènes et personnalisation",
      "Modes multiples : Sur place, À emporter, Livraison",
      "Système de points de fidélité automatique",
      "Interface optimisée pour mobile (PWA feel)"
    ],
    icon: <Smartphone className="w-20 h-20 text-blue-500" />,
    bg: "bg-blue-50"
  },
  {
    title: "Gestion Administrative",
    subtitle: "Contrôle Total & Analytics",
    list: [
      "Tableau de bord temps réel pour le suivi des commandes",
      "Gestion dynamique du menu et des catégories",
      "Générateur de cartes de fidélité QR Code",
      "Statistiques de ventes et export Excel"
    ],
    icon: <BarChart3 className="w-20 h-20 text-emerald-500" />,
    bg: "bg-emerald-50"
  },
  {
    title: "Innovation : Fidélité QR",
    subtitle: "Digitaliser la carte tampon",
    content: "Génération de QR Codes uniques pour chaque client. Scan instantané par le personnel pour ajouter ou déduire des points, supprimant le besoin de cartes physiques.",
    icon: <QrCode className="w-20 h-20 text-indigo-500" />,
    bg: "bg-indigo-50"
  },
  {
    title: "Architecture Technique",
    subtitle: "Performance et Sécurité",
    list: [
      "Frontend : React 18 + Tailwind CSS (Design System moderne)",
      "Backend : Firebase (Firestore temps réel + Auth)",
      "Sécurité : Règles Firestore granulaires (RBAC)",
      "Animations : Framer Motion pour une UX fluide"
    ],
    icon: <Layout className="w-20 h-20 text-purple-500" />,
    bg: "bg-purple-50"
  },
  {
    title: "Sécurité & Rôles",
    subtitle: "Accès Contrôlés",
    content: "Système de rôles strict (Admin, Cuisine, Livreur, Client) garantissant que chaque utilisateur n'accède qu'aux données nécessaires à sa fonction.",
    icon: <ShieldCheck className="w-20 h-20 text-slate-700" />,
    bg: "bg-slate-50"
  },
  {
    title: "Conclusion",
    subtitle: "Prêt pour le futur de la restauration",
    content: "RestoOrder transforme un restaurant traditionnel en un établissement connecté, axé sur la donnée et la satisfaction client.",
    icon: <CheckCircle2 className="w-20 h-20 text-primary" />,
    bg: "bg-surface"
  }
];

export default function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-subtle z-50">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>

      <div className="max-w-5xl w-full aspect-video relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`w-full h-full rounded-[32px] shadow-2xl border border-subtle p-8 md:p-16 flex flex-col items-center justify-center text-center ${slides[currentSlide].bg}`}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              {slides[currentSlide].icon}
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-6xl font-bold text-content mb-4 tracking-tight"
            >
              {slides[currentSlide].title}
            </motion.h1>

            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl font-medium text-primary mb-8 italic"
            >
              {slides[currentSlide].subtitle}
            </motion.h2>

            {slides[currentSlide].content && (
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg md:text-xl text-content-muted max-w-3xl leading-relaxed"
              >
                {slides[currentSlide].content}
              </motion.p>
            )}

            {slides[currentSlide].list && (
              <motion.ul 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-left space-y-4 max-w-2xl mx-auto"
              >
                {slides[currentSlide].list.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-lg text-content-muted">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                    {item}
                  </li>
                ))}
              </motion.ul>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="absolute -bottom-20 left-0 w-full flex items-center justify-between px-4">
          <div className="flex gap-4">
            <button 
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="p-4 rounded-full bg-surface border border-subtle text-content hover:bg-surface-hover disabled:opacity-30 transition-all shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="p-4 rounded-full bg-surface border border-subtle text-content hover:bg-surface-hover disabled:opacity-30 transition-all shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-content-muted font-medium">
              Slide {currentSlide + 1} / {slides.length}
            </span>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-inverted text-content-inverted rounded-xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
            >
              <Layout className="w-4 h-4" />
              Quitter la démo
            </button>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="fixed -z-10 top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
