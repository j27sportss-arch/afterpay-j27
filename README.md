# Afterpay J27 — versão multi-empresa (SaaS)

Cada pessoa que criar conta vira administradora da própria operação,
totalmente separada das outras. Você e seus amigos usam o mesmo app,
sem ver dado uns dos outros.

## O que mudou da versão anterior
- Login de verdade (e-mail + senha) em vez de acesso livre
- Cada operação (empresa) tem seus próprios pedidos, afiliados e despesas
- Afiliados continuam entrando com nome + PIN, mas por trás disso agora
  existe um login de verdade e seguro (você não precisa se preocupar
  com isso, é tudo automático)
- Notificações em tempo real (sino) via Supabase Realtime — quando um
  pedido é criado, entregue ou pago, todo mundo da mesma empresa vê
  na hora

## Passo 1 — Crie um projeto NOVO no Supabase
Recomendo um projeto **separado** do que você já tinha, pra não misturar
com os dados antigos. Vá em supabase.com → New Project.

## Passo 2 — Rode o schema.sql
No SQL Editor do novo projeto, cole o conteúdo de `supabase/schema.sql`
inteiro e clique em Run. Isso cria todas as tabelas, segurança (RLS) e
funções necessárias.

## Passo 3 — Publique a função de criar afiliado
Essa parte precisa da CLI do Supabase (não tem como fazer só pelo site,
porque ela usa uma chave secreta que nunca pode aparecer no navegador):

```
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
npx supabase functions deploy create-affiliate
```

## Passo 4 — Configure o Auth do Supabase
Em **Authentication → Providers**, confirme que "Email" está ativado.
Em **Authentication → Settings**, eu recomendo **desativar** a
confirmação por e-mail por enquanto (pra você e seus amigos conseguirem
entrar na hora, sem precisar clicar em link de confirmação) — procure
por "Confirm email" e desligue. Depois, se quiser mais segurança, pode
ligar de novo.

## Passo 5 — Suba os arquivos pro GitHub
Mesmo processo de sempre: cria um repositório novo (ou usa um limpo),
sobe TODOS os arquivos e pastas de dentro de `saas_v1/`.

## Passo 6 — Configure a Vercel
Cria um projeto novo na Vercel, conecta no repositório, e adiciona nas
variáveis de ambiente:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-novo-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

## Passo 7 — Teste o fluxo completo
1. Abra o site publicado
2. Clique em "Criar minha operação"
3. Preencha seu nome, nome do negócio, e-mail e senha
4. Você deve cair direto no Dashboard, como administrador
5. Vá em Afiliados → Novo afiliado, cria um de teste
6. Saia (Logout) e entre de novo escolhendo "Sou afiliado" — deve
   aparecer sua operação, depois o nome do afiliado, depois o PIN

## Sobre os dados antigos
Seus 86 pedidos e despesas da versão anterior **não migram sozinhos**
pra esse banco novo (são projetos Supabase diferentes). Se quiser, dá
pra escrever um script de migração depois — me avisa quando estiver
com o app novo funcionando que eu te ajudo com isso.

## Web Push (notificações no celular)

O projeto agora possui a cadeia de Web Push: frontend → `push_subscriptions` →
Database Webhook → Edge Function `push-notification` → Web Push → `public/sw.js`.

### 1. Vercel

Adicione:
```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=SUACHAVEPUBLICA
```

Use a mesma chave pública correspondente à chave privada VAPID usada no backend.

### 2. Supabase — tabela

Para um projeto novo, o `supabase/schema.sql` já inclui `push_subscriptions`.

Para um projeto existente, aplique a migration:
```text
supabase/migrations/202609060001_push_notifications.sql
```

### 3. Supabase — secrets da Edge Function

Configure os seguintes secrets. Nunca coloque a chave privada no frontend/Vercel:
```text
VAPID_PUBLIC_KEY=SUACHAVEPUBLICA
VAPID_PRIVATE_KEY=SUACHAVEPRIVADA
VAPID_SUBJECT=mailto:seu-email@dominio.com
PUSH_WEBHOOK_SECRET=um-segredo-forte-e-aleatorio
```

A `VAPID_PUBLIC_KEY` deve ser a mesma usada em `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

### 4. Deploy da Edge Function

A função fica em:
```text
supabase/functions/push-notification/index.ts
```

Faça o deploy sem exigir JWT, porque o chamador é o Database Webhook:
```bash
npx supabase functions deploy push-notification --no-verify-jwt
```

### 5. Database Webhook

No Supabase Dashboard, abra **Database → Webhooks** e crie um webhook:

- Name: `push-notification`
- Table: `public.notificacoes`
- Events: `INSERT`
- Method: `POST`
- URL:
  `https://SEU-PROJECT-REF.supabase.co/functions/v1/push-notification`
- Header:
  `x-webhook-secret: O_MESMO_VALOR_DE_PUSH_WEBHOOK_SECRET`

O webhook envia o registro inserido em `record`. A Edge Function ignora outros tipos de evento.

### 6. Teste

No celular, abra o Afterpay J27 em HTTPS, entre com um usuário e abra o sino.
Toque em **Ativar notificações**.

Depois confirme em `push_subscriptions` que existe uma linha para o usuário/empresa.
Crie um pedido de teste e confira o histórico do webhook e os logs da Edge Function.

Para testar com o app fora da tela, coloque o navegador/app em segundo plano e crie outro pedido.

No iPhone/iPad, o Web Push depende das regras do Safari/iOS; para receber push de um site, normalmente é necessário adicionar o site à Tela de Início e usar o PWA.

