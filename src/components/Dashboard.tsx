import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  Send,
  Plus,
  ArrowDownRight,
  CreditCard,
  Building,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayIso, getDateOffsetIso, getLoanFinancialSummary, getMonthlyFinancialData } from '../utils/calculations';
import { generateWhatsAppMessage, openWhatsAppChat } from '../utils/whatsapp';

export const Dashboard: React.FC = () => {
  const {
    clients,
    loans,
    settings,
    setIsLoanModalOpen,
    setIsClientModalOpen,
    setSelectedLoanDetail,
    setSelectedClientDetail,
    setActiveTab,
  } = useApp();

  const today = getTodayIso();
  const tomorrow = getDateOffsetIso(1);

  // Financial summary aggregations
  let totalLoaned = 0;
  let totalToReceive = 0;
  let totalProfitForecast = 0;
  let activeClientsCount = 0;
  let overdueClientsCount = 0;
  let paymentsToday = 0;
  let loansDueToday = 0;
  let loansDueTomorrow = 0;
  let totalOverdueAmount = 0;

  const activeClientIdsSet = new Set<string>();
  const overdueClientIdsSet = new Set<string>();

  loans.forEach((loan) => {
    const summary = getLoanFinancialSummary(loan, today, settings.defaultDailyFine);
    totalLoaned += loan.principalAmount;
    totalToReceive += summary.remainingBalance;
    totalProfitForecast += loan.interestAmount + summary.fineAmount;

    if (!summary.isPaid) {
      activeClientIdsSet.add(loan.clientId);
    }

    if (summary.isOverdue) {
      overdueClientIdsSet.add(loan.clientId);
      totalOverdueAmount += summary.remainingBalance;
    }

    if (loan.dueDate === today && !summary.isPaid) {
      loansDueToday += 1;
    }

    if (loan.dueDate === tomorrow && !summary.isPaid) {
      loansDueTomorrow += 1;
    }

    (loan.payments || []).forEach((p) => {
      if (p.date === today) {
        paymentsToday += p.amount;
      }
    });
  });

  activeClientsCount = activeClientIdsSet.size;
  overdueClientsCount = overdueClientIdsSet.size;

  // Chart Data calculations: 100% dynamic from real loan & payment records
  const monthlyRevenueData = getMonthlyFinancialData(loans, 7, today);

  const statusPieData = [
    { name: 'Em dia', value: loans.filter((l) => getLoanFinancialSummary(l, today, settings.defaultDailyFine).status === 'em_dia' || !getLoanFinancialSummary(l, today, settings.defaultDailyFine).isOverdue && !getLoanFinancialSummary(l, today, settings.defaultDailyFine).isPaid).length, color: '#8BCF00' },
    { name: 'Em atraso', value: loans.filter((l) => getLoanFinancialSummary(l, today, settings.defaultDailyFine).isOverdue).length, color: '#FF3B30' },
    { name: 'Vencendo hoje', value: loansDueToday, color: '#FFCC00' },
    { name: 'Quitados', value: loans.filter((l) => getLoanFinancialSummary(l, today, settings.defaultDailyFine).isPaid).length, color: '#30B0C7' },
  ].filter((d) => d.value > 0);

  // Overdue and urgent items table
  const urgentLoans = loans
    .map((l) => {
      const summary = getLoanFinancialSummary(l, today, settings.defaultDailyFine);
      return { loan: l, summary };
    })
    .filter((item) => item.summary.isOverdue || item.loan.dueDate === today || item.loan.dueDate === tomorrow)
    .sort((a, b) => b.summary.delayDays - a.summary.delayDays);

  const handleWhatsAppUrgent = (loan: typeof loans[0]) => {
    const client = clients.find((c) => c.id === loan.clientId);
    if (!client) return;
    const summary = getLoanFinancialSummary(loan, today, settings.defaultDailyFine);
    const msgType = summary.isOverdue ? 'cobranca_atraso' : loan.dueDate === today ? 'vencimento_hoje' : 'lembrete_1_dia';
    const msg = generateWhatsAppMessage(client, loan, settings, msgType);
    openWhatsAppChat(client.whatsapp, msg);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 via-[#1A1A1A] to-[#141414] p-6 rounded-3xl border border-neutral-800 shadow-xl">
        <div>
          <span className="text-xs font-bold text-[#8BCF00] uppercase tracking-wider bg-[#8BCF00]/10 px-3 py-1 rounded-full border border-[#8BCF00]/20">
            Painel Geral do Credor
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-['Outfit']">
            Visão Geral dos Empréstimos
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            Acompanhe pagamentos, juros de 30% e cobrança de multas diárias em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-2xl border border-neutral-700 transition-all cursor-pointer flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-[#8BCF00]" />
            Novo Cliente
          </button>
          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="bg-[#8BCF00] hover:bg-[#9DE000] text-black text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-lg shadow-[#8BCF00]/20 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Novo Empréstimo
          </button>
        </div>
      </div>

      {/* Grid of Key Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Total Emprestado */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Total Emprestado</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white font-['Outfit']">{formatCurrency(totalLoaned)}</p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Capital total alocado
          </p>
        </div>

        {/* Total a Receber */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Total a Receber</span>
            <div className="w-9 h-9 rounded-xl bg-[#8BCF00]/10 text-[#8BCF00] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#8BCF00] font-['Outfit']">{formatCurrency(totalToReceive)}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Com juros + multas acumuladas</p>
        </div>

        {/* Lucro Previsto */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Lucro Previsto</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 font-['Outfit']">{formatCurrency(totalProfitForecast)}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Juros (30% padrão) + Multas</p>
        </div>

        {/* Clientes Inadimplentes (ALERTA EM VERMELHO) */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-[#FF3B30]/30 hover:border-[#FF3B30]/50 transition-all shadow-md bg-gradient-to-b from-[#FF3B30]/5 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#FF3B30]">Inadimplentes</span>
            <div className="w-9 h-9 rounded-xl bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#FF3B30] font-['Outfit']">{overdueClientsCount} Clientes</p>
          <p className="text-[11px] text-[#FF3B30]/90 mt-1 font-semibold">
            Valor em atraso: {formatCurrency(totalOverdueAmount)}
          </p>
        </div>

        {/* Pagamentos Recebidos Hoje */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Recebido Hoje</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white font-['Outfit']">{formatCurrency(paymentsToday)}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Entradas de caixa do dia</p>
        </div>

        {/* Vencendo Hoje */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Vencendo Hoje</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-400 font-['Outfit']">{loansDueToday} Empréstimo(s)</p>
          <p className="text-[11px] text-neutral-400 mt-1">Cobranças para a data de hoje</p>
        </div>

        {/* Vencendo Amanhã */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Vencendo Amanhã</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-400 font-['Outfit']">{loansDueTomorrow} Empréstimo(s)</p>
          <p className="text-[11px] text-neutral-400 mt-1">Lembrete de envio 1 dia antes</p>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Clientes Ativos</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white font-['Outfit']">{activeClientsCount} / {clients.length}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Com contratos em aberto</p>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receita Mensal Chart */}
        <div className="lg:col-span-2 bg-[#1C1C1C] p-6 rounded-3xl border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Receita & Lucro Mensal</h3>
              <p className="text-xs text-neutral-400">Evolução dos valores emprestados vs recebidos</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-blue-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Emprestado
              </span>
              <span className="flex items-center gap-1 text-[#8BCF00] font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8BCF00]"></span> Recebido
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="name" stroke="#737373" fontSize={12} />
                <YAxis
                  stroke="#737373"
                  fontSize={12}
                  tickFormatter={(val) =>
                    val === 0
                      ? 'R$ 0'
                      : val >= 1000
                      ? `R$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`
                      : `R$${val}`
                  }
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#171717] border border-neutral-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[175px]">
                          <p className="font-bold text-white border-b border-neutral-800 pb-1 text-sm font-['Outfit']">
                            {data.fullName || `Mês: ${label}`}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-blue-400 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span> Emprestado:
                            </span>
                            <span className="font-mono text-white">{formatCurrency(data.emprestado)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#8BCF00] font-semibold">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#8BCF00] shrink-0"></span> Recebido:
                            </span>
                            <span className="font-mono text-white">{formatCurrency(data.recebido)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold pt-1 border-t border-neutral-800/80">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span> Lucro:
                            </span>
                            <span className="font-mono text-white">{formatCurrency(data.lucro)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="emprestado" name="Emprestado" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="recebido" name="Recebido" fill="#8BCF00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Pie Chart */}
        <div className="bg-[#1C1C1C] p-6 rounded-3xl border border-neutral-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Status da Carteira</h3>
            <p className="text-xs text-neutral-400">Proporção dos empréstimos cadastrados</p>
          </div>
          <div className="h-56 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-extrabold text-white font-['Outfit']">{loans.length}</span>
              <span className="text-[10px] text-neutral-400">Contratos</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="truncate">{item.name}: <strong>{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Immediate Overdue Collection Action Table */}
      <div className="bg-[#1C1C1C] p-6 rounded-3xl border border border-neutral-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FF3B30]" />
              <h3 className="text-lg font-bold text-white font-['Outfit']">Cobranças Urgentes e Vencimentos</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Clientes com pagamentos atrasados ou vencendo hoje. Envie cobrança por WhatsApp em 1 clique.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('loans')}
            className="text-xs text-[#8BCF00] hover:underline font-semibold cursor-pointer self-start sm:self-auto"
          >
            Ver todos ({loans.length}) &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="text-xs uppercase bg-neutral-900/80 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Cliente</th>
                <th className="py-3.5 px-4 font-semibold">Vencimento</th>
                <th className="py-3.5 px-4 font-semibold">Valor Original</th>
                <th className="py-3.5 px-4 font-semibold text-center">Atraso</th>
                <th className="py-3.5 px-4 font-semibold text-right">Multa (R$20/dia)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Atualizado</th>
                <th className="py-3.5 px-4 font-semibold text-center">Ação WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {urgentLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-[#8BCF00] mx-auto mb-2 opacity-70" />
                    Nenhuma cobrança em atraso no momento! Todos os clientes em dia.
                  </td>
                </tr>
              ) : (
                urgentLoans.map(({ loan, summary }) => (
                  <tr key={loan.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div
                        className="cursor-pointer hover:text-[#8BCF00] transition-colors"
                        onClick={() => {
                          setSelectedLoanDetail(loan);
                          setActiveTab('loans');
                        }}
                      >
                        {loan.clientName}
                        <span className="block text-xs font-normal text-neutral-400">{loan.clientPhone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      {formatDate(loan.dueDate)}
                    </td>
                    <td className="py-3.5 px-4">{formatCurrency(loan.totalOriginalAmount)}</td>
                    <td className="py-3.5 px-4 text-center">
                      {summary.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[#FF3B30]/20 text-[#FF3B30]">
                          {summary.delayDays} dia(s)
                        </span>
                      ) : loan.dueDate === today ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">
                          Vence Hoje
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">
                          Vence Amanhã
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#FF3B30]">
                      {summary.fineAmount > 0 ? formatCurrency(summary.fineAmount) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#8BCF00]">
                      {formatCurrency(summary.remainingBalance)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleWhatsAppUrgent(loan)}
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow hover:shadow-lg flex items-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Cobrar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
