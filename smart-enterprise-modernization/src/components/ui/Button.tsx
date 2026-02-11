'use client';
export default function Button({
  children,
  onClick,
}: {
  children: any;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-md bg-gradient-to-r from-brand-500 to-purple-600 text-white hover:brightness-105"
    >
      {children}
    </button>
  );
}
