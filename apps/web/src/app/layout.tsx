import './globals.css';

export const metadata = {
  title: 'Global Wallet',
  description: 'Painel somente leitura de carteira multimoeda'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
