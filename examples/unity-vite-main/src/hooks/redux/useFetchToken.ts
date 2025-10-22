import { useEffect } from 'react';
import {
  AuthorizationStep,
  fetchUserToken,
  selectAuthorization,
} from 'hooks/redux/authorizationSlice';
import { useAppDispatch, useAppSelector } from './rtk';

const REFRESH_TIMEOUT_MINUTES = 50;

export const useFetchToken = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuthorization);
  useEffect(() => {
    if (auth.step === AuthorizationStep.NotStarted) {
      dispatch(fetchUserToken());
    }
    const refreshInterval = setInterval(
      () => {
        dispatch(fetchUserToken());
      },
      REFRESH_TIMEOUT_MINUTES * 60 * 1000,
    );
    return () => clearInterval(refreshInterval);
  }, [auth.step, dispatch]);

  return auth;
};
