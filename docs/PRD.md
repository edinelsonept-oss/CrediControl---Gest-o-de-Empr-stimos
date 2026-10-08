# Documento de Requisitos do Produto (PRD)
## CrediControl — Sistema de Gestão de Empréstimos e Cobrança

---

### Informações do Documento
- **Produto:** CrediControl (Gestão de Empréstimos e Carteira Particular)
- **Versão do Documento:** 1.0.0
- **Status:** Aprovado / Em Produção
- **Data da Última Atualização:** Outubro de 2026
- **Público-Alvo do Documento:** Desenvolvedores, Gerentes de Produto, Administradores Financeiros e Auditores

---

## 1. Visão Geral e Objetivos do Produto

### 1.1 Declaração do Problema
Operações de concessão de crédito direto e empréstimos particulares sofrem comumente com:
1. **Controle descentralizado:** Uso de cadernos, planilhas dispersas e anotações manuais suscetíveis a perda de dados e fraudes.
2. **Inadimplência descontrolada:** Ausência de cálculo automático e diário de multas por atraso e falta de régua de cobrança preventiva.
3. **Falta de formalização jurídica:** Dificuldade em emitir rapidamente Notas Promissórias e Contratos com dados completos de ambas as partes.
4. **Logística ineficiente de campo:** Cobradores de rua sem itinerário visual dos clientes devedores e endereços sem geolocalização.
5. **Risco de segurança e integridade:** Vulnerabilidade a acessos não autorizados de funcionários a dados sigilosos e ausência de trilha de auditoria para pagamentos recebidos.

### 1.2 Proposta de Valor
O **CrediControl** é uma plataforma financeira completa e responsiva projetada especificamente para gestores de crédito particular, factoring e operadores financeiros autônomos. Ele unifica o ciclo de vida do crédito: desde a análise e cadastro de clientes (KYC com validação de CPF e captura de documentos), emissão do empréstimo e geração instantânea de Nota Promissória, até a régua de cobrança multicanal (WhatsApp com mensagens inteligentes), mapa interativo de devedores, baixa atômica de parcelas com controle de multas diárias, e trilha de auditoria antifraude com RBAC.

### 1.3 Objetivos Estratégicos & Métricas de Sucesso (KPIs)
* **Redução da Inadimplência:** Reduzir em 35% o atraso médio de parcelas através de notificações preventivas (3 dias antes, 1 dia antes e no dia do vencimento).
* **Eficiência Operacional:** Reduzir o tempo de concessão e formalização de um empréstimo para menos de 2 minutos.
* **Integridade Financeira:** 100% de consistência contábil com eliminação de perdas por conciliação através de transações atômicas ACID.
* **Governança e Rastreabilidade:** Registro auditável de 100% dos eventos sensíveis (criação, edição, baixa e exclusão).

---

## 2. Personas e Perfis de Acesso (RBAC)

O sistema adota o **Princípio do Menor Privilégio** e divide seus usuários em dois perfis fundamentais:

| Papel | Descrição | Permissões Chave | Restrições |
| :--- | :--- | :--- | :--- |
| **Administrador (Admin)** | Proprietário do negócio ou Diretor Financeiro | Acesso total: criação/edição/exclusão de clientes e empréstimos; gestão de funcionários; configuração de taxas e multas; acesso aos logs de auditoria; geração e restauração de backups com checksum; relatórios consolidados de rentabilidade e DRE. | Nenhuma |
| **Colaborador / Cobrador (Employee)** | Operador de atendimento, cobrador de rua ou atendente | Consulta à carteira de clientes; visualização de rotas no mapa; criação de novas propostas de empréstimo; registro de pagamentos e baixas de parcelas; envio de mensagens de cobrança via WhatsApp; upload de documentos de clientes. | Não pode excluir clientes ou contratos; não pode acessar logs de auditoria; não pode alterar configurações do sistema; não pode restaurar backups; não pode gerenciar outros colaboradores. |

---

## 3. Requisitos Funcionais (RF)

### RF01: Autenticação, Controle de Acesso e Gestão de Equipe
* **RF01.1:** Login seguro para Administrador (via e-mail administrativo autenticado via Firebase Auth / credenciais de sistema).
* **RF01.2:** Login dedicado para Colaboradores através de validação de e-mail ativo e senha individual cadastrada pelo Administrador.
* **RF01.3:** Gestão de Colaboradores: Cadastro, edição de função (ex.: *Cobrador de Campo*, *Atendente*, *Operador Financeiro*), ativação/desativação imediata de acesso.
* **RF01.4:** Recuperação de senha segura com fluxo orientado a e-mail cadastrado.
* **RF01.5:** Registro em log de auditoria de todas as sessões de login e logout com timestamp e papel de usuário.

### RF02: Gestão de Clientes e Validação Cadastral (KYC)
* **RF02.1:** Cadastro completo contendo: Nome Completo, CPF, RG, Data de Nascimento, Telefone, WhatsApp, E-mail, Endereço estruturado (CEP, Rua, Número, Bairro, Cidade, Estado, Complemento).
* **RF02.2 (Validação Estrita de CPF):** Validação matemática obrigatória pelo algoritmo do **Módulo 11** (rejeição automática de CPFs com dígitos inválidos ou números repetidos como `111.111.111-11`).
* **RF02.3 (Higienização e Proteção):** Sanitização contra injeção de scripts (XSS) e caracteres de controle em todos os campos textuais.
* **RF02.4 (Documentoscopia / Scanner):** Upload e visualização de documentos do cliente categorizados em: *Comprovante de Residência*, *RG / CNH*, *Foto da Fachada da Residência*, *Selfie com Documento*, *Contrato Assinado* e *Outros*.
* **RF02.5 (Captura por Câmera Web/Mobile):** Módulo de digitalização com suporte a acesso à câmera nativa para fotos em campo de documentos e comprovantes.
* **RF02.6 (Geocodificação de Endereço):** Armazenamento de latitude e longitude do cliente para posicionamento geoespacial em mapa.

### RF03: Motor Financeiro e Gestão de Empréstimos
* **RF03.1 (Modalidades de Pagamento):**
  * *Pagamento Único (30 dias):* Amortização integral com juros aplicados no vencimento.
  * *Parcelado Mensal:* Divisão em $N$ parcelas iguais com datas de vencimento sequenciais a cada 30 dias.
  * *Diário (Segunda a Sábado ou Corridos):* Parcelas diárias pré-calculadas para cobradores de rota diária.
* **RF03.2 (Cálculo Financeiro):**
  * Juros configuráveis (padrão de 30% ou personalizado na criação do contrato).
  * Valor Total = Principal + (Principal $\times$ Taxa / 100).
  * Arredondamento monetário estrito para duas casas decimais ($R\$$).
* **RF03.3 (Cálculo Dinâmico de Multas por Atraso):**
  * Multa fixa por dia de atraso (padrão $R\$\;20,00$/dia, parametrizável pelo Administrador).
  * O sistema calcula dinamicamente os dias de atraso a cada virada de dia e atualiza o montante devido da parcela em tempo real:
    $$\text{Saldo Devedor da Parcela} = (\text{Valor Original} - \text{Valor Pago}) + (\text{Dias de Atraso} \times \text{Multa Diária})$$
* **RF03.4 (Status de Contratos e Parcelas):**
  * `em_dia`: Nenhuma parcela vencida e prazo regular.
  * `proximo_vencimento`: Parcela com vencimento previsto nos próximos 3 dias.
  * `em_atraso`: Pelo menos uma parcela não quitada com data de vencimento anterior à data atual.
  * `quitado`: Saldo devedor total igual a zero ($100\%$ das parcelas pagas).

### RF04: Formalização Jurídica e Emissão de Documentos
* **RF04.1 (Geração de Nota Promissória):** Emissão instantânea em formato padronizado com validade de título executivo extrajudicial, contendo: Número de emissão, valor nominal por extenso, data de vencimento, dados do credor, dados do devedor (CPF, RG e endereço completo), cláusula de juros e mora, e campo de assinatura física ou digital.
* **RF04.2 (Recibo de Pagamento / Quitação):** Emissão de comprovante detalhado a cada baixa de pagamento, especificando parcelas amortizadas, multas quitadas e saldo devedor remanescente.
* **RF04.3 (Impressão e Exportação PDF):** Suporte nativo para impressão direta e download de relatórios e comprovantes.

### RF05: Régua de Cobrança e Notificações via WhatsApp
* **RF05.1 (Alertas Preditivos do Dashboard):** Identificação em destaque de:
  * Vencendo Hoje.
  * Vencendo Amanhã.
  * Vencendo em 3 Dias.
  * Em Atraso Crítico (com contador de dias de atraso e valor acumulado de multa).
* **RF05.2 (Disparo via WhatsApp):** Botão de ação rápida que abre a conversa no WhatsApp Web ou App do cliente com texto pré-redigido contextualizado:
  * *Lembrete Amigável:* "Olá [Nome], seu empréstimo vence em [Data]..."
  * *Cobrança de Atraso:* "Olá [Nome], sua parcela venceu há [Dias] dias. O valor atualizado com a multa diária de R$ [Valor Multa] é de R$ [Total Devido]..."
  * *Confirmação de Baixa:* "Recebemos o pagamento de R$ [Valor] referente à parcela [X]..."

### RF06: Registro de Pagamentos com Integridade Transacional (ACID)
* **RF06.1 (Baixas Parciais e Totais):** Suporte ao recebimento integral ou parcial de parcelas.
* **RF06.2 (Ordem de Amortização Financeira):** Amortização preferencial: Multas Acumuladas $\rightarrow$ Juros de Mora $\rightarrow$ Principal da Parcela.
* **RF06.3 (Métodos de Pagamento):** Suporte a PIX, Dinheiro em Espécie, Transferência Bancária e Cartão.
* **RF06.4 (Transações Atômicas via Firestore):** Execução da baixa de pagamento através de `runTransaction`, impedindo concorrência, pagamentos duplicados ou valores negativos.
* **RF06.5 (Imutabilidade de Baixas):** Proibição de valores de pagamento superiores ao saldo devedor ou menores/iguais a zero.

### RF07: Mapeamento Geográfico e Roteirização de Cobrança
* **RF07.1 (Visualização em Mapa Interativo):** Plotagem geoespacial de todos os clientes cadastrados com marcadores coloridos conforme o status:
  * Verde: Em dia.
  * Amarelo: Vencendo em breve.
  * Vermelho: Em atraso.
* **RF07.2 (Cartão de Cliente no Mapa):** Ao clicar no marcador, exibição de nome, telefone, valor devido, dias de atraso e atalho para abrir o GPS (Google Maps / Waze) até a residência do cliente.
* **RF07.3 (Filtro por Região / Bairro):** Localização ágil para equipes de cobradores organizarem rotas de visita física.

### RF08: Dashboard Executivo e Relatórios Gerenciais
* **RF08.1 (Indicadores Chave - KPI Cards):**
  * Capital Total Emprestado (Principal investido acumulado).
  * Lucro Total Projetado vs. Realizado (Juros contratados vs. Juros recebidos).
  * Saldo Total a Receber em Aberto.
  * Total de Multas Acumuladas por Atraso.
  * Taxa de Inadimplência da Carteira (% de contratos e capital em atraso).
* **RF08.2 (Gráficos e Projeções Financeiras):**
  * Evolução de Empréstimos Mês a Mês.
  * Distribuição da Carteira por Status.
  * Previsão de Entradas Financeiras por Semana/Mês.
* **RF08.3 (Exportação de Dados):** Exportação de relatórios em CSV/Excel e relatórios para prestação de contas.

### RF09: Segurança, Trilha de Auditoria e Backup
* **RF09.1 (Trilha de Auditoria Imutável - Audit Trail):**
  * Registro de ações críticas: `CREATE_CLIENT`, `UPDATE_CLIENT`, `DELETE_CLIENT`, `CREATE_LOAN`, `DELETE_LOAN`, `REGISTER_PAYMENT`, `UPDATE_SETTINGS`, `AUTH_LOGIN`, `DATABASE_RESTORE`.
  * Metadados registrados: ID do usuário executor, Nome, E-mail, Papel (`admin` / `employee`), Timestamp UTC, Dados alterados (com mascaramento de senhas e dados confidenciais).
  * Regras do Firestore proíbem terminantemente a exclusão ou alteração de registros da coleção `audit_logs`.
* **RF09.2 (Backup Criptograficamente Assinado com SHA-256):**
  * Exportação de backup completo em JSON contendo clientes, contratos, colaboradores e configurações.
  * Cálculo de Hash SHA-256 de integridade no cabeçalho do arquivo.
  * Na restauração, o sistema recalcula o SHA-256 e recusa a importação caso o arquivo tenha sido adulterado manualmente.

---

## 4. Requisitos Não-Funcionais (RNF)

| Identificador | Categoria | Descrição |
| :--- | :--- | :--- |
| **RNF01** | **Arquitetura & Resiliência** | Arquitetura *Offline-First* com persistência dupla: LocalStorage de sincronização imediata + Nuvem Cloud Firestore com sincronização assíncrona tolerante a falhas de rede. |
| **RNF02** | **Desempenho** | Tempo de resposta para consultas, filtros e cálculos no dashboard inferior a 200ms na interface cliente. |
| **RNF03** | **Segurança da Informação** | Implementação de RBAC estrito via Firestore Security Rules; bloqueio de deleção para usuários sem papel `admin`; proteção contra ataques OWASP Top 10 (XSS, NoSQL Injection, Broken Object Level Authorization). |
| **RNF04** | **Conformidade LGPD** | Mascaramento de dados sensíveis em relatórios de auditoria; senhas criptografadas; garantia de direitos do titular para atualização de dados. |
| **RNF05** | **Responsividade & UX** | Interface desenvolvida em Tailwind CSS com padrão *Mobile-First*, garantindo usabilidade total em smartphones (telas de 360px a 430px de cobradores de rua) e monitores desktop ultrawide. |
| **RNF06** | **Compatibilidade de Plataforma** | Compatibilidade com Google Chrome, Safari Mobile, Mozilla Firefox, Microsoft Edge e WebViews de dispositivos móveis Android/iOS. |

---

## 5. Modelo de Dados e Esquema de Coleções (Firestore)

### 5.1 Coleção: `clients`
Armazena o dossiê cadastral de tomadores de empréstimo.
```json
{
  "id": "cli_uuid_123",
  "fullName": "João Carlos da Silva",
  "cpf": "123.456.789-00",
  "rg": "12.345.678-9 SSP/SP",
  "birthDate": "1985-04-12",
  "phone": "(11) 98765-4321",
  "whatsapp": "(11) 98765-4321",
  "email": "joao.carlos@email.com",
  "address": {
    "cep": "01001-000",
    "street": "Praça da Sé",
    "number": "100",
    "neighborhood": "Sé",
    "city": "São Paulo",
    "state": "SP",
    "complement": "Apto 32"
  },
  "location": {
    "lat": -23.55052,
    "lng": -46.633308,
    "addressFormatted": "Praça da Sé, 100 - Sé, São Paulo - SP"
  },
  "documents": [
    {
      "id": "doc_1",
      "type": "rg_cnh",
      "name": "cnh_frente_verso.jpg",
      "url": "data:image/jpeg;base64,...",
      "fileType": "image",
      "uploadedAt": "2026-10-01T14:30:00Z"
    }
  ],
  "photoUrl": "data:image/jpeg;base64,...",
  "notes": "Cliente indicado por Maria da Padaria",
  "createdAt": "2026-10-01T14:00:00Z"
}
```

### 5.2 Coleção: `loans`
Contratos de empréstimo financeiro e cronograma de amortização.
```json
{
  "id": "loan_uuid_456",
  "clientId": "cli_uuid_123",
  "clientName": "João Carlos da Silva",
  "clientPhone": "(11) 98765-4321",
  "clientWhatsapp": "(11) 98765-4321",
  "principalAmount": 1000.00,
  "interestRatePercent": 30.0,
  "interestAmount": 300.00,
  "totalOriginalAmount": 1300.00,
  "loanDate": "2026-10-01",
  "dueDate": "2026-10-31",
  "paymentFrequency": "pagamento_unico_30",
  "installmentsCount": 1,
  "dailyFineAmount": 20.00,
  "installments": [
    {
      "id": "inst_1",
      "number": 1,
      "dueDate": "2026-10-31",
      "amount": 1300.00,
      "paidAmount": 0.00,
      "status": "em_dia",
      "delayDays": 0,
      "fineAmount": 0.00
    }
  ],
  "payments": [],
  "status": "em_dia",
  "notes": "Primeiro empréstimo particular",
  "createdAt": "2026-10-01T14:15:00Z"
}
```

### 5.3 Coleção: `employees`
Colaboradores autorizados com perfil subordinado.
```json
{
  "id": "emp_uuid_789",
  "name": "Lucas Cobrador",
  "email": "lucas.cobranca@credicontrol.com",
  "password": "senha_segura_cadastrada",
  "role": "employee",
  "roleTitle": "Cobrador de Campo",
  "phone": "(11) 99999-8888",
  "status": "active",
  "createdAt": "2026-10-02T10:00:00Z",
  "createdByName": "Edinelson (Admin)"
}
```

### 5.4 Coleção: `settings` (Documento: `config`)
Parâmetros globais de negócio da empresa credora.
```json
{
  "defaultInterestRate": 30.0,
  "defaultDailyFine": 20.00,
  "reminderDaysBefore": [3, 1, 0],
  "companyName": "CrediControl Soluções Financeiras",
  "companyPhone": "(11) 3333-4444",
  "companyWhatsapp": "(11) 99999-0000",
  "companyAddress": "Av. Paulista, 1000 - São Paulo, SP",
  "companyCnpj": "12.345.678/0001-90",
  "theme": "dark"
}
```

### 5.5 Coleção: `audit_logs` (Imutável)
Registro de auditoria forense com retenção permanente.
```json
{
  "id": "audit_uuid_999",
  "action": "REGISTER_PAYMENT",
  "entityType": "loan",
  "entityId": "loan_uuid_456",
  "userId": "emp_uuid_789",
  "userName": "Lucas Cobrador",
  "userEmail": "lucas.cobranca@credicontrol.com",
  "userRole": "employee",
  "timestamp": "2026-10-08T15:00:00Z",
  "details": {
    "amountPaid": 650.00,
    "paymentMethod": "pix",
    "installmentNumber": 1,
    "remainingBalance": 650.00
  }
}
```

---

## 6. Regras de Negócio Fundamentais (RN)

* **RN01 (Regra de Cálculo de Amortização):**
  O saldo total devido é a soma do principal reajustado com juros somado às multas diárias incidentes sobre todas as parcelas não quitadas cuja data de vencimento seja anterior ao dia de cálculo:
  $$\text{Dívida Total Atualizada} = \sum (\text{Valor Parcela}_i - \text{Valor Pago}_i) + \sum (\text{Dias de Atraso}_i \times \text{Multa Diária})$$
* **RN02 (Ordem de Liquidação de Valores):**
  Ao receber qualquer quantia, o sistema quita primeiramente o montante de multas diárias acumuladas da parcela mais antiga em atraso antes de amortizar o valor principal da parcela.
* **RN03 (Proibição de Deleção de Clientes com Contratos Ativos):**
  Um cliente só pode ser excluído do sistema se todos os seus empréstimos estiverem no status `quitado` ou se o Administrador explicitamente confirmar a exclusão conjunta de todos os contratos vinculados.
* **RN04 (Unicidade e Consistência de CPF):**
  Não é permitido cadastrar dois clientes distintos com o mesmo número de CPF.
* **RN05 (Concessão Bloqueada para Inadimplentes Críticos):**
  O sistema emite um alerta visual impeditivo no modal de novo empréstimo caso o cliente selecionado possua outro contrato com parcelas em atraso há mais de 15 dias.
* **RN06 (Imutabilidade de Histórico de Auditoria):**
  Nenhum usuário, mesmo o Administrador, tem permissão de apagar ou editar logs da coleção `audit_logs`.

---

## 7. Matriz de Rastreabilidade de Requisitos

| ID | Funcionalidade | Componente UI | Camada de Serviço | Coleção Firestore |
| :--- | :--- | :--- | :--- | :--- |
| **RF01** | Autenticação & Equipe | `LoginView.tsx`, `EmployeesView.tsx` | `AppContext.tsx` | `employees` |
| **RF02** | Cadastro KYC de Clientes | `ClientFormModal.tsx`, `ClientList.tsx` | `securityValidator.ts` | `clients` |
| **RF02.4** | Scanner de Documentos | `DocumentScannerModal.tsx` | `AppContext.tsx` | `clients.documents` |
| **RF03** | Motor de Empréstimos | `LoanFormModal.tsx`, `LoanList.tsx` | `calculations.ts` | `loans` |
| **RF04** | Nota Promissória e Recibos | `LoanDetailModal.tsx` | `calculations.ts` | `loans` |
| **RF05** | Régua de WhatsApp | `Dashboard.tsx`, `LoanList.tsx` | `calculations.ts` | `loans` |
| **RF06** | Baixa de Pagamentos ACID | `PaymentModal.tsx` | `financialTransactions.ts` | `loans.payments` |
| **RF07** | Mapa de Clientes / GPS | `MapView.tsx` | `AppContext.tsx` | `clients.location` |
| **RF08** | Relatórios e Indicadores | `Dashboard.tsx`, `ReportsView.tsx` | `calculations.ts` | Agregação |
| **RF09** | Trilha de Auditoria | `SettingsView.tsx` | `auditLogger.ts` | `audit_logs` |
| **RF09.2** | Backup SHA-256 | `SettingsView.tsx` | `backupService.ts` | Exportação Full |

---

## 8. Roadmap de Evolução e Futuras Releases

### Fase 1: Fundação & Operação Diária *(Atual)*
- [x] CRUD completo de Clientes, Contratos e Colaboradores.
- [x] Cálculo dinâmico de multas por atraso e juros de 30%.
- [x] Transações atômicas ACID no Firestore para pagamentos.
- [x] Módulo 11 para validação de CPF e sanitização de dados.
- [x] Trilha de auditoria imutável e backup assinado com SHA-256.
- [x] Geração de Notas Promissórias e alertas WhatsApp.
- [x] Mapa com geolocalização dos tomadores de empréstimo.

### Fase 2: Automação Bancária & PIX *(Próxima Fase)*
- [ ] Integração com Gateway de Pagamento PIX (geração automática de QR Code dinâmico Copia e Cola para cada parcela).
- [ ] Webhook de confirmação instantânea de pagamento PIX com baixa automática sem intervenção manual.
- [ ] Envio automático de mensagens no WhatsApp via API oficial (WhatsApp Business API / Meta Cloud API) disparadas por cron job às 08:00 diariamente.

### Fase 3: Assinatura Eletrônica e Jurídico Avançado
- [ ] Assinatura eletrônica de contratos e Notas Promissórias na tela do dispositivo (touchscreen/biometria) com gravação de IP, geolocalização e carimbo de tempo.
- [ ] Exportação de dossiê para execução jurídica e cobrança extrajudicial contendo histórico completo de notificações e comprovantes de recusa.
- [ ] Suporte a PWA offline completo com Service Workers e fila de sincronização em segundo plano (*Background Sync*).
