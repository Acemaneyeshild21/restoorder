import React, { useState } from 'react';
import { X, Calendar, Clock, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !guests || !name || !phone) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    // Ici, on enverrait normalement la réservation au backend
    setIsSubmitted(true);
    toast.success('Demande de réservation envoyée !');
    
    // Réinitialiser après un délai
    setTimeout(() => {
      setIsSubmitted(false);
      setDate('');
      setTime('');
      setGuests('2');
      setName('');
      setPhone('');
      onClose();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-subtle">
          <h2 className="text-xl font-bold text-content">Réserver une table</h2>
          <button 
            onClick={onClose}
            className="text-content-muted hover:text-content-muted transition-colors rounded-full p-1 hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-content mb-2">Demande envoyée !</h3>
              <p className="text-content-muted">
                Nous avons bien reçu votre demande pour le {date} à {time}. 
                Nous vous confirmerons votre réservation très bientôt.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-default rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Heure</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                    <input 
                      type="time" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-default rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-content mb-1">Nombre de personnes</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                  <select 
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-default rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '10+'].map(num => (
                      <option key={num} value={num}>{num} personne{typeof num === 'number' && num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-content mb-1">Nom complet</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-3 py-2 border border-default rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-content mb-1">Téléphone</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-3 py-2 border border-default rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-primary text-content-inverted font-bold rounded-xl hover:bg-primary-hover transition-colors mt-6"
              >
                Demander la réservation
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
