import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

const LIGHT = {
  background: '#ffffff',
  card: '#f3f3f3',
  input: '#ffffff',
  text: '#111111',
  secondaryText: '#777777',
  border: '#dddddd',
  tabBar: '#ffffff',
};

const DARK = {
  background: '#101010',
  card: '#1c1c1c',
  input: '#242424',
  text: '#ffffff',
  secondaryText: '#aaaaaa',
  border: '#333333',
  tabBar: '#171717',
};

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved =
          await AsyncStorage.getItem(
            '@securtap_dark_mode'
          );

        if (saved !== null) {
          setDarkMode(saved === 'true');
        }
      } catch (error) {
        console.error(
          'Unable to load theme:',
          error
        );
      } finally {
        setLoaded(true);
      }
    };

    loadTheme();
  }, []);

  const toggleDarkMode = async (value) => {
    setDarkMode(value);

    try {
      await AsyncStorage.setItem(
        '@securtap_dark_mode',
        String(value)
      );
    } catch (error) {
      console.error(
        'Unable to save theme:',
        error
      );
    }
  };

  const colors = darkMode ? DARK : LIGHT;

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        setDarkMode: toggleDarkMode,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider'
    );
  }

  return context;
}