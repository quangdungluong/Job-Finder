import Link from "next/link";
import "./globals.css"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Job Board</title>
      </head>
      <body className="antialiased bg-gray-50">
        <nav className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">Job Board</Link>
            <div>
              <Link href="/" className="mr-4 hover:underline">Home</Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
