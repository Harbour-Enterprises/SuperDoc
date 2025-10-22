import { configureStore } from '@reduxjs/toolkit';
import authorizationSlice from 'hooks/redux/authorizationSlice';

export const store = configureStore({
  reducer: {
    authorization: authorizationSlice,
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware();
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
