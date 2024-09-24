import { configureStore } from '@reduxjs/toolkit';
import * as Player from './playerSlice';
import * as Match from './matchSlice';

export const store = configureStore({
    reducer: {
        player: Player.playerSlice.reducer,
        match: Match.matchSlice.reducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
