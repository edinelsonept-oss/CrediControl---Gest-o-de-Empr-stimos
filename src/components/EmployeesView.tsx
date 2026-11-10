import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  Search,
  KeyRound,
  Shield,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UserX,
  Phone,
  Mail,
  Calendar,
  Lock,
  Sparkles,
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  Building,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmployeeUser } from '../types';
import { ADMIN_EMAIL } from '../config/env';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import { ReasonModal } from './ReasonModal';

type TabType = 'all' | 'pending' | 'approved' | 'denied' | 'suspended';

export const EmployeesView: React.FC = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    approveEmployee,
    denyEmployee,
    suspendEmployee,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeUser | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeUser | null>(null);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<EmployeeUser | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Reason modal state
  const [reasonModalState, setReasonModalState] = useState<{
    isOpen: boolean;
    employee: EmployeeUser | null;
    actionType: 'deny' | 'suspend';
  }>({
    isOpen: false,
    employee: null,
    actionType: 'deny',
  });

  // Create/Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleTitle: 'Cobrador(a) & Operador(a)',
    phone: '',
    cpf: '',
    address: '',
    city: 'Salinópolis',
    birthDate: '',
    status: 'approved' as 'approved' | 'pending',
  });
  const [formError, setFormError] = useState('');

  const isAdmin = currentUser.role === 'admin';

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      roleTitle: 'Cobrador(a) & Operador(a)',
      phone: '',
      cpf: '',
      address: '',
      city: 'Salinópolis',
      birthDate: '',
      status: 'approved',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (emp: EmployeeUser) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      password: emp.password || '',
      roleTitle: emp.roleTitle || 'Cobrador(a)',
      phone: emp.phone || '',
      cpf: emp.cpf || '',
      address: emp.address || '',
      city: emp.city || 'Salinópolis',
      birthDate: emp.birthDate || '',
      status: (emp.status === 'pending' ? 'pending' : 'approved') as 'approved' | 'pending',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let generated = '@';
    for (let i = 0; i < 7; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: generated }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setFormError('Preencha o nome, e-mail e senha do funcionário.');
      return;
    }

    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      setFormError(`O e-mail ${ADMIN_EMAIL} é reservado exclusivamente para o Administrador.`);
      return;
    }

    const duplicate = employees.find(
      (emp) => emp.email.toLowerCase() === cleanEmail && emp.id !== editingEmployee?.id
    );
    if (duplicate) {
      setFormError(`O e-mail "${cleanEmail}" já está cadastrado para o funcionário ${duplicate.name}.`);
      return;
    }

    if (cleanPassword.length < 4) {
      setFormError('A senha de acesso deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        roleTitle: formData.roleTitle,
        phone: formData.phone.trim() || 'Não informado',
        cpf: formData.cpf.trim() || 'Não informado',
        address: formData.address.trim() || 'Não informado',
        city: formData.city.trim() || 'Salinópolis',
        birthDate: formData.birthDate.trim() || 'Não informado',
      });
      showFeedback(`Funcionário "${cleanName}" atualizado com sucesso!`);
    } else {
      addEmployee({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        role: 'employee',
        roleTitle: formData.roleTitle,
        phone: formData.phone.trim() || 'Não informado',
        cpf: formData.cpf.trim() || 'Não informado',
        address: formData.address.trim() || 'Não informado',
        city: formData.city.trim() || 'Salinópolis',
        birthDate: formData.birthDate.trim() || 'Não informado',
        status: 'approved',
        registrationMethod: 'email_password',
        avatarUrl:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      });
      showFeedback(`Login do funcionário "${cleanName}" cadastrado com status APROVADO!`);
    }

    setIsCreateModalOpen(false);
  };

  const handleOpenDeleteModal = (emp: EmployeeUser) => {
    setEmployeeToDelete(emp);
  };

  const handleConfirmDeleteEmployee = () => {
    if (!employeeToDelete) return;
    const targetId = employeeToDelete.id;
    const targetName = employeeToDelete.name;

    deleteEmployee(targetId);
    setEmployeeToDelete(null);
    showFeedback(`Acesso do funcionário "${targetName}" excluído com sucesso.`);
  };

  // Administrative Actions
  const handleApprove = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    await approveEmployee(id);
    showFeedback(`Acesso de "${emp?.name || 'Funcionário'}" APROVADO com sucesso! Notificação enviada.`);
  };

  const handleOpenDenyModal = (emp: EmployeeUser) => {
    setReasonModalState({
      isOpen: true,
      employee: emp,
      actionType: 'deny',
    });
  };

  const handleOpenSuspendModal = (emp: EmployeeUser) => {
    setReasonModalState({
      isOpen: true,
      employee: emp,
      actionType: 'suspend',
    });
  };

  const handleConfirmReason = async (reason: string) => {
    const emp = reasonModalState.employee;
    if (!emp) return;

    if (reasonModalState.actionType === 'deny') {
      await denyEmployee(emp.id, reason);
      showFeedback(`Solicitação de "${emp.name}" NEGADA. Notificação automática enviada.`);
    } else {
      await suspendEmployee(emp.id, reason);
      showFeedback(`Acesso de "${emp.name}" SUSPENSO imediatamente. Sessões ativas revogadas.`);
    }

    setReasonModalState({ isOpen: false, employee: null, actionType: 'deny' });
  };

  // Counts for each tab
  const pendingCount = employees.filter((e) => e.status === 'pending').length;
  const approvedCount = employees.filter((e) => e.status === 'approved' || e.status === 'active').length;
  const deniedCount = employees.filter((e) => e.status === 'denied').length;
  const suspendedCount = employees.filter((e) => e.status === 'suspended' || e.status === 'inactive').length;

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      cleanSearch === '' ||
      emp.name.toLowerCase().includes(cleanSearch) ||
      emp.email.toLowerCase().includes(cleanSearch) ||
      (emp.cpf && emp.cpf.toLowerCase().includes(cleanSearch)) ||
      (emp.roleTitle && emp.roleTitle.toLowerCase().includes(cleanSearch));

    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = emp.status === 'pending';
    } else if (activeTab === 'approved') {
      matchesTab = emp.status === 'approved' || emp.status === 'active';
    } else if (activeTab === 'denied') {
      matchesTab = emp.status === 'denied';
    } else if (activeTab === 'suspended') {
      matchesTab = emp.status === 'suspended' || emp.status === 'inactive';
    }

    return matchesSearch && matchesTab;
  });

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-8 bg-[#181818] border border-neutral-800 rounded-3xl text-center space-y-4 my-12">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white font-['Outfit']">
          Acesso Restrito ao Administrador
        </h2>
        <p className="text-neutral-400 text-sm max-w-md mx-auto">
          Apenas o usuário Administrador tem permissão para aprovar cadastros, alterar status ou gerenciar os acessos de funcionários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-[#8BCF00]" /> GERENCIAMENTO DE FUNCIONÁRIOS
          </h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Gerencie solicitações de cadastro, autorize novos colaboradores e controle os acessos da equipe.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#8BCF00]/20 transition-all cursor-pointer shrink-0 active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Funcionário</span>
        </button>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMessage && (
        <div className="bg-[#8BCF00]/15 border border-[#8BCF00]/40 text-[#8BCF00] px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Tabs as specified in Requirement 3 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'all'
              ? 'bg-[#8BCF00] text-black shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <span>Todos os funcionários</span>
          <span className={`text-[11px] px-2 py-0.2 rounded-full font-extrabold ${activeTab === 'all' ? 'bg-black text-[#8BCF00]' : 'bg-neutral-800 text-neutral-300'}`}>
            {employees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Solicitações pendentes</span>
          <span className={`text-[11px] px-2 py-0.2 rounded-full font-extrabold ${pendingCount > 0 ? 'bg-amber-400 text-black animate-pulse' : 'bg-neutral-800 text-neutral-400'}`}>
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'approved'
              ? 'bg-emerald-500 text-black shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Funcionários aprovados</span>
          <span className={`text-[11px] px-2 py-0.2 rounded-full font-extrabold ${activeTab === 'approved' ? 'bg-black text-emerald-400' : 'bg-neutral-800 text-neutral-300'}`}>
            {approvedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('denied')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'denied'
              ? 'bg-red-500 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Funcionários negados</span>
          <span className={`text-[11px] px-2 py-0.2 rounded-full font-extrabold ${activeTab === 'denied' ? 'bg-white text-red-600' : 'bg-neutral-800 text-neutral-300'}`}>
            {deniedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suspended')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'suspended'
              ? 'bg-neutral-700 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Funcionários suspensos</span>
          <span className={`text-[11px] px-2 py-0.2 rounded-full font-extrabold ${activeTab === 'suspended' ? 'bg-black text-white' : 'bg-neutral-800 text-neutral-300'}`}>
            {suspendedCount}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181818] border border-neutral-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, e-mail ou CPF..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition-all"
          />
        </div>

        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="text-xs text-neutral-400 hover:text-white px-2 cursor-pointer"
          >
            Limpar busca
          </button>
        )}
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-12 text-center space-y-3">
          <UserX className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white font-['Outfit']">
            Nenhum funcionário encontrado
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Nenhum resultado corresponde aos termos da pesquisa.'
              : 'Não há registros nesta aba no momento.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEmployees.map((emp) => {
            const isPasswordVisible = visiblePasswords[emp.id] || false;
            const isPending = emp.status === 'pending';
            const isApproved = emp.status === 'approved' || emp.status === 'active';
            const isDenied = emp.status === 'denied';
            const isSuspended = emp.status === 'suspended' || emp.status === 'inactive';

            return (
              <div
                key={emp.id}
                className={`bg-[#181818] border rounded-3xl p-5 space-y-4 shadow-lg transition-all ${
                  isPending
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent'
                    : isApproved
                    ? 'border-neutral-800 hover:border-neutral-700'
                    : isDenied
                    ? 'border-red-950/50 opacity-80'
                    : 'border-neutral-800 opacity-80'
                }`}
              >
                {/* Employee Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={
                        emp.avatarUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={emp.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-neutral-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-base font-['Outfit'] break-words">
                          {emp.name}
                        </h4>
                        <span
                          className={`shrink-0 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse'
                              : isApproved
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isDenied
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          {isPending && 'Pendente'}
                          {isApproved && 'Aprovado'}
                          {isDenied && 'Negado'}
                          {isSuspended && 'Suspenso'}
                        </span>
                      </div>
                      <p className="text-xs text-[#8BCF00] font-semibold flex items-center gap-1.5 mt-0.5">
                        <Shield className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{emp.roleTitle || 'Colaborador'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions Header: Edit & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(emp)}
                      title="Editar funcionário"
                      className="p-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#8BCF00]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(emp)}
                      title="Excluir cadastro"
                      className="p-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cadastral Information Snippet */}
                <div className="bg-neutral-900/90 rounded-2xl p-3.5 border border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" /> E-mail:
                    </span>
                    <strong className="text-white font-mono truncate max-w-[200px]">{emp.email}</strong>
                  </div>

                  {emp.phone && emp.phone !== 'Não informado' && (
                    <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" /> Telefone / WhatsApp:
                      </span>
                      <span className="text-neutral-200">{emp.phone}</span>
                    </div>
                  )}

                  {emp.cpf && emp.cpf !== 'Não informado' && (
                    <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 text-neutral-400" /> CPF:
                      </span>
                      <span className="text-neutral-200 font-mono">{emp.cpf}</span>
                    </div>
                  )}

                  {emp.password && (
                    <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                        <KeyRound className="w-3.5 h-3.5 text-neutral-400" /> Senha:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">
                          {isPasswordVisible ? emp.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(emp.id)}
                          className="text-neutral-400 hover:text-white cursor-pointer"
                        >
                          {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {emp.decisionReason && (
                    <div className="pt-1 border-t border-neutral-800/80 text-[11px]">
                      <span className="text-amber-400 block font-semibold">Motivo da Decisão:</span>
                      <p className="text-neutral-300 italic">{emp.decisionReason}</p>
                    </div>
                  )}
                </div>

                {/* View Full Profile Button */}
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForDetail(emp)}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#8BCF00]" />
                  <span>VER CADASTRO COMPLETO</span>
                </button>

                {/* Administrative Decision Buttons (Requirement 5) */}
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                  {/* Option A: PERMITIR ACESSO */}
                  {(isPending || isDenied || isSuspended) && (
                    <button
                      type="button"
                      onClick={() => handleApprove(emp.id)}
                      className="flex-1 bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#8BCF00]/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSuspended || isDenied ? 'Reativar Acesso' : 'Permitir Acesso'}</span>
                    </button>
                  )}

                  {/* Option B: NEGAR ACESSO */}
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleOpenDenyModal(emp)}
                      className="flex-1 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Negar Acesso</span>
                    </button>
                  )}

                  {/* Option C: SUSPENDER ACESSO */}
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => handleOpenSuspendModal(emp)}
                      className="flex-1 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Suspender Acesso</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: View Full Cadastral Profile */}
      <EmployeeDetailModal
        isOpen={!!selectedEmployeeForDetail}
        onClose={() => setSelectedEmployeeForDetail(null)}
        employee={selectedEmployeeForDetail}
        onApprove={(id) => handleApprove(id)}
        onDeny={(id) => {
          const emp = employees.find((e) => e.id === id);
          if (emp) handleOpenDenyModal(emp);
        }}
        onSuspend={(id) => {
          const emp = employees.find((e) => e.id === id);
          if (emp) handleOpenSuspendModal(emp);
        }}
      />

      {/* Modal: Reason for Denial or Suspension */}
      <ReasonModal
        isOpen={reasonModalState.isOpen}
        onClose={() => setReasonModalState({ isOpen: false, employee: null, actionType: 'deny' })}
        onConfirm={handleConfirmReason}
        title={reasonModalState.actionType === 'deny' ? 'Negar Acesso ao Funcionário' : 'Suspender Acesso do Funcionário'}
        subtitle={
          reasonModalState.actionType === 'deny'
            ? 'Informe o motivo pelo qual o cadastro não foi aprovado. A mensagem será enviada na notificação ao funcionário.'
            : 'Informe o motivo da suspensão. As sessões ativas serão invalidadas imediatamente.'
        }
        actionType={reasonModalState.actionType}
        employeeName={reasonModalState.employee?.name || ''}
      />

      {/* Modal: Create or Edit Employee */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#8BCF00]" />
                  {editingEmployee ? 'Editar Funcionário' : 'Novo Cadastro de Funcionário'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Cadastre as credenciais e dados pessoais do colaborador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Nome Completo do Funcionário *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Mariana Silva"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="mariana@credicontrol.com"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">Senha de Acesso *</label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[11px] text-[#8BCF00] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RefreshCw className="w-3 h-3" /> Gerar
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Ex: @Mariana123"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(91) 98877-0000"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Endereço Completo</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, bairro..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Salinópolis"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Cargo / Função</label>
                  <select
                    value={formData.roleTitle}
                    onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="Cobrador(a) & Operador(a)">Cobrador(a) & Operador(a)</option>
                    <option value="Atendente de Cobrança">Atendente de Cobrança</option>
                    <option value="Operador(a) Financeiro">Operador(a) Financeiro</option>
                    <option value="Gerente Operacional">Gerente Operacional</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-[#8BCF00]/20 transition-all cursor-pointer"
                >
                  {editingEmployee ? 'Salvar Alterações' : 'Criar Cadastro Aprovado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Deletion */}
      <ConfirmDeleteModal
        isOpen={!!employeeToDelete}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={handleConfirmDeleteEmployee}
        title="Excluir Funcionário"
        message={`VOCÊ DESEJA EXCLUIR O ACESSO DO FUNCIONÁRIO ${employeeToDelete?.name?.toUpperCase()} (${employeeToDelete?.roleTitle || 'FUNCIONÁRIO'} - ${employeeToDelete?.email})? SE SIM CLIQUE EM (DELETAR) SE NÃO CLIQUE EM (NÃO )`}
        confirmLabel="DELETAR"
        cancelLabel="NÃO"
      />
    </div>
  );
};
