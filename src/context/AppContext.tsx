import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, remove as rtdbRemove, onValue } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  db,
  rtdb,
  auth,
  handleFirestoreError,
  OperationType,
  onPermissionError,
  clearPermissionError,
} from '../lib/firebase';
import {
  Client,
  Loan,
  SystemSettings,
  UserProfile,
  EmployeeUser,
  EmployeeNotification,
  EmployeeStatus,
  FilterStatus,
  PaymentRecord,
  NotificationAlert,
  AuditLog,
} from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_LOANS,
  INITIAL_SETTINGS,
  INITIAL_USER_PROFILES,
  INITIAL_EMPLOYEES,
} from '../data/initialData';
import { getTodayIso, getDateOffsetIso, getLoanFinancialSummary } from '../utils/calculations';
import {
  validateClient,
  validateLoan,
  validatePayment,
} from '../utils/securityValidator';
import { logAuditEvent, getLocalAuditLogs } from '../utils/auditLogger';
import { executeAtomicPayment } from '../utils/financialTransactions';
import { generateDatabaseBackup, validateBackupFile } from '../utils/backupService';
import { runDatabaseMigrations } from '../utils/dbMigrations';

interface AppContextType {
  clients: Client[];
  loans: Loan[];
  settings: SystemSettings;
  currentUser: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (status: FilterStatus) => void;
  selectedClientDetail: Client | null;
  setSelectedClientDetail: (client: Client | null) => void;
  selectedLoanDetail: Loan | null;
  setSelectedLoanDetail: (loan: Loan | null) => void;
  isClientModalOpen: boolean;
  setIsClientModalOpen: (open: boolean) => void;
  isLoanModalOpen: boolean;
  setIsLoanModalOpen: (open: boolean) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
  activeLoanForPayment: Loan | null;
  setActiveLoanForPayment: (loan: Loan | null) => void;
  
  // Auth State
  isAuthenticated: boolean;
  setIsAuthenticated: (authenticated: boolean) => void;
  loginWithCustomUser: (user: UserProfile) => void;
  logout: () => void;

  // Employees Management (Created, registered and controlled by Admin)
  employees: EmployeeUser[];
  employeeNotifications: EmployeeNotification[];
  addEmployee: (employeeData: Omit<EmployeeUser, 'id' | 'createdAt' | 'createdByName'>) => EmployeeUser;
  registerEmployeeApplication: (data: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    address?: string;
    city?: string;
    birthDate?: string;
    avatarUrl?: string;
    registrationMethod: 'google' | 'email_password';
    password?: string;
  }) => Promise<{ success: boolean; employee: EmployeeUser; message: string }>;
  approveEmployee: (id: string) => Promise<void>;
  denyEmployee: (id: string, reason?: string) => Promise<void>;
  suspendEmployee: (id: string, reason?: string) => Promise<void>;
  updateEmployee: (id: string, employeeData: Partial<EmployeeUser>) => void;
  deleteEmployee: (id: string) => void;
  toggleEmployeeStatus: (id: string) => void;
  authenticateEmployee: (email: string, password: string) => { success: boolean; message?: string; user?: UserProfile; employee?: EmployeeUser };
  isEmployeeEmailAllowed: (email: string) => { allowed: boolean; employee?: EmployeeUser; message?: string };
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  suspendedSessionAlert: { title: string; message: string; reason?: string; type: 'suspended' | 'denied' } | null;
  clearSuspendedSessionAlert: () => void;

  // Actions
  setCurrentUserRole: (role: 'admin' | 'employee') => void;
  toggleTheme: () => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, clientData: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addLoan: (loanData: Omit<Loan, 'id' | 'createdAt' | 'payments'>) => Loan;
  updateLoan: (id: string, loanData: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  registerPayment: (loanId: string, amount: number, paymentMethod: 'pix' | 'dinheiro' | 'transferencia' | 'cartao', note?: string) => PaymentRecord | null;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetToSampleData: () => void;
  
  // Security, Audit & Disaster Recovery
  auditLogs: AuditLog[];
  downloadBackup: () => Promise<void>;
  restoreBackupFromFile: (fileContent: string) => Promise<{ success: boolean; message: string }>;

  // Alerts / Notifications
  notifications: NotificationAlert[];

  // Firebase Sync State
  isFirebasePermissionMissing: boolean;
  dismissFirebaseWarning: () => void;
  retryFirebaseConnection: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'credicontrol_loan_app_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_clients`);
    if (!saved) return INITIAL_CLIENTS;
    try {
      const parsed: Client[] = JSON.parse(saved);
      // Migrate any old Belém records to Salinópolis
      return parsed.map((c) => {
        if (c.address?.city === 'Belém' || !c.address?.city) {
          return {
            ...c,
            address: {
              ...c.address,
              city: 'Salinópolis',
              state: 'PA',
              cep: '68721-000',
            },
            location: c.location
              ? {
                  ...c.location,
                  lat: c.location.lat < -1 ? -0.6136 : c.location.lat,
                  lng: c.location.lng < -48 ? -47.3562 : c.location.lng,
                  addressFormatted: c.location.addressFormatted?.replace(/Belém/g, 'Salinópolis') || 'Salinópolis - PA, 68721-000',
                }
              : {
                  lat: -0.6136,
                  lng: -47.3562,
                  addressFormatted: 'Salinópolis - PA, 68721-000',
                },
          };
        }
        return c;
      });
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_loans`);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    // Only on very first clean run if never initialized
    const isFirstRun = localStorage.getItem(`${STORAGE_KEY}_initialized`) !== 'true';
    if (isFirstRun) {
      localStorage.setItem(`${STORAGE_KEY}_initialized`, 'true');
      return INITIAL_LOANS;
    }
    return [];
  });


  const [employees, setEmployees] = useState<EmployeeUser[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_employees`);
    if (!saved) return INITIAL_EMPLOYEES;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [employeeNotifications, setEmployeeNotifications] = useState<EmployeeNotification[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_employee_notifications`);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [suspendedSessionAlert, setSuspendedSessionAlert] = useState<{
    title: string;
    message: string;
    reason?: string;
    type: 'suspended' | 'denied';
  } | null>(null);

  const clearSuspendedSessionAlert = () => {
    setSuspendedSessionAlert(null);
  };

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
    if (!saved) return INITIAL_SETTINGS;
    try {
      const parsed: SystemSettings = JSON.parse(saved);
      if (parsed.companyAddress?.includes('Belém')) {
        return {
          ...parsed,
          companyAddress: 'Av. Beira Mar, S/N - Atalaia, Salinópolis - PA, CEP 68721-000',
        };
      }
      return parsed;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILES[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_auth`) === 'true';
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getLocalAuditLogs());

  // Run database migrations on mount
  useEffect(() => {
    runDatabaseMigrations();
  }, []);

  const loginWithCustomUser = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(user));
    localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(`${STORAGE_KEY}_auth`);
    if (auth.currentUser) {
      auth.signOut().catch(() => {});
    }
  };
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');

  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [selectedLoanDetail, setSelectedLoanDetail] = useState<Loan | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [activeLoanForPayment, setActiveLoanForPayment] = useState<Loan | null>(null);

  const [isFirebasePermissionMissing, setIsFirebasePermissionMissing] = useState<boolean>(() => {
    return false;
  });
  const [isWarningDismissed, setIsWarningDismissed] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? sessionStorage.getItem('credicontrol_dismiss_sync_banner') === 'true' : false;
  });
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const dismissFirebaseWarning = () => {
    setIsFirebasePermissionMissing(false);
    setIsWarningDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('credicontrol_dismiss_sync_banner', 'true');
    }
  };

  const retryFirebaseConnection = () => {
    clearPermissionError();
    setIsFirebasePermissionMissing(false);
    setIsWarningDismissed(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('credicontrol_dismiss_sync_banner');
    }
    setRetryCounter((prev) => prev + 1);
  };


  // Listen for permission error broadcasts from firebase.ts
  useEffect(() => {
    const unsub = onPermissionError(() => {
      setIsFirebasePermissionMissing(true);
    });
    return () => unsub();
  }, []);

  // Synchronize Firestore & Realtime Database with app state
  useEffect(() => {
    let unsubClients: (() => void) | null = null;
    let unsubLoans: (() => void) | null = null;
    let unsubEmployees: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;
    let unsubEmployeeNotifs: (() => void) | null = null;

    // 1. Realtime Database listeners (if databaseURL is configured)
    if (rtdb) {
      try {
        const rtdbClientsRef = rtdbRef(rtdb, 'clients');
        onValue(
          rtdbClientsRef,
          (snapshot) => {
            const val = snapshot.val();
            if (val) {
              const loaded: Client[] = Array.isArray(val)
                ? val.filter(Boolean)
                : Object.values(val);
              if (loaded.length > 0) {
                setClients(loaded);
              }
            }
          },
          (err) => {
            console.warn('Realtime Database clients sync note:', err.message);
          }
        );

        const rtdbLoansRef = rtdbRef(rtdb, 'loans');
        onValue(
          rtdbLoansRef,
          (snapshot) => {
            const val = snapshot.val();
            if (val) {
              const loaded: Loan[] = Array.isArray(val)
                ? val.filter(Boolean)
                : Object.values(val);
              if (loaded.length > 0) {
                setLoans(loaded);
              }
            }
          },
          (err) => {
            console.warn('Realtime Database loans sync note:', err.message);
          }
        );

        const rtdbEmployeesRef = rtdbRef(rtdb, 'employees');
        onValue(
          rtdbEmployeesRef,
          (snapshot) => {
            const val = snapshot.val();
            if (val) {
              const loaded: EmployeeUser[] = Array.isArray(val)
                ? val.filter(Boolean)
                : Object.values(val);
              if (loaded.length > 0) {
                setEmployees(loaded);
              }
            }
          },
          (err) => {
            console.warn('Realtime Database employees sync note:', err.message);
          }
        );

        const rtdbSettingsRef = rtdbRef(rtdb, 'settings');
        onValue(
          rtdbSettingsRef,
          (snapshot) => {
            const val = snapshot.val();
            if (val && typeof val === 'object') {
              setSettings((prev) => ({ ...prev, ...val }));
            }
          },
          (err) => {
            console.warn('Realtime Database settings sync note:', err.message);
          }
        );
      } catch (err) {
        console.warn('Realtime Database initialization note:', err);
      }
    }

    // 2. Cloud Firestore listeners (strictly guarded by authenticated state)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // If user is unauthenticated or logged out, detach all Firestore listeners cleanly
      if (!user) {
        if (unsubClients) {
          try { unsubClients(); } catch (_) {}
          unsubClients = null;
        }
        if (unsubLoans) {
          try { unsubLoans(); } catch (_) {}
          unsubLoans = null;
        }
        if (unsubEmployees) {
          try { unsubEmployees(); } catch (_) {}
          unsubEmployees = null;
        }
        if (unsubSettings) {
          try { unsubSettings(); } catch (_) {}
          unsubSettings = null;
        }
        if (unsubEmployeeNotifs) {
          try { unsubEmployeeNotifs(); } catch (_) {}
          unsubEmployeeNotifs = null;
        }
        return;
      }

      if (!db) {
        return;
      }

      // User authenticated, attach listeners with smart bi-directional local recovery
      if (!unsubClients) {
        try {
          unsubClients = onSnapshot(
            collection(db, 'clients'),
            (snapshot) => {
              setIsFirebasePermissionMissing(false);
              if (!snapshot.empty) {
                const remoteClients: Client[] = snapshot.docs.map((d) => d.data() as Client);
                const remoteMap = new Map<string, Client>(remoteClients.map((c) => [c.id, c]));

                // Retrieve set of explicitly deleted client IDs
                const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_clients`);
                const deletedIds = new Set<string>(deletedIdsJson ? JSON.parse(deletedIdsJson) : []);

                setClients((prevLocal) => {
                  // Filter out any remote or local record that is marked as deleted
                  const validRemoteClients = remoteClients.filter((c) => !deletedIds.has(c.id));

                  // Preserve only pending locally created clients that have not reached Firestore AND are not deleted
                  const pendingUploads = prevLocal.filter(
                    (local) => !remoteMap.has(local.id) && !deletedIds.has(local.id)
                  );

                  // Push pending local records to Firestore in background
                  if (pendingUploads.length > 0 && auth.currentUser) {
                    pendingUploads.forEach((pending) => {
                      setDoc(doc(db, 'clients', pending.id), pending).catch((err) => {
                        console.warn('Sync pending client recovery note:', err);
                      });
                    });
                  }

                  // 2. Merge: remote wins if exists, append pending local
                  return [...validRemoteClients, ...pendingUploads];
                });
              } else {
                // If remote collection is completely empty, do NOT re-upload initial clients if they were deleted!
                const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_clients`);
                const deletedIds = new Set<string>(deletedIdsJson ? JSON.parse(deletedIdsJson) : []);
                setClients((prevLocal) => prevLocal.filter((c) => !deletedIds.has(c.id)));
              }
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.LIST, 'clients');
                setIsFirebasePermissionMissing(true);
              }
              if (unsubClients) {
                try { unsubClients(); } catch (_) {}
                unsubClients = null;
              }
            }
          );
        } catch (err) {
          console.warn('Clients snapshot listener attach error:', err);
        }
      }

      if (!unsubLoans) {
        try {
          unsubLoans = onSnapshot(
            collection(db, 'loans'),
            (snapshot) => {
              setIsFirebasePermissionMissing(false);
              if (!snapshot.empty) {
                const remoteLoans: Loan[] = snapshot.docs.map((d) => d.data() as Loan);
                const remoteMap = new Map<string, Loan>(remoteLoans.map((l) => [l.id, l]));

                // Retrieve set of explicitly deleted loan IDs
                const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_loans`);
                const deletedIds = new Set<string>(deletedIdsJson ? JSON.parse(deletedIdsJson) : []);

                setLoans((prevLocal) => {
                  // Filter out any remote or local record that is marked as deleted
                  const validRemoteLoans = remoteLoans.filter((l) => !deletedIds.has(l.id));

                  // Preserve only pending locally created loans that have not reached Firestore AND are not deleted
                  const pendingLoans = prevLocal.filter(
                    (local) => !remoteMap.has(local.id) && !deletedIds.has(local.id)
                  );

                  if (pendingLoans.length > 0 && auth.currentUser) {
                    pendingLoans.forEach((pending) => {
                      setDoc(doc(db, 'loans', pending.id), pending).catch((err) => {
                        console.warn('Sync pending loan recovery note:', err);
                      });
                    });
                  }

                  // Merge valid remote with pending local
                  return [...validRemoteLoans, ...pendingLoans];
                });
              } else {
                // Remote collection is empty: this is a legitimate state (e.g. all loans deleted)
                const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_loans`);
                const deletedIds = new Set<string>(deletedIdsJson ? JSON.parse(deletedIdsJson) : []);

                setLoans((prevLocal) => {
                  const pendingLoans = prevLocal.filter((l) => !deletedIds.has(l.id));
                  return pendingLoans;
                });
              }

            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.LIST, 'loans');
                setIsFirebasePermissionMissing(true);
              }
              if (unsubLoans) {
                try { unsubLoans(); } catch (_) {}
                unsubLoans = null;
              }
            }
          );
        } catch (err) {
          console.warn('Loans snapshot listener attach error:', err);
        }
      }

      if (!unsubEmployees) {
        try {
          unsubEmployees = onSnapshot(
            collection(db, 'employees'),
            (snapshot) => {
              setIsFirebasePermissionMissing(false);
              if (!snapshot.empty) {
                const remoteEmployees: EmployeeUser[] = snapshot.docs.map((d) => d.data() as EmployeeUser);
                const remoteMap = new Map<string, EmployeeUser>(remoteEmployees.map((e) => [e.id, e]));

                // Retrieve set of explicitly deleted employee IDs
                const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_employees`);
                const deletedIds = new Set<string>(deletedIdsJson ? JSON.parse(deletedIdsJson) : []);

                setEmployees((prevLocal) => {
                  const validRemoteEmployees = remoteEmployees.filter((e) => !deletedIds.has(e.id));
                  const pendingEmployees = prevLocal.filter(
                    (local) => !remoteMap.has(local.id) && !deletedIds.has(local.id)
                  );

                  if (pendingEmployees.length > 0 && auth.currentUser) {
                    pendingEmployees.forEach((pending) => {
                      setDoc(doc(db, 'employees', pending.id), pending).catch(() => {});
                    });
                  }
                  return [...validRemoteEmployees, ...pendingEmployees];
                });
              } else {
                const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_employees`);
                const deletedIds = new Set<string>(deletedIdsJson ? JSON.parse(deletedIdsJson) : []);
                setEmployees((prevLocal) => prevLocal.filter((e) => !deletedIds.has(e.id)));
              }
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.LIST, 'employees');
                setIsFirebasePermissionMissing(true);
              }
              if (unsubEmployees) {
                try { unsubEmployees(); } catch (_) {}
                unsubEmployees = null;
              }
            }
          );
        } catch (err) {
          console.warn('Employees snapshot listener attach error:', err);
        }
      }

      if (!unsubSettings) {
        try {
          unsubSettings = onSnapshot(
            doc(db, 'settings', 'config'),
            (snapshot) => {
              setIsFirebasePermissionMissing(false);
              if (snapshot.exists()) {
                setSettings(snapshot.data() as SystemSettings);
              } else {
                if (auth.currentUser) {
                  setSettings((current) => {
                    setDoc(doc(db, 'settings', 'config'), current).catch(() => {});
                    return current;
                  });
                }
              }
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.GET, 'settings/config');
                setIsFirebasePermissionMissing(true);
              }
              if (unsubSettings) {
                try { unsubSettings(); } catch (_) {}
                unsubSettings = null;
              }
            }
          );
        } catch (err) {
          console.warn('Settings snapshot listener attach error:', err);
        }
      }

      if (!unsubEmployeeNotifs) {
        try {
          unsubEmployeeNotifs = onSnapshot(
            collection(db, 'employee_notifications'),
            (snapshot) => {
              if (!snapshot.empty) {
                const remoteNotifs: EmployeeNotification[] = snapshot.docs.map(
                  (d) => d.data() as EmployeeNotification
                );
                // Sort newest first
                remoteNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setEmployeeNotifications(remoteNotifs);
              }
            },
            (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.LIST, 'employee_notifications');
              }
              if (unsubEmployeeNotifs) {
                try { unsubEmployeeNotifs(); } catch (_) {}
                unsubEmployeeNotifs = null;
              }
            }
          );
        } catch (err) {
          console.warn('Employee notifications snapshot attach note:', err);
        }
      }

    });

    return () => {
      unsubAuth();
      if (unsubClients) unsubClients();
      if (unsubLoans) unsubLoans();
      if (unsubEmployees) unsubEmployees();
      if (unsubSettings) unsubSettings();
      if (unsubEmployeeNotifs) unsubEmployeeNotifs();
    };
  }, [retryCounter]);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_clients`, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_loans`, JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_employee_notifications`, JSON.stringify(employeeNotifications));
  }, [employeeNotifications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Real-time Employee Session & Access Revocation Watcher
  // Enforces requirement 8: "Garantir que uma suspensão bloqueie também sessões já autenticadas, sem depender apenas de um novo login."
  useEffect(() => {
    if (!isAuthenticated || currentUser.role !== 'employee') return;

    const currentEmp = employees.find(
      (e) => e.id === currentUser.id || e.email.toLowerCase() === currentUser.email.toLowerCase()
    );

    if (currentEmp) {
      if (currentEmp.status === 'suspended' || currentEmp.status === 'inactive') {
        setSuspendedSessionAlert({
          title: 'ACESSO SUSPENSO',
          message: 'Seu acesso ao CrediControl foi temporariamente suspenso pelo administrador. No momento, você não poderá utilizar as funcionalidades do sistema.',
          reason: currentEmp.decisionReason,
          type: 'suspended',
        });
        setIsAuthenticated(false);
        localStorage.removeItem(`${STORAGE_KEY}_auth`);
        if (auth.currentUser) {
          auth.signOut().catch(() => {});
        }
      } else if (currentEmp.status === 'denied') {
        setSuspendedSessionAlert({
          title: 'ACESSO NÃO AUTORIZADO',
          message: 'Infelizmente, sua solicitação de acesso ao CrediControl não foi aprovada pelo administrador. Você não possui autorização para acessar o sistema neste momento.',
          reason: currentEmp.decisionReason,
          type: 'denied',
        });
        setIsAuthenticated(false);
        localStorage.removeItem(`${STORAGE_KEY}_auth`);
        if (auth.currentUser) {
          auth.signOut().catch(() => {});
        }
      }
    }
  }, [employees, currentUser, isAuthenticated]);

  // Compute notifications dynamically
  const today = getTodayIso();
  const tomorrow = getDateOffsetIso(1);

  const notifications: NotificationAlert[] = loans
    .map((l) => {
      const summary = getLoanFinancialSummary(l, today, settings.defaultDailyFine);
      if (summary.isPaid) return null;

      if (summary.isOverdue) {
        return {
          id: `notif_${l.id}_overdue`,
          loanId: l.id,
          clientId: l.clientId,
          clientName: l.clientName,
          clientWhatsapp: l.clientWhatsapp,
          type: 'overdue' as const,
          dueDate: l.dueDate,
          amountDue: summary.remainingBalance,
          delayDays: summary.delayDays,
          fineAmount: summary.fineAmount,
          createdAt: today,
        };
      } else if (l.dueDate === today) {
        return {
          id: `notif_${l.id}_today`,
          loanId: l.id,
          clientId: l.clientId,
          clientName: l.clientName,
          clientWhatsapp: l.clientWhatsapp,
          type: 'due_today' as const,
          dueDate: l.dueDate,
          amountDue: summary.remainingBalance,
          delayDays: 0,
          fineAmount: 0,
          createdAt: today,
        };
      } else if (l.dueDate === tomorrow) {
        return {
          id: `notif_${l.id}_tomorrow`,
          loanId: l.id,
          clientId: l.clientId,
          clientName: l.clientName,
          clientWhatsapp: l.clientWhatsapp,
          type: 'due_tomorrow' as const,
          dueDate: l.dueDate,
          amountDue: summary.remainingBalance,
          delayDays: 0,
          fineAmount: 0,
          createdAt: today,
        };
      }
      return null;
    })
    .filter(Boolean) as NotificationAlert[];

  const setCurrentUserRole = (role: 'admin' | 'employee') => {
    const found = INITIAL_USER_PROFILES.find((p) => p.role === role);
    if (found) setCurrentUser(found);
  };

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>): Client => {
    // 1. Input Sanitization & Modulo 11 CPF Validation
    const valResult = validateClient(clientData, clients, false);
    if (!valResult.isValid) {
      alert(valResult.errors.join('\n'));
      throw new Error(valResult.errors.join(' '));
    }
    const newClient: Client = valResult.sanitizedData!;

    setClients((prev) => [newClient, ...prev]);
    if (db && auth.currentUser) {
      setDoc(doc(db, 'clients', newClient.id), newClient).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `clients/${newClient.id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbSet(rtdbRef(rtdb, `clients/${newClient.id}`), newClient).catch(() => {});
      } catch {}
    }

    // 2. Audit Trail
    logAuditEvent(currentUser, 'CREATE_CLIENT', 'client', newClient.id, {
      fullName: newClient.fullName,
      cpf: newClient.cpf,
      phone: newClient.phone,
    });

    return newClient;
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    const target = clients.find((c) => c.id === id);
    if (!target) return;

    // Validate updated data
    const valResult = validateClient({ ...target, ...clientData, id }, clients, true);
    if (!valResult.isValid) {
      alert(valResult.errors.join('\n'));
      return;
    }
    const sanitized = valResult.sanitizedData!;

    setClients((prev) => {
      const updated = prev.map((c) => (c.id === id ? sanitized : c));
      if (db && auth.currentUser) {
        setDoc(doc(db, 'clients', id), sanitized).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, `clients/${id}`)
        );
      }
      if (rtdb) {
        try {
          rtdbSet(rtdbRef(rtdb, `clients/${id}`), sanitized).catch(() => {});
        } catch {}
      }
      return updated;
    });

    if (selectedClientDetail && selectedClientDetail.id === id) {
      setSelectedClientDetail(sanitized);
    }

    // Audit Trail
    logAuditEvent(currentUser, 'UPDATE_CLIENT', 'client', id, {
      fullName: sanitized.fullName,
      updatedFields: Object.keys(clientData),
    });
  };

  const deleteClient = (id: string) => {
    // Role Authorization Check (Principle of Least Privilege)
    if (currentUser.role !== 'admin') {
      alert('Operação bloqueada: Apenas administradores têm autorização para excluir clientes.');
      return;
    }

    const target = clients.find((c) => c.id === id);

    // Record in deleted tombstones to prevent snapshot or recovery resurrection
    try {
      const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_clients`);
      const deletedIds: string[] = deletedIdsJson ? JSON.parse(deletedIdsJson) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem(`${STORAGE_KEY}_deleted_clients`, JSON.stringify(deletedIds));
      }
    } catch {}

    setClients((prev) => prev.filter((c) => c.id !== id));
    if (db && auth.currentUser) {
      deleteDoc(doc(db, 'clients', id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, `clients/${id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbRemove(rtdbRef(rtdb, `clients/${id}`)).catch(() => {});
      } catch {}
    }
    setLoans((prev) => {
      const remaining = prev.filter((l) => l.clientId !== id);
      const deleted = prev.filter((l) => l.clientId === id);
      deleted.forEach((l) => {
        try {
          const deletedLoansJson = localStorage.getItem(`${STORAGE_KEY}_deleted_loans`);
          const deletedLoanIds: string[] = deletedLoansJson ? JSON.parse(deletedLoansJson) : [];
          if (!deletedLoanIds.includes(l.id)) {
            deletedLoanIds.push(l.id);
            localStorage.setItem(`${STORAGE_KEY}_deleted_loans`, JSON.stringify(deletedLoanIds));
          }
        } catch {}

        if (db && auth.currentUser) {
          deleteDoc(doc(db, 'loans', l.id)).catch((err) =>
            handleFirestoreError(err, OperationType.DELETE, `loans/${l.id}`)
          );
        }
        if (rtdb) {
          try {
            rtdbRemove(rtdbRef(rtdb, `loans/${l.id}`)).catch(() => {});
          } catch {}
        }
      });
      return remaining;
    });
    if (selectedClientDetail?.id === id) setSelectedClientDetail(null);

    // Audit Trail
    logAuditEvent(currentUser, 'DELETE_CLIENT', 'client', id, {
      deletedClientName: target?.fullName,
      cpf: target?.cpf,
    });
  };

  const addLoan = (loanData: Omit<Loan, 'id' | 'createdAt' | 'payments'>): Loan => {
    // Financial & Foreign Key Validation
    const valResult = validateLoan(loanData, clients);
    if (!valResult.isValid) {
      alert(valResult.errors.join('\n'));
      throw new Error(valResult.errors.join(' '));
    }
    const newLoan: Loan = valResult.sanitizedData!;

    setLoans((prev) => [newLoan, ...prev]);
    if (db && auth.currentUser) {
      setDoc(doc(db, 'loans', newLoan.id), newLoan).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `loans/${newLoan.id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbSet(rtdbRef(rtdb, `loans/${newLoan.id}`), newLoan).catch(() => {});
      } catch {}
    }

    // Audit Trail
    logAuditEvent(currentUser, 'CREATE_LOAN', 'loan', newLoan.id, {
      clientId: newLoan.clientId,
      clientName: newLoan.clientName,
      principalAmount: newLoan.principalAmount,
      interestRatePercent: newLoan.interestRatePercent,
      totalOriginalAmount: newLoan.totalOriginalAmount,
      dueDate: newLoan.dueDate,
    });

    return newLoan;
  };

  const updateLoan = (id: string, loanData: Partial<Loan>) => {
    setLoans((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, ...loanData } : l));
      const target = updated.find((l) => l.id === id);
      if (target) {
        if (db && auth.currentUser) {
          setDoc(doc(db, 'loans', id), target).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `loans/${id}`)
          );
        }
        if (rtdb) {
          try {
            rtdbSet(rtdbRef(rtdb, `loans/${id}`), target).catch(() => {});
          } catch {}
        }
      }
      return updated;
    });
    if (selectedLoanDetail && selectedLoanDetail.id === id) {
      setSelectedLoanDetail((prev) => (prev ? { ...prev, ...loanData } : null));
    }

    // Audit Trail
    logAuditEvent(currentUser, 'UPDATE_LOAN', 'loan', id, {
      updatedFields: Object.keys(loanData),
    });
  };

  const deleteLoan = (id: string) => {
    // Role Authorization Check (Principle of Least Privilege)
    if (currentUser.role !== 'admin') {
      alert('Operação bloqueada: Apenas administradores têm autorização para excluir empréstimos.');
      return;
    }

    const target = loans.find((l) => l.id === id);

    // 1. Permanently register ID as deleted to prevent resurrection from snapshots or offline caches
    try {
      const deletedJson = localStorage.getItem(`${STORAGE_KEY}_deleted_loans`);
      const deletedArr: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      if (!deletedArr.includes(id)) {
        deletedArr.push(id);
        localStorage.setItem(`${STORAGE_KEY}_deleted_loans`, JSON.stringify(deletedArr));
      }
    } catch (e) {
      console.warn('Error saving deleted loan id:', e);
    }

    // 2. Immediately update state and localStorage
    setLoans((prev) => {
      const nextLoans = prev.filter((l) => l.id !== id);
      try {
        localStorage.setItem(`${STORAGE_KEY}_loans`, JSON.stringify(nextLoans));
      } catch {}
      return nextLoans;
    });

    // 3. Remove from Cloud Firestore
    if (db && auth.currentUser) {
      deleteDoc(doc(db, 'loans', id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, `loans/${id}`)
      );
    }

    // 4. Remove from Realtime Database if connected
    if (rtdb) {
      try {
        rtdbRemove(rtdbRef(rtdb, `loans/${id}`)).catch(() => {});
      } catch {}
    }

    if (selectedLoanDetail?.id === id) setSelectedLoanDetail(null);

    // 5. Audit Trail
    logAuditEvent(currentUser, 'DELETE_LOAN', 'loan', id, {
      clientName: target?.clientName,
      principalAmount: target?.principalAmount,
    });
  };


  const registerPayment = (
    loanId: string,
    amount: number,
    paymentMethod: 'pix' | 'dinheiro' | 'transferencia' | 'cartao',
    note?: string
  ): PaymentRecord | null => {
    const targetLoan = loans.find((l) => l.id === loanId);
    if (!targetLoan) return null;

    // Financial Validation: prevent overpayment, negative amounts, invalid state
    const existingPayments = targetLoan.payments || [];
    const totalPaidSoFar = existingPayments.reduce((s, p) => s + p.amount, 0);
    const remainingDue = Math.max(0, targetLoan.totalOriginalAmount - totalPaidSoFar);

    const valResult = validatePayment(targetLoan, amount, paymentMethod, remainingDue);
    if (!valResult.isValid) {
      alert(valResult.errors.join('\n'));
      return null;
    }

    const safeAmount = valResult.sanitizedData!.amount;
    const safeMethod = valResult.sanitizedData!.paymentMethod;

    // ACID Atomic Transaction on Firestore (prevents race conditions)
    executeAtomicPayment(loanId, safeAmount, safeMethod, currentUser, targetLoan, note).then((res) => {
      if (res.success && res.updatedLoan) {
        setLoans((prev) => prev.map((l) => (l.id === loanId ? res.updatedLoan! : l)));
        if (selectedLoanDetail && selectedLoanDetail.id === loanId) {
          setSelectedLoanDetail(res.updatedLoan);
        }
      }
    });

    // Optimistic Local State Update
    const paymentId = `pay_${Date.now()}`;
    const newPayment: PaymentRecord = {
      id: paymentId,
      loanId,
      amount: safeAmount,
      date: getTodayIso(),
      paymentMethod: safeMethod,
      note,
      registeredBy: currentUser.name,
    };

    const updatedPayments = [...existingPayments, newPayment];
    const totalPaidNow = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const newStatus = totalPaidNow >= targetLoan.totalOriginalAmount - 0.05 ? 'quitado' : targetLoan.status;

    const updatedInstallments = targetLoan.installments.map((inst) => {
      if (inst.status !== 'paga') {
        return {
          ...inst,
          paidAmount: inst.amount,
          paidDate: getTodayIso(),
          status: 'paga' as const,
        };
      }
      return inst;
    });

    const updatedLoan: Loan = {
      ...targetLoan,
      payments: updatedPayments,
      installments: updatedInstallments,
      status: newStatus,
    };

    setLoans((prev) => prev.map((l) => (l.id === loanId ? updatedLoan : l)));
    if (selectedLoanDetail && selectedLoanDetail.id === loanId) {
      setSelectedLoanDetail(updatedLoan);
    }

    return newPayment;
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    // Role Authorization Check
    if (currentUser.role !== 'admin') {
      alert('Operação bloqueada: Apenas administradores têm autorização para alterar as configurações do sistema.');
      return;
    }

    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (db && auth.currentUser) {
        setDoc(doc(db, 'settings', 'config'), updated).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, 'settings/config')
        );
      }
      if (rtdb) {
        try {
          rtdbSet(rtdbRef(rtdb, 'settings'), updated).catch(() => {});
        } catch {}
      }
      return updated;
    });

    // Audit Trail
    logAuditEvent(currentUser, 'UPDATE_SETTINGS', 'settings', 'config', {
      changedKeys: Object.keys(newSettings),
    });
  };

  // Employee Management (Controlled strictly by Admin)
  const addEmployee = (
    employeeData: Omit<EmployeeUser, 'id' | 'createdAt' | 'createdByName'>
  ): EmployeeUser => {
    if (currentUser.role !== 'admin') {
      alert('Apenas administradores podem cadastrar funcionários.');
      throw new Error('Operação não autorizada');
    }

    const newEmployee: EmployeeUser = {
      ...employeeData,
      id: `emp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdByName: currentUser.name || 'Edinelson (Admin)',
    };

    setEmployees((prev) => [newEmployee, ...prev]);

    if (db && auth.currentUser) {
      setDoc(doc(db, 'employees', newEmployee.id), newEmployee).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employees/${newEmployee.id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbSet(rtdbRef(rtdb, `employees/${newEmployee.id}`), newEmployee).catch(() => {});
      } catch {}
    }

    // Audit Trail (scrubbing sensitive password automatically)
    logAuditEvent(currentUser, 'CREATE_EMPLOYEE', 'employee', newEmployee.id, {
      name: newEmployee.name,
      email: newEmployee.email,
      roleTitle: newEmployee.roleTitle,
    });

    return newEmployee;
  };

  const updateEmployee = (id: string, employeeData: Partial<EmployeeUser>) => {
    if (currentUser.role !== 'admin') {
      alert('Apenas administradores podem atualizar funcionários.');
      return;
    }

    setEmployees((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...employeeData } : e));
      const target = updated.find((e) => e.id === id);
      if (target) {
        if (db && auth.currentUser) {
          setDoc(doc(db, 'employees', id), target).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `employees/${id}`)
          );
        }
        if (rtdb) {
          try {
            rtdbSet(rtdbRef(rtdb, `employees/${id}`), target).catch(() => {});
          } catch {}
        }
      }
      return updated;
    });

    logAuditEvent(currentUser, 'UPDATE_EMPLOYEE', 'employee', id, {
      updatedFields: Object.keys(employeeData),
    });
  };

  const deleteEmployee = (id: string) => {
    if (currentUser.role !== 'admin') {
      alert('Apenas administradores podem excluir funcionários.');
      return;
    }

    const target = employees.find((e) => e.id === id);

    // Record in deleted tombstones to prevent snapshot or recovery resurrection
    try {
      const deletedIdsJson = localStorage.getItem(`${STORAGE_KEY}_deleted_employees`);
      const deletedIds: string[] = deletedIdsJson ? JSON.parse(deletedIdsJson) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem(`${STORAGE_KEY}_deleted_employees`, JSON.stringify(deletedIds));
      }
    } catch {}

    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (db && auth.currentUser) {
      deleteDoc(doc(db, 'employees', id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, `employees/${id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbRemove(rtdbRef(rtdb, `employees/${id}`)).catch(() => {});
      } catch {}
    }

    logAuditEvent(currentUser, 'DELETE_EMPLOYEE', 'employee', id, {
      deletedEmployeeName: target?.name,
      email: target?.email,
    });
  };

  const toggleEmployeeStatus = (id: string) => {
    if (currentUser.role !== 'admin') {
      alert('Apenas administradores podem ativar/desativar funcionários.');
      return;
    }

    setEmployees((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          return { ...e, status: e.status === 'active' ? ('inactive' as const) : ('active' as const) };
        }
        return e;
      });
      const target = updated.find((e) => e.id === id);
      if (target) {
        if (db && auth.currentUser) {
          setDoc(doc(db, 'employees', id), target).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `employees/${id}`)
          );
        }
        if (rtdb) {
          try {
            rtdbSet(rtdbRef(rtdb, `employees/${id}`), target).catch(() => {});
          } catch {}
        }
      }
      return updated;
    });
  };

  // Register Employee Application (Self-Registration via Email/Password or Google)
  const registerEmployeeApplication = async (data: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    address?: string;
    city?: string;
    birthDate?: string;
    avatarUrl?: string;
    registrationMethod: 'google' | 'email_password';
    password?: string;
  }): Promise<{ success: boolean; employee: EmployeeUser; message: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    // Check if employee already exists to avoid duplicates
    const existing = employees.find((e) => e.email.trim().toLowerCase() === cleanEmail);
    if (existing) {
      return {
        success: false,
        employee: existing,
        message: `Já existe um cadastro com o e-mail "${cleanEmail}". Situação atual: ${existing.status.toUpperCase()}.`,
      };
    }

    const newEmp: EmployeeUser = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: cleanEmail,
      phone: data.phone?.trim() || 'Não informado',
      cpf: data.cpf?.trim() || 'Não informado',
      address: data.address?.trim() || 'Não informado',
      city: data.city?.trim() || 'Não informado',
      birthDate: data.birthDate?.trim() || 'Não informado',
      avatarUrl:
        data.avatarUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      registrationMethod: data.registrationMethod,
      password: data.password ? data.password.trim() : undefined,
      role: 'employee',
      roleTitle: 'Colaborador',
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdByName: 'Auto-cadastro (' + (data.registrationMethod === 'google' ? 'Google' : 'E-mail/Senha') + ')',
    };

    setEmployees((prev) => [newEmp, ...prev]);

    if (db) {
      setDoc(doc(db, 'employees', newEmp.id), newEmp).catch((err) => {
        console.warn('Firestore employee registration note:', err);
      });
    }

    logAuditEvent(
      { id: newEmp.id, name: newEmp.name, email: newEmp.email, role: 'employee' },
      'EMPLOYEE_REGISTER',
      'employee',
      newEmp.id,
      {
        name: newEmp.name,
        email: newEmp.email,
        method: data.registrationMethod,
        status: 'pending',
      }
    );

    return {
      success: true,
      employee: newEmp,
      message:
        'Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá uma notificação assim que houver uma decisão.',
    };
  };

  // Administrator Action: A) PERMITIR ACESSO
  const approveEmployee = async (id: string) => {
    if (currentUser.role !== 'admin') {
      alert('Apenas o Administrador pode aprovar cadastros.');
      return;
    }

    const target = employees.find((e) => e.id === id);
    if (!target) return;

    const previousStatus = target.status;
    const nowIso = new Date().toISOString();
    const decidedByStr = `${currentUser.name} (${currentUser.email})`;

    const updatedEmployee: EmployeeUser = {
      ...target,
      status: 'approved',
      decidedBy: decidedByStr,
      decidedAt: nowIso,
      decisionReason: undefined,
    };

    setEmployees((prev) => prev.map((e) => (e.id === id ? updatedEmployee : e)));

    if (db && auth.currentUser) {
      setDoc(doc(db, 'employees', id), updatedEmployee).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employees/${id}`)
      );
    }

    // Automatic notification for employee
    const notif: EmployeeNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: target.id,
      employeeEmail: target.email,
      title: 'ACESSO APROVADO!',
      message:
        'Parabéns! Seu cadastro no CrediControl foi aprovado pelo administrador. Seu acesso ao sistema foi liberado. Agora você já pode entrar e utilizar as funcionalidades disponíveis para o seu perfil.',
      type: 'approval',
      createdAt: nowIso,
      read: false,
      actionLabel: 'ENTRAR NO SISTEMA',
    };

    setEmployeeNotifications((prev) => [notif, ...prev]);

    if (db && auth.currentUser) {
      setDoc(doc(db, 'employee_notifications', notif.id), notif).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employee_notifications/${notif.id}`)
      );
    }

    logAuditEvent(currentUser, 'EMPLOYEE_APPROVED', 'employee', id, {
      employeeName: target.name,
      employeeEmail: target.email,
      previousStatus,
      newStatus: 'approved',
      admin: decidedByStr,
    });
  };

  // Administrator Action: B) NEGAR ACESSO
  const denyEmployee = async (id: string, reason?: string) => {
    if (currentUser.role !== 'admin') {
      alert('Apenas o Administrador pode negar acessos.');
      return;
    }

    const target = employees.find((e) => e.id === id);
    if (!target) return;

    const previousStatus = target.status;
    const nowIso = new Date().toISOString();
    const decidedByStr = `${currentUser.name} (${currentUser.email})`;
    const cleanReason = reason?.trim() || '';

    const updatedEmployee: EmployeeUser = {
      ...target,
      status: 'denied',
      decidedBy: decidedByStr,
      decidedAt: nowIso,
      decisionReason: cleanReason || undefined,
    };

    setEmployees((prev) => prev.map((e) => (e.id === id ? updatedEmployee : e)));

    if (db && auth.currentUser) {
      setDoc(doc(db, 'employees', id), updatedEmployee).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employees/${id}`)
      );
    }

    // Automatic notification for employee
    const notif: EmployeeNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: target.id,
      employeeEmail: target.email,
      title: 'ACESSO NÃO AUTORIZADO',
      message:
        'Infelizmente, sua solicitação de acesso ao CrediControl não foi aprovada pelo administrador. Você não possui autorização para acessar o sistema neste momento.',
      reason: cleanReason || undefined,
      type: 'rejection',
      createdAt: nowIso,
      read: false,
    };

    setEmployeeNotifications((prev) => [notif, ...prev]);

    if (db && auth.currentUser) {
      setDoc(doc(db, 'employee_notifications', notif.id), notif).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employee_notifications/${notif.id}`)
      );
    }

    logAuditEvent(currentUser, 'EMPLOYEE_DENIED', 'employee', id, {
      employeeName: target.name,
      employeeEmail: target.email,
      previousStatus,
      newStatus: 'denied',
      reason: cleanReason,
      admin: decidedByStr,
    });
  };

  // Administrator Action: C) SUSPENDER ACESSO
  const suspendEmployee = async (id: string, reason?: string) => {
    if (currentUser.role !== 'admin') {
      alert('Apenas o Administrador pode suspender acessos.');
      return;
    }

    const target = employees.find((e) => e.id === id);
    if (!target) return;

    const previousStatus = target.status;
    const nowIso = new Date().toISOString();
    const decidedByStr = `${currentUser.name} (${currentUser.email})`;
    const cleanReason = reason?.trim() || '';

    const updatedEmployee: EmployeeUser = {
      ...target,
      status: 'suspended',
      decidedBy: decidedByStr,
      decidedAt: nowIso,
      decisionReason: cleanReason || undefined,
    };

    setEmployees((prev) => prev.map((e) => (e.id === id ? updatedEmployee : e)));

    if (db && auth.currentUser) {
      setDoc(doc(db, 'employees', id), updatedEmployee).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employees/${id}`)
      );
    }

    // Automatic notification for employee
    const notif: EmployeeNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: target.id,
      employeeEmail: target.email,
      title: 'ACESSO SUSPENSO',
      message:
        'Seu acesso ao CrediControl foi temporariamente suspenso pelo administrador. No momento, você não poderá utilizar as funcionalidades do sistema.',
      reason: cleanReason || undefined,
      type: 'suspension',
      createdAt: nowIso,
      read: false,
    };

    setEmployeeNotifications((prev) => [notif, ...prev]);

    if (db && auth.currentUser) {
      setDoc(doc(db, 'employee_notifications', notif.id), notif).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employee_notifications/${notif.id}`)
      );
    }

    logAuditEvent(currentUser, 'EMPLOYEE_SUSPENDED', 'employee', id, {
      employeeName: target.name,
      employeeEmail: target.email,
      previousStatus,
      newStatus: 'suspended',
      reason: cleanReason,
      admin: decidedByStr,
    });
  };

  const markNotificationAsRead = async (id: string) => {
    setEmployeeNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (db && auth.currentUser) {
      setDoc(doc(db, 'employee_notifications', id), { read: true }, { merge: true }).catch(() => {});
    }
  };

  const markAllNotificationsAsRead = async () => {
    setEmployeeNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (db && auth.currentUser) {
      employeeNotifications.forEach((n) => {
        if (!n.read) {
          setDoc(doc(db, 'employee_notifications', n.id), { read: true }, { merge: true }).catch(() => {});
        }
      });
    }
  };

  const authenticateEmployee = (
    inputEmail: string,
    inputPassword: string
  ): { success: boolean; message?: string; user?: UserProfile; employee?: EmployeeUser } => {
    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanPass = inputPassword.trim();

    const employee = employees.find((e) => e.email.trim().toLowerCase() === cleanEmail);

    if (!employee) {
      return {
        success: false,
        message: 'Acesso não localizado: Este e-mail não possui cadastro no CrediControl. Solicite seu cadastro ou cadastre-se para aprovação.',
      };
    }

    if (employee.status === 'pending') {
      return {
        success: false,
        message: 'PENDING',
        employee,
      };
    }

    if (employee.status === 'denied') {
      return {
        success: false,
        message: 'DENIED',
        employee,
      };
    }

    if (employee.status === 'suspended' || employee.status === 'inactive') {
      return {
        success: false,
        message: 'SUSPENDED',
        employee,
      };
    }

    // Only approved/active status reaches password verification
    if (employee.password && employee.password !== cleanPass) {
      return {
        success: false,
        message: 'Senha incorreta para este funcionário.',
        employee,
      };
    }

    const userProfile: UserProfile = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: 'employee',
      avatarUrl:
        employee.avatarUrl ||
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      roleTitle: employee.roleTitle,
    };

    return {
      success: true,
      user: userProfile,
      employee,
    };
  };

  const isEmployeeEmailAllowed = (
    emailToCheck: string
  ): { allowed: boolean; employee?: EmployeeUser; message?: string } => {
    const cleanEmail = emailToCheck.trim().toLowerCase();
    const employee = employees.find((e) => e.email.trim().toLowerCase() === cleanEmail);

    if (!employee) {
      return {
        allowed: false,
        message: 'NOT_FOUND',
      };
    }

    if (employee.status === 'pending') {
      return {
        allowed: false,
        employee,
        message: 'PENDING',
      };
    }

    if (employee.status === 'denied') {
      return {
        allowed: false,
        employee,
        message: 'DENIED',
      };
    }

    if (employee.status === 'suspended' || employee.status === 'inactive') {
      return {
        allowed: false,
        employee,
        message: 'SUSPENDED',
      };
    }

    return { allowed: true, employee };
  };

  const resetToSampleData = () => {
    setClients(INITIAL_CLIENTS);
    setLoans(INITIAL_LOANS);
    setSettings(INITIAL_SETTINGS);
    setEmployees(INITIAL_EMPLOYEES);
    localStorage.removeItem(`${STORAGE_KEY}_clients`);
    localStorage.removeItem(`${STORAGE_KEY}_loans`);
    localStorage.removeItem(`${STORAGE_KEY}_settings`);
    localStorage.removeItem(`${STORAGE_KEY}_employees`);
    localStorage.removeItem(`${STORAGE_KEY}_deleted_loans`);

    if (db) {

      INITIAL_CLIENTS.forEach((c) => setDoc(doc(db, 'clients', c.id), c).catch(() => {}));
      INITIAL_LOANS.forEach((l) => setDoc(doc(db, 'loans', l.id), l).catch(() => {}));
      INITIAL_EMPLOYEES.forEach((e) => setDoc(doc(db, 'employees', e.id), e).catch(() => {}));
      setDoc(doc(db, 'settings', 'config'), INITIAL_SETTINGS).catch(() => {});
    }

    logAuditEvent(currentUser, 'UPDATE_SETTINGS', 'settings', 'config', {
      action: 'RESET_SAMPLE_DATA',
    });
  };

  const downloadBackup = async () => {
    await generateDatabaseBackup(clients, loans, employees, settings, currentUser, auditLogs);
  };

  const restoreBackupFromFile = async (fileContent: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Operação não autorizada: Apenas administradores podem restaurar backups.' };
    }

    const val = validateBackupFile(fileContent);
    if (!val.valid || !val.data) {
      return { success: false, message: val.error || 'Arquivo de backup corrompido ou inválido.' };
    }

    const backup = val.data;

    // Apply restored state
    setClients(backup.clients);
    setLoans(backup.loans);
    localStorage.removeItem(`${STORAGE_KEY}_deleted_loans`);
    if (backup.settings) setSettings(backup.settings);

    if (backup.employees && backup.employees.length > 0) setEmployees(backup.employees);

    // Sync to Firestore
    if (db) {
      backup.clients.forEach((c) => setDoc(doc(db, 'clients', c.id), c).catch(() => {}));
      backup.loans.forEach((l) => setDoc(doc(db, 'loans', l.id), l).catch(() => {}));
      if (backup.settings) setDoc(doc(db, 'settings', 'config'), backup.settings).catch(() => {});
      if (backup.employees) {
        backup.employees.forEach((e) => setDoc(doc(db, 'employees', e.id), e).catch(() => {}));
      }
    }

    await logAuditEvent(currentUser, 'DATABASE_RESTORE', 'backup', `restore_${Date.now()}`, {
      restoredClients: backup.clients.length,
      restoredLoans: backup.loans.length,
      backupExportedAt: backup.metadata.exportedAt,
      backupExportedBy: backup.metadata.exportedBy,
    });

    return {
      success: true,
      message: `Restauração concluída com sucesso! ${backup.clients.length} clientes e ${backup.loans.length} contratos recuperados.`,
    };
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        loans,
        settings,
        currentUser,
        isAuthenticated,
        setIsAuthenticated,
        loginWithCustomUser,
        logout,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        filterStatus,
        setFilterStatus,
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
        setActiveLoanForPayment,
        setCurrentUserRole,
        toggleTheme,
        addClient,
        updateClient,
        deleteClient,
        addLoan,
        updateLoan,
        deleteLoan,
        registerPayment,
        updateSettings,
        resetToSampleData,
        employees,
        employeeNotifications,
        addEmployee,
        registerEmployeeApplication,
        approveEmployee,
        denyEmployee,
        suspendEmployee,
        updateEmployee,
        deleteEmployee,
        toggleEmployeeStatus,
        authenticateEmployee,
        isEmployeeEmailAllowed,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        suspendedSessionAlert,
        clearSuspendedSessionAlert,
        notifications,
        isFirebasePermissionMissing: isFirebasePermissionMissing && !isWarningDismissed,
        dismissFirebaseWarning,
        retryFirebaseConnection,

        auditLogs,
        downloadBackup,
        restoreBackupFromFile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
