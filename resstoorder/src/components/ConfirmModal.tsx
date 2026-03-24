import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmer", 
  cancelText = "Annuler" 
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-subtle">
          <h3 className="text-lg font-bold text-content">{title}</h3>
          <button onClick={onClose} className="text-content-muted hover:text-content-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-content-muted">{message}</p>
        </div>
        <div className="p-5 bg-background flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-content-muted font-medium hover:bg-surface-hover rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { 
              onConfirm(); 
              onClose(); 
            }} 
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-content-inverted font-medium rounded-xl transition-colors shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
