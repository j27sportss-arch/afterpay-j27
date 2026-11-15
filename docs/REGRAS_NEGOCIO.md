# Afterpay J27 — Regras de Negócio Comprovadas

> **Nota de atualização — 15/11/2026:** este documento contém histórico de auditoria de 21/09/2026. Para o estado vigente do ZIP atualizado, consulte [`ATUALIZACAO_2026-11-15.md`](ATUALIZACAO_2026-11-15.md), que prevalece em caso de divergência.

**Data:** 2026-09-21

## 1. Usuários

### Existentes

- Usuário administrador usa e-mail + senha.
- Um profile possui uma empresa.
- `role` aceita `admin` ou `affiliate`.
- Afiliado usa PIN na interface, mas o código transforma esse PIN em senha de uma conta real do Supabase Auth.
- Afiliado possui `auth_user_id`.

### Parcial

- Há infraestrutura de alteração de profile, mas não há fluxo completo de administração de usuários identificado.

### Planejadas

- Plataforma deverá controlar usuários/empresas.
- Administração ampliada de usuários da empresa.

## 2. Empresas

### Existentes

- Cada empresa possui UUID.
- Cadastro inicial cria empresa e profile admin.
- Um usuário com profile não pode usar novamente a RPC de criação de empresa.

### Planejadas

- ativação/suspensão;
- licença;
- plano;
- vencimento;
- acesso administrado pela plataforma.

## 3. Pedidos

Status permitidos:

- Em Rota
- Entregue
- Não Pago
- Pago
- Frustrado

Campos de negócio:

- cliente;
- data do pedido;
- previsão de entrega;
- custo;
- venda;
- forma de pagamento;
- data de pagamento;
- afiliado.

Custo e venda não podem ser negativos no banco.

Pedido frustrado é excluído dos cálculos normais de vendas/faturamento/lucro no frontend e passa a ser tratado como prejuízo/venda perdida.

## 4. Pagamentos

Formas exibidas na interface:

- PIX
- Cartão
- Boleto
- Dinheiro
- Pendente

A modelagem não implementa um gateway de pagamento.

`Pago` representa um status operacional/financeiro do pedido.

## 5. Comissões

Há referência a afiliados e cálculo de lucro, mas não existe tabela ou regra de comissão financeira persistida identificada no schema.

**Estado: NÃO IDENTIFICADO COMO MÓDULO IMPLEMENTADO.**

## 6. Afiliados

- Admin cria afiliado.
- Nome obrigatório.
- PIN de 4 a 6 números.
- Afiliado recebe conta Auth.
- Afiliado é associado à empresa do admin que o criou.
- Afiliado pode ser desativado.
- Afiliado registra pedido.
- Afiliado vê seus pedidos no frontend.

## 7. Despesas

- São registradas por empresa e por dia.
- Categorias existentes: tráfego e outras.
- A combinação empresa + data é única.
- Dashboard desconta despesas do cálculo de lucro apresentado.

## 8. Notificações

Eventos comprovados pelo trigger:

- novo pedido;
- pedido entregue;
- pedido pago.

Notificações são armazenadas em tabela.

## 9. Dashboard

Indicadores calculados no frontend incluem:

- faturamento;
- pagos;
- lucro;
- vendas;
- pendentes;
- em rota;
- entregues;
- não pagos;
- frustrados;
- prejuízo de frustrados;
- venda perdida de frustrados.

## 10. Regras parcialmente implementadas

- Web Push depende de configuração externa.
- PWA não possui manifest identificado.
- Recuperação de senha não está implementada no frontend.
- Administração de usuários é limitada ao que existe no banco; não foi encontrada interface completa.

## 11. Regras planejadas

As seguintes são visão futura e não devem ser tratadas como comportamento atual:

- fornecedores;
- clientes como entidade própria;
- produtos;
- financeiro avançado;
- margem;
- ROI;
- custo de envio;
- lucro líquido;
- Meta Ads;
- WhatsApp;
- Kommo;
- Shopee;
- Mercado Livre;
- fornecedor inteligente;
- recomendações por CEP/região/custo/prazo/confiabilidade/margem/disponibilidade;
- IA analista;
- alertas e rankings.

## 12. Regras ainda não definidas

Não foram encontradas definições suficientes para:

- política de comissão;
- planos e preços SaaS;
- licença e vencimento;
- suspensão automática;
- papéis adicionais;
- hierarquia da plataforma;
- regras de clientes/produtos;
- cálculo oficial de lucro líquido;
- cálculo oficial de ROI;
- política de fornecedor;
- critérios de ranking de fornecedores;
- permissões detalhadas de cada novo módulo.
