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
| Testes | Vitest (unitário/integração) + Testing Library + MSW · Playwright (E2E) |
| TypeScript | Não — JavaScript puro |

---

## Comandos

```bash
npm run dev          # dev server em http://localhost:1420
npm run build        # build da UI (dist/)
npm run tauri:dev    # app Tauri em modo dev (abre janela nativa)
npm run tauri:build  # gera instalador em src-tauri/target/release/bundle/

npm test              # Vitest — unitário + integração, roda uma vez
npm run test:watch    # Vitest em modo watch
npm run test:e2e      # Playwright — sobe o dev server sozinho e roda os E2E em Chromium
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
    Cotacoes.jsx            # Tabela de cotações, token brapi.dev, botão ↻ por ativo, edição inline
    MetaClasses.jsx         # Sliders de % alvo por classe
    MetaAtivos.jsx          # Notas e preços-teto por ativo
    PosicaoAtual.jsx        # Posição atual (valor investido, % atual)
    Rebalanceamento.jsx     # Tabela de rebalanceamento + modal compra/venda + toast
    Rebalanceamento.test.jsx # Modal de compra/venda, compra sugerida, validação de venda
    Proventos.jsx           # Dividendos/JCP/rendimentos FII: cards de resumo, tabela de ativos (busca
                             # individual, como Cotacoes.jsx) + tabela de eventos com abas por tipo
    Proventos.test.jsx      # Estado sem token, tabela de ativos, busca individual, filtro por aba, estado vazio
    Historico.jsx           # Registro de todas as operações realizadas
    Historico.test.jsx      # Confirmação dupla do botão "Limpar histórico"

  components/
    Sidebar.jsx             # Navegação lateral fixa
    CardClasse.jsx          # Card de resumo de cada classe (Dashboard)
    GraficoPizza.jsx        # SVG puro (sem lib externa) — pizza atual vs meta
    GraficoBarras.jsx       # SVG puro (sem lib externa) — barras atual vs meta
    BarraProgresso.jsx      # Barra de progresso (atingimento da meta, usada em CardClasse)
    ClassePill.jsx          # Badge colorido por classe de ativo
    ThOrdenavel.jsx         # <th> clicável com seta de ordenação (props: campo, ordenacao, onOrdenar, tooltip)
    ThOrdenavel.test.jsx
    Toggle.jsx              # Interruptor de incluir/excluir ativo no rebalanceamento
    Toggle.test.jsx
    CampoEdicaoInline.jsx   # Célula de planilha editável (cotação manual em Cotacoes.jsx)
    CampoEdicaoInline.test.jsx

  lib/
    CarteiraContext.jsx     # Estado global (Context API) — única fonte de verdade
    CarteiraContext.test.jsx # Integração: brapi.dev/CoinGecko mockados via MSW
    calculos.js             # Cálculos puros (sem UI): rebalanceamento, déficit, % meta/atual
    calculos.test.js
    proventos.js            # Puro: normaliza resposta brapi de dividendos, cruza com quantidade, monta resumo
    proventos.test.js
    storage.js              # localStorage centralizado (chaves prefixadas "carteira:")
    storage.test.js
    dadosIniciais.js        # Seed com ~55 ativos fictícios (exemplo de portfólio diversificado)
    formato.js              # formatarMoeda, formatarPercentual, formatarQuantidade, etc.
    formato.test.js
    coresClasse.js          # Mapeamento classe de ativo -> variável CSS de cor (CORES_CLASSE)
    useOrdenacao.js         # Hook: useOrdenacao(campo, dir) + aplicarOrdenacao(lista, ordenacao)
    useOrdenacao.test.js
    useToast.js             # Hook de toast local por tela (usado em Rebalanceamento.jsx e Cotacoes.jsx)

  styles/
    tokens.css              # Variáveis CSS (cores, espaçamento, tipografia) — tema escuro fixo
    layout.css               # Reset e layout base (app-shell, sidebar, content-area)
    fonts.css                 # @font-face
    graficos.css               # Estilos específicos de GraficoPizza/GraficoBarras
    components.css              # Estilos de todos os componentes (tabela, modal, toast, badge, etc.)

  test/
    setupTests.js           # cleanup() automático do Testing Library entre testes (Vitest setupFiles)

e2e/                       # Playwright — roda contra `npm run dev` (Chromium)
  rebalanceamento-fluxo.spec.js  # Caminho de ouro: aporte -> compra sugerida -> Histórico
  meta-classes.spec.js           # Slider de meta de classe + badge de validação em tempo real

playwright.config.js
vite.config.js             # Config do Vite + bloco `test` do Vitest
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

Derivados (via `useMemo`): `total`, `resumoClasses`, `metaAtivos`, `posicaoAtual`, `rebalanceamento`, `metasValidas`,
`proventos` (cruza o cache bruto de dividendos com a `quantidade` **atual** de cada ativo — ver limitação
abaixo), `resumoProventos` (totais para os cards da tela Proventos)

`statusCotacao` e `statusProventos` seguem o mesmo shape `{ atualizadoEm, atualizando, erro }` (mais `atualizados`
só em `statusCotacao`) e são atualizados pelas ações `atualizarCotacoes()`/`atualizarProventos({ forcar })`.

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
| `carteira:proventos` | `{ buscadoEm, porAtivo: { [codigo]: Provento[] } }` — cache bruto de dividendos/rendimentos |

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

### brapi.dev v2 — proventos (dividendos, JCP, rendimentos de FII)

```
GET https://brapi.dev/api/v2/stocks/dividends?symbols=ITUB3   # Ações e ETFs (classe != "FIIs"/"Criptomoedas")
GET https://brapi.dev/api/v2/fii/dividends?symbols=MXRF11     # classe === "FIIs"
Authorization: Bearer {token}
```

- **Busca sempre item a item, um símbolo por chamada** (`atualizarProventoUnico` em
  `CarteiraContext.jsx`) — mesmo padrão de `atualizarCotacaoUnica`. A primeira versão tentava
  agrupar por tipo em lotes de `symbols=A,B,C`, mas em teste real contra a API (token válido do
  usuário), **100% dos ativos retornaram erro de HTTP**, tanto no lote quanto no fallback item a
  item — então a estratégia foi simplificada para sempre buscar um símbolo por vez, igual à
  cotação, eliminando a complexidade de lote sem ganho comprovado. A causa raiz do erro
  (endpoint indisponível no plano gratuito? URL incorreta? outro motivo?) ainda não foi
  diagnosticada — ver "Problemas conhecidos" abaixo.
- Tela Proventos lista **todos os ativos elegíveis** (Ações, ETFs e FIIs — REGEX_B3 e
  `classe !== "Criptomoedas"`) numa tabela com botão ↻ por linha (busca só aquele ativo) e um
  botão "Buscar todos" que itera sequencialmente com pequeno intervalo entre chamadas — mesmo
  par de controles de `Cotacoes.jsx` (botão por linha + "Atualizar todos" com progresso local).
- Cache em `localStorage` (`carteira:proventos`, `{ buscadoEm, porAtivo }`) com TTL de 12h
  (`TTL_PROVENTOS_MS` em `lib/proventos.js`) — usado só pela busca automática de fundo
  (`atualizarProventos()`, roda uma vez ao montar o Provider se o cache expirou); os botões
  manuais (por linha ou "Buscar todos") sempre buscam, ignorando o TTL.
- `statusProventos.erro`, quando a busca em massa tem falhas, inclui a contagem e um exemplo
  real (`"N/M ativo(s) com erro — ex: CODIGO: HTTP 402"`) para facilitar diagnóstico — antes só
  mostrava a contagem agregada, escondendo o motivo real do erro.
- **Mapeamento de campos do corpo de sucesso ainda não validado** (`normalizarProventoAcao`/
  `normalizarProventoFii` em `lib/proventos.js`) — como toda chamada real feita até agora
  retornou erro de HTTP (nunca um corpo 200 com dados), o shape de sucesso continua sem
  confirmação; os nomes usados (`paymentDate`, `rate`, `lastDatePrior`, `dividendType`,
  `cashDividends`/`stockDividends`/`subscriptions`) são o palpite mais provável, não um fato
  verificado.
- O valor exibido é sempre **valor por ativo × quantidade atual** — o sistema não guarda
  posição histórica por data (`quantidade` é editável livremente em `PosicaoAtual.jsx` sem
  gerar registro em `historico`), então mesmo proventos já pagos usam a quantidade de hoje.
  Sinalizado via `quantidadeAproximada: true` em cada `ProventoPosicao` e num aviso fixo na tela.
- Histórico de proventos pagos é recortado para o ano corrente em diante
  (`dentroDoEscopoHistorico` em `lib/proventos.js`); eventos futuros (`PREVISTO`) não são
  filtrados por ano.

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

**Plano de aporte congelado (Rebalanceamento.jsx)**
As colunas de **sugestão** (Qtd. sug., Vlr. compra, % Meta, % Dif.) não recalculam a cada
compra. Enquanto `planoCongelado === null` a tabela acompanha o cálculo ao vivo do
`CarteiraContext`; a primeira interação que altera a base do cálculo — editar o campo *Valor do
aporte* (`handleAporte`) ou comprar pelo ícone verde (`comprarSugerido`) — chama `congelarPlano()`
e fixa um snapshot de `rebalanceamento`. A partir daí:
- o ícone verde abate `vlrCompra` do campo de aporte, registra histórico e marca o código em
  `executados` (desabilita aquele botão até recalcular), mas **não** mexe nas sugestões;
- a **posição real** (cotação, Qtd., Investido, % Atual) continua ao vivo — `plano` (useMemo)
  mescla esses campos de `rebalanceamento` sobre as linhas congeladas;
- `planoDesatualizado` compara `chavePlano` (código/qtdComprar/vlrCompra/pctMeta/valorAportar) do
  snapshot vs. o vivo; quando difere, o botão **↻ Recalcular** ao lado do campo de aporte fica
  habilitado e destacado (`.rebal-recalcular--pendente`) + aviso "Sugestões desatualizadas";
- `recalcularPlano()` refaz o snapshot com o `rebalanceamento` atual e zera `executados`.
O modal manual de compra/venda **não** congela o plano (é operação avulsa).

---

## Testes

157 testes automatizados no total. Convenção: arquivo de teste
sempre ao lado do arquivo testado (`Foo.jsx` → `Foo.test.jsx`), exceto os E2E, que ficam
em `e2e/` na raiz.

**Vitest (unitário + integração)** — `npm test`
- Ambiente padrão `node` (rápido); arquivos que precisam de DOM/localStorage declaram
  `// @vitest-environment jsdom` na primeira linha (não usar `environmentMatchGlobs` —
  foi removido no Vitest 4).
- `src/test/setupTests.js` roda `cleanup()` do Testing Library após cada teste
  (`test.setupFiles` no `vite.config.js`) — sem isso, testes de componente subsequentes
  enxergam DOM vazado de renders anteriores.
- `calculos.js` / `formato.js`: puros, sem mocks.
- `storage.js`: mocka `Storage.prototype.setItem/getItem` para simular quota
  excedida e JSON corrompido.
- `CarteiraContext.jsx`: MSW (`msw/node`) mocka brapi.dev e CoinGecko — nenhuma chamada
  de rede real. Importante: `atualizarCotacoes` (lote, chamado automaticamente no mount)
  checa o token **antes** de filtrar os ativos, então com `brapiToken` vazio (padrão em
  todo teste que não o define via `setBrapiToken`) o efeito de mount sempre aborta cedo
  — os testes não precisam se preocupar com esse fetch automático correndo em paralelo.
- Componentes: `ThOrdenavel`, `Toggle`, `useOrdenacao`/`aplicarOrdenacao`, o padrão de
  confirmação dupla (via `Historico.jsx`) e o modal de compra/venda (via
  `Rebalanceamento.jsx`, incluindo a validação de venda acima do estoque).
- `lib/proventos.js`: puro, sem mocks (normalização, `dentroDoEscopoHistorico`,
  `paraProventoPosicao`, `montarResumo`).
- `atualizarProventoUnico`/`atualizarProventos` em `CarteiraContext.test.jsx`: MSW cobre busca
  individual por Ação e por FII, a busca sequencial de todos os ativos elegíveis (ignora
  Criptomoedas, acumula erro de um símbolo sem interromper os demais) e o TTL do cache (não
  repete fetch sem `forcar`). Igual às cotações, o efeito de mount aborta cedo sem token.
- `Proventos.test.jsx`: semeia `carteira:proventos` já "fresco" (`buscadoEm` = agora,
  dentro do TTL) para não depender de rede no mount — só o fetch de cotações
  (`atualizarCotacoes`, que roda sempre no mount quando há token, sem TTL) precisa de um
  handler MSW catch-all. Como a tela agora tem duas `<table>` (ativos + eventos), os testes
  escopam consultas com `within(screen.getAllByRole("table")[0|1])` em vez de `getByText` cru,
  já que o mesmo código de ativo aparece em ambas. Comparações de valor em R$ usam regex
  tolerante a espaço indivisível (NBSP) do `Intl.NumberFormat`, com os caracteres especiais de
  regex escapados.

**Playwright (E2E)** — `npm run test:e2e`
- `playwright.config.js` sobe `npm run dev` como `webServer` e roda em Chromium contra
  `http://localhost:1420` — não usa o driver nativo do Tauri, pois nenhum fluxo testado
  depende de IPC Rust.
- As linhas de tabela em `Rebalanceamento.jsx` e `Historico.jsx` têm `data-codigo`
  (e `data-tipo` no Histórico) só para dar seletor estável ao Playwright — não afeta
  layout nem lógica.
- Os specs leem os valores reais da tela em vez de fixar números: não quebram se o seed
  em `dadosIniciais.js` mudar.

**Não coberto ainda**: `Dashboard.jsx`, `Cotacoes.jsx`, `MetaAtivos.jsx`, `PosicaoAtual.jsx`
(nenhuma lógica de risco alta neles, mas zero cobertura), e não há CI configurado rodando
`npm test`/`npm run test:e2e` automaticamente em push/PR.

---

## Problemas conhecidos / limitações ativas

- **"Atualizar todos" para B3 em lote ainda retorna HTTP 400** — o endpoint individual (`/api/v2/stocks/quote?symbols=TICKER`) funciona, mas o lote com 20+ símbolos falha. Pode ser limite do plano gratuito brapi.dev. Contorno: usar o botão ↻ por ativo.
- **Sem TypeScript** — erros de campo (`item.data.regularMarketPrice` vs `item.regularMarketPrice`) só aparecem em produção.
- **Token no frontend** — o `brapiToken` fica em localStorage (texto claro). Para produção real deveria passar pelo backend Rust do Tauri.
- **Proventos: `/stocks/dividends` e `/fii/dividends` retornaram erro de HTTP para 100% dos
  ativos em teste real** (token válido do usuário, ~26 Ações/ETFs) — tanto no lote quanto item a
  item. A causa não está diagnosticada: pode ser endpoint fora do plano gratuito (402/403), URL
  incorreta (a doc pública da brapi não é totalmente confiável quanto a paths), ou outra causa.
  `statusProventos.erro` agora mostra um exemplo real do erro (`"CODIGO: HTTP xxx"`) — o próximo
  passo é ler esse código específico na tela e decidir o que fazer a partir dele (ver Backlog).
- **Proventos: mapeamento de campos do corpo de sucesso não validado** (ver seção "brapi.dev v2 —
  proventos" acima) — consequência direta do item anterior: nunca houve uma resposta 200 com
  dados para conferir o shape.
- **Proventos: valor estimado sempre usa a quantidade atual do ativo**, inclusive para eventos já
  pagos no passado — o app não guarda histórico de posição por data. Documentado explicitamente
  na tela (aviso fixo) e no modelo de dados (`quantidadeAproximada: true`).

---

## Backlog (não implementado)

- [ ] Tooltips nos ícones da sidebar (hover no mobile)
- [ ] Alertas de desvio de meta (ex: quando classe está > 5% fora do alvo)
- [ ] Exportar carteira como CSV
- [ ] Modo claro (toggle)
- [ ] Onboarding para novo usuário
- [ ] Múltiplas carteiras
- [ ] Histórico de cotações (sparkline por ativo)
- [ ] Cobertura de teste para Dashboard/Cotações/MetaAtivos/PosicaoAtual
- [ ] CI (GitHub Actions) rodando `npm test` + `npm run test:e2e` em cada push/PR
- [ ] E2E (Playwright) para o fluxo de Proventos — ainda só coberto por Vitest/Testing Library
- [ ] **Diagnosticar o HTTP real retornado por `/stocks/dividends`/`/fii/dividends`** (ver
      "Problemas conhecidos") — clicar no botão ↻ de um ativo na tela Proventos e ler o código no
      badge de erro/tooltip decide o próximo passo: 402/403 → endpoint pago, plano precisa de
      upgrade; 404 → path errado, checar doc atualizada da brapi; outro → investigar caso a caso
- [ ] Validar o mapeamento de campos do corpo de sucesso em `lib/proventos.js` assim que uma
      resposta 200 com dados reais for obtida (bloqueado pelo item acima)

---

## Sessões anteriores notáveis

- Integração brapi.dev v2 com Bearer token (endpoint mudou de `/api/quote/` para `/api/v2/stocks/quote`)
- CoinGecko substituiu brapi.dev para cripto (plano gratuito não cobre cripto)
- Dados de exemplo (seed fictício, ~55 ativos) em `dadosIniciais.js`, no mesmo formato usado por uma carteira real
- `resetarParaExemplo()` no Dashboard carrega esses dados do `dadosIniciais.js`
- Suíte de testes criada do zero (Vitest + Testing Library + MSW + Playwright, ver seção **Testes**)
- Ao escrever os testes do modal de venda em `Rebalanceamento.jsx`, achado e corrigido um bug real:
  vender mais unidades do que o ativo possuía clampava a posição em 0 mas registrava no histórico
  a quantidade *pedida*, não a *realmente vendida*. `confirmarModal` agora bloqueia a venda acima do
  estoque (inclusive via atalho de teclado Enter, que ignorava o `disabled` do botão)
- Tela de Proventos implementada após uma análise arquitetural dedicada (decisão registrada: sem
  backend real no projeto — Tauri sem `#[tauri::command]` customizado, tudo roda no frontend — então
  "endpoints internos" viraram estado derivado no `CarteiraContext`, não rotas REST). Decisões que
  se mantiveram: cache em localStorage com TTL de 12h (sem polling automático, diferente de
  cotações), e cálculo sempre com a quantidade atual do ativo por falta de histórico de posição por
  data (limitação documentada, não contornada com uma regra inventada)
- Primeira versão de Proventos tentou busca agrupada por tipo (`symbols=A,B,C` em lotes de 8, com
  fallback item a item em caso de erro) — testada contra a API real com o token do usuário, **toda
  chamada retornou erro de HTTP**, tanto em lote quanto no fallback individual. Simplificado para
  busca sempre item a item (uma chamada por ativo, igual à cotação), e a tela ganhou uma segunda
  tabela listando todos os ativos elegíveis com busca individual por linha + "Buscar todos"
  sequencial — mesmo padrão de controle de `Cotacoes.jsx` — para tornar esse tipo de falha visível
  e diagnosticável ativo a ativo, em vez de só um contador agregado de erro. Causa raiz do HTTP de
  erro ainda não diagnosticada (ver Backlog e Problemas conhecidos)
