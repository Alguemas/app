# SimBet - Product Requirements Document (PRD)

## Vision
Um aplicativo que simula uma casa de apostas real (estilo Bet365/Sportingbet) para ajudar viciados em apostas a se recuperarem - como um "AA para apostadores". Todos os jogos usam moedas virtuais; é impossível depositar ou sacar dinheiro real.

## Core Features (v1)

### 1. Autenticação
- Login Social com Google (Emergent-managed OAuth)
- Cada usuário começa com **200 moedas virtuais**
- Session token com validade de 7 dias (expo-secure-store no mobile, localStorage no web)

### 2. Jogos Simulados
- **Apostas Esportivas**: 6 partidas hardcoded (Brasileirão, Premier League, La Liga, NBA, Libertadores) com odds Casa/Empate/Fora. Boletim múltiplo com odds combinadas.
- **Crash (Aviator)**: Multiplicador subindo com botão CASHOUT. Casa tem edge programado (crash bias em multiplicadores baixos).
- **Slots**: 3 rolos com 6 símbolos. Jackpot 7-7-7 = 20x, 3 iguais = 5x, 2 iguais = 1.5x. House edge biased.

### 3. Depósito Falso (Privacidade Crítica)
- Formulário realista de cartão de crédito (número, nome, validade, CVV)
- **CARTÃO É DESCARTADO**: nenhum dado do cartão é enviado ao backend nem salvo
- Backend `/api/user/deposit` recebe apenas o campo `amount`; campos de cartão são aceitos pelo Pydantic e imediatamente descartados
- Após "sucesso", exibe modal de conscientização

### 4. Camada de Conscientização
- Modal periódica no home (a cada 5 minutos) com mensagens motivacionais
- Modal automática após 3 perdas consecutivas no Crash, 4 no Slots, 3 no Sports
- Tela dedicada **Buscar Ajuda** com:
  - CVV 188 (Centro de Valorização da Vida)
  - CVV Chat Online
  - Jogadores Anônimos GA
  - SUS 132 (CAPS)
  - Fatos sobre vício em apostas (OMS CID-11, sinais de alerta, house edge)

### 5. Anúncios (Google AdMob)
- Banner topo e rodapé em todas as telas principais (Home, Sports, Casino, Profile, Crash, Slots)
- Interstitial popup ao ganhar apostas
- **Preview (Expo Go)**: placeholder "Espaço de anúncio Google"
- **Build nativo**: IDs reais AdMob fornecidos pelo usuário:
  - Android App ID: `ca-app-pub-9217530735639061~8432409382`
  - Banner Top: `ca-app-pub-9217530735639061/7477998903`
  - Banner Bottom: `ca-app-pub-9217530735639061/4411449492`
  - Interstitial: `ca-app-pub-9217530735639061/5454892257`

## Data Persistence

**Salvo no MongoDB:**
- `users`: user_id, email, name, picture, virtual_coins, created_at
- `user_sessions`: session_token, user_id, expires_at (TTL), created_at
- `bets`: bet_id, user_id, game, stake, multiplier, payout, won, label, created_at

**NUNCA salvo:**
- Números de cartão
- Nomes de titular
- Data de validade
- CVV

## Design
- Tema dark neon (verde #22C55E + vermelho #EF4444 + fundo verde-escuro #061A12)
- Estética visual copiada de casas de apostas reais para máxima imersão
- Camada de conscientização em azul calmo (#1E3A8A) para contraste emocional

## Estrutura
- Bottom tabs: Início · Esportes · Cassino · Perfil
- Rotas modais: /deposit
- Rotas stack: /crash, /slots, /help
