# VEIC promotional page

A card-based 2026 technology page covering 6G, IPv6, Physical AI, MCP, agent security and zero trust. The final product card contains a lightweight interactive Veicord preview for topology, policy and events.

The page uses a normal vertical document flow rather than full-screen slides. The contact flow remains available.

## Editorial image sources

- ITU: IMT-2030 technical requirements for 6G
- Anthropic: Model Context Protocol
- NVIDIA: GR00T N1 humanoid foundation model
- OpenAI: tools for building agents
- APNIC Labs: IPv6 adoption measurements

Local monochrome copies live in `public/assets/editorial/`. Each card links to a corresponding technical source.

## Development

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

The production output is generated in `dist/`.

## Visual

The page keeps the animated Bayer background and the monochrome Veicord product language.
