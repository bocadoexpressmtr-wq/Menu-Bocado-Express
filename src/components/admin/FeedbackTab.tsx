import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Feedback } from '../../types';
import { Trash2, MessageSquare, CheckCircle, Clock, Phone, User, Inbox, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDialog } from '../../context/DialogContext';

export default function FeedbackTab() {
  const { showAlert, showConfirm } = useDialog();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[];
      setFeedbacks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    showConfirm(
      "¿Eliminar Mensaje?",
      "¿Estás seguro de que deseas eliminar este mensaje? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, 'feedback', id));
          showAlert("Eliminado", "Mensaje eliminado", 'success');
        } catch (error) {
          console.error("Error deleting feedback", error);
          showAlert("Error", "Error al eliminar el mensaje", 'error');
        }
      }
    );
  };

  const toggleRead = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'feedback', id), {
        status: currentStatus === 'read' ? 'unread' : 'read'
      });
    } catch (error) {
      console.error("Error updating feedback status", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-3xl font-black text-stone-900 tracking-tight">Sugerencias y Quejas</h2>
        <p className="text-stone-500 text-sm">Escucha lo que tus clientes tienen que decir</p>
      </div>

      {feedbacks.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border border-stone-100 text-center space-y-4">
          <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto text-stone-300">
            <Inbox size={32} />
          </div>
          <p className="text-stone-400 font-medium">No hay mensajes de clientes aún.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {feedbacks.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "bg-white p-4 rounded-2xl border transition-all group relative",
                item.status === 'unread' ? "border-stone-900 shadow-md" : "border-stone-100 shadow-sm opacity-80"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest",
                      item.type === 'queja' ? "bg-red-100 text-red-600" :
                      item.type === 'sugerencia' ? "bg-blue-100 text-blue-600" :
                      "bg-stone-100 text-stone-600"
                    )}>
                      {item.type}
                    </span>
                    <span className="text-stone-400 text-[10px] font-bold flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    {item.status === 'unread' && (
                      <span className="bg-stone-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest animate-pulse">
                        Nuevo
                      </span>
                    )}
                  </div>

                  <p className="text-stone-800 font-medium leading-relaxed text-sm">
                    "{item.message}"
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-stone-500">
                      <User size={14} className="text-stone-400" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{item.customerName}</span>
                    </div>
                    {item.customerPhone && (
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Phone size={14} className="text-stone-400" />
                        <span className="text-[10px] font-bold">{item.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => toggleRead(item.id!, item.status)}
                    className={cn(
                      "p-2 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest",
                      item.status === 'unread' 
                        ? "bg-stone-900 text-white hover:bg-stone-800" 
                        : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    )}
                  >
                    <CheckCircle size={14} />
                    {item.status === 'unread' ? 'Marcar leído' : 'Leído'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id!)}
                    className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
