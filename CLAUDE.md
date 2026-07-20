# CLAUDE.md — Carteira Holder

Contexto essencial para retomar qualquer sessão sem reler o código todo.

---

## O que é o projeto

**Carteira Holder** é um app desktop de gestão de portfólio de investimentos pessoais.
Permite acompanhar a posição atual, definir metas por classe de ativo e calcular quanto
comprar de cada ativo a cada aporte para se aproximar da meta (rebalanceamento proporcional ao déficit).

Usuário: único, uso pessoal. Carteira de exemplo com ~55 ativos fictícios carregada como seed.

---

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 18 + React Router 6 (HashRouter) |
| Desktop | Tauri v1 (Rust + WebView2) |
| Build | Vite 5.4 |
| Estilo | CSS puro com variáveis (tema escuro fixo) |
| Testes | Nenhum ainda |
| TypeScript | Não — JavaScript puro |

---

## Comandos

```bash
npm run dev          # dev server em http://localhost:1420
npm run build        # build da UI (dist/)
npm run tauri:dev    # app Tauri em modo dev (abre janela nativa)
npm run tauri:build  # gera instalador em src-tauri/target/release/bundle/
```

O instalador final fica em:
- `src-tauri/target/release/bundle/msi/Carteira Holder_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Carteira Holder_0.1.0_x64-setup.exe`

---

## Arquitetura

```
src/
  App.jsx                  # Rotas (HashRouter) + CarteiraProvider
  main.jsx                 # Entry point React

  pages/                   # Uma tela por arquivo
    Dashboard.jsx           # KPIs, cards por classe, gráficos, botão Redefinir dados
    Cotacoes.jsx            # Tabela de cotações, token brapi.dev, botão ↻ por ativo
    MetaClasses.jsx         # Sliders de % alvo por classe
    MetaAtivos.jsx          # Notas e preços-teto por ativo
    PosicaoAtual.jsx        # Posição atual (valor investido, % atual)
    Rebalanceamento.jsx     # Tabela de rebalanceamento + modal compra/venda + toast
    Historico.jsx           # Registro de todas as operações realizadas

  components/
    Sidebar.jsx             # Navegação lateral fixa
    CardClasse.jsx          # Card de resumo de cada classe (Dashboard)
    GraficoPizza.jsx        # Recharts — pizza atual vs meta
    GraficoBarras.jsx       # Recharts — barras atual vs meta
    ClassePill.jsx          # Badge colorido por classe de ativo
    ThOrdenavel.jsx         # <th> clicável com seta de ordenação (props: campo, ordenacao, onOrdenar, tooltip)
    Toggle.jsx              # Interruptor de incluir/excluir ativo no rebalanceamento

  lib/
    CarteiraContext.jsx     # Estado global (Context API) — única fonte de verdade
    calculos.js             # Cálculos puros (sem UI): rebalanceamento, déficit, % meta/atual
    storage.js              # localStorage centralizado (chaves prefixadas "carteira:")
    dadosIniciais.js        # Seed com ~55 ativos fictícios (exemplo de portfólio diversificado)
    formato.js              # formatarMoeda, formatarPercentual, formatarQuantidade, etc.
    useOrdenacao.js         # Hook: useOrdenacao(campo, dir) + aplicarOrdenacao(lista, ordenacao)

  styles/
    globals.css             # Reset, variáveis CSS, layout base (app-shell, sidebar, content-area)
    components.css          # Estilos de todos os componentes (tabela, modal, toast, badge, etc.)
```

---

## Estado global — CarteiraContext

Provê e persiste:

| Campo | Tipo | Descrição |
|---|---|---|
| `ativos` | `Ativo[]` | Lista completa de ativos (código, classe, nota, precoTeto, cotacao, quantidade) |
| `metasClasse` | `Object` | `{ "Ações": 30, "FIIs": 29, ... }` — deve somar 100 |
| `aporte` | `number` | Valor do aporte atual em R$ |
| `excluidos` | `Set<string>` | Códigos excluídos do cálculo de rebalanceamento |
| `brapiToken` | `string` | Token da API brapi.dev (salvo no localStorage) |
| `historico` | `Entrada[]` | Operações registradas (max 500, persistido) |

Derivados (via `useMemo`): `total`, `resumoClasses`, `metaAtivos`, `posicaoAtual`, `rebalanceamento`, `metasValidas`

---

## Persistência (storage.js)

Chaves no localStorage:

| Chave | Conteúdo |
|---|---|
| `carteira:ativos` | Array de ativos |
| `carteira:metasClasse` | Objeto de metas |
| `carteira:aporte` | Número |
| `carteira:excluidos` | Array de códigos |
| `carteira:brapiToken` | String do token |
| `carteira:historico` | Array de operações |

`resetarParaExemplo()` restaura `ATIVOS_INICIAIS` de `dadosIniciais.js` e limpa o histórico.

---

## APIs externas

### brapi.dev v2 — ações e FIIs da B3

```
GET https://brapi.dev/api/v2/stocks/quote?symbols=ITUB3,BBAS3
Authorization: Bearer {token}

Resposta: json.results[].data.regularMarketPrice
          (ou json.results[].regularMarketPrice como fallback)
```

- Token gratuito: cadastro em brapi.dev → "Obter Chave de API"
- Token salvo em localStorage e gerenciado via campo na tela Cotações
- Detecção de ativo B3: regex `REGEX_B3 = /^[A-Z]{3,5}\d{1,2}$/`

### CoinGecko — criptomoedas

```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl

Resposta: json[id].brl
```

- Gratuito, sem autenticação
- Mapeamento código → ID em `COINGECKO_IDS` dentro de `CarteiraContext.jsx`
- Cryptos suportadas: BTC, ETH, XRP, SOL, AAVE, BNB, ADA, DOT, MATIC, LINK, UNI, DOGE, AVAX, ATOM, LTC, BCH

---

## Padrões de código — convenções a respeitar

**Colunas ordenáveis**
Todo `<th>` que deve ser ordenável usa `ThOrdenavel` com prop `tooltip` para colunas técnicas:
```jsx
const th = (campo, label, className = "", tooltip) => (
  <ThOrdenavel campo={campo} ordenacao={ordenacao} onOrdenar={alternarOrdem} className={className} tooltip={tooltip}>
    {label}
  </ThOrdenavel>
);
```

**Formatação de números**
- Moeda: `formatarMoeda(valor)` → "R$ 1.234,56"
- Percentual: `formatarPercentual(valor)` — valor em decimal (0.3 → "30.00%")
- Quantidade de ativos: `formatarQuantidade(valor)` — decimais adaptativos por magnitude
- Número genérico: `formatarNumero(valor, casasDecimais)`

**Toast de feedback**
`useToast()` é local por tela (não global). Implementado em `Rebalanceamento.jsx`.
```jsx
const { toasts, add: addToast } = useToast();
addToast("mensagem", "compra" | "venda");
```

**Confirmação dupla para ações destrutivas**
Padrão usado no Dashboard (Redefinir dados) e Histórico (Limpar):
```jsx
const [confirmando, setConfirmando] = useState(false);
function handleAcao() {
  if (!confirmando) { setConfirmando(true); return; }
  executarAcao();
  setConfirmando(false);
}
// No botão: onBlur={() => setTimeout(() => setConfirmando(false), 200)}
```

**Tabela compacta**
`Rebalanceamento.jsx` usa `.tabela-wrap--rebal` + `.tabela--rebal` (padding reduzido, overflow-x: visible).

---

## Problemas conhecidos / limitações ativas

- **"Atualizar todos" para B3 em lote ainda retorna HTTP 400** — o endpoint individual (`/api/v2/stocks/quote?symbols=TICKER`) funciona, mas o lote com 20+ símbolos falha. Pode ser limite do plano gratuito brapi.dev. Contorno: usar o botão ↻ por ativo.
- **Sem TypeScript** — erros de campo (`item.data.regularMarketPrice` vs `item.regularMarketPrice`) só aparecem em produção.
- **Token no frontend** — o `brapiToken` fica em localStorage (texto claro). Para produção real deveria passar pelo backend Rust do Tauri.
- **Sem testes automatizados** — `calculos.js` é o arquivo de maior risco sem cobertura.

---

## Backlog (não implementado)

- [ ] Tooltips nos ícones da sidebar (hover no mobile)
- [ ] Alertas de desvio de meta (ex: quando classe está > 5% fora do alvo)
- [ ] Exportar carteira como CSV
- [ ] Modo claro (toggle)
- [ ] Onboarding para novo usuário
- [ ] Testes unitários em `calculos.js` (Jest ou Vitest)
- [ ] Múltiplas carteiras
- [ ] Histórico de cotações (sparkline por ativo)

---

## Sessões anteriores notáveis

- Integração brapi.dev v2 com Bearer token (endpoint mudou de `/api/quote/` para `/api/v2/stocks/quote`)
- CoinGecko substituiu brapi.dev para cripto (plano gratuito não cobre cripto)
- Dados de exemplo (seed fictício, ~55 ativos) em `dadosIniciais.js`, no mesmo formato usado por uma carteira real
- `resetarParaExemplo()` no Dashboard carrega esses dados do `dadosIniciais.js`
