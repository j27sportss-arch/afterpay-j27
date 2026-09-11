import "./globals.css";

export const metadata = {
  title: "Afterpay J27",
  description: "Gestão de vendas, afiliados e financeiro — multi-operação",
  icons: { icon: "/icons/icon-192.svg", apple: "/icons/icon-192.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A4F42",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
