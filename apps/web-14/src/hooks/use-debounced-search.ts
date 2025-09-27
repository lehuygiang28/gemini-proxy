'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseDebouncedSearchOptions {
    delay?: number;
    initialValue?: string;
}

interface UseDebouncedSearchReturn {
    searchValue: string;
    debouncedValue: string;
    setSearchValue: (value: string) => void;
    clearSearch: () => void;
    isSearching: boolean;
}

export const useDebouncedSearch = ({
    delay = 500,
    initialValue = '',
}: UseDebouncedSearchOptions = {}): UseDebouncedSearchReturn => {
    const [searchValue, setSearchValue] = useState(initialValue);
    const [debouncedValue, setDebouncedValue] = useState(initialValue);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        setIsSearching(true);

        const timer = setTimeout(() => {
            setDebouncedValue(searchValue);
            setIsSearching(false);
        }, delay);

        return () => {
            clearTimeout(timer);
            setIsSearching(false);
        };
    }, [searchValue, delay]);

    const clearSearch = useCallback(() => {
        setSearchValue('');
        setDebouncedValue('');
        setIsSearching(false);
    }, []);

    return {
        searchValue,
        debouncedValue,
        setSearchValue,
        clearSearch,
        isSearching,
    };
};
