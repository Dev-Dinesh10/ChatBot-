import React from 'react';

export default function DeleteModal({ show, title = 'Delete Chat', message = 'Are you sure you want to delete this chat?', onCancel, onConfirm }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#0f0f11] border border-white/5 rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-300 hover:bg-white/10">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-2 rounded-lg bg-red-600 text-sm text-white hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}
