# Supabase do servidor

Configurar e verificar API HTTPS:

```bash
bash /root/admin/docradar/deploy/connect-supabase.sh
```

O comando verifica primeiro a API local, configura o acesso externo apenas a Auth, REST, Storage, Functions e Realtime e confirma as contagens pela API HTTPS. Studio e Postgres continuam sem acesso publico por esta rota. Preserva o Nginx existente e guarda uma copia da configuracao.

- `.env.local`: configuracao publica usada pelo Vite na compilacao.
- `.env.server.local`: configuracao de execucao do backend, com a chave service-role.

Ambos os ficheiros sao ignorados pelo Git e protegidos com permissao 600. A chave administrativa nao tem prefixo VITE e nao deve ser introduzida no frontend.

Se a aplicacao correr em Node no host, carregar as variaveis de backend com `bash deploy/with-server-env.sh <comando>`. Por exemplo, depois de gerar uma compilacao Node com Nitro: `bash deploy/with-server-env.sh node .output/server/index.mjs`.

O script de publicação converte `.env.server.local` para um ficheiro de ambiente
compatível com Docker e substitui SUPABASE_URL pelo gateway na rede Supabase
(`http://api-gw:8000`). O localhost de um contentor não é o host.

Os scripts de ligação ao Supabase não publicam o frontend. Para compilar e
publicar, usar o procedimento abaixo. A configuração original do Lovable continua
em `.env` no repositório; a publicação utiliza as variáveis locais do Supabase.

Relatorios: `/root/server-stack/your-event-hub-migration/connection-local.json` e `connection-public.json`. Nao incluem chaves nem registos pessoais.
# Publicar o docradar neste servidor

Executar no terminal do servidor:

```bash
bash /root/server-stack/deploy-docradar.sh
```

O script usa Bun 1.4.2, guarda uma cópia do `bun.lock` e reconcilia-o com
`package.json` através de `bun install --lockfile-only --ignore-scripts`.
A compilação instala depois com `--frozen-lockfile`, executa os testes existentes,
compila para Node.js 22 e inicia um container ligado ao Supabase local. Publica
em `https://srv2042599.hstgr.cloud/docradar/` depois de verificar o candidato.
O prefixo é configurado apenas durante a compilação; o desenvolvimento no
Lovable continua a usar `/`. O Nginx encaminha os assets sem o prefixo e as
páginas/API com o prefixo que o router espera.

Os ficheiros `.env*` são excluídos do contexto Docker. A compilação recebe
apenas as duas variáveis públicas via BuildKit secret; as chaves privadas são
carregadas no container em execução. O script verifica que a chave de serviço
não está nos assets públicos.

A configuração anterior do Nginx e do Supabase fica guardada numa pasta privada
em `/root/server-stack/docradar-deploy-<data>/`. Uma falha repõe essas configurações
e remove o candidato quando a reposição foi bem-sucedida. Containers de versões
anteriores ficam disponíveis para recuperação. A base de dados não é restaurada
nem alterada por este processo, exceto a configuração de URLs do serviço Auth.

O resumo final identifica sucesso ou erro e aponta para o log e para
`/root/server-stack/docradar-deploy.json`. As verificações HTTP cobrem SSR,
JavaScript/CSS publicados, APIs sem credenciais e contagens migradas. A entrada
com a palavra-passe existente e a execução do JavaScript no navegador requerem
teste no navegador após a publicação. Não se criam utilizadores de teste.

Referências: [Lovable — publicação num servidor](https://docs.lovable.dev/tips-tricks/external-deployment-hosting),
[TanStack Start — hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting).
