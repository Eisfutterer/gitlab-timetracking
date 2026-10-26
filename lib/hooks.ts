'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL_MS = 120_000; // 2 minutes

export function useAutoRefresh(enabled: boolean) {
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(INTERVAL_MS / 1000);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function reset() {
        setSecondsLeft(INTERVAL_MS / 1000);
    }

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countRef.current) clearInterval(countRef.current);
            reset();
            return;
        }

        countRef.current = setInterval(() => {
            setSecondsLeft(s => {
                if (s <= 1) return INTERVAL_MS / 1000;
                return s - 1;
            });
        }, 1000);

        timerRef.current = setTimeout(function tick() {
            router.refresh();
            reset();
            timerRef.current = setTimeout(tick, INTERVAL_MS);
        }, INTERVAL_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countRef.current) clearInterval(countRef.current);
        };
    }, [enabled, router]);

    function manualRefresh() {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countRef.current) clearInterval(countRef.current);
        router.refresh();
        reset();

        if (enabled) {
            countRef.current = setInterval(() => {
                setSecondsLeft(s => {
                    if (s <= 1) return INTERVAL_MS / 1000;
                    return s - 1;
                });
            }, 1000);
            timerRef.current = setTimeout(function tick() {
                router.refresh();
                reset();
                timerRef.current = setTimeout(tick, INTERVAL_MS);
            }, INTERVAL_MS);
        }
    }

    return { secondsLeft, manualRefresh };
}
