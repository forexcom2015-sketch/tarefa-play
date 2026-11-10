-- Roteiro manual da Fase 9 para o Supabase externo.
-- Executar com contas fictícias e, quando necessário, em transações de teste/rollback.
-- As rotinas de bloqueio exigem role service_role.

-- 1) Ciclo 10 -> 5:
-- Validar 10 habilitações Instagram do mesmo validador no mesmo dia.
-- SELECT * FROM public.validador_contadores_diarios
-- WHERE validador_id = '<VALIDADOR>' AND dia = ((now() at time zone 'America/Sao_Paulo')::date);
-- Confirmar creditos_liberados=5 para Site e tentar a 6a habilitação Site após consumir 5.

-- 2) Ciclo 5 -> 2:
-- Validar 5 habilitações Site e confirmar 2 créditos YouTube.
-- Após 2 validações YouTube, uma nova habilitação deve ser recusada.

-- 3) Isolamento:
-- Repetir os mesmos dados com outro validador e no dia seguinte; os contadores não podem misturar usuários nem dias.

-- 4) Idempotência:
-- UPDATE public.habilitacoes SET status='validada', validada_em=coalesce(validada_em,now())
-- WHERE id='<HABILITACAO>';

/* 5) Bloqueio diário:
select public.processar_bloqueios_diarios();
select public.processar_bloqueios_diarios();
-- O segundo retorno deve ser 0 para o mesmo dia/validador já bloqueado.
*/

/* 6) Exceções:
-- a) token_lista sem token_tarefa: não criar bloqueio de habilitacao_expirada;
-- b) sem tarefa Instagram elegível para o validador: não criar minimo_diario;
-- c) falha técnica: simular erro fora da regra de negócio e confirmar ausência de bloqueio.
*/

/* 7) Bloqueio server-side:
-- Como Validador bloqueado, chamar habilitar_tarefa com p_dispositivo_id válido.
-- Deve falhar antes de criar nova habilitação.
*/

/* 8) Contestação:
-- Validador: select public.contestar_bloqueio('<BLOQUEIO>','texto de teste com pelo menos dez caracteres');
-- Admin: select public.decidir_contestacao_bloqueio('<CONTESTACAO>','aceita');
-- ou 'negada'.
-- Validar que outro Validador não lê a contestação e não consegue decidir.
*/

/* 9) Velocidade:
-- Ajustar temporariamente:
-- update public.configuracoes set valor='1' where chave in ('limite_tarefas_hora_validador','limite_tarefas_hora_dispositivo');
-- A segunda habilitação dentro da janela deve ser recusada e gerar auditoria origem=velocidade.
*/

/* 10) Não autenticado/sem papel:
-- Chamadas às RPCs novas devem falhar.
*/
