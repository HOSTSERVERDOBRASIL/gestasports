# Claude Code com Amazon Bedrock

Use este fluxo para abrir o Claude Code usando Bedrock sem salvar segredo no repositorio.

## Configurar

1. Copie `claude-bedrock.env.example` para `claude-bedrock.local.env`.
2. Preencha `AWS_REGION` e uma forma de autenticacao:
   - `AWS_BEARER_TOKEN_BEDROCK` para Bedrock API key; ou
   - `AWS_PROFILE`/credenciais AWS locais.
   - Se fixar o modelo, use o ID do inference profile, por exemplo
     `ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0`.
     O ID direto `anthropic.claude-sonnet-4-20250514-v1:0` gera erro 400
     porque nao aceita throughput on-demand direto no Bedrock.
3. Rode:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-claude-bedrock.ps1
```

Para validar sem abrir uma sessao interativa:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-claude-bedrock.ps1 -Check
```

Se `claude-bedrock.local.env` nao existir e nenhuma credencial AWS estiver ativa, o script pede a Bedrock API key no terminal apenas para a sessao atual.

## Arquivos

- `start-claude-bedrock.ps1`: carrega variaveis locais, ativa `CLAUDE_CODE_USE_BEDROCK`, normaliza IDs Anthropic diretos para inference profile `us.*` e abre `claude`.
- `claude-bedrock.env.example`: modelo seguro para configurar a maquina.
- `claude-bedrock.local.env`: arquivo local com segredo, ignorado pelo git.
