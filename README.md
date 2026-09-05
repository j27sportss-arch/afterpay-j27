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
