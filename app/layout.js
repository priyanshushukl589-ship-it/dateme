import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'DateMe – meet someone new',
  description: 'Swipe, match and chat on DateMe.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff3d77',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="shell">
            {children}
            <NavBar />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
