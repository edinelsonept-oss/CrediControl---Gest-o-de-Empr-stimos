# 📑 CrediControl - Sistema de Gestão de Empréstimos

> **Sistema web completo e moderno para controle e gestão de empréstimos particulares, contratos, cobranças automatizadas com multas diárias por atraso, geolocalização de clientes em mapa, comprovantes térmicos e relatórios gerenciais.**

---

## 📌 Sumário

1. [Visão Geral](#-visão-geral)
2. [Stack Tecnológica](#-stack-tecnológica)
3. [Estrutura do Projeto](#-estrutura-do-projeto)
4. [Modelos de Dados (Tipos TypeScript)](#-modelos-de-dados)
5. [Regras de Negócio e Cálculos Financeiros](#-regras-de-negócio-e-cálculos-financeiros)
6. [Módulos e Funcionalidades](#-módulos-e-funcionalidades)
   - [6.1 Dashboard e Indicadores em Tempo Real](#61-dashboard-e-indicadores-em-tempo-real)
   - [6.2 Cadastro e Gestão de Clientes](#62-cadastro-e-gestão-de-clientes)
   - [6.3 Gestão de Empréstimos e Parcelamentos](#63-gestão-de-empréstimos-e-parcelamentos)
   - [6.4 Baixa de Pagamentos e Recibos Térmicos (PDF)](#64-baixa-de-pagamentos-e-recibos-térmicos-pdf)
   - [6.5 Cobrança Inteligente via WhatsApp](#65-cobrança-inteligente-via-whatsapp)
   - [6.6 Mapa Georreferenciado de Clientes](#66-mapa-georreferenciado-de-clientes)
   - [6.7 Relatórios em PDF e Planilhas Excel](#67-relatórios-em-pdf-e-planilhas-excel)
   - [6.8 Perfis de Acesso (RBAC) e Segurança](#68-perfis-de-acesso-rbac-e-segurança)
   - [6.9 Backup, Restauração e Configurações](#69-backup-restauração-e-configurações)
7. [Integração com Firebase (Firestore, Auth, Analytics)](#-integração-com-firebase)
8. [Como Executar o Projeto Localmente](#-como-executar-o-projeto-localmente)
9. [Scripts Disponíveis](#-scripts-disponíveis)

---

## 🌟 Visão Geral

O **CrediControl** foi desenvolvido para atender às necessidades operacionais e financeiras de operadores de crédito e empréstimos pessoais/particulares. O sistema proporciona:

- **Controle de Carteira de Clientes:** Documentação completa (CPF, RG, comprovante de residência, CNH, fotos e localização no mapa).
- **Contratos e Parcelamentos:** Simulação com taxas pré-definidas (ex: 30%), frequência diária, parcela única (30 dias) ou parcelado mensal.
- **Cobrança Rigorosa com Multa Diária:** Cálculo automático de multas diárias (ex: R$ 20,00/dia) acumuladas instantaneamente após o vencimento.
- **Comunicação Direta via WhatsApp:** Modelos prontos de lembretes (3 dias antes, véspera, dia do vencimento e aviso de inadimplência com saldo atualizado).
- **Roteirização de Cobrança em Campo:** Mapa interativo destacando clientes adimplentes e inadimplentes por cores para otimizar visitas.
- **Auditoria e Exportação:** Emissão de recibos em formato cupom térmico (80mm) em PDF, relatórios analíticos em PDF e planilhas Excel (.xlsx).

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend Core** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Interface reativa, tipagem estática e componentes modulares |
| **Build Tool** | [Vite 6](https://vitejs.dev/) | Empacotador rápido com suporte a módulos ESM nativos |
| **Estilização** | [Tailwind CSS v4](https://tailwindcss.com/) | Estilização utilitária moderna com tema Dark/Light nativo |
| **Ícones** | [Lucide React](https://lucide.dev/) | Conjunto consistente de ícones vetoriais |
| **Gráficos** | [Recharts 3](https://recharts.org/) | Visualização de métricas financeiras e fluxo de caixa |
| **Mapas** | [Leaflet](https://leafletjs.com/) + OpenStreetMap | Mapeamento geográfico interativo de clientes |
| **Relatórios PDF** | [jsPDF](https://github.com/parallax/jsPDF) + jsPDF-AutoTable | Geração client-side de tabelas e comprovantes térmicos |
| **Planilhas** | [SheetJS (XLSX)](https://sheetjs.com/) | Exportação de dados brutos e resumos financeiros para Excel |
| **Animações** | [Motion](https://motion.dev/) | Transições visuais fluidas e microinterações |
| **Backend & Banco de Dados** | [Firebase Firestore](https://firebase.google.com/) | Banco de dados NoSQL em nuvem com sincronização em tempo real |
| **Autenticação** | [Firebase Authentication](https://firebase.google.com/products/auth) | Sessões seguras e autenticação anônima/credenciais |
| **Telemetria** | [Google Analytics para Firebase](https://firebase.google.com/docs/analytics) | Monitoramento e telemetria de uso da aplicação |

---

## 📂 Estrutura do Projeto

```text
├── .env.example                  # Modelo de variáveis de ambiente do projeto
├── firebase-applet-config.json   # Credenciais de conexão com o projeto Firebase
├── firebase-blueprint.json       # Esquema descritivo das coleções Firestore
├── firestore.rules               # Regras de segurança de leitura/escrita do Firestore
├── index.html                    # Ponto de entrada HTML e fontes Google Fonts
├── metadata.json                 # Metadados e permissões de câmera/geolocalização
├── package.json                  # Manifesto de dependências e scripts npm
├── tsconfig.json                 # Configuração do compilador TypeScript
├── vite.config.ts                # Configuração do Vite com plugins Tailwind e React
└── src/
    ├── main.tsx                  # Inicializador raiz do React
    ├── App.tsx                   # Layout principal, roteamento de abas e modais
    ├── index.css                 # Importação do Tailwind CSS v4
    ├── types.ts                  # Definições centrais de interfaces e tipos TypeScript
    ├── context/
    │   └── AppContext.tsx        # Gerenciamento global de estado e sincronização Firestore
    ├── data/
    │   └── initialData.ts        # Dados iniciais de demonstração e fallback offline
    ├── lib/
    │   └── firebase.ts           # Inicialização do SDK do Firebase e tratamento de erros
    ├── utils/
    │   ├── calculations.ts       # Funções puras de cálculo de juros, multas e datas
    │   ├── pdfExport.ts          # Gerador de relatórios e recibo térmico em PDF
    │   ├── excelExport.ts        # Exportador de clientes e contratos em formato XLSX
    │   └── whatsapp.ts           # Gerador de mensagens e links diretos do WhatsApp
    └── components/
        ├── Header.tsx            # Barra superior com busca global, alertas e perfil
        ├── Sidebar.tsx           # Navegação lateral, alternador de perfil e tema
        ├── Dashboard.tsx         # Painel principal com KPIs, gráficos e ações rápidas
        ├── ClientList.tsx        # Tabela e cartões com busca e filtros de clientes
        ├── ClientDetailView.tsx  # Ficha técnica do cliente, histórico e documentos
        ├── ClientFormModal.tsx   # Modal de cadastro e edição de cliente com geolocalização
        ├── LoanList.tsx          # Listagem de contratos com status e filtros de atraso
        ├── LoanDetailModal.tsx   # Visualização das parcelas, pagamentos e multas
        ├── LoanFormModal.tsx     # Novo contrato com cálculo de juros e parcelamento
        ├── PaymentModal.tsx      # Registro de baixa financeira (PIX, Dinheiro, etc.)
        ├── MapView.tsx           # Mapa interativo com pinos de clientes por status
        ├── ReportsView.tsx       # Central de emissão de relatórios PDF e Excel
        ├── SettingsView.tsx      # Parâmetros de juros, multa diária e backup JSON
        ├── LoginView.tsx         # Tela de autenticação com suporte a perfis
        ├── ConfirmDeleteModal.tsx# Modal de confirmação para ações destrutivas
        ├── ForgotPasswordModal.tsx# Modal de recuperação de senha
        └── SuccessModal.tsx      # Modal de confirmação visual de operações
```

---

## 📊 Modelos de Dados

Os tipos estão centralizados em `src/types.ts`:

### 1. Cliente (`Client`)
```typescript
export interface Client {
  id: string;
  fullName: string;
  cpf: string;
  rg: string;
  birthDate: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
  };
  location: {
    lat: number;
    lng: number;
    addressFormatted: string;
  };
  documents: ClientDocument[];
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}
```

### 2. Empréstimo / Contrato (`Loan`)
```typescript
export interface Loan {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientWhatsapp: string;
  principalAmount: number;         // Valor do capital emprestado (ex: R$ 1.000,00)
  interestRatePercent: number;     // Taxa de juros aplicada (ex: 30%)
  interestAmount: number;          // Valor nominal dos juros (ex: R$ 300,00)
  totalOriginalAmount: number;     // Total original contratado (ex: R$ 1.300,00)
  loanDate: string;                // Data de contratação (YYYY-MM-DD)
  dueDate: string;                 // Data de vencimento final (YYYY-MM-DD)
  paymentFrequency: 'diaria' | 'pagamento_unico_30' | 'parcelado';
  installmentsCount: number;       // Quantidade de parcelas
  dailyFineAmount: number;         // Multa diária por atraso (padrão R$ 20,00/dia)
  installments: Installment[];     // Cronograma detalhado de parcelas
  payments: PaymentRecord[];       // Histórico de pagamentos efetuados
  status: 'em_dia' | 'proximo_vencimento' | 'em_atraso' | 'quitado';
  notes?: string;
  createdAt: string;
}
```

### 3. Registro de Pagamento (`PaymentRecord`)
```typescript
export interface PaymentRecord {
  id: string;
  loanId: string;
  installmentId?: string;
  amount: number;
  date: string;
  paymentMethod: 'pix' | 'dinheiro' | 'transferencia' | 'cartao';
  note?: string;
  registeredBy: string;
}
```

---

## 🧮 Regras de Negócio e Cálculos Financeiros

Todas as regras financeiras estão concentradas em `src/utils/calculations.ts`, garantindo integridade e ausência de discrepâncias matemáticas:

### 1. Cálculo de Juros do Empréstimo
$$\text{Valor dos Juros} = \frac{\text{Capital Emprestado} \times \text{Taxa de Juros (\%)}}{100}$$
$$\text{Total Original} = \text{Capital Emprestado} + \text{Valor dos Juros}$$

*Exemplo:* Empréstimo de R$ 1.000,00 a 30% gera R$ 300,00 de juros, totalizando R$ 1.300,00.

### 2. Multa Diária por Atraso
- A multa é aplicada a partir do **1º dia após a data de vencimento**:
$$\text{Dias de Atraso} = \max(0, \text{Data Atual} - \text{Data de Vencimento})$$
$$\text{Multa Acumulada} = \text{Dias de Atraso} \times \text{Valor da Multa Diária}$$
- **Valor padrão configurável:** R$ 20,00 por dia de atraso.
- *Exemplo:* Vencimento em 01/08 e consulta em 03/08 $\rightarrow$ 2 dias de atraso $\rightarrow$ Multa acumulada = $2 \times R\$\ 20 = R\$\ 40,00$.

### 3. Saldo Devedor Atualizado e Quitação
$$\text{Total Atualizado} = \text{Total Original} + \text{Multa Acumulada}$$
$$\text{Saldo Devedor} = \max(0, \text{Total Atualizado} - \text{Total Já Pago})$$

Se o $\text{Total Já Pago} \ge \text{Total Original}$ e não houver multas pendentes, o contrato é marcado automaticamente como **Quitado**.

---

## 🚀 Módulos e Funcionalidades

### 6.1 Dashboard e Indicadores em Tempo Real
- **KPIs Principais:**
  - Total Emprestado (Capital em circulação)
  - Total a Receber (Saldo restante devedor)
  - Lucro Previsto (Juros projetados + Multas acumuladas)
  - Total em Atraso (Valor em risco de inadimplência)
  - Vencimentos para Hoje e Vencimentos para Amanhã
- **Gráficos Dinâmicos com Recharts:**
  - Gráfico de barras de projeção de fluxo mensal (Emprestado vs. Recebido vs. Juros)
  - Gráfico de rosca com distribuição da carteira (Em dia, Em atraso, Próximos e Quitados)
- **Barra de Ações Rápidas:** Acesso com 1 clique para novo empréstimo, cadastro de cliente e cobranças imediatas.

### 6.2 Cadastro e Gestão de Clientes
- Formulário inteligente com máscara automática para CPF (`000.000.000-00`) e Telefones (`(00) 00000-0000`).
- Endereço completo com busca por CEP e preenchimento de coordenadas geográficas.
- Upload e pré-visualização de documentos anexados (RG/CNH, comprovante de residência, foto do imóvel, selfies e contratos assinados).
- Histórico individual de todos os contratos e pagamentos realizados pelo cliente.

### 6.3 Gestão de Empréstimos e Parcelamentos
- Presets rápidos de valores (R$ 100, R$ 200, R$ 500, R$ 1.000, R$ 2.000) e taxas pré-calculadas.
- Geração automática do cronograma de parcelas conforme a modalidade escolhida:
  - **Diária:** Vencimentos consecutivos dia a dia.
  - **30 Dias (Pagamento Único):** Vencimento integral ao final do ciclo.
  - **Parcelado Mensal:** Parcelas com amortização e datas mensais fixas.
- Visualização detalhada das parcelas com indicadores visuais de status.

### 6.4 Baixa de Pagamentos e Recibos Térmicos (PDF)
- Modal dedicado para registro de recebimentos parciais ou totais.
- Seleção da forma de pagamento (PIX, Dinheiro em Espécie, Transferência Bancária, Cartão).
- **Emissão Instantânea de Comprovante Térmico:**
  - Formato padronizado 80mm (compatível com impressoras térmicas e envio digital).
  - Inclui identificação da empresa, dados do cliente, data/hora, operador, valor pago, saldo anterior e saldo devedor remanescente.

### 6.5 Cobrança Inteligente via WhatsApp
Integração nativa via API Web do WhatsApp (`https://api.whatsapp.com/send`) com 4 modelos automatizados:
1. **Lembrete de 3 Dias:** Aviso amigável do vencimento próximo.
2. **Lembrete de 1 Dia:** Lembrete na véspera com valor exato.
3. **Vencimento Hoje:** Alerta de vencimento no dia com instrução para evitar multa diária.
4. **Cobrança de Atraso:** Mensagem com os dias de atraso, valor da multa acumulada e saldo total atualizado para transferência via PIX.

### 6.6 Mapa Georreferenciado de Clientes
- Integração com Leaflet e camadas OpenStreetMap.
- Marcadores com diferenciação visual:
  - 🟢 **Verde:** Clientes com contratos rigorosamente em dia.
  - 🔴 **Vermelho:** Clientes com pendências ou parcelas em atraso.
  - ⚪ **Cinza:** Clientes com empréstimos já quitados.
- Popup interativo exibindo dados de contato, saldo devedor e botão para iniciar cobrança.

### 6.7 Relatórios em PDF e Planilhas Excel
- **Relatórios em PDF:**
  - Relatório Geral de Clientes cadastrados.
  - Relatório Sintético e Analítico de Empréstimos com status e saldos devedores.
- **Exportação para Excel (.xlsx):**
  - Exportação completa da base de clientes com endereço e documentos.
  - Exportação de contratos e parcelas com cálculo de multas acumuladas.
  - Resumo financeiro consolidado com indicadores gerenciais e lucro realizado.

### 6.8 Perfis de Acesso (RBAC) e Credenciais
- **Administrador:** Acesso irrestrito a todos os módulos, alteração de taxas de juros, exclusão de registros e alteração de parâmetros.
  - **E-mail:** `edinelsonept@gmail.com`
  - **Senha:** `@Coelho60`
- **Operador / Funcionário:** Registro de pagamentos, inclusão de clientes e novos empréstimos, com proteção contra exclusões acidentais e alteração de regras do negócio.
- Alternância dinâmica entre perfis para testes e operações em campo.

### 6.9 Backup, Restauração e Configurações
- Exportação completa da base de dados em formato JSON com 1 clique.
- Restauração de dados por importação de arquivo JSON.
- Opção para restaurar dados padrão de demonstração.
- Personalização de nome da empresa, telefone, WhatsApp, CNPJ e endereço exibidos nos recibos e relatórios.

---

## 🔥 Integração com Firebase

O aplicativo está conectado ao projeto **`credicontrol-8315e`**.

### Arquivos de Configuração
- **`firebase-applet-config.json`**: Contém as chaves públicas da aplicação (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId`).
- **`src/lib/firebase.ts`**: Inicializa as instâncias de `db` (Firestore), `auth` (Authentication) e `analytics` (Google Analytics).
- **`firestore.rules`**: Regras de segurança em nuvem configuradas para garantir que as coleções principais (`clients`, `loans`, `settings`, `test`) estejam protegidas e acessíveis por usuários autenticados da aplicação.

### Sincronização em Tempo Real
No `AppContext.tsx`, os dados são sincronizados através de ouvintes em tempo real (`onSnapshot`) com fallback automático para o `localStorage` do navegador, garantindo resiliência e funcionamento ininterrupto mesmo com oscilações de rede.

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: Versão 18 ou superior instalada.
- **npm** ou **yarn** ou **bun**.

### Passo a Passo

1. **Clone o repositório ou acesse a pasta do projeto:**
   ```bash
   cd credicontrol
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O aplicativo estará disponível em: `http://localhost:3000`

4. **Executar a checagem de tipos e lint:**
   ```bash
   npm run lint
   ```

5. **Gerar a compilação para produção:**
   ```bash
   npm run build
   ```

---

## 📜 Scripts Disponíveis

No arquivo `package.json`, estão configurados os seguintes comandos:

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor Vite na porta `3000` e host `0.0.0.0` |
| `npm run build` | Compila o aplicativo otimizado para o diretório `dist/` |
| `npm run preview` | Executa um servidor local servindo a pasta `dist/` |
| `npm run lint` | Executa o compilador TypeScript (`tsc --noEmit`) para validação de integridade |
| `npm run clean` | Remove as pastas de build (`dist/`) e arquivos temporários |

---

## 📄 Licença e Propriedade

Desenvolvido para **CrediControl - Gestão de Empréstimos Particulares**.  
Todos os direitos reservados. Uso restrito e confidencial para gestão de operações de crédito.
