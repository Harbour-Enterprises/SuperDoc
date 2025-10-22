import { Button, Header, useWindowSize } from '@abbvie-unity/react';
import { selectAuthorization } from 'hooks/redux/authorizationSlice';
import { useAppSelector } from 'hooks/redux/rtk';
import AppLogoLink from './AppLogoLink/AppLogoLink';
import AppNotifications from './AppNotifications';
import AppSearch from './AppSearch';
import Avatar from './Avatar';

const AppHeader = () => {
  const { isBreakpointGreaterThan } = useWindowSize();
  const { user } = useAppSelector(selectAuthorization);

  return (
    <Header justify="space-between">
      <AppLogoLink />
      <div className="flex">
        {isBreakpointGreaterThan('md') && (
          <span className="flex items-center gap-4">
            <AppSearch />
            <AppNotifications />
            {isBreakpointGreaterThan('lg') && (
              <>
                <Avatar />
                <Button
                  variant="tertiary"
                  shape="default"
                  endIcon="chevron-down"
                >
                  {user?.fn}
                </Button>
              </>
            )}
          </span>
        )}
      </div>
    </Header>
  );
};

export default AppHeader;
