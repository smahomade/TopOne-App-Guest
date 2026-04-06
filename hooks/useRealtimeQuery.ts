import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

type RefreshMode = 'initial' | 'refresh';

type UseRealtimeQueryOptions<T> = {
  fetcher: () => Promise<T>;
  initialData: T;
  tables: string[];
  enabled?: boolean;
};

export function useRealtimeQuery<T>({
  fetcher,
  initialData,
  tables,
  enabled = true,
}: UseRealtimeQueryOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  const tablesKey = useMemo(() => tables.join('|'), [tables]);
  const stableTables = useMemo(() => tables, [tablesKey]);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (mode: RefreshMode = 'initial') => {
      if (!enabled) {
        return;
      }

      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const nextData = await fetcherRef.current();

        if (!isMountedRef.current) {
          return;
        }

        setData(nextData);
        setError(null);
      } catch (fetchError) {
        if (!isMountedRef.current) {
          return;
        }

        const message = fetchError instanceof Error ? fetchError.message : 'Unable to load data.';
        setError(message);
      } finally {
        if (!isMountedRef.current) {
          return;
        }

        if (mode === 'initial') {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void load('initial');

    if (stableTables.length === 0) {
      return;
    }

    const channel = stableTables.reduce(
      (currentChannel, table) =>
        currentChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
          },
          () => {
            void load('refresh');
          }
        ),
      supabase.channel(`live-query:${tablesKey}:${Math.random().toString(36).slice(2)}`)
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, load, stableTables, tablesKey]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      void load('refresh');
    }, [enabled, load])
  );

  return {
    data,
    error,
    loading,
    refreshing,
    refetch: () => load('refresh'),
  };
}