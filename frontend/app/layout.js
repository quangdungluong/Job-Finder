import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Job Board</title>
      </head>
      <body className="antialiased bg-gray-50">
        <nav className="p-4 bg-white shadow-md">
          <div className="container flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-gray-800 no-underline">Job Board</Link>
            <div className="flex space-x-4">
              <Link href="/" className="text-gray-600 no-underline">Home</Link>
            </div>
          </div>
        </nav>
        <main className="container py-6 flex flex-col md:flex-row gap-6">
          {children}
        </main>
      </body>
    </html>
  );
}
