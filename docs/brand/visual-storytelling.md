# SENTINEL — Visual Storytelling

Direção audiovisual do SENTINEL. O Higgsfield é a ferramenta de produção; este documento é a régua. A interface continua sendo o produto: o audiovisual só conta a mesma história em outro meio.

> **Tese.** Um espaço central onde tudo o que eu crio ganha contexto, memória e direção.
>
> **Arco.** silêncio → informação → movimento → estrutura → inteligência

---

## 1. Princípios

1. **Silêncio antes de tudo.** Todo filme começa escuro e quieto. O primeiro elemento só aparece depois de um respiro (≥ 0,8 s).
2. **Nada se move porque pode.** Cada movimento tem causa: algo chega, algo se conecta, algo se organiza. Movimento sem causa é cortado.
3. **Um gesto por plano.** Um movimento de câmera *ou* um movimento de elementos, nunca os dois ao mesmo tempo.
4. **Arquitetura, não ficção científica.** Planos, linhas, volumes, luz rasante. Nada de hologramas, HUDs, neon, partículas, glitch ou "rede neural".
5. **Espaço negativo é o protagonista.** O assunto ocupa no máximo 30% do quadro, e o resto é sombra com textura.
6. **A marca não é gerada.** Logotipo, tipografia e textos nunca saem do modelo de vídeo. São compostos depois, a partir do SVG e das fontes reais (ver §8).
7. **Pertence à interface.** Mesma paleta, mesmo ritmo, mesma curva de movimento. Ao cortar do filme para o app, nada deve "trocar de mundo".

## 2. Sistema visual compartilhado com a interface

### Paleta (valores do `globals.css`)

| Papel | Token | Hex | No vídeo |
| --- | --- | --- | --- |
| Fundo | `canvas` / Aswad | `#15161A` / `#17181C` | Preto de base. Nunca `#000` puro: o preto do SENTINEL tem temperatura. |
| Profundidade | Rurikon | `#1B294B` | Luz ambiente fria, sempre difusa, vinda de um canto (como o gradiente do header do projeto). |
| Estrutura | Deep Cobalt | `#424769` | Arestas, planos secundários, linhas de conexão distantes. |
| Texto e luz | Jam Session / `fg-strong` | `#D4CFD6` / `#ECE8EE` | Linhas finas em primeiro plano e a luz rasante principal. |
| Sinal | Antique Gold | `#B59E5F` | Um único elemento por plano: o arco que "vigia". |
| Destaque | Wine Yellow | `#D7C485` | Só no final: o ponto central da marca. |

**Regra do sinal:** o dourado aparece em no máximo um elemento por plano, como na interface, onde o accent marca só o que importa.

### Tipografia (só na composição, nunca gerada)

- **DM Sans**: títulos e wordmark (`SENTINEL`, tracking 0,28–0,34em, semibold).
- **Inter**: legendas curtas, 11–13px equivalente, caixa alta com tracking 0,09em (o `eyebrow` do app).
- **Roboto**: não entra no vídeo (é a fonte de leitura longa).

### Ritmo e movimento

- Curva principal: `cubic-bezier(0.16, 1, 0.3, 1)`, a mesma dos `Reveal` e do fade do `BrandLoop`. Chegada rápida, assentamento longo.
- Duração-base de um gesto: 1,2–1,8 s. Nada abaixo de 0,6 s.
- Câmera: dolly-in lento, travelling lateral ou crane. Sem shake, whip-pan, zoom rápido ou órbita de 360°.
- Loops: começo e fim idênticos, sem "costura" visível. O movimento é um ciclo, não um trecho recortado.

### Luz e textura

- Uma fonte de luz principal, rasante (10–20° sobre a superfície), de cima e à esquerda.
- Grão fino de filme (ISO 400–800), nunca ruído digital.
- Profundidade de campo rasa em planos próximos. Em planos abertos, névoa volumétrica mínima para dar profundidade.
- Materiais: pedra escura polida, vidro fosco, alumínio anodizado escuro, papel grosso. Nada de plástico brilhante.

## 3. Brand film — "Convergência"

**Duração:** 20 s (16:9) e 15 s (9:16). **Som:** opcional; se houver, um drone grave e um único tom limpo no fechamento. Sem trilha épica.

| # | Tempo (16:9) | O que vemos | Gesto | Conecta com o app |
| --- | --- | --- | --- | --- |
| 1 | 0,0–2,5 s | Escuro quase total. Um plano de pedra escura, luz rasante mal tocando a borda. | Nenhum. Silêncio. | O `canvas` com o gradiente Rurikon no canto. |
| 2 | 2,5–5,0 s | Pequenos fragmentos surgem espalhados, sem ordem: lâminas finas de vidro fosco e cartões de papel escuro. | Fragmentos acendem em tempos diferentes (luz, não movimento). | Registros soltos: ideias do Inbox. |
| 3 | 5,0–8,5 s | Os fragmentos derivam lentamente e começam a se alinhar em uma grade invisível. | Travelling lateral lento. | Os itens assentando nos horizontes do Roadmap. |
| 4 | 8,5–11,5 s | Linhas finíssimas de luz conectam os fragmentos: poucas, retas, com ângulos arquitetônicos. | As linhas se desenham de um ponto a outro, uma de cada vez. | Hairlines da interface e dependências do roadmap. |
| 5 | 11,5–15,0 s | Os fragmentos ganham identidade por forma e textura, não por texto: um feixe de linhas paralelas (commits), uma folha (Rubrica), um marco (milestone), uma balança sugerida por duas lâminas (decisões). Todos convergem. | Dolly-in lento em direção ao centro. | GitHub, notas, decisões e ferramentas indo para o projeto. |
| 6 | 15,0–17,5 s | Tudo forma uma estrutura concêntrica: dois anéis e um arco dourado que percorre um quarto do anel externo. | O arco dourado varre uma vez e para. | A abertura do login (`Aperture`) e o `LogoMark`. |
| 7 | 17,5–20,0 s | Corte seco para preto com textura. Marca composta: `LogoMark` + `SENTINEL`. Ponto Wine Yellow no centro. | O wordmark aparece com fade de 1,2 s na curva do app. | O lockup da tela de login, idêntico. |

**Versão 9:16 (15 s):** planos 1, 2, 4, 6 e 7. A estrutura concêntrica fica no terço superior e a marca no centro óptico (ligeiramente acima do centro geométrico). Deixe a margem de segurança das redes (≈ 14% em cima e 20% embaixo) sem nenhum elemento.

**Versão hero (loop de 8 s):** só os planos 4 → 6, em ciclo. Linhas se desenham, o arco varre, tudo se dissolve de volta no escuro e recomeça. Sem marca: a marca já está na página.

## 4. Produção no Higgsfield

### Fluxo recomendado

1. **Quadros-chave primeiro.** Gere as imagens paradas de cada plano (modelo de imagem) e aprove composição, luz e paleta antes de animar.
2. **Imagem → vídeo.** Anime a partir do quadro aprovado, com um único movimento de câmera por plano. Isso mantém a consistência entre planos.
3. **Clipes curtos.** Gere cada plano isolado (3–5 s) e monte na edição. Nunca peça o filme inteiro de uma vez.
4. **Seleção dura.** Para cada plano, gere de 4 a 6 variações e fique com uma. Descarte qualquer uma que falhe em um item do §6.
5. **Cor e marca na pós.** Grade de cor para a paleta do §2 e composição do logotipo e dos textos a partir dos arquivos reais.

### Prompt-base (colar antes de cada plano)

```
Minimal architectural still life, dark editorial composition, vast negative space,
deep charcoal stone surface with subtle texture, single low raking light from upper left,
cool indigo ambient light (#1B294B) fading from one corner, muted lavender-gray highlights (#D4CFD6),
restrained, silent, precise, premium product film, 35mm, shallow depth of field,
fine film grain, no text, no logos, no people, no screens.
```

### Negativo (colar em todos)

```
neon, cyberpunk, hologram, HUD, glowing particles, sparks, bokeh orbs, lens flare,
glitch, circuit board, neural network, matrix code, sci-fi interface, floating UI screens,
robot, AI brain, purple-blue gradient, saturated colors, text, letters, watermark, logo,
busy composition, fast motion, camera shake
```

### Prompts por plano

**1 — Silêncio.** `[base]` + `almost total darkness, the edge of a polished dark stone plane barely touched by raking light, nothing else in frame, static camera`

**2 — Informação.** `[base]` + `small thin frosted-glass slivers and dark matte paper cards scattered sparsely across the stone surface, unordered, each one catching light at a different moment, static camera`

**3 — Movimento.** `[base]` + `the slivers and cards slowly drift and settle into an invisible orthogonal grid, calm and deliberate, very slow lateral tracking shot`

**4 — Estrutura.** `[base]` + `hair-thin straight lines of soft light draw themselves between the aligned pieces one at a time, architectural angles, few connections, static camera`

**5 — Convergência.** `[base]` + `the pieces differ only by form and texture: a bundle of fine parallel lines, a single folded sheet, a small upright marker, two balanced blades; they converge toward the center, very slow dolly in`

**6 — Inteligência.** `[base]` + `the pieces resolve into a precise concentric structure of two thin rings, a single muted antique-gold arc (#B59E5F) sweeps a quarter of the outer ring once and stops, top-down view, static camera`

**Loop hero.** `[base]` + `seamless loop: hair-thin lines of light slowly draw between sparse aligned pieces on dark stone, then gently fade back into darkness, identical first and last frame, static camera`

### Materiais para redes (a partir do mesmo sistema)

| Peça | Formato | Conteúdo |
| --- | --- | --- |
| Teaser | 9:16, 6–8 s | Planos 2 → 6 acelerados só na montagem (nunca no movimento), marca no fim. |
| Carrossel "Espaços" | 4:5, estático | Um quadro-chave por espaço (Inbox = fragmentos soltos, Roadmap = grade, Decisões = duas lâminas, Histórico = anéis). Legenda em Inter caixa alta. |
| Lançamento de versão | 16:9 e 1:1, 5 s | Plano 6 com o número da versão composto em DM Sans. |
| Background de apresentação | 16:9, loop de 8 s | O loop hero, sem marca. |

## 5. No produto

O SENTINEL é software primeiro. O audiovisual entra em **um** lugar: a tela de login, o único momento de marca de um produto privado.

- **Componente:** `src/components/brand/brand-loop.tsx`. Sem dependências novas.
- **Slot:** `LOGIN_LOOP` em `src/lib/brand-media.ts`. Com `null`, a página mostra só a abertura em SVG (estado atual), sem nenhuma requisição.
- **Comportamento:**
  - O fallback estático (a `Aperture`) é sempre o HTML do servidor.
  - O `<video>` só é criado no cliente, perto da viewport, e aparece com fade (1,4 s na curva do app) quando consegue tocar.
  - Pausa com a aba oculta ou fora da tela.
- **Nunca toca com:** `prefers-reduced-motion`, economia de dados (`saveData`), conexões lentas (2G/3G) ou telas com menos de 768 px. Nesses casos fica só a imagem estática.
- **Orçamento:** ≤ 10 s, ≤ 1,5 MB, sem áudio (`BRAND_LOOP_BUDGET`).

**Fora do produto:** Command Center, páginas de projeto e fluxos de trabalho não recebem vídeo. Lá o movimento continua sendo o Motion da interface: contextual, curto e causado por uma ação.

### Como publicar um loop

1. Exporte do editor em ProRes ou H.264 de alta qualidade, 1920×1080, 24 fps.
2. Codifique:

```bash
# WebM (AV1): menor arquivo, navegadores modernos
ffmpeg -i loop.mov -an -vf "scale=1920:-2,fps=24" -c:v libsvtav1 -crf 38 -preset 6 -g 240 public/brand/login-loop.webm
# MP4 (H.264): compatibilidade universal
ffmpeg -i loop.mov -an -vf "scale=1920:-2,fps=24" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart public/brand/login-loop.mp4
# Poster: o primeiro quadro, igual ao último quadro do loop
ffmpeg -i loop.mov -frames:v 1 -q:v 3 public/brand/login-loop.jpg
```

3. Confira os tamanhos (`ls -lh public/brand`) contra o orçamento.
4. Preencha o slot:

```ts
export const LOGIN_LOOP: BrandMedia | null = { webm: "/brand/login-loop.webm", mp4: "/brand/login-loop.mp4", poster: "/brand/login-loop.jpg" };
```

5. O loop deve ser escuro o suficiente para o formulário continuar legível. Na dúvida, escureça 20% na grade de cor.

## 6. Checklist de aprovação

Um plano só entra se passar em todos os itens:

- [ ] Parece fotografado, não gerado. Sem superfícies "derretendo", simetria artificial ou detalhes sem lógica.
- [ ] Nenhum item da lista negativa aparece, nem de leve.
- [ ] No máximo um elemento dourado.
- [ ] Um único gesto: câmera *ou* elementos.
- [ ] O assunto ocupa ≤ 30% do quadro.
- [ ] O corte do plano 7 para a tela de login real não parece troca de mundo.
- [ ] Sem texto ou logotipo gerado pelo modelo.
- [ ] O loop fecha sem costura.

## 7. Ferramentas: o que cada uma faz

**HyperFrames** (HeyGen) é *motion design programático*: HTML, CSS e uma timeline GSAP renderizados quadro a quadro para MP4, WebM, MOV ou GIF. Não é um modelo generativo.

| Necessidade | HyperFrames | Higgsfield |
| --- | --- | --- |
| Camada geométrica do filme (fragmentos, grade, linhas, anéis, arco dourado) | ✅ Feita: `hyperframes/convergencia.mjs` | — |
| Fechamento com a marca real (SVG e DM Sans) | ✅ Feito, com a marca composta a partir dos arquivos reais | Não deve gerar marca (§1.6) |
| Versões 16:9, 9:16 e loop sem costura | ✅ Feitas | — |
| Materiais fotográficos (pedra, vidro fosco, luz rasante, profundidade de campo) | ❌ | ✅ Continua dependendo dele |
| Gerar imagens ou vídeos a partir de prompt | ❌ Só com conta HeyGen logada, FLUX local (Apple Silicon) ou LTX local (GPU) | ✅ |
| Trilha e efeitos sonoros | Com conta HeyGen (etapa "enhance") | — |

- O conector hospedado (`compose` e `render_video`) recusa chamadas do Claude Code. Funciona pelo Claude.ai web/desktop.
- O caminho local (CLI `hyperframes`, open source) funciona com Node e FFmpeg.

**Combinação recomendada:** o Higgsfield entrega os planos fotográficos, e o HyperFrames compõe a estrutura, as linhas e a marca por cima (ou os substitui na versão geométrica).

## 8. Marca na pós-produção

- Use `LogoMark` e o wordmark exportados do SVG do app (`src/components/brand/logo.tsx`): anel externo a 28% de opacidade, arco `#B59E5F`, anel interno, ponto `#D7C485`.
- Wordmark em DM Sans semibold, tracking 0,28em, cor `#ECE8EE`.
- No fechamento, o arco da marca pode varrer uma vez (9 s por volta no app; no filme, um quarto de volta em 1,2 s) e parar.
