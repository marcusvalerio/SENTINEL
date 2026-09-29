# Convergência — HyperFrames

Fonte da versão geométrica do brand film do SENTINEL (ver `../visual-storytelling.md`, §3). Um template gera três variantes: `film-16x9` (20 s), `film-9x16` (15 s) e `loop-16x9` (8 s, sem costura).

Isto não faz parte do app: nada aqui é importado pelo Next.js.

```bash
mkdir convergencia && cd convergencia
cp /caminho/para/SENTINEL/docs/brand/hyperframes/convergencia.mjs gen.mjs
npm init -y && npm i hyperframes@0.8.93 gsap@3.14.2 @fontsource/dm-sans
node gen.mjs                              # gera projects/<variante>/
npx hyperframes lint projects/film-16x9
npx hyperframes snapshot projects/film-16x9 --at 2,8.3,13,17.4,19.5
npx hyperframes render projects/film-16x9 -o out/sentinel-film-16x9.mp4 --fps 24 --quality delivery
```

A renderização precisa de FFmpeg na máquina (`npx hyperframes doctor` confere). O WebM padrão do renderizador preserva transparência e fica grande; para web, recodifique a partir do MP4 com os comandos do §5 da direção.
