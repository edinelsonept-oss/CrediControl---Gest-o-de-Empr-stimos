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
  FilterStatus,
  PaymentRecord,
  NotificationAlert,
} from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_LOANS,
  INITIAL_SETTINGS,
  INITIAL_USER_PROFILES,
  INITIAL_EMPLOYEES,
} from '../data/initialData';
import { getTodayIso, getDateOffsetIso, getLoanFinancialSummary } from '../utils/calculations';

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

  // Employees Management (Created and controlled by Admin)
  employees: EmployeeUser[];
  addEmployee: (employeeData: Omit<EmployeeUser, 'id' | 'createdAt' | 'createdByName'>) => EmployeeUser;
  updateEmployee: (id: string, employeeData: Partial<EmployeeUser>) => void;
  deleteEmployee: (id: string) => void;
  toggleEmployeeStatus: (id: string) => void;
  authenticateEmployee: (email: string, password: string) => { success: boolean; message?: string; user?: UserProfile };
  isEmployeeEmailAllowed: (email: string) => { allowed: boolean; employee?: EmployeeUser; message?: string };

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
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
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

  const loginWithCustomUser = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(user));
    localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(`${STORAGE_KEY}_auth`);
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

  const [isFirebasePermissionMissing, setIsFirebasePermissionMissing] = useState<boolean>(false);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const dismissFirebaseWarning = () => {
    setIsFirebasePermissionMissing(false);
  };

  const retryFirebaseConnection = () => {
    clearPermissionError();
    setIsFirebasePermissionMissing(false);
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

    // 2. Cloud Firestore listeners (with auth state check)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.warn('Anonymous auth signin note:', err);
        });
        return;
      }

      if (!db) {
        return;
      }

      // User authenticated, attach listeners
      if (!unsubClients) {
        try {
          unsubClients = onSnapshot(
            collection(db, 'clients'),
            (snapshot) => {
              if (!snapshot.empty) {
                const loadedClients: Client[] = snapshot.docs.map((d) => d.data() as Client);
                setClients(loadedClients);
                setIsFirebasePermissionMissing(false);
              }
            },
            (error) => {
              handleFirestoreError(error, OperationType.LIST, 'clients');
              setIsFirebasePermissionMissing(true);
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
              if (!snapshot.empty) {
                const loadedLoans: Loan[] = snapshot.docs.map((d) => d.data() as Loan);
                setLoans(loadedLoans);
                setIsFirebasePermissionMissing(false);
              }
            },
            (error) => {
              handleFirestoreError(error, OperationType.LIST, 'loans');
              setIsFirebasePermissionMissing(true);
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
              if (!snapshot.empty) {
                const loadedEmployees: EmployeeUser[] = snapshot.docs.map((d) => d.data() as EmployeeUser);
                setEmployees(loadedEmployees);
                setIsFirebasePermissionMissing(false);
              }
            },
            (error) => {
              handleFirestoreError(error, OperationType.LIST, 'employees');
              setIsFirebasePermissionMissing(true);
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
              if (snapshot.exists()) {
                setSettings(snapshot.data() as SystemSettings);
                setIsFirebasePermissionMissing(false);
              }
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, 'settings/config');
              setIsFirebasePermissionMissing(true);
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
    });

    return () => {
      unsubAuth();
      if (unsubClients) unsubClients();
      if (unsubLoans) unsubLoans();
      if (unsubEmployees) unsubEmployees();
      if (unsubSettings) unsubSettings();
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
    localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

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
    const newClient: Client = {
      ...clientData,
      id: `cli_${Date.now()}`,
      createdAt: getTodayIso(),
    };
    setClients((prev) => [newClient, ...prev]);
    if (db) {
      setDoc(doc(db, 'clients', newClient.id), newClient).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `clients/${newClient.id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbSet(rtdbRef(rtdb, `clients/${newClient.id}`), newClient).catch(() => {});
      } catch {}
    }
    return newClient;
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    setClients((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...clientData } : c));
      const target = updated.find((c) => c.id === id);
      if (target) {
        if (db) {
          setDoc(doc(db, 'clients', id), target).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `clients/${id}`)
          );
        }
        if (rtdb) {
          try {
            rtdbSet(rtdbRef(rtdb, `clients/${id}`), target).catch(() => {});
          } catch {}
        }
      }
      return updated;
    });
    if (selectedClientDetail && selectedClientDetail.id === id) {
      setSelectedClientDetail((prev) => (prev ? { ...prev, ...clientData } : null));
    }
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (db) {
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
        if (db) {
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
  };

  const addLoan = (loanData: Omit<Loan, 'id' | 'createdAt' | 'payments'>): Loan => {
    const newLoan: Loan = {
      ...loanData,
      id: `loan_${Date.now()}`,
      payments: [],
      createdAt: getTodayIso(),
    };
    setLoans((prev) => [newLoan, ...prev]);
    if (db) {
      setDoc(doc(db, 'loans', newLoan.id), newLoan).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `loans/${newLoan.id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbSet(rtdbRef(rtdb, `loans/${newLoan.id}`), newLoan).catch(() => {});
      } catch {}
    }
    return newLoan;
  };

  const updateLoan = (id: string, loanData: Partial<Loan>) => {
    setLoans((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, ...loanData } : l));
      const target = updated.find((l) => l.id === id);
      if (target) {
        if (db) {
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
  };

  const deleteLoan = (id: string) => {
    setLoans((prev) => prev.filter((l) => l.id !== id));
    if (db) {
      deleteDoc(doc(db, 'loans', id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, `loans/${id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbRemove(rtdbRef(rtdb, `loans/${id}`)).catch(() => {});
      } catch {}
    }
    if (selectedLoanDetail?.id === id) setSelectedLoanDetail(null);
  };

  const registerPayment = (
    loanId: string,
    amount: number,
    paymentMethod: 'pix' | 'dinheiro' | 'transferencia' | 'cartao',
    note?: string
  ): PaymentRecord | null => {
    const targetLoan = loans.find((l) => l.id === loanId);
    if (!targetLoan) return null;

    const newPayment: PaymentRecord = {
      id: `pay_${Date.now()}`,
      loanId,
      amount,
      date: getTodayIso(),
      paymentMethod,
      note,
      registeredBy: currentUser.name,
    };

    const updatedPayments = [...(targetLoan.payments || []), newPayment];
    const totalPaidNow = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus = targetLoan.status;
    if (totalPaidNow >= targetLoan.totalOriginalAmount) {
      newStatus = 'quitado';
    }

    // Update installments if applicable
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
    if (db) {
      setDoc(doc(db, 'loans', loanId), updatedLoan).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `loans/${loanId}`)
      );
    }
    if (rtdb) {
      try {
        rtdbSet(rtdbRef(rtdb, `loans/${loanId}`), updatedLoan).catch(() => {});
      } catch {}
    }
    if (selectedLoanDetail && selectedLoanDetail.id === loanId) {
      setSelectedLoanDetail(updatedLoan);
    }

    return newPayment;
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (db) {
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
  };

  // Employee Management (Created by Admin)
  const addEmployee = (
    employeeData: Omit<EmployeeUser, 'id' | 'createdAt' | 'createdByName'>
  ): EmployeeUser => {
    const newEmployee: EmployeeUser = {
      ...employeeData,
      id: `emp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdByName: currentUser.name || 'Edinelson (Admin)',
    };

    setEmployees((prev) => [newEmployee, ...prev]);

    if (db) {
      setDoc(doc(db, 'employees', newEmployee.id), newEmployee).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `employees/${newEmployee.id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbSet(rtdbRef(rtdb, `employees/${newEmployee.id}`), newEmployee).catch(() => {});
      } catch {}
    }

    return newEmployee;
  };

  const updateEmployee = (id: string, employeeData: Partial<EmployeeUser>) => {
    setEmployees((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...employeeData } : e));
      const target = updated.find((e) => e.id === id);
      if (target) {
        if (db) {
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

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (db) {
      deleteDoc(doc(db, 'employees', id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, `employees/${id}`)
      );
    }
    if (rtdb) {
      try {
        rtdbRemove(rtdbRef(rtdb, `employees/${id}`)).catch(() => {});
      } catch {}
    }
  };

  const toggleEmployeeStatus = (id: string) => {
    setEmployees((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          return { ...e, status: e.status === 'active' ? ('inactive' as const) : ('active' as const) };
        }
        return e;
      });
      const target = updated.find((e) => e.id === id);
      if (target) {
        if (db) {
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

  const authenticateEmployee = (
    inputEmail: string,
    inputPassword: string
  ): { success: boolean; message?: string; user?: UserProfile } => {
    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanPass = inputPassword.trim();

    const employee = employees.find((e) => e.email.trim().toLowerCase() === cleanEmail);

    if (!employee) {
      return {
        success: false,
        message: 'Acesso negado: Este e-mail de funcionário não foi cadastrado pelo administrador. Solicite que o administrador crie seu login no sistema.',
      };
    }

    if (employee.status === 'inactive') {
      return {
        success: false,
        message: 'Acesso bloqueado: Este usuário de funcionário está inativo ou foi desativado pelo administrador.',
      };
    }

    if (employee.password !== cleanPass) {
      return {
        success: false,
        message: 'Senha incorreta para este funcionário.',
      };
    }

    const userProfile: UserProfile = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: 'employee',
      avatarUrl: employee.avatarUrl || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      roleTitle: employee.roleTitle,
    };

    return {
      success: true,
      user: userProfile,
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
        message: 'Acesso não autorizado: O e-mail não possui cadastro de funcionário criado pelo administrador.',
      };
    }

    if (employee.status === 'inactive') {
      return {
        allowed: false,
        employee,
        message: 'Acesso bloqueado: O cadastro deste funcionário foi inativado pelo administrador.',
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
        addEmployee,
        updateEmployee,
        deleteEmployee,
        toggleEmployeeStatus,
        authenticateEmployee,
        isEmployeeEmailAllowed,
        notifications,
        isFirebasePermissionMissing,
        dismissFirebaseWarning,
        retryFirebaseConnection,
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
