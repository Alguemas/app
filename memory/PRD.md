# SimBet - Product Requirements Document (PRD)

## Vision
Um aplicativo que simula uma casa de apostas real (estilo Bet365/Sportingbet) para ajudar viciados em apostas a se recuperarem - como um "AA para apostadores". Todos os jogos usam moedas virtuais; é impossível depositar ou sacar dinheiro real.

## Core Features (v2 - sem Emergent)

### 1. Autenticação (100% própria, sem Emergent)
- **E-mail + senha** com bcrypt (12 rounds) e JWT HS256 stateless (7 dias)
  - POST `/api/auth/register` `{email, password, name}` → cria usuário com 200 moedas
  - POST `/api/auth/login` `{email, password}` → retorna `{user, session_token}`
  - Mensagens de erro em português
- **Login Google real** via SDK nativo `@react-native-google-signin/google-signin` (Android APK)
  - Fallback via `expo-auth-session/providers/google` para Expo Go / Web
  - Backend valida `id_token` com `google.oauth2.id_token.verify_oauth2_token`
  - POST `/api/auth/google` `{id_token}` → cria/atualiza usuário e emite JWT próprio
  - Vincula por `google_sub` (não por email) para segurança
  - Requer `GOOGLE_WEB_CLIENT_ID` (backend) e `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (frontend) — sem essas variáveis, o botão é desabilitado automaticamente
- Cada usuário começa com **200 moedas virtuais**
- Token guardado em `expo-secure-store` (mobile) ou `localStorage` (web)

### 2. Jogos Simulados (inalterados)
- **Apostas Esportivas**: 6 partidas hardcoded com odds
- **Crash (Aviator)**: multiplicador subindo com CASHOUT (house edge programado)
- **Slots**: 3 rolos, jackpot 7-7-7 = 20x, house edge

### 3. Depósito Falso (Privacidade Crítica)
- Formulário realista mas **cartão é DESCARTADO** no backend (validado por testing agent com scan completo do DB)

### 4. Camada de Conscientização
- Modal periódica no home + modal após perdas consecutivas
- Tela **Buscar Ajuda** com CVV 188, GA, SUS 132

### 5. Anúncios (AdMob)
- Placeholders no Expo Go, IDs reais no APK (mantido para versão futura)

## Data Persistence
**MongoDB:**
- `users`: user_id, email, name, picture, virtual_coins, password_hash (opcional), google_sub (opcional, sparse unique), auth_provider, created_at
- `bets`: bet_id, user_id, game, stake, multiplier, payout, won, label, created_at

**Índices:** users.email (unique), users.user_id (unique), users.google_sub (unique sparse), bets.user_id

**NUNCA salvo:** números de cartão, nome do titular, validade, CVV (validado com scan de DB)

## Design
- Tema dark neon (verde #22C55E + fundo verde-escuro #061A12)
- Formulários de auth com KeyboardAvoidingView + ScrollView
- Camada de conscientização em azul calmo

## Deploy
- Backend: qualquer VPS/Render/Railway (FastAPI + uvicorn + Caddy/Nginx HTTPS)
- APK: build local via `expo prebuild` + `./gradlew assembleRelease` (Android Studio + JDK 17)
- Manual completo: `/app/MANUAL_APK.md`
