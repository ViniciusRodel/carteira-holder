# Carteira Holder — App Desktop

App desktop de controle e rebalanceamento de carteira de investimentos, com as
mesmas funcionalidades da planilha Excel: Dashboard, Cotações, Carteira Meta
(por classe e por ativo), Posição Atual e Rebalanceamento.

Construído com **React** (interface) + **Tauri** (casca desktop). A interface
é 100% reaproveitável numa versão web futura — ver seção "Migrar para web".

---

## 1. Pré-requisitos

Antes de rodar o projeto, instale:

1. **Node.js** 18 ou superior — https://nodejs.org
2. **Rust** (exigido pelo Tauri) — https://www.rust-lang.org/tools/install
3. **Dependências de sistema do Tauri** — variam por SO, siga o guia oficial:
   https://tauri.app/v1/guides/getting-started/prerequisites
   - **Windows**: Microsoft Visual Studio C++ Build Tools + WebView2 (geralmente já vem com o Windows 10/11)
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Linux**: pacotes `webkit2gtk`, `libssl-dev`, `libgtk-3-dev` (nomes variam por distro)

## 2. Instalação

```bash
npm install
```

## 3. Rodando em modo desenvolvimento

```bash
npm run tauri:dev
```

Isso abre uma janela nativa do app com hot-reload — qualquer alteração no
código React aparece na hora, sem precisar reiniciar.

Se quiser testar só a interface no navegador (mais rápido para ajustes
visuais, sem precisar do Rust/Tauri compilado):

```bash
npm run dev
```

e abra `http://localhost:1420`.

## 4. Gerando o instalador (build de produção)

```bash
npm run tauri:build
```

O instalador final aparece em `src-tauri/target/release/bundle/` — o formato
varia por sistema operacional (`.msi`/`.exe` no Windows, `.dmg`/`.app` no
macOS, `.deb`/`.AppImage` no Linux). Cada SO só gera o instalador para si
mesmo — para distribuir nos três, é preciso buildar em cada um (ou usar uma
pipeline de CI multiplataforma, ex. GitHub Actions com `tauri-action`).

## 5. Ícones do app

Os ícones em `src-tauri/icons/` são **placeholders funcionais** (um "CH"
simples). Para gerar o conjunto completo e definitivo a partir de uma
imagem própria (logo em alta resolução, idealmente PNG quadrado 1024×1024):

```bash
npm run tauri icon caminho/para/seu-logo.png
```

Isso substitui automaticamente todos os formatos (`.ico`, `.icns`, PNGs em
várias resoluções) dentro de `src-tauri/icons/`.

## 6. Fontes (opcional)

Por padrão o app usa fontes do sistema operacional (sem precisar de
internet). Para usar a identidade visual original (Fraunces + Inter +
JetBrains Mono):

1. Baixe os arquivos `.woff2` de:
   - Fraunces: https://fonts.google.com/specimen/Fraunces
   - Inter: https://fonts.google.com/specimen/Inter
   - JetBrains Mono: https://www.jetbrains.com/lp/mono/
2. Coloque-os em `src/assets/fonts/`
3. Descomente os blocos `@font-face` em `src/styles/fonts.css` e ajuste os
   nomes de arquivo se necessário

## 7. Onde ficam os dados

Hoje os dados (ativos, metas, posição) são salvos em `localStorage`, isto é,
no próprio computador onde o app roda — cada instalação tem seus próprios
dados, sem sincronização entre dispositivos. Veja `src/lib/storage.js`.

---

## Estrutura do projeto

```
carteira-holder/
├── src/
│   ├── pages/              Telas (Dashboard, Cotações, Meta-Classes, ...)
│   ├── components/         Peças reutilizáveis (Sidebar, Card, Gráficos, ...)
│   ├── lib/
│   │   ├── calculos.js     Lógica de cálculo pura (idêntica à da planilha)
│   │   ├── CarteiraContext.jsx  Estado global da aplicação
│   │   ├── storage.js      Camada de persistência (hoje: localStorage)
│   │   ├── dadosIniciais.js     Dados de exemplo (seed)
│   │   ├── formato.js      Formatação de moeda/percentual/número
│   │   └── coresClasse.js  Mapeamento cor <-> classe de ativo
│   ├── styles/              CSS (tokens de design, layout, componentes)
│   ├── App.jsx               Rotas
│   └── main.jsx              Ponto de entrada React
├── src-tauri/                Casca desktop (Rust) — só isso muda ao ir para web
├── index.html
├── package.json
└── vite.config.js
```

A pasta **`src/`** é exatamente o que se reaproveita numa versão web. A pasta
**`src-tauri/`** é a única parte específica de desktop.

---

## Migrar para web no futuro

Quando chegar a hora de publicar uma versão web (acessível por navegador,
de qualquer dispositivo), os passos são:

1. **Trocar o roteador**: em `src/App.jsx`, troque `HashRouter` por
   `BrowserRouter` (do mesmo pacote `react-router-dom`). É a única linha
   que precisa mudar nas telas.
2. **Trocar a persistência**: hoje `src/lib/storage.js` usa `localStorage`
   (dados só no navegador/dispositivo local). Para multi-dispositivo e
   multi-usuário, troque as funções desse arquivo por chamadas a uma API
   própria (backend com banco de dados — Postgres, Supabase, Firebase, etc).
   Como toda a aplicação já fala com os dados através desse arquivo (nunca
   diretamente com `localStorage`), **nenhuma tela precisa ser alterada**.
3. **Hospedar**: builde com `npm run build` (gera a pasta `dist/`) e suba
   em qualquer serviço de hospedagem de site estático com backend (Vercel,
   Netlify, Railway, etc).
4. **Cotação automática** (opcional): hoje a cotação é manual (tela
   "Cotações"). Para puxar preços automaticamente, crie uma rota no seu
   backend que busca os preços numa API de mercado (ex. brapi.dev) e
   chame essa rota periodicamente da tela "Cotações" — de novo, sem
   precisar tocar nas outras telas, já que todas leem o preço a partir do
   estado central (`CarteiraContext`).

Nenhuma página, componente ou cálculo precisa ser reescrito — é literalmente
o mesmo código rodando num navegador em vez de numa janela nativa.

---

## Lógica de cálculo (resumo)

Toda a regra de negócio vive em `src/lib/calculos.js`, sem nenhuma
dependência de tela — pode ser testada isoladamente (ver exemplos de uso
no topo do arquivo). É o mesmo modelo de cálculo já validado na planilha:

1. **Nota** do ativo → peso relativo dentro da sua classe
2. **% da classe (meta)** = nota do ativo ÷ soma das notas da classe
3. **% da carteira (meta)** = % da classe (meta) × % meta da classe
4. **Déficit** = quanto falta para o ativo atingir sua meta em R$, ou zero
   se já está na meta ou acima dela
5. **Rebalanceamento** = aporte total distribuído proporcionalmente ao
   déficit de cada ativo incluído no cálculo
