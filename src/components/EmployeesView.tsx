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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmployeeUser } from '../types';

export const EmployeesView: React.FC = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
    currentUser,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeUser | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleTitle: 'Cobrador(a) & Operador(a)',
    phone: '',
    status: 'active' as 'active' | 'inactive',
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
      status: 'active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: EmployeeUser) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      password: emp.password,
      roleTitle: emp.roleTitle || 'Cobrador(a)',
      phone: emp.phone || '',
      status: emp.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let generated = '@';
    for (let i = 0; i < 7; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: generated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setFormError('Preencha o nome, e-mail e senha do funcionário.');
      return;
    }

    if (cleanEmail === 'edinelsonept@gmail.com') {
      setFormError('O e-mail edinelsonept@gmail.com é reservado exclusivamente para o Administrador.');
      return;
    }

    // Check duplicate email
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
        phone: formData.phone.trim(),
        status: formData.status,
      });
      showFeedback(`Funcionário "${cleanName}" atualizado com sucesso!`);
    } else {
      addEmployee({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        role: 'employee',
        roleTitle: formData.roleTitle,
        phone: formData.phone.trim(),
        status: formData.status,
        avatarUrl:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      });
      showFeedback(`Login do funcionário "${cleanName}" criado com sucesso! Ele já pode acessar o sistema.`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (emp: EmployeeUser) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir o login de "${emp.name}" (${emp.email})? Ele perderá imediatamente o acesso ao CrediControl.`
      )
    ) {
      deleteEmployee(emp.id);
      showFeedback(`Acesso de "${emp.name}" removido do sistema.`);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.roleTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? emp.status === 'active'
        : emp.status === 'inactive';

    return matchesSearch && matchesStatus;
  });

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const inactiveCount = employees.filter((e) => e.status === 'inactive').length;

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
          Apenas o usuário Administrador tem permissão para cadastrar, visualizar ou gerenciar os acessos e senhas de funcionários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-[#8BCF00]" /> Gestão de Funcionários & Acessos
          </h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Crie e gerencie os logins da sua equipe. O funcionário só consegue entrar se for cadastrado pelo Administrador.
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-neutral-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 text-[#8BCF00] flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Total de Funcionários</p>
            <p className="text-xl font-extrabold text-white font-['Outfit']">{employees.length}</p>
          </div>
        </div>

        <div className="bg-[#181818] border border-neutral-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Acessos Ativos</p>
            <p className="text-xl font-extrabold text-emerald-400 font-['Outfit']">{activeCount}</p>
          </div>
        </div>

        <div className="bg-[#181818] border border-neutral-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-medium">Acessos Inativos/Bloqueados</p>
            <p className="text-xl font-extrabold text-neutral-400 font-['Outfit']">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Security Rule Card */}
      <div className="p-4 bg-[#8BCF00]/10 border border-[#8BCF00]/30 rounded-2xl flex items-start gap-3 text-xs text-neutral-300">
        <Sparkles className="w-5 h-5 text-[#8BCF00] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white text-sm">
            Regra de Segurança: Login de Funcionário Criado pelo Administrador
          </p>
          <p className="text-neutral-300 leading-relaxed">
            Nenhum funcionário pode se auto-cadastrar no CrediControl. Para ter acesso, o Administrador deve cadastrar o e-mail e definir a senha aqui. Se você desativar um funcionário, seu acesso será bloqueado no mesmo instante.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181818] border border-neutral-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar funcionário por nome, e-mail ou cargo..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl pl-10 pr-3.5 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800 self-stretch sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              statusFilter === 'all'
                ? 'bg-[#8BCF00] text-black shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-black font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ativos ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              statusFilter === 'inactive'
                ? 'bg-neutral-700 text-white font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Inativos ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Employees List */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-12 text-center space-y-3">
          <UserX className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white font-['Outfit']">
            Nenhum funcionário encontrado
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Tente alterar os termos da busca.'
              : 'Clique no botão acima para cadastrar o primeiro funcionário.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEmployees.map((emp) => {
            const isPasswordVisible = visiblePasswords[emp.id] || false;
            const isActive = emp.status === 'active';

            return (
              <div
                key={emp.id}
                className={`bg-[#181818] border rounded-3xl p-5 space-y-4 shadow-lg transition-all ${
                  isActive
                    ? 'border-neutral-800 hover:border-neutral-700'
                    : 'border-red-950/40 opacity-75'
                }`}
              >
                {/* Employee Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        emp.avatarUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={emp.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-neutral-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base truncate font-['Outfit']">
                          {emp.name}
                        </h4>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-xs text-[#8BCF00] font-semibold flex items-center gap-1.5 mt-0.5">
                        <Shield className="w-3.5 h-3.5" />
                        {emp.roleTitle || 'Funcionário'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(emp)}
                      title="Editar dados ou senha do funcionário"
                      className="p-2 text-neutral-400 hover:text-[#8BCF00] hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(emp)}
                      title="Excluir funcionário"
                      className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Login Credentials Information */}
                <div className="bg-neutral-900/90 rounded-2xl p-3.5 border border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" /> E-mail (Login):
                    </span>
                    <strong className="text-white font-mono">{emp.email}</strong>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-neutral-800/80">
                    <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                      <KeyRound className="w-3.5 h-3.5 text-neutral-400" /> Senha de Acesso:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">
                        {isPasswordVisible ? emp.password : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(emp.id)}
                        className="text-neutral-400 hover:text-white cursor-pointer"
                        title={isPasswordVisible ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {isPasswordVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {emp.phone && (
                    <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" /> WhatsApp / Tel:
                      </span>
                      <span className="text-neutral-300">{emp.phone}</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls: Toggle Status & Info */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Criado pelo Admin
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      toggleEmployeeStatus(emp.id);
                      showFeedback(
                        `Acesso de "${emp.name}" ${
                          isActive ? 'bloqueado (Inativo)' : 'liberado (Ativo)'
                        }.`
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                      isActive
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Bloquear Acesso
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Liberar Acesso
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Employee */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-neutral-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#8BCF00]" />
                  {editingEmployee ? 'Editar Funcionário' : 'Novo Login de Funcionário'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Defina as credenciais para o funcionário acessar o sistema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="funcionario@credicontrol.com"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  />
                  <span className="text-[11px] text-neutral-500 block">
                    Usado pelo funcionário para entrar.
                  </span>
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
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Cargo / Função</label>
                  <select
                    value={formData.roleTitle}
                    onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="Cobrador(a) & Operador(a)">Cobrador(a) & Operador(a)</option>
                    <option value="Atendente de Cobrança">Atendente de Cobrança</option>
                    <option value="Operador(a) Financeiro">Operador(a) Financeiro</option>
                    <option value="Gerente Operacional">Gerente Operacional</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(91) 98877-0000"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#8BCF00] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Status do Acesso</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                      formData.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-xs'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Ativo (Pode Logar)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'inactive' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                      formData.status === 'inactive'
                        ? 'bg-red-500/15 text-red-400 border-red-500/40 shadow-xs'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Inativo (Bloqueado)
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="bg-[#8BCF00] hover:bg-[#9DE000] text-black font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-[#8BCF00]/20 transition-all cursor-pointer"
                >
                  {editingEmployee ? 'Salvar Alterações' : 'Criar Login de Funcionário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
