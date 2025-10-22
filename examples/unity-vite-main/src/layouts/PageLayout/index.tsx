import { type ReactNode } from 'react';
import { Column, Grid, H1, Typography } from '@abbvie-unity/react';

interface PageProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const Page = ({
  title,
  subtitle,
  children,
  ...props
}: PageProps & React.ComponentProps<'div'>) => {
  return (
    <Grid className="gap-y-6" {...props}>
      {/* Page Heading */}
      <Column span="100%" className="flex flex-col gap-y-2">
        <H1>{title}</H1>
        {subtitle && <Typography styledAs="subhead2">{subtitle}</Typography>}
      </Column>
      {/* Page Content */}
      <Column span="100%">{children}</Column>
    </Grid>
  );
};

export default Page;
