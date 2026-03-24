import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Star, Clock, ChevronRight, CheckCircle2, Award, Trophy, Crown, Medal, Plus, Mail, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

export default function LoyaltyPage() {
  const { user, isAuthenticated } = useAuth();
  
  const currentPoints = user?.points || 0;
  // totalSpent is roughly points / 5
  const totalSpent = Math.floor(currentPoints / 5);
  
  const [floatingPoints, setFloatingPoints] = useState<{ id: number, val: number }[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  
  const rewards = [
    { id: 1, points: 50, title: 'Cookie ou Café', description: 'Une petite douceur pour bien finir', unlocked: currentPoints >= 50 },
    { id: 2, points: 75, title: 'Supplément offert', description: 'Fromage, bacon ou sauce au choix', unlocked: currentPoints >= 75 },
    { id: 3, points: 100, title: 'Boisson offerte', description: 'Une boisson 33cl au choix', unlocked: currentPoints >= 100 },
    { id: 4, points: 150, title: 'Frites classiques', description: 'Une portion de frites dorées', unlocked: currentPoints >= 150 },
    { id: 5, points: 250, title: 'Accompagnement Premium', description: 'Frites de patate douce ou Onion rings', unlocked: currentPoints >= 250 },
    { id: 6, points: 500, title: 'Dessert offert', description: 'Un dessert au choix sur toute la carte', unlocked: currentPoints >= 500 },
    { id: 7, points: 750, title: 'Burger Classique', description: 'Notre fameux burger classique offert', unlocked: currentPoints >= 750 },
    { id: 8, points: 1000, title: 'Menu VIP', description: 'Un menu complet au choix', unlocked: currentPoints >= 1000 },
  ];

  const history = [...(user?.loyaltyHistory || [])].sort((a, b) => b.id - a.id).slice(0, 5);

  // Gamification: Badges
  const getBadge = (points: number) => {
    if (points >= 1000) return { name: 'Platine', color: 'text-indigo-500', bg: 'bg-indigo-100', icon: Crown, border: 'border-indigo-200' };
    if (points >= 500) return { name: 'Or', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Trophy, border: 'border-yellow-200' };
    if (points >= 250) return { name: 'Argent', color: 'text-content-muted', bg: 'bg-surface-hover', icon: Award, border: 'border-subtle' };
    return { name: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-100', icon: Medal, border: 'border-amber-200' };
  };

  const currentBadge = getBadge(currentPoints);
  const BadgeIcon = currentBadge.icon;

  // Progress calculation
  const nextReward = rewards.find(r => r.points > currentPoints) || rewards[rewards.length - 1];
  const progressPercentage = Math.min((currentPoints / nextReward.points) * 100, 100);

  // Simulate earning points
  const handleSimulatePurchase = async () => {
    if (isSimulating || !user) return;
    setIsSimulating(true);
    
    const spend = Math.floor(Math.random() * 20) + 10; // Random spend between 10€ and 30€
    const pointsEarned = spend * 5; // 1€ = 5 points
    const newId = Date.now();
    
    setFloatingPoints(prev => [...prev, { id: newId, val: pointsEarned }]);
    
    try {
      const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      await updateDoc(doc(db, 'users', user.id), {
        points: increment(pointsEarned),
        loyaltyHistory: arrayUnion({
          id: newId,
          date: today,
          action: `Commande #${Math.floor(Math.random() * 9000) + 1000} (${spend}€)`,
          points: `+${pointsEarned}`
        })
      });
    } catch (error) {
      console.error("Error simulating purchase:", error);
      toast.error("Erreur lors de la simulation.");
    }

    setTimeout(() => {
      setIsSimulating(false);
    }, 800);

    // Clean up floating points
    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(p => p.id !== newId));
    }, 2000);
  };

  const handleSendGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward || !user) return;

    try {
      const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      await updateDoc(doc(db, 'users', user.id), {
        points: increment(-selectedReward.points),
        loyaltyHistory: arrayUnion({
          id: Date.now(),
          date: today,
          action: `Récompense : ${selectedReward.title}`,
          points: `-${selectedReward.points}`
        })
      });

      toast.success(`Carte cadeau envoyée avec succès !`, {
        description: `Félicitations ${userName || 'Client'} ! Le bon de commande pour "${selectedReward.title}" a été envoyé à ${userEmail}.`
      });

      setSelectedReward(null);
      setUserName(user.name || '');
      setUserEmail(user.email || '');
    } catch (error) {
      console.error("Error redeeming reward:", error);
      toast.error("Erreur lors de l'échange de la récompense.");
    }
  };

  // Dynamic QR Code URL
  const qrCodeUrl = `https://resto-order.com/promo/FIDELITE2026?user=${user?.id || 'guest'}&badge=${currentBadge.name.toLowerCase()}&pts=${currentPoints}`;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 flex flex-col items-center justify-center p-4">
        <Gift className="w-16 h-16 text-content-muted mb-4" />
        <h1 className="text-2xl font-bold text-content mb-2">Programme Fidélité</h1>
        <p className="text-content-muted mb-6 text-center max-w-md">Connectez-vous pour cumuler des points et débloquer des récompenses exclusives à chaque commande.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8"
    >
      <div className="text-center mb-10 relative">
        <h1 className="text-3xl font-bold text-content mb-2">Mon Programme Fidélité</h1>
        <p className="text-content-muted">Cumulez des points à chaque commande et débloquez des récompenses exclusives.</p>
        
        {/* Simulation Button for Demonstration */}
        <button 
          onClick={handleSimulatePurchase}
          disabled={isSimulating}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold hover:bg-emerald-200 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Simuler un achat (Gagner des points)
        </button>
      </div>

      {/* Points Card with Gamification */}
      <div className="bg-gradient-to-br from-primary to-primary-hover rounded-3xl p-8 text-content-inverted shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-surface opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-surface opacity-10 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left flex-1 relative">
            
            {/* Floating Points Animation */}
            <AnimatePresence>
              {floatingPoints.map(fp => (
                <motion.div
                  key={fp.id}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.5, 1.2, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute left-1/2 md:left-0 -top-10 text-2xl font-black text-emerald-300 drop-shadow-md z-50"
                  style={{ x: '-50%' }}
                >
                  +{fp.val}
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <p className="text-primary-100 font-medium uppercase tracking-wider text-sm">Solde actuel</p>
              <motion.div 
                key={currentBadge.name} // Re-animate when badge changes
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${currentBadge.bg} ${currentBadge.color} ${currentBadge.border} shadow-sm bg-opacity-90`}
              >
                <BadgeIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Membre {currentBadge.name}</span>
              </motion.div>
            </div>
            
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <motion.span 
                key={currentPoints} // Re-animate when points change
                initial={{ scale: 1.2, color: '#fde68a' }} // text-yellow-200
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-6xl font-black tracking-tight"
              >
                {currentPoints}
              </motion.span>
              <span className="text-xl font-semibold text-primary-100">pts</span>
            </div>
            <p className="text-primary-100 text-sm mt-1 text-center md:text-left">
              Total dépensé : <span className="font-bold text-content-inverted">{totalSpent}€</span>
            </p>
            
            <div className="mt-6">
              <div className="flex justify-between text-sm font-medium text-primary-100 mb-2">
                <span>Prochain palier : {nextReward.title}</span>
                <span>{currentPoints} / {nextReward.points}</span>
              </div>
              
              {/* Animated Progress Bar */}
              <div className="w-full bg-inverted/30 rounded-full h-4 backdrop-blur-sm overflow-hidden relative shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, type: "spring", bounce: 0.2 }}
                  className="bg-surface h-full rounded-full relative overflow-hidden"
                >
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-primary-100/50 to-transparent skew-x-12"
                  />
                </motion.div>
              </div>
              
              <p className="text-sm text-primary-100 mt-2">
                Plus que <span className="font-bold text-content-inverted">{Math.max(0, nextReward.points - currentPoints)} points</span> pour votre prochaine récompense !
              </p>
            </div>
          </div>

          {/* Real QR Code Section */}
          <motion.div 
            whileHover={{ scale: 1.02, rotate: 1 }}
            className="bg-surface p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center shrink-0 border-4 border-primary/30"
          >
            <QRCodeSVG 
              value={qrCodeUrl} 
              size={140} 
              level="H" 
              includeMargin={false} 
              fgColor="#111827"
            />
            <p className="text-[10px] text-content-muted font-bold mt-3 text-center uppercase tracking-widest">Scanner en caisse</p>
            <p className="text-[9px] text-content-muted/70 text-center mt-1">ID: {user?.id}</p>
          </motion.div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Rewards Catalog */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Gift className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-content">Vos Récompenses</h2>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {rewards.map((reward, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={reward.id} 
                className={`p-4 rounded-2xl border-2 transition-all ${
                  reward.unlocked 
                    ? 'border-primary bg-primary-50 shadow-sm relative overflow-hidden' 
                    : 'border-subtle bg-surface opacity-70 grayscale-[0.5]'
                }`}
              >
                {reward.unlocked && (
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
                )}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-sm ${
                      reward.unlocked ? 'bg-primary text-content-inverted' : 'bg-surface-hover text-content-muted'
                    }`}>
                      {reward.points}
                    </div>
                    <div>
                      <h3 className={`font-bold ${reward.unlocked ? 'text-content' : 'text-content-muted'}`}>
                        {reward.title}
                      </h3>
                      <p className="text-sm text-content-muted">{reward.description}</p>
                    </div>
                  </div>
                  {reward.unlocked && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.1 + 0.3 }}
                    >
                      <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                    </motion.div>
                  )}
                </div>
                {reward.unlocked && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedReward(reward)}
                    className="mt-4 w-full py-2 bg-surface border border-primary-100 text-primary-hover font-semibold rounded-xl hover:bg-primary-50 transition-colors text-sm shadow-sm"
                  >
                    Utiliser maintenant
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* History & Info */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-content">Historique</h2>
            </div>
            <div className="bg-surface rounded-2xl border border-subtle shadow-sm overflow-hidden">
              <AnimatePresence initial={false}>
                {history.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, height: 0, backgroundColor: '#f0fdf4' }}
                    animate={{ opacity: 1, height: 'auto', backgroundColor: '#ffffff' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`p-4 flex items-center justify-between ${
                      index !== history.length - 1 ? 'border-b border-subtle' : ''
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-content">{item.action}</p>
                      <p className="text-sm text-content-muted">{item.date}</p>
                    </div>
                    <div className={`font-bold ${
                      item.points.startsWith('+') ? 'text-emerald-500' : 'text-content'
                    }`}>
                      {item.points} pts
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button className="w-full p-4 text-sm font-medium text-primary hover:bg-background transition-colors flex items-center justify-center gap-1 border-t border-subtle">
                Voir tout l'historique <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-primary-50 rounded-2xl p-5 border border-primary-100 flex items-start gap-4 shadow-sm"
          >
            <div className="bg-primary-100 p-2 rounded-full shrink-0">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-content text-sm mb-1">Comment gagner des points ?</h4>
              <p className="text-sm text-content-muted leading-relaxed">
                Gagnez <strong>5 points</strong> pour chaque euro dépensé sur notre application ou en restaurant. (Ex: 100€ dépensés = 500 points). Les points s'accumulent pour débloquer des bons de commande !
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-surface rounded-2xl p-5 border border-subtle flex items-start gap-4 shadow-sm"
          >
            <div className="bg-border-default p-2 rounded-full shrink-0">
              <Trophy className="w-5 h-5 text-content-muted" />
            </div>
            <div>
              <h4 className="font-bold text-content text-sm mb-1">Niveaux de fidélité</h4>
              <p className="text-sm text-content-muted leading-relaxed">
                Passez du statut <strong>Bronze</strong> à <strong>Platine</strong> en cumulant des points. Chaque niveau débloque des avantages exclusifs (livraison gratuite, offres secrètes...).
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Gift Card Modal */}
      <AnimatePresence>
        {selectedReward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverted/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedReward(null)}
                className="absolute top-4 right-4 p-2 text-content-muted hover:text-content-muted bg-background hover:bg-surface-hover rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6 mt-2">
                <div className="w-16 h-16 bg-primary-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-content">Félicitations !</h3>
                <p className="text-content-muted mt-2">
                  Transformez <span className="font-bold text-primary">{selectedReward.points} points</span> en bon de commande pour :<br/>
                  <strong className="text-content text-lg">{selectedReward.title}</strong>
                </p>
              </div>

              <form onSubmit={handleSendGiftCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Nom du bénéficiaire</label>
                  <input 
                    type="text" 
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-2 border border-subtle rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Adresse Email</label>
                  <input 
                    type="email" 
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-subtle rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="jean.dupont@email.com"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full mt-4 py-3 bg-primary hover:bg-primary-hover text-content-inverted font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                >
                  <Mail className="w-5 h-5" />
                  Envoyer la carte cadeau
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
