import React, { createContext, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

// 导入 MUI ThemeProvider 和 CssBaseline
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const ThemeNameContext = createContext({
  themeName: 'midnight',
  setThemeName: () => {},
});

const baseTypography = {
  fontFamily: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    '"Fira Sans"',
    '"Droid Sans"',
    '"Helvetica Neue"',
    'sans-serif',
  ].join(','),
  h6: {
    fontWeight: 900,
    letterSpacing: 0.2,
  },
  button: {
    fontWeight: 800,
    letterSpacing: 0.1,
  },
};

const createAppTheme = (themeName) => {
  const themes = {
    midnight: {
      mode: 'dark',
      primary: '#7c4dff',
      secondary: '#22c55e',
      info: '#38bdf8',
      bgDefault: '#0b1020',
      bgPaper: 'rgba(15, 23, 51, 0.56)',
      buttonGrad: 'linear-gradient(135deg, rgba(124,77,255,1) 0%, rgba(34,197,94,0.95) 140%)',
      buttonShadow: '0 10px 30px rgba(124,77,255,0.22)',
    },
    graphite: {
      mode: 'dark',
      primary: '#a78bfa',
      secondary: '#60a5fa',
      info: '#22c55e',
      bgDefault: '#0a0d12',
      bgPaper: 'rgba(18, 22, 31, 0.60)',
      buttonGrad: 'linear-gradient(135deg, rgba(96,165,250,0.95) 0%, rgba(167,139,250,0.95) 140%)',
      buttonShadow: '0 10px 30px rgba(167,139,250,0.18)',
    },
    daylight: {
      mode: 'light',
      primary: '#4f46e5',
      secondary: '#16a34a',
      info: '#0284c7',
      bgDefault: '#f6f7fb',
      bgPaper: 'rgba(255, 255, 255, 0.82)',
      buttonGrad: 'linear-gradient(135deg, rgba(79,70,229,1) 0%, rgba(2,132,199,0.92) 140%)',
      buttonShadow: '0 10px 30px rgba(79,70,229,0.18)',
    },
  };
  const t = themes[themeName] || themes.midnight;
  return createTheme({
    palette: {
      mode: t.mode,
      primary: { main: t.primary },
      secondary: { main: t.secondary },
      info: { main: t.info },
      background: {
        default: t.bgDefault,
        paper: t.bgPaper,
      },
    },
    shape: {
      borderRadius: 14,
    },
    typography: baseTypography,
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage:
              t.mode === 'dark'
                ? 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                : 'linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01))',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: t.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(2,6,23,0.08)',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          'html, body, #root': {
            height: '100%',
            '@supports (height: 100dvh)': {
              height: '100dvh',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 14,
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateZ(0)',
            '&:before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background:
                'radial-gradient(240px 120px at 30% 35%, rgba(var(--accent-rgb) / 0.35), transparent 60%)',
              opacity: 0,
              transition: 'opacity 180ms ease',
              pointerEvents: 'none',
            },
            '&:hover:before': {
              opacity: 1,
            },
          },
          containedPrimary: {
            backgroundImage: t.buttonGrad,
            boxShadow: t.buttonShadow,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateZ(0)',
            '&:before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background:
                'radial-gradient(120px 80px at 30% 35%, rgba(var(--accent-rgb) / 0.32), transparent 60%)',
              opacity: 0,
              transition: 'opacity 180ms ease',
              pointerEvents: 'none',
            },
            '&:hover:before': {
              opacity: 1,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            borderColor: t.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(2,6,23,0.12)',
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateZ(0)',
            '&:before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background:
                'radial-gradient(180px 120px at 30% 35%, rgba(var(--accent-rgb) / 0.22), transparent 60%)',
              opacity: 0,
              transition: 'opacity 180ms ease',
              pointerEvents: 'none',
            },
            '&:hover:before': {
              opacity: 1,
            },
          },
          filled: {
            backgroundColor: t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(2,6,23,0.06)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: t.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(2,6,23,0.03)',
            borderRadius: 14,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: t.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(2,6,23,0.16)',
              boxShadow: t.mode === 'dark' ? '0 0 0 2px rgba(var(--accent-rgb) / 0.10)' : '0 0 0 2px rgba(79,70,229,0.10)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: t.mode === 'dark' ? 'rgba(var(--accent-rgb) / 0.55)' : 'rgba(79,70,229,0.55)',
              boxShadow: t.mode === 'dark' ? '0 0 0 3px rgba(var(--accent-rgb) / 0.14)' : '0 0 0 3px rgba(79,70,229,0.12)',
            },
          },
          notchedOutline: {
            borderColor: t.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(2,6,23,0.10)',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateZ(0)',
            '&:before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background:
                'radial-gradient(220px 140px at 30% 35%, rgba(var(--accent-rgb) / 0.16), transparent 60%)',
              opacity: 0,
              transition: 'opacity 180ms ease',
              pointerEvents: 'none',
            },
            '&:hover:before': {
              opacity: 1,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
          },
        },
      },
      MuiModal: {
        defaultProps: {
          disableScrollLock: true,
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: t.mode === 'dark' ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(2,6,23,0.10)',
            backgroundColor: t.mode === 'dark' ? 'rgba(15, 23, 51, 0.90)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            backgroundImage: 'none',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateZ(0)',
            '&:before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background:
                'radial-gradient(220px 140px at 30% 35%, rgba(var(--accent-rgb) / 0.16), transparent 60%)',
              opacity: 0,
              transition: 'opacity 180ms ease',
              pointerEvents: 'none',
            },
            '&:hover:before': {
              opacity: 1,
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            borderColor: t.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(2,6,23,0.10)',
            position: 'relative',
            overflow: 'hidden',
            '&:before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background:
                'radial-gradient(180px 120px at 30% 35%, rgba(var(--accent-rgb) / 0.28), transparent 60%)',
              opacity: 0,
              transition: 'opacity 180ms ease',
              pointerEvents: 'none',
            },
            '&:hover:before': {
              opacity: 1,
            },
            '&.Mui-selected': {
              backgroundColor: t.mode === 'dark' ? 'rgba(124,77,255,0.20)' : 'rgba(79,70,229,0.10)',
            },
          },
        },
      },
    },
  });
};

const Root = () => {
  const [themeName, setThemeName] = useState(() => localStorage.getItem('theme_name') || 'midnight');
  const theme = useMemo(() => createAppTheme(themeName), [themeName]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeName;
  }, [themeName]);
  const ctx = useMemo(
    () => ({
      themeName,
      setThemeName: (next) => {
        localStorage.setItem('theme_name', next);
        setThemeName(next);
      },
    }),
    [themeName]
  );
  return (
    <ThemeNameContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ThemeNameContext.Provider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
reportWebVitals();
