'use client';

import React, { type PropsWithChildren, createContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import {
    DATETIME_FORMAT_COOKIE_NAME,
    DATETIME_FORMAT_COOKIE_OPTIONS,
    type DatetimeFormatMode,
} from '@constants';
import { parseDatetimeFormatMode } from '@/features/datetime/datetime-format';

type DateTimeFormatContextType = {
    mode: DatetimeFormatMode;
    setMode: (mode: DatetimeFormatMode) => void;
    now: Date;
};

export const DateTimeFormatContext = createContext<DateTimeFormatContextType>({
    mode: 'auto',
    setMode: () => undefined,
    now: new Date(0),
});

type DateTimeFormatContextProviderProps = {
    defaultMode?: DatetimeFormatMode;
};

export const DateTimeFormatContextProvider: React.FC<
    PropsWithChildren<DateTimeFormatContextProviderProps>
> = ({ children, defaultMode }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [mode, setModeState] = useState<DatetimeFormatMode>(defaultMode ?? 'auto');
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        if (isMounted) {
            setModeState(parseDatetimeFormatMode(Cookies.get(DATETIME_FORMAT_COOKIE_NAME)));
        }
    }, [isMounted]);

    const setMode = (nextMode: DatetimeFormatMode) => {
        setModeState(nextMode);
        Cookies.set(DATETIME_FORMAT_COOKIE_NAME, nextMode, DATETIME_FORMAT_COOKIE_OPTIONS);
    };

    return (
        <DateTimeFormatContext.Provider value={{ mode, setMode, now }}>
            {children}
        </DateTimeFormatContext.Provider>
    );
};
