import { H1, Logo } from '@abbvie-unity/react';
import { Link } from 'react-router-dom';
import { AppRoutes } from 'routes/routes';

const AppLogoLink = () => (
  <Link
    to={AppRoutes.HOME}
    className="flex items-center gap-[var(--un-header-footer-space-gap)] no-underline"
  >
    <Logo kind="circle" />
    <H1 styledAs="h2" className="text-brand-800">
      App Name
    </H1>
  </Link>
);

export default AppLogoLink;
