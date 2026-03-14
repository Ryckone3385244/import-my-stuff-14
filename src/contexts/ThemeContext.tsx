import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { useWebsiteStyles } from "@/hooks/useWebsiteStyles";

interface ThemeContextValue {
  stylesLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  stylesLoaded: false,
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { stylesLoaded } = useWebsiteStyles();

  const value = useMemo(() => ({ stylesLoaded }), [stylesLoaded]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
