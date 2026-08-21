# Manutenção da página Agora

A página pública está em `agora.html`. O conteúdo variável fica centralizado em `data/now.json` e é renderizado por `scripts/agora.js`. Os estilos exclusivos da página ficam em `styles/Agora.css`.

## Atualizar o conteúdo

- Altere `snapshotDate` para modificar a data geral exibida no hero. Use `AAAA-MM-DD` e apenas datas confirmadas.
- Adicione uma frente em `workItems`. Use um `id` público e único, escolha `group` como `focus` ou `evolution` e preencha os textos `pt` e `en`.
- Use em `status` somente: `in-progress`, `next`, `planning`, `definition`, `studying`, `documenting`, `horizon`, `completed` ou `paused`.
- Use em `horizon`: `now`, `next` ou `horizon`.
- Para marcar um marco como concluído, altere seu campo `completed` para `true`. Não marque planos ou estudos como concluídos sem confirmação.
- Adicione atualizações em `recentUpdates`. O campo `date` é opcional; não transforme prazos internos em datas públicas de conclusão.
- Links são opcionais. Omita o item ou deixe de cadastrá-lo quando a URL pública não estiver confirmada. Nunca cadastre links administrativos ou privados.
- Os totais do resumo são calculados em `getActivitySummary()` a partir dos dados; não escreva números manualmente no HTML.

## Testar localmente

Na raiz do repositório, inicie um servidor estático e acesse `http://127.0.0.1:8000/agora.html`:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Teste o acesso direto, o refresh, os links, a tradução, os accordions, o menu móvel e as larguras de 375, 768 e 1024 pixels ou mais. Abrir o HTML diretamente pelo sistema de arquivos não é suficiente, porque o navegador pode bloquear o carregamento do JSON por `fetch`.

## Privacidade antes de publicar

Revise cada alteração e remova dados pessoais, nomes de clientes, prioridades internas, prazos particulares, observações informais, IDs, links privados, tokens, credenciais, emails não públicos, endereços de rede, hostnames, URLs administrativas e detalhes que aumentem a superfície de ataque da infraestrutura.

A página é uma seleção pública, não um espelho da fonte interna.

## Migração futura para API

`getCurrentWork()`, `getRoadmap()` e `getRecentUpdates()` já isolam o acesso ao conteúdo. Uma futura API poderá substituir `loadNowData()` sem mudar os componentes de apresentação. Essa API deverá passar por uma camada de filtragem e sanitização, publicar somente campos explicitamente aprovados e nunca permitir que o navegador consulte diretamente uma base privada.
