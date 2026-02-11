"use client";
export default function Card({ title, value, icon }: { title: string; value: number | string; icon?: string }) {
  return (
    <div className="p-5 rounded-2xl shadow-neon-lg bg-white/60 border border-white/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
