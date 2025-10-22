import AppFooter from 'layouts/MainLayout/AppFooter';
import AppHeader from 'layouts/MainLayout/AppHeader';
import { type ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
}

/**
 * MainLayout is the main layout for the application that persists the whole application workflow.
 * It contains the header, footer, content (children), sidebar (optional).
 */
const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="shrink-1 grow-1 basis-0 py-8">{children}</main>
      <AppFooter />
    </div>
  );
};

export default MainLayout;
