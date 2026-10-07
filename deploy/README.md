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

Se correr num contentor, usar um env_file com `.env.server.local` e substituir SUPABASE_URL pelo endereco do gateway na rede Docker (`http://api-gw:8000`), ligando o contentor a rede Supabase. O localhost de um contentor nao e o host.

O frontend do docradar ainda nao foi publicado por estes scripts. A migracao de base de dados nao muda automaticamente uma compilacao existente. Recompilar antes de usar a nova configuracao e validar o login com a conta migrada. A configuracao original do Lovable continua em `.env` no repositorio, mas `.env.local` tem precedencia na compilacao local.

Relatorios: `/root/server-stack/your-event-hub-migration/connection-local.json` e `connection-public.json`. Nao incluem chaves nem registos pessoais.
