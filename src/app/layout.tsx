import type { Metadata } from "next";
import { WorkspaceProvider } from "@/lib/store";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description:
    "Conformité ISO 27001 et NIS2 pour les TPE/PME : un parcours guidé, des preuves simples, des alertes avant l'audit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
