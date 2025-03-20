import Link from "next/link";
import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";
import ThemeProvider from "../components/ThemeProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <title>Job Board</title>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const savedTheme = localStorage.getItem('theme');
                const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const theme = savedTheme || 'system';

                if (theme === 'dark' || (theme === 'system' && systemPreference === 'dark')) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {
                console.error('Theme initialization error:', e);
              }
            })();
          `,
        }} />
      </head>
      <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 h-full overflow-hidden">
        <ThemeProvider>
          <div className="flex flex-col h-screen">
            <nav className="h-16 bg-white dark:bg-gray-800 shadow-md border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20">
              <div className="container h-full mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-gray-800 dark:text-white no-underline">Job Board</Link>
                <div className="flex items-center space-x-4">
                  <Link href="/" className="text-gray-600 dark:text-gray-300 no-underline">Home</Link>
                  <ThemeToggle />
                </div>
              </div>
            </nav>
            <main className="flex-grow h-[calc(100vh-64px)] overflow-hidden">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
