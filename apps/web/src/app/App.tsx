import React from 'react';
import { AuthProvider } from '../services/auth-context';
import { AppRouter } from './router';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};
