import { Footer, Logo, Typography } from '@abbvie-unity/react';

const AppFooter = () => (
  <Footer position="static">
    <Logo />
    <Typography styledAs="caption" className="ml-auto!">
      Copyright © {new Date().getFullYear()} AbbVie Inc.
    </Typography>
  </Footer>
);

export default AppFooter;
