import { Button, Icon, Menu, MenuItem } from '@abbvie-unity/react';
import { Link } from 'react-router-dom';
import { AppRoutes } from 'routes/routes';

const AppNotifications = () => (
  <Menu
    disclosureIcon={false}
    disclosure={
      <Button aria-label="Notifications" shape="circle" variant="tertiary">
        <Icon icon={['fas', 'bell']} />
      </Button>
    }
  >
    <MenuItem render={<Link to={AppRoutes.NOTIFICATIONS} />}>
      See Notifications page
    </MenuItem>
    <MenuItem render={<Link to={AppRoutes.NOTIFICATIONS} />}>
      See Notifications page
    </MenuItem>
    <MenuItem render={<Link to={AppRoutes.NOTIFICATIONS} />}>
      See Notifications page
    </MenuItem>
  </Menu>
);

export default AppNotifications;
