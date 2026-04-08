import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

type DialogType = 'alert' | 'confirm' | 'success' | 'error';

interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogContextType {
  showAlert: (title: string, message: string, type?: 'alert' | 'success' | 'error') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, options?: Partial<DialogOptions>) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(DialogOptions & { isOpen: boolean }) | null>(null);

  const showAlert = (title: string, message: string, type: 'alert' | 'success' | 'error' = 'alert') => {
    setDialog({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'Aceptar'
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, options: Partial<DialogOptions> = {}) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      ...options
    });
  };

  const closeDialog = () => {
    if (dialog?.onCancel) dialog.onCancel();
    setDialog(null);
  };

  const handleConfirm = () => {
    if (dialog?.onConfirm) dialog.onConfirm();
    setDialog(null);
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog?.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center border border-stone-100">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg",
              dialog.type === 'success' ? "bg-emerald-50 text-emerald-500 shadow-emerald-100" : 
              dialog.type === 'confirm' ? "bg-stone-50 text-stone-900 shadow-stone-100" : 
              dialog.type === 'error' ? "bg-red-50 text-red-500 shadow-red-100" :
              "bg-amber-50 text-amber-500 shadow-amber-100"
            )}>
              {dialog.type === 'success' ? <CheckCircle2 size={40} /> : 
               dialog.type === 'confirm' ? <Info size={40} /> : 
               dialog.type === 'error' ? <AlertCircle size={40} /> :
               <Info size={40} />}
            </div>
            <h3 className="text-2xl font-black text-stone-900 mb-2 uppercase tracking-tight">{dialog.title}</h3>
            <p className="text-stone-500 text-sm mb-8 leading-relaxed font-medium">{dialog.message}</p>
            <div className={cn("grid gap-3", dialog.type === 'confirm' ? "grid-cols-2" : "grid-cols-1")}>
              {dialog.type === 'confirm' && (
                <button 
                  onClick={closeDialog}
                  className="py-4 px-6 rounded-2xl bg-stone-100 text-stone-500 font-black uppercase tracking-wider text-[10px] hover:bg-stone-200 transition-all active:scale-95"
                >
                  {dialog.cancelText || 'Cancelar'}
                </button>
              )}
              <button 
                onClick={handleConfirm}
                className={cn(
                  "py-4 px-6 rounded-2xl text-white font-black uppercase tracking-wider text-[10px] transition-all active:scale-95 shadow-lg",
                  dialog.type === 'success' ? "bg-emerald-600 shadow-emerald-200" : 
                  dialog.type === 'confirm' ? "bg-stone-900 shadow-stone-200" : 
                  dialog.type === 'error' ? "bg-red-600 shadow-red-200" :
                  "bg-stone-900 shadow-stone-200"
                )}
              >
                {dialog.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
