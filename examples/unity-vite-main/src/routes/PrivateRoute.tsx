import UserAttestationModal from 'components/UserAttestationModal';
import { useAppDispatch } from 'hooks/redux/rtk';
import { useFetchToken } from 'hooks/redux/useFetchToken';
import LoginPage from 'pages/Login/Login';
import {
  AuthorizationStep,
  fetchUserTokenManually,
} from 'hooks/redux/authorizationSlice';

export const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const dispatch = useAppDispatch();
  const { step } = useFetchToken();

  switch (step) {
    case AuthorizationStep.NotStarted:
    case AuthorizationStep.FetchingToken:
      return <></>;
    case AuthorizationStep.AwaitingAttestation:
    case AuthorizationStep.AwaitingNewAttestation:
      return <UserAttestationModal />;
    case AuthorizationStep.Ready:
      return children;
    case AuthorizationStep.Error:
    default:
      return (
        <LoginPage
          login={(username, password) => {
            dispatch(fetchUserTokenManually({ username, password }));
          }}
        />
      );
  }
};
