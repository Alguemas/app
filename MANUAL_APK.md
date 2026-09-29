# 📱 Manual - SimBet APK (Android)

Este manual mostra como **rodar o backend em produção**, **configurar login Google real** e **gerar o APK localmente**, sem nenhuma dependência da Emergent.

---

## 🎯 O que mudou

- ✅ Login com **e-mail + senha** próprio (JWT)
- ✅ Login **Google real** via SDK nativo `@react-native-google-signin/google-signin`
- ✅ Fallback via navegador (Expo Go / Web) usando `expo-auth-session`
- ✅ Todos os endpoints com JWT stateless (nenhuma URL da Emergent)
- ✅ Ainda mantém 200 moedas iniciais + toda lógica de apostas

---

## 1) Rodar o backend em produção

O backend é FastAPI + MongoDB. Você pode hospedar em qualquer VPS (Contabo, Hetzner, Oracle Free), Render, Railway ou até em casa com um túnel Cloudflare.

**Passo a passo mínimo em VPS Ubuntu:**

```bash
# 1. Instalar dependências
sudo apt update && sudo apt install -y python3-pip python3-venv nginx
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb.gpg --dearmor
echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# 2. Clonar e configurar
git clone https://github.com/Alguemas/app.git simbet
cd simbet/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Criar .env de produção
cat > .env <<'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="simbet"
CORS_ORIGINS="*"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_EXPIRE_MINUTES=10080
GOOGLE_WEB_CLIENT_ID="COLOQUE_SEU_WEB_CLIENT_ID_AQUI"
EOF

# 4. Rodar como serviço
sudo tee /etc/systemd/system/simbet.service <<'EOF'
[Unit]
Description=SimBet API
After=network.target mongod.service
[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/simbet/backend
ExecStart=/home/ubuntu/simbet/backend/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now simbet

# 5. HTTPS com Caddy (mais simples que Nginx + Certbot)
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<'EOF'
seu-dominio.com {
  reverse_proxy /api/* localhost:8001
}
EOF
sudo systemctl restart caddy
```

Depois anote a URL final HTTPS (ex.: `https://api.seuapp.com`). Ela vai no `frontend/.env` como `EXPO_PUBLIC_BACKEND_URL`.

> **Alternativa grátis sem VPS:** use **Render.com** (free tier), **Fly.io** ou **Railway.app**. Basta apontar o serviço para `backend/` e definir as variáveis de ambiente acima.

---

## 2) Configurar Google Sign-In (opcional, mas recomendado)

Se você **não quer** login Google, pode pular esta seção. O app funciona só com e-mail/senha.

### 2.1 Google Cloud Console

1. Acesse https://console.cloud.google.com/ e crie um projeto (ex.: `simbet-app`).
2. Vá em **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: `SimBet`, e-mail de suporte, developer contact
   - Scopes: `openid`, `email`, `profile`
   - Adicione seu e-mail como **test user** (enquanto estiver em modo Testing)
3. Vá em **APIs & Services → Credentials → Create Credentials → OAuth client ID**:

   **a) Client ID tipo Web application:**
   - Name: `SimBet Web`
   - Authorized JavaScript origins: `http://localhost:8081` (dev), sua URL de produção
   - **Anote o Client ID** → este é o `GOOGLE_WEB_CLIENT_ID` (usado no backend E no frontend)

   **b) Client ID tipo Android:**
   - Name: `SimBet Android`
   - Package name: `com.simbet.app` (o mesmo do `app.json`)
   - SHA-1: rode o comando abaixo depois de gerar o keystore (passo 3.2)

### 2.2 Colocar as chaves nos `.env`

**Backend** (`/backend/.env`):
```env
GOOGLE_WEB_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
```

**Frontend** (`/frontend/.env`):
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=987654321-xyzwww.apps.googleusercontent.com
```

> ⚠️ O SDK nativo do Google usa o **Web Client ID** como `webClientId` (não é bug, é assim mesmo). O Android Client ID só é necessário para o fluxo browser em Expo Go.

---

## 3) Gerar o APK localmente (Android Studio, 100% grátis, sem fila)

### 3.1 Pré-requisitos

Instale no seu computador:

| Ferramenta | Como instalar |
|---|---|
| **Node.js 20+** | https://nodejs.org/ |
| **Yarn 1.x** | `npm i -g yarn` |
| **Java JDK 17** | https://adoptium.net/temurin/releases/?version=17 |
| **Android Studio** | https://developer.android.com/studio |

No Android Studio:
1. **SDK Manager → SDK Platforms**: instale Android 14 (API 34)
2. **SDK Manager → SDK Tools**: marque `Android SDK Build-Tools 34.0.0`, `Android SDK Command-line Tools`, `Android SDK Platform-Tools`

Configure variáveis de ambiente (Linux/Mac em `~/.bashrc`, Windows em Painel de Controle):
```bash
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
# export ANDROID_HOME=$HOME/Library/Android/sdk  # Mac
# Windows: C:\Users\SEU_USER\AppData\Local\Android\Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which javac))))
```

### 3.2 Gerar keystore de release

Faça uma única vez e **guarde bem** este arquivo (perdeu = não consegue mais atualizar o app na loja):

```bash
cd frontend
mkdir -p android-keys
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android-keys/simbet-release.keystore \
  -alias simbet -keyalg RSA -keysize 2048 -validity 10000
# Anote a senha do keystore e a senha da alias!
```

**Pegar o SHA-1** para colar no Google Cloud Console (passo 2.1):
```bash
keytool -list -v -keystore android-keys/simbet-release.keystore -alias simbet
# procure a linha "SHA1:" - copie
```

Cole o SHA-1 em Google Cloud → Credentials → seu Android OAuth Client.

### 3.3 Prebuild (gera pasta nativa `android/`)

```bash
cd frontend
yarn install
npx expo prebuild --clean --platform android
```

Isso cria a pasta `frontend/android/` com o projeto Gradle. Você **NÃO precisa comitar essa pasta** (fica no `.gitignore` do Expo).

### 3.4 Configurar assinatura de release

Edite `frontend/android/gradle.properties` e adicione ao final:

```properties
SIMBET_UPLOAD_STORE_FILE=../../android-keys/simbet-release.keystore
SIMBET_UPLOAD_KEY_ALIAS=simbet
SIMBET_UPLOAD_STORE_PASSWORD=SUA_SENHA_KEYSTORE
SIMBET_UPLOAD_KEY_PASSWORD=SUA_SENHA_ALIAS
```

Edite `frontend/android/app/build.gradle`, dentro do bloco `android { ... }`:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('SIMBET_UPLOAD_STORE_FILE')) {
            storeFile file(SIMBET_UPLOAD_STORE_FILE)
            storePassword SIMBET_UPLOAD_STORE_PASSWORD
            keyAlias SIMBET_UPLOAD_KEY_ALIAS
            keyPassword SIMBET_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

### 3.5 Compilar o APK

```bash
cd frontend/android
./gradlew assembleRelease         # Linux/Mac
# gradlew.bat assembleRelease     # Windows
```

Aguarde 3-10 min. O APK final estará em:

```
frontend/android/app/build/outputs/apk/release/app-release.apk
```

Instale no celular via ADB ou copiando o arquivo:
```bash
adb install -r frontend/android/app/build/outputs/apk/release/app-release.apk
```

### 3.6 Rebuilds

Para gerar nova versão, incremente o `versionCode` em `android/app/build.gradle` e rode `./gradlew assembleRelease` de novo. **Não precisa refazer prebuild** a menos que mude `app.json` ou plugins.

---

## 4) Testar

Antes de compilar o APK, valide localmente:

```bash
# Backend
cd backend && source .venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Frontend (em outro terminal)
cd frontend
EXPO_PUBLIC_BACKEND_URL=http://SEU_IP_LAN:8001 npx expo start
```

Cheque:
- ✅ Cadastro cria usuário com 200 moedas
- ✅ Login com e-mail/senha funciona
- ✅ Google só aparece se `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` estiver setado
- ✅ Sessão persiste depois de fechar o app

---

## 5) FAQ

**Q: "Network request failed" no APK real**
→ APK real não enxerga `localhost` nem `10.0.2.2`. Use URL HTTPS pública (passo 1).

**Q: Login Google diz "DEVELOPER_ERROR"**
→ SHA-1 ou package name errado no Google Cloud. Refaça o passo 2.1.b com o SHA-1 do keystore de release.

**Q: "Token do Google inválido"**
→ O `GOOGLE_WEB_CLIENT_ID` do backend precisa ser **igual** ao do frontend (o Web ID, não o Android ID).

**Q: Onde vejo os logs do backend em produção?**
→ `sudo journalctl -u simbet -f`

**Q: Como reverter para só e-mail/senha?**
→ Deixe `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` vazio no frontend/.env. O botão Google fica desabilitado automaticamente.
