# LGPD e contratos - base operacional

Este documento define o minimo necessario para vender o GestaSports com dados reais de clubes, associados e atletas.

## Dados tratados

- Dados de usuario: nome, email, perfil e senha criptografada.
- Dados de associado/atleta: nome, contato, mensalidade, status, participacao esportiva e saude esportiva declarada.
- Dados financeiros: mensalidades, receitas, despesas, cobrancas e logs de cobranca.
- Dados historicos: fotos, documentos, sumulas, jogos e acervo do clube.
- Logs: usuario, acao, data, rota, metodo e metadados de auditoria.

## Papeis

- GestaSports: operador da plataforma e, conforme contrato, operador de dados do clube.
- Clube cliente: controlador dos dados dos seus associados, atletas e documentos.
- Usuario administrador do clube: responsavel por conceder acessos e manter dados corretos.

## Requisitos antes da venda

- Contrato de prestacao com escopo do servico.
- Politica de privacidade publicada.
- Termos de uso para administradores e usuarios finais.
- Canal de solicitacao: acesso, correcao, exportacao e exclusao de dados.
- Registro interno de incidentes de seguranca.
- Backup e restore documentados.

## Clausulas que o contrato deve cobrir

- propriedade dos dados do clube;
- responsabilidade do clube sobre dados inseridos;
- suporte e prazo de atendimento;
- disponibilidade esperada;
- backup e retencao;
- encerramento e exportacao de dados;
- proibicao de compartilhamento de senha;
- limites do plano contratado;
- tratamento de inadimplencia e suspensao do ambiente.

## Operacao de solicitacoes LGPD

1. Registrar solicitacao com data, solicitante e tenant.
2. Validar identidade do solicitante com o administrador do clube.
3. Exportar ou corrigir dados quando aplicavel.
4. Excluir ou anonimizar quando permitido pelo contrato e pela obrigacao legal.
5. Registrar a conclusao em auditoria interna.

## Observacao

Antes de escalar a venda, o contrato e a politica de privacidade devem ser revisados por advogado.
