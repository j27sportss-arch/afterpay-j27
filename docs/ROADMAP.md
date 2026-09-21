# Afterpay J27 — Roadmap

**Data:** 2026-09-21

## Princípio

O roadmap abaixo separa o estado real do repositório da visão futura. Nada nesta lista deve ser interpretado como já implementado.

## Fase 0 — Auditoria e documentação

**Estado: CONCLUÍDA nesta entrega**

Objetivos:
- entender o código;
- documentar arquitetura;
- documentar banco;
- documentar regras;
- documentar integrações;
- auditar segurança;
- registrar lacunas.

## Fase 1 — Estabilização técnica

Antes de adicionar módulos:

1. resolver a incompatibilidade entre `AppInner.jsx` e `db.js`;
2. validar o build real;
3. validar o fluxo de cadastro/login;
4. validar RLS em ambiente de teste;
5. validar isolamento entre duas empresas;
6. validar Edge Functions;
7. validar Web Push;
8. decidir e documentar política correta de notificações;
9. confirmar configuração de produção;
10. completar/decidir a arquitetura PWA.

**Não executado nesta Fase 0.**

## Fase 2 — SaaS Multiempresa

Visão:

```text
PLATAFORMA
    ↓
EMPRESAS
    ↓
USUÁRIOS
    ↓
DADOS DA EMPRESA
```

### Plataforma

Futuro:

- gestão de empresas;
- ativação/suspensão;
- licença;
- plano;
- vencimento;
- controle de acesso.

Nada disso existe como módulo de plataforma no código atual.

## Fase 3 — Gestão da empresa

Futuro:

- usuários;
- pedidos;
- clientes;
- produtos;
- fornecedores;
- financeiro;
- operação.

Pedidos, afiliados e despesas já existem em parte.

Clientes, produtos e fornecedores como entidades próprias não foram identificados.

## Fase 4 — Fornecedor Inteligente

Futuro:

Entrada:

- CEP;
- região;
- custo;
- prazo;
- confiabilidade;
- histórico;
- margem;
- disponibilidade.

Saída:

- recomendação de fornecedor.

Ação:

- abrir produto/checkout do fornecedor em nova aba;
- compra concluída manualmente pelo usuário.

### Regra importante

Não presumir que Shopee, Mercado Livre ou qualquer terceiro permita checkout automatizado.

Antes de implementar:
- pesquisar documentação oficial;
- confirmar permissões;
- confirmar termos;
- confirmar endpoints;
- confirmar limitações.

## Fase 5 — Financeiro

Futuro:

- custo do produto;
- custo de envio;
- receita;
- lucro bruto;
- lucro líquido;
- comissão;
- margem;
- ROI.

O sistema atual possui somente uma parte desses conceitos.

## Fase 6 — Marketing

Futuro:

- Meta Ads;
- WhatsApp;
- Kommo.

Atualmente não implementado.

## Fase 7 — Fornecedores

Futuro:

- Shopee;
- Mercado Livre;
- outros fornecedores.

Atualmente não implementado.

## Fase 8 — Inteligência

Futuro:

- análise de produtos;
- análise de lucro;
- análise de anúncios;
- alertas;
- ranking;
- recomendações;
- IA analista.

## Prioridade arquitetural

A ordem recomendada, sem implementar nesta fase, é:

```text
Estabilizar código atual
        ↓
Validar banco/RLS
        ↓
Validar Auth
        ↓
Validar Web Push
        ↓
Formalizar SaaS de plataforma
        ↓
Expandir domínio
        ↓
Financeiro
        ↓
Integrações
        ↓
Fornecedor Inteligente
        ↓
IA Analista
```

## Lacunas que precisam de decisão antes de desenvolvimento

- modelo de planos;
- licença/vencimento;
- papéis da plataforma;
- permissões detalhadas;
- comissão;
- clientes;
- produtos;
- fornecedores;
- cálculo financeiro oficial;
- regras de margem/ROI;
- integração oficial com cada terceiro;
- política de notificações;
- estratégia PWA;
- estratégia de recuperação de senha.
