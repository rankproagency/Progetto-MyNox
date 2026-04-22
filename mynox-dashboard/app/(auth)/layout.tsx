export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
      {/* Gradient viola di sfondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-purple-800/8 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full flex items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
}
