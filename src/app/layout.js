import { Bebas_Neue, Roboto } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: '400',
  variable: '--font-bebas',
  subsets: ['latin'],
});

const roboto = Roboto({
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  subsets: ['latin'],
});

export const metadata = {
  title: "Falcon Media App",
  description: "Falcon Media App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body
        className={`${bebas.variable} ${roboto.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
