<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fluxo de trabalho

Sempre que realizarmos alterações, fazer **commit + push** para o GitHub (branch `main`) — a Vercel sobe automaticamente e fica em produção. Não é preciso pedir confirmação para isso. Commitar apenas os arquivos da alteração em questão (nunca `git add -A`), pois o working tree pode conter WIP de outra origem.
