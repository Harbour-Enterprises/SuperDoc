import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  decodeToken,
  fetchTokenManually,
  getOrFetchToken,
  getUserAttestationDate,
  isAttestationRecent,
  storeUserAttestation,
} from 'services/auth.service';
import type { AuthUser } from 'services/auth.service';
import type { RootState } from 'app/store';

export enum AuthorizationStep {
  NotStarted,
  FetchingToken,
  FetchingManualLogin,
  AwaitingAttestation, // Never attested
  AwaitingNewAttestation, // Attestation is out of date
  Ready,
  Error,
}

type Token = string;

type AuthorizationState = {
  step: AuthorizationStep;
  token: Token | null;
  user: AuthUser | null;
  error: string | null;
  attestation?: string | null;
};

export const fetchUserToken = createAsyncThunk(
  'auth/fetchToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getOrFetchToken();
      return token;
    } catch (e: unknown) {
      console.error('error fetching token', e);
      return rejectWithValue('There was a problem fetching your token');
    }
  },
);

export const fetchUserTokenManually = createAsyncThunk(
  'auth/manualLogin',
  async (
    { username, password }: { username: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const token = await fetchTokenManually(username, password);
      return token;
    } catch (e: unknown) {
      console.error('error fetching token', e);

      return rejectWithValue('Your username/password do not match');
    }
  },
);

const initialState: AuthorizationState = {
  step: AuthorizationStep.NotStarted,
  token: null,
  user: null,
  error: null,
};

const getStepForAttestation = (attestationDate: Date | null) => {
  if (attestationDate && isAttestationRecent(attestationDate)) {
    return AuthorizationStep.Ready;
  }
  if (attestationDate) {
    return AuthorizationStep.AwaitingNewAttestation;
  }
  return AuthorizationStep.AwaitingAttestation;
};

const gotToken = (state: AuthorizationState, action: PayloadAction<Token>) => {
  const decodedToken = action.payload ? decodeToken(action.payload) : null;
  const attestationDate = getUserAttestationDate(decodedToken?.upi);

  state.step = getStepForAttestation(attestationDate);
  state.token = action.payload;
  state.attestation = attestationDate?.toISOString();
  state.user = decodedToken;
  state.error = null;
};

const gotError = (state: AuthorizationState, action: PayloadAction<string>) => {
  state.step = AuthorizationStep.Error;
  state.token = null;
  state.user = null;
  state.error = action.payload;
};

export const authorizationSlice = createSlice({
  name: 'authorization',
  initialState,
  reducers: {
    setAttestation: (state, action: PayloadAction<Date>) => {
      storeUserAttestation(state.user?.upi, action.payload);
      state.attestation = action.payload.toISOString();
      state.step = AuthorizationStep.Ready;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserToken.fulfilled, gotToken);
    builder.addCase(fetchUserToken.rejected, gotError);
    builder.addCase(fetchUserTokenManually.pending, (state) => {
      state.step = AuthorizationStep.FetchingManualLogin;
    });
    builder.addCase(fetchUserTokenManually.fulfilled, gotToken);
    builder.addCase(fetchUserTokenManually.rejected, gotError);
  },
});

export default authorizationSlice.reducer;

export const { setAttestation } = authorizationSlice.actions;

export const selectAuthorization = ({ authorization }: RootState) =>
  authorization;

export const selectAuthStep = ({ authorization }: RootState) =>
  authorization.step;
