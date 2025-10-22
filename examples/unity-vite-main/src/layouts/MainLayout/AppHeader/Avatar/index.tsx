import { ProfilePicture } from '@abbvie-unity/react';
import { selectAuthorization } from 'hooks/redux/authorizationSlice';
import { useAppSelector } from 'hooks/redux/rtk';

const getAvatarSrc = (upi?: string) =>
  upi &&
  `https://avatars.eastcoast.awscloud.abbvienet.com/avatar/${upi}.png?with_404=true`;

const Avatar = () => {
  const { user } = useAppSelector(selectAuthorization);
  const { upi, fn } = user ?? {};
  const initials =
    fn &&
    fn
      .split(' ')
      .map((name) => name[0])
      .reverse()
      .join('');

  return (
    <ProfilePicture
      name={fn}
      src={getAvatarSrc(upi)}
      initials={initials}
      variant="filled"
    />
  );
};

export default Avatar;
