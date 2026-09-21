'use client';

import { createTheme } from '@mui/material/styles';
import { editorTokens } from './palette';

export const editorTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: editorTokens.bg.app,
      paper: editorTokens.bg.panel,
    },
    primary: {
      main: editorTokens.accent.primary,
      light: editorTokens.accent.primaryHover,
      dark: editorTokens.accent.primaryActive,
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6e7681',
    },
    divider: editorTokens.bg.divider,
    text: {
      primary: editorTokens.text.primary,
      secondary: editorTokens.text.secondary,
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 12,
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.75rem',
    },
    body1: {
      fontSize: '0.75rem',
      color: editorTokens.text.primary,
    },
    body2: {
      fontSize: '0.7rem',
      color: editorTokens.text.secondary,
    },
    caption: {
      fontSize: '0.65rem',
      color: editorTokens.text.muted,
    },
  },
  shape: {
    borderRadius: 3,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: editorTokens.bg.app,
          color: editorTokens.text.primary,
          userSelect: 'none',
          overflow: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: `${editorTokens.border.medium} transparent`,
          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: editorTokens.border.medium,
            borderRadius: 3,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: 'small',
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 2,
          padding: '2px 8px',
          minHeight: 24,
          minWidth: 24,
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 3,
          padding: 4,
          color: editorTokens.text.secondary,
          '&:hover': {
            backgroundColor: editorTokens.bg.hoverRow,
            color: editorTokens.text.primary,
          },
          '&.Mui-disabled': {
            color: editorTokens.text.muted,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#111111',
          border: `1px solid ${editorTokens.border.medium}`,
          color: '#ffffff',
          fontSize: '0.7rem',
          padding: '4px 8px',
          borderRadius: 3,
          boxShadow: editorTokens.shadow.panel,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: editorTokens.bg.surface,
          border: `1px solid ${editorTokens.border.medium}`,
          boxShadow: editorTokens.shadow.menu,
          borderRadius: 4,
          minWidth: 160,
        },
        list: {
          padding: '4px 0',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          minHeight: 24,
          padding: '3px 10px',
          '&:hover': {
            backgroundColor: editorTokens.accent.primary,
            color: '#ffffff',
            '& .MuiTypography-root': {
              color: '#ffffff',
            },
          },
        },
      },
    },
    MuiSlider: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          color: editorTokens.accent.primary,
          height: 3,
          padding: '10px 0',
        },
        thumb: {
          width: 10,
          height: 10,
          '&:before': {
            boxShadow: 'none',
          },
        },
        rail: {
          opacity: 0.3,
          backgroundColor: '#555555',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          backgroundColor: editorTokens.bg.input,
          borderRadius: 2,
          border: `1px solid ${editorTokens.border.subtle}`,
          '&:hover': {
            borderColor: editorTokens.border.medium,
          },
          '&.Mui-focused': {
            borderColor: editorTokens.border.focus,
          },
        },
        input: {
          padding: '2px 6px',
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        select: {
          padding: '2px 8px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: editorTokens.bg.surface,
          border: `1px solid ${editorTokens.border.medium}`,
          borderRadius: 4,
          boxShadow: editorTokens.shadow.menu,
        },
      },
    },
  },
});
