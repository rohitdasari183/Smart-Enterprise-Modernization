'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'sonner';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: { label: string; value: string }[];
}

interface ModalFormProps {
  title: string;
  fields: FieldDef[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  onClose: () => void;
  open: boolean;
  submitLabel?: string;
}

export default function ModalForm({
  title,
  fields,
  initialData = {},
  onSubmit,
  onClose,
  open,
  submitLabel = 'Save',
}: ModalFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Prevent infinite loop issue for large data sets
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setFormData(initialData);
    }
  }, [JSON.stringify(initialData)]); // stringified to trigger only on actual content change

  if (!open) return null;

  const handleChange = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(`${title} saved successfully 🎉`, {
        style: {
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #22c55e',
        },
      });
      onClose();
    } catch (err: any) {
      toast.error(`Failed to save ${title}: ${err.message || 'Unknown error'}`, {
        style: { background: '#450a0a', color: '#fef2f2' },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gradient-to-br from-slate-900 to-gray-800 rounded-xl shadow-2xl w-full max-w-lg sm:max-w-xl md:max-w-2xl p-6 relative border border-white/10 max-h-[90vh] flex flex-col"
          initial={{ scale: 0.9, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 150 }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-300 hover:text-white"
          >
            <FaTimes />
          </button>

          <h2 className="text-2xl font-bold text-white mb-4 pr-6">{title}</h2>

          {/* ✅ Scrollable form content area */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1"
          >
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col">
                <label className="block text-sm text-gray-400 mb-1">
                  {field.label}
                </label>

                {field.type === 'select' ? (
                  <select
                    className="w-full bg-slate-800 text-gray-200 p-2 rounded border border-white/10 focus:ring-2 focus:ring-indigo-500"
                    value={formData[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    className="w-full bg-slate-800 text-gray-200 p-2 rounded border border-white/10 focus:ring-2 focus:ring-indigo-500 resize-none"
                    value={formData[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                ) : (
                  <input
                    type={field.type}
                    className="w-full bg-slate-800 text-gray-200 p-2 rounded border border-white/10 focus:ring-2 focus:ring-indigo-500"
                    value={formData[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* ✅ Sticky footer for form actions */}
            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-gradient-to-t from-slate-900/90 to-slate-900/50 backdrop-blur-md py-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-70"
              >
                {submitting ? 'Saving...' : submitLabel}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
