import { useFocusEffect } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

const SCROLL_THRESHOLD = 16;

type TabBarVisibilityContextValue = {
  isVisible: boolean;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  reset: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null);

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const isVisibleRef = useRef(true);
  const previousScrollYRef = useRef(0);

  const setVisibility = useCallback((nextVisible: boolean) => {
    if (isVisibleRef.current === nextVisible) return;
    isVisibleRef.current = nextVisible;
    setIsVisible(nextVisible);
  }, []);

  const reset = useCallback(() => {
    previousScrollYRef.current = 0;
    setVisibility(true);
  }, [setVisibility]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = Math.max(0, event.nativeEvent.contentOffset.y);

      if (currentScrollY === 0) {
        previousScrollYRef.current = 0;
        setVisibility(true);
        return;
      }

      const previousScrollY = previousScrollYRef.current;
      const distanceMoved = currentScrollY - previousScrollY;

      if (Math.abs(distanceMoved) < SCROLL_THRESHOLD) return;

      previousScrollYRef.current = currentScrollY;
      // Moving toward lower content shows the bar; moving toward earlier
      // content hides it, matching the app's requested scroll semantics.
      setVisibility(distanceMoved > 0);
    },
    [setVisibility],
  );

  const value = useMemo(
    () => ({ isVisible, handleScroll, reset }),
    [handleScroll, isVisible, reset],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    throw new Error('useTabBarVisibility must be used inside TabBarVisibilityProvider');
  }
  return context;
}

export function useTabBarScrollHandler() {
  const { handleScroll, reset } = useTabBarVisibility();

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

  return handleScroll;
}