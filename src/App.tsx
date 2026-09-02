import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ClientList } from './components/ClientList';
import { ClientDetailView } from './components/ClientDetailView';
import { ClientFormModal } from './components/ClientFormModal';
import { LoanList } from './components/LoanList';
import { LoanFormModal } from './components/LoanFormModal';
import { LoanDetailModal } from './components/LoanDetailModal';
import { PaymentModal } from './components/PaymentModal';
import { MapView } from './components/MapView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { FirebaseSyncBanner } from './components/FirebaseSyncBanner';
import { Client } from './types';

function AppContent() {
  const {
    isAuthenticated,
    activeTab,
    selectedClientDetail,
    setSelectedClientDetail,
    selectedLoanDetail,
    setSelectedLoanDetail,
    isClientModalOpen,
    setIsClientModalOpen,
    isLoanModalOpen,
    setIsLoanModalOpen,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    activeLoanForPayment,
    isFirebasePermissionMissing,
    dismissFirebaseWarning,
    retryFirebaseConnection,
  } = useApp();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClientDetail(client);
  };

  const handleEditClient = (client: Client) => {
    setClientToEdit(client);
    setIsClientModalOpen(true);
  };

  const handleCloseClientModal = () => {
    setIsClientModalOpen(false);
    setClientToEdit(null);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar navigation */}
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Container */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <Header setIsMobileOpen={setIsMobileOpen} />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {isFirebasePermissionMissing && (
            <FirebaseSyncBanner
              onDismiss={dismissFirebaseWarning}
              onRetryConnection={retryFirebaseConnection}
            />
          )}

          {activeTab === 'dashboard' && <Dashboard />}

          {activeTab === 'clients' && (
            selectedClientDetail ? (
              <ClientDetailView
                client={selectedClientDetail}
                onBack={() => setSelectedClientDetail(null)}
                onEdit={() => handleEditClient(selectedClientDetail)}
              />
            ) : (
              <ClientList
                onSelectClient={handleSelectClient}
                onEditClient={handleEditClient}
              />
            )
          )}

          {activeTab === 'loans' && <LoanList />}
          {activeTab === 'map' && <MapView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Modals */}
      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={handleCloseClientModal}
        clientToEdit={clientToEdit}
      />

      <LoanFormModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
      />

      <LoanDetailModal
        isOpen={!!selectedLoanDetail}
        onClose={() => setSelectedLoanDetail(null)}
        loan={selectedLoanDetail}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        loan={activeLoanForPayment}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
