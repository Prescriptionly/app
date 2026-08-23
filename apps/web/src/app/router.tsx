import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { DocumentDetailPage } from '../features/documents/DocumentDetailPage';
import { OcrReviewPage } from '../features/ocr/OcrReviewPage';
import { PrescriptionsPage } from '../features/prescriptions/PrescriptionsPage';
import { NewPrescriptionPage } from '../features/prescriptions/NewPrescriptionPage';
import { TreatmentsPage } from '../features/treatments/TreatmentsPage';
import { TimelinePage } from '../features/timeline/TimelinePage';
import { SymptomsPage } from '../features/symptoms/SymptomsPage';
import { AiAssistantPage } from '../features/ai-assistant/AiAssistantPage';
import { HealthSummariesPage } from '../features/summaries/HealthSummariesPage';
import { ExportsPage } from '../features/exports/ExportsPage';
import { SharingPage } from '../features/sharing/SharingPage';
import { SharedWalletViewPage } from '../features/sharing/SharedWalletViewPage';
import { EmergencyCardPage } from '../features/emergency/EmergencyCardPage';
import { PublicEmergencyCardPage } from '../features/emergency/PublicEmergencyCardPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { AdminPage } from '../features/admin/AdminPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/shared/:token',
    element: <SharedWalletViewPage />,
  },
  {
    path: '/emergency-card/:token',
    element: <PublicEmergencyCardPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'prescriptions',
        element: <PrescriptionsPage />,
      },
      {
        path: 'prescriptions/new',
        element: <NewPrescriptionPage />,
      },
      {
        path: 'treatments',
        element: <TreatmentsPage />,
      },
      {
        path: 'documents',
        element: <DocumentsPage />,
      },
      {
        path: 'documents/:id',
        element: <DocumentDetailPage />,
      },
      {
        path: 'ocr/review/:id',
        element: <OcrReviewPage />,
      },
      {
        path: 'timeline',
        element: <TimelinePage />,
      },
      {
        path: 'symptoms',
        element: <SymptomsPage />,
      },
      {
        path: 'assistant',
        element: <AiAssistantPage />,
      },
      {
        path: 'summaries',
        element: <HealthSummariesPage />,
      },
      {
        path: 'exports',
        element: <ExportsPage />,
      },
      {
        path: 'sharing',
        element: <SharingPage />,
      },
      {
        path: 'emergency',
        element: <EmergencyCardPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
