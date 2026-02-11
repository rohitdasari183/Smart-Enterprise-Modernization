import './globals.css';
import { ReactNode } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { AuthProvider } from '../context/AuthContext';
import { EnterpriseProvider } from '../context/EnterpriseContext';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Smart Enterprise Modernization',
  description: 'API-first modernization for enterprises'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-b from-slate-50 to-white min-h-screen text-slate-900">
        <AuthProvider>
          <EnterpriseProvider>
            <Header />
            <main className="container mx-auto px-4 py-8">{children}</main>
            <Toaster position="top-right" richColors expand />
            <Footer />
          </EnterpriseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
