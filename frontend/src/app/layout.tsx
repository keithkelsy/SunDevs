import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  title: 'SunDevs Food Ordering',
  description: 'Order food online',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <CartProvider>
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-orange-600">
                SunDevs Food
              </a>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-6">
            {children}
          </main>
        </CartProvider>
      </body>
    </html>
  );
}
