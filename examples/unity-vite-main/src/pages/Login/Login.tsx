import * as Unity from '@abbvie-unity/react';
import {
  AuthorizationStep,
  selectAuthorization,
} from 'hooks/redux/authorizationSlice';
import { useAppSelector } from 'hooks/redux/rtk';
import SimpleLayout from 'layouts/Simple';
import { useState } from 'react';

const LoginPage = ({
  login,
}: {
  login: (username: string, password: string) => void;
}) => {
  const [username, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const { step, error } = useAppSelector(selectAuthorization);

  return (
    <SimpleLayout>
      {error && (
        <Unity.Alert
          status="error"
          subtitle="Either sign in manually or use the AbbVie network VPN to be automatically signed in."
          className="mb-4"
        >
          {error}
        </Unity.Alert>
      )}
      <Unity.Card>
        <Unity.CardBody>
          <form
            className="flex flex-col gap-8"
            onSubmit={(evt) => {
              evt.preventDefault();
              if (username.length && password.length) {
                login(username, password);
              }
            }}
          >
            <Unity.H2>Sign In</Unity.H2>
            <div className="flex flex-col gap-6 self-center">
              <Unity.Field label="Username" floatingLabel>
                <Unity.TextInput
                  id="loginUserName"
                  onChange={(event) => setUserName(event.target.value)}
                  required
                  autoFocus
                />
              </Unity.Field>

              <Unity.Field label="Password" floatingLabel>
                <Unity.TextInput
                  type="password"
                  id="loginPassword"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Unity.Field>

              <Unity.Button
                type="submit"
                size="large"
                variant="primary"
                disabled={step === AuthorizationStep.FetchingManualLogin}
                className="w-full"
              >
                Log In
              </Unity.Button>
            </div>
          </form>
        </Unity.CardBody>
      </Unity.Card>
    </SimpleLayout>
  );
};

export default LoginPage;
