
export const metadata = { title: "Video Redaction Pro", description: "Redaction UI", icons:{ icon:"/icon.png" } };
export default function RootLayout({ children }:{ children: React.ReactNode }){
  return (<html lang="en"><body className="min-h-screen">{children}</body></html>);
}
