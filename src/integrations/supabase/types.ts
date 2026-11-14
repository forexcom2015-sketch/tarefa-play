export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      aceites_contrato: {
        Row: {
          aceito_em: string
          id: string
          ip: unknown
          usuario_id: string
          versao: string
        }
        Insert: {
          aceito_em?: string
          id?: string
          ip?: unknown
          usuario_id: string
          versao: string
        }
        Update: {
          aceito_em?: string
          id?: string
          ip?: unknown
          usuario_id?: string
          versao?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          acao: string
          criado_em: string
          dados: Json | null
          entidade: string
          id: number
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          dados?: Json | null
          entidade: string
          id?: number
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          dados?: Json | null
          entidade?: string
          id?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          comentario: string
          compraria: string
          criado_em: string
          id: string
          interacoes: Json
          nota_divulgacao: number
          nota_preco: number
          nota_produto: number
          rodada_id: string
          tempo_tela_segundos: number
          validador_id: string
        }
        Insert: {
          comentario: string
          compraria: string
          criado_em?: string
          id?: string
          interacoes?: Json
          nota_divulgacao: number
          nota_preco: number
          nota_produto: number
          rodada_id: string
          tempo_tela_segundos: number
          validador_id: string
        }
        Update: {
          comentario?: string
          compraria?: string
          criado_em?: string
          id?: string
          interacoes?: Json
          nota_divulgacao?: number
          nota_preco?: number
          nota_produto?: number
          rodada_id?: string
          tempo_tela_segundos?: number
          validador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_rodada_id_fkey"
            columns: ["rodada_id"]
            isOneToOne: false
            referencedRelation: "rodadas_validacao"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueios: {
        Row: {
          atualizado_em: string
          contestado: boolean
          criado_em: string
          dia_referencia: string | null
          fim: string
          id: string
          inicio: string
          motivo: string
          origem: string
          status: string
          validador_id: string
        }
        Insert: {
          atualizado_em?: string
          contestado?: boolean
          criado_em?: string
          dia_referencia?: string | null
          fim: string
          id?: string
          inicio?: string
          motivo: string
          origem?: string
          status?: string
          validador_id: string
        }
        Update: {
          atualizado_em?: string
          contestado?: boolean
          criado_em?: string
          dia_referencia?: string | null
          fim?: string
          id?: string
          inicio?: string
          motivo?: string
          origem?: string
          status?: string
          validador_id?: string
        }
        Relationships: []
      }
      cadastro_anunciantes: {
        Row: {
          atualizado_em: string
          maior_de_18: boolean
          nome_empresa: string
          telefone: string
          tipo_produto: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          maior_de_18?: boolean
          nome_empresa: string
          telefone: string
          tipo_produto: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          maior_de_18?: boolean
          nome_empresa?: string
          telefone?: string
          tipo_produto?: string
          usuario_id?: string
        }
        Relationships: []
      }
      cadastro_validadores: {
        Row: {
          atualizado_em: string
          consentimento_lgpd_interesses: boolean
          maior_de_18: boolean
          telefone: string
          telefone_verificado: boolean
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          consentimento_lgpd_interesses?: boolean
          maior_de_18?: boolean
          telefone: string
          telefone_verificado?: boolean
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          consentimento_lgpd_interesses?: boolean
          maior_de_18?: boolean
          telefone?: string
          telefone_verificado?: boolean
          usuario_id?: string
        }
        Relationships: []
      }
      canais: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          slug: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          slug: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      carteiras: {
        Row: {
          codigo_indicacao: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          codigo_indicacao?: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          codigo_indicacao?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativa: boolean
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      chamados_token: {
        Row: {
          atualizado_em: string
          criado_em: string
          decisao_suporte: string | null
          evidencia: string | null
          habilitacao_id: string
          id: string
          link_comentario: string
          motivo: string
          prazo: string
          responsavel: string | null
          resposta_anunciante: string | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          decisao_suporte?: string | null
          evidencia?: string | null
          habilitacao_id: string
          id?: string
          link_comentario: string
          motivo: string
          prazo: string
          responsavel?: string | null
          resposta_anunciante?: string | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          decisao_suporte?: string | null
          evidencia?: string | null
          habilitacao_id?: string
          id?: string
          link_comentario?: string
          motivo?: string
          prazo?: string
          responsavel?: string | null
          resposta_anunciante?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_token_habilitacao_id_fkey"
            columns: ["habilitacao_id"]
            isOneToOne: false
            referencedRelation: "habilitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          atualizado_em: string
          chave: string
          descricao: string | null
          valor: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          descricao?: string | null
          valor: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          descricao?: string | null
          valor?: string
        }
        Relationships: []
      }
      contas_pix: {
        Row: {
          aprovado: boolean
          atualizado_em: string
          chave: string
          tipo_chave: string
          titular_cpf: string
          titular_cpf_normalizado: string | null
          titular_nome: string
          usuario_id: string
        }
        Insert: {
          aprovado?: boolean
          atualizado_em?: string
          chave: string
          tipo_chave: string
          titular_cpf: string
          titular_cpf_normalizado?: string | null
          titular_nome: string
          usuario_id: string
        }
        Update: {
          aprovado?: boolean
          atualizado_em?: string
          chave?: string
          tipo_chave?: string
          titular_cpf?: string
          titular_cpf_normalizado?: string | null
          titular_nome?: string
          usuario_id?: string
        }
        Relationships: []
      }
      contas_sociais: {
        Row: {
          atualizado_em: string
          canal: string
          criado_em: string
          data_primeira_postagem: string
          handle: string
          id: string
          imagem_url: string | null
          observacao_admin: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          canal: string
          criado_em?: string
          data_primeira_postagem: string
          handle: string
          id?: string
          imagem_url?: string | null
          observacao_admin?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          canal?: string
          criado_em?: string
          data_primeira_postagem?: string
          handle?: string
          id?: string
          imagem_url?: string | null
          observacao_admin?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: []
      }
      contestacoes_bloqueio: {
        Row: {
          atualizado_em: string
          bloqueio_id: string
          criado_em: string
          decidido_em: string | null
          decisor: string | null
          id: string
          status: string
          texto: string
          validador_id: string
        }
        Insert: {
          atualizado_em?: string
          bloqueio_id: string
          criado_em?: string
          decidido_em?: string | null
          decisor?: string | null
          id?: string
          status?: string
          texto: string
          validador_id: string
        }
        Update: {
          atualizado_em?: string
          bloqueio_id?: string
          criado_em?: string
          decidido_em?: string | null
          decisor?: string | null
          id?: string
          status?: string
          texto?: string
          validador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contestacoes_bloqueio_bloqueio_id_fkey"
            columns: ["bloqueio_id"]
            isOneToOne: true
            referencedRelation: "bloqueios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_usuarios: {
        Row: {
          criado_em: string
          documento: string
          documento_normalizado: string | null
          tipo_documento: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          documento: string
          documento_normalizado?: string | null
          tipo_documento: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          documento?: string
          documento_normalizado?: string | null
          tipo_documento?: string
          usuario_id?: string
        }
        Relationships: []
      }
      habilitacoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          dispositivo_id: string | null
          expira_em: string
          handle: string
          id: string
          status: string
          tarefa_id: string
          validada_em: string | null
          validador_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          dispositivo_id?: string | null
          expira_em: string
          handle: string
          id?: string
          status?: string
          tarefa_id: string
          validada_em?: string | null
          validador_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          dispositivo_id?: string | null
          expira_em?: string
          handle?: string
          id?: string
          status?: string
          tarefa_id?: string
          validada_em?: string | null
          validador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habilitacoes_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      habilitacoes_contabilizadas: {
        Row: {
          canal_id: string
          contabilizada_em: string
          dia: string
          habilitacao_id: string
          validador_id: string
        }
        Insert: {
          canal_id: string
          contabilizada_em?: string
          dia: string
          habilitacao_id: string
          validador_id: string
        }
        Update: {
          canal_id?: string
          contabilizada_em?: string
          dia?: string
          habilitacao_id?: string
          validador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habilitacoes_contabilizadas_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habilitacoes_contabilizadas_habilitacao_id_fkey"
            columns: ["habilitacao_id"]
            isOneToOne: true
            referencedRelation: "habilitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      indicacoes: {
        Row: {
          bonus_percentual: number
          codigo_indicacao: string
          criado_em: string
          id: string
          indicado_id: string
          indicador_id: string
          status: string
        }
        Insert: {
          bonus_percentual?: number
          codigo_indicacao: string
          criado_em?: string
          id?: string
          indicado_id: string
          indicador_id: string
          status?: string
        }
        Update: {
          bonus_percentual?: number
          codigo_indicacao?: string
          criado_em?: string
          id?: string
          indicado_id?: string
          indicador_id?: string
          status?: string
        }
        Relationships: []
      }
      interesses_validador: {
        Row: {
          categoria_id: string
          criado_em: string
          usuario_id: string
        }
        Insert: {
          categoria_id: string
          criado_em?: string
          usuario_id: string
        }
        Update: {
          categoria_id?: string
          criado_em?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interesses_validador_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          carteira_id: string
          criado_em: string
          disponivel_em: string
          id: string
          referencia_id: string | null
          referencia_tipo: string | null
          status: string
          tipo: string
          valor: number
        }
        Insert: {
          carteira_id: string
          criado_em?: string
          disponivel_em?: string
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          status: string
          tipo: string
          valor: number
        }
        Update: {
          carteira_id?: string
          criado_em?: string
          disponivel_em?: string
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          status?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "carteiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "saldo_disponivel"
            referencedColumns: ["carteira_id"]
          },
          {
            foreignKeyName: "lancamentos_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "saldo_pendente"
            referencedColumns: ["carteira_id"]
          },
          {
            foreignKeyName: "lancamentos_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "saldo_reservado"
            referencedColumns: ["carteira_id"]
          },
        ]
      }
      niveis: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          ordem: number
          tarefas_validas_minimas: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          ordem: number
          tarefas_validas_minimas?: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          ordem?: number
          tarefas_validas_minimas?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      publicacoes: {
        Row: {
          anunciante_id: string
          atualizado_em: string
          categoria_id: string
          criado_em: string
          id: string
          imagem_url: string
          legenda: string
          link: string
          oferta: string
          preco: number
          produto_eh_curso: boolean
          publico_alvo: Json
          restricao_id: string | null
          revisao_admin_pendente: boolean
          status: string
          versao: number
        }
        Insert: {
          anunciante_id: string
          atualizado_em?: string
          categoria_id: string
          criado_em?: string
          id?: string
          imagem_url: string
          legenda: string
          link: string
          oferta: string
          preco?: number
          produto_eh_curso?: boolean
          publico_alvo?: Json
          restricao_id?: string | null
          revisao_admin_pendente?: boolean
          status?: string
          versao?: number
        }
        Update: {
          anunciante_id?: string
          atualizado_em?: string
          categoria_id?: string
          criado_em?: string
          id?: string
          imagem_url?: string
          legenda?: string
          link?: string
          oferta?: string
          preco?: number
          produto_eh_curso?: boolean
          publico_alvo?: Json
          restricao_id?: string | null
          revisao_admin_pendente?: boolean
          status?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_restricao_id_fkey"
            columns: ["restricao_id"]
            isOneToOne: false
            referencedRelation: "restricoes"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_liberacao: {
        Row: {
          ativo: boolean
          atualizado_em: string
          ciclica: boolean
          criado_em: string
          id: string
          quantidade_liberada: number
          quantidade_requisito: number
          tipo_destino_id: string
          tipo_origem_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          ciclica?: boolean
          criado_em?: string
          id?: string
          quantidade_liberada: number
          quantidade_requisito: number
          tipo_destino_id: string
          tipo_origem_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          ciclica?: boolean
          criado_em?: string
          id?: string
          quantidade_liberada?: number
          quantidade_requisito?: number
          tipo_destino_id?: string
          tipo_origem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_liberacao_tipo_destino_id_fkey"
            columns: ["tipo_destino_id"]
            isOneToOne: false
            referencedRelation: "tipos_tarefa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_liberacao_tipo_origem_id_fkey"
            columns: ["tipo_origem_id"]
            isOneToOne: false
            referencedRelation: "tipos_tarefa"
            referencedColumns: ["id"]
          },
        ]
      }
      restricoes: {
        Row: {
          ativa: boolean
          atualizado_em: string
          criado_em: string
          descricao: string
          exige_revisao: boolean
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao: string
          exige_revisao?: boolean
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          exige_revisao?: boolean
          id?: string
          nome?: string
        }
        Relationships: []
      }
      rodadas_validacao: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          publicacao_id: string
          quantidade_concluida: number
          quantidade_contratada: number
          status: string
          valor_reservado: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          publicacao_id: string
          quantidade_concluida?: number
          quantidade_contratada?: number
          status?: string
          valor_reservado: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          publicacao_id?: string
          quantidade_concluida?: number
          quantidade_contratada?: number
          status?: string
          valor_reservado?: number
        }
        Relationships: [
          {
            foreignKeyName: "rodadas_validacao_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      saques: {
        Row: {
          carteira_id: string
          id: string
          lancamento_id: string
          revisado_em: string | null
          revisado_por: string | null
          solicitado_em: string
          status: string
          valor: number
        }
        Insert: {
          carteira_id: string
          id?: string
          lancamento_id: string
          revisado_em?: string | null
          revisado_por?: string | null
          solicitado_em?: string
          status?: string
          valor: number
        }
        Update: {
          carteira_id?: string
          id?: string
          lancamento_id?: string
          revisado_em?: string | null
          revisado_por?: string | null
          solicitado_em?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "saques_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "carteiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saques_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "saldo_disponivel"
            referencedColumns: ["carteira_id"]
          },
          {
            foreignKeyName: "saques_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "saldo_pendente"
            referencedColumns: ["carteira_id"]
          },
          {
            foreignKeyName: "saques_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "saldo_reservado"
            referencedColumns: ["carteira_id"]
          },
          {
            foreignKeyName: "saques_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: true
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          atualizado_em: string
          categoria_id: string
          criado_em: string
          id: string
          is_demo: boolean
          link_destino: string | null
          publicacao_id: string | null
          status: string
          tempo_estimado_minutos: number
          tipo_tarefa_id: string
          tokens_exportados_em: string | null
          vagas: number
          vagas_concluidas: number
          vagas_ocupadas: number
          valor_reservado: number
        }
        Insert: {
          atualizado_em?: string
          categoria_id: string
          criado_em?: string
          id?: string
          is_demo?: boolean
          link_destino?: string | null
          publicacao_id?: string | null
          status?: string
          tempo_estimado_minutos?: number
          tipo_tarefa_id: string
          tokens_exportados_em?: string | null
          vagas: number
          vagas_concluidas?: number
          vagas_ocupadas?: number
          valor_reservado?: number
        }
        Update: {
          atualizado_em?: string
          categoria_id?: string
          criado_em?: string
          id?: string
          is_demo?: boolean
          link_destino?: string | null
          publicacao_id?: string | null
          status?: string
          tempo_estimado_minutos?: number
          tipo_tarefa_id?: string
          tokens_exportados_em?: string | null
          vagas?: number
          vagas_concluidas?: number
          vagas_ocupadas?: number
          valor_reservado?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tipo_tarefa_id_fkey"
            columns: ["tipo_tarefa_id"]
            isOneToOne: false
            referencedRelation: "tipos_tarefa"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_tarefa: {
        Row: {
          acao: string
          ativo: boolean
          atualizado_em: string
          canal_id: string
          criado_em: string
          id: string
          metodo_verificacao: string
          nome: string
          valor_validador: number
        }
        Insert: {
          acao: string
          ativo?: boolean
          atualizado_em?: string
          canal_id: string
          criado_em?: string
          id?: string
          metodo_verificacao: string
          nome: string
          valor_validador: number
        }
        Update: {
          acao?: string
          ativo?: boolean
          atualizado_em?: string
          canal_id?: string
          criado_em?: string
          id?: string
          metodo_verificacao?: string
          nome?: string
          valor_validador?: number
        }
        Relationships: [
          {
            foreignKeyName: "tipos_tarefa_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_tarefa: {
        Row: {
          atualizado_em: string
          criado_em: string
          expira_em: string
          habilitacao_id: string
          hash: string
          id: string
          limite_tentativas: number
          status: string
          tentativas: number
          usado_em: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          expira_em: string
          habilitacao_id: string
          hash: string
          id?: string
          limite_tentativas?: number
          status?: string
          tentativas?: number
          usado_em?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          expira_em?: string
          habilitacao_id?: string
          hash?: string
          id?: string
          limite_tentativas?: number
          status?: string
          tentativas?: number
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_tarefa_habilitacao_id_fkey"
            columns: ["habilitacao_id"]
            isOneToOne: false
            referencedRelation: "habilitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validador_contadores_diarios: {
        Row: {
          atualizado_em: string
          canal_id: string
          creditos_consumidos: number
          creditos_liberados: number
          criado_em: string
          dia: string
          id: string
          tarefas_concluidas: number
          validador_id: string
        }
        Insert: {
          atualizado_em?: string
          canal_id: string
          creditos_consumidos?: number
          creditos_liberados?: number
          criado_em?: string
          dia: string
          id?: string
          tarefas_concluidas?: number
          validador_id: string
        }
        Update: {
          atualizado_em?: string
          canal_id?: string
          creditos_consumidos?: number
          creditos_liberados?: number
          criado_em?: string
          dia?: string
          id?: string
          tarefas_concluidas?: number
          validador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validador_contadores_diarios_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      saldo_disponivel: {
        Row: {
          carteira_id: string | null
          saldo: number | null
          usuario_id: string | null
        }
        Relationships: []
      }
      saldo_pendente: {
        Row: {
          carteira_id: string | null
          saldo: number | null
          usuario_id: string | null
        }
        Relationships: []
      }
      saldo_reservado: {
        Row: {
          carteira_id: string | null
          saldo: number | null
          usuario_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      abrir_chamado_token: {
        Args: {
          p_evidencia?: string
          p_habilitacao_id: string
          p_link_comentario: string
          p_motivo: string
        }
        Returns: string
      }
      atualizar_interesses_validador: {
        Args: { p_categoria_ids: string[] }
        Returns: number
      }
      concluir_avaliacao_interna: {
        Args: {
          p_comentario: string
          p_compraria: string
          p_habilitacao_id: string
          p_interacoes: Json
          p_nota_divulgacao: number
          p_nota_preco: number
          p_nota_produto: number
          p_tempo_tela_segundos: number
        }
        Returns: string
      }
      contestar_bloqueio: {
        Args: { p_bloqueio_id: string; p_texto: string }
        Returns: string
      }
      creditar_bonus_indicacao: {
        Args: {
          p_base_calculo: number
          p_indicado_id: string
          p_referencia_id: string
        }
        Returns: number
      }
      criar_tarefa_real: {
        Args: {
          p_link_publicacao: string
          p_publicacao_id: string
          p_tipo_tarefa_id: string
          p_vagas: number
        }
        Returns: string
      }
      decidir_contestacao_bloqueio: {
        Args: { p_contestacao_id: string; p_decisao: string }
        Returns: undefined
      }
      depositar_mock: { Args: { p_valor: number }; Returns: string }
      desistir_habilitacao: {
        Args: { p_habilitacao_id: string }
        Returns: undefined
      }
      duplicar_publicacao: {
        Args: { p_publicacao_id: string }
        Returns: string
      }
      estimar_validadores_disponiveis: {
        Args: { p_categoria_id: string }
        Returns: number
      }
      gerar_tokens_tarefa: {
        Args: { p_tarefa_id: string }
        Returns: {
          codigo: string
          expira_em: string
          habilitacao_id: string
          handle: string
        }[]
      }
      habilitar_tarefa: {
        Args: { p_dispositivo_id: string; p_tarefa_id: string }
        Returns: string
      }
      iniciar_rodada_validacao: {
        Args: { p_publicacao_id: string }
        Returns: {
          quantidade_estimada: number
          rodada_id: string
          valor_reservado: number
        }[]
      }
      listar_chamados_token_anunciante: {
        Args: never
        Returns: {
          chamado_id: string
          evidencia: string
          handle: string
          link_comentario: string
          motivo: string
          prazo: string
          resposta_anunciante: string
          status: string
        }[]
      }
      listar_habilitacoes_tarefa: {
        Args: { p_tarefa_id: string }
        Returns: {
          expira_em: string
          habilitacao_id: string
          handle: string
          status: string
          token_expira_em: string
          token_status: string
        }[]
      }
      marcar_saque_pago: { Args: { p_saque_id: string }; Returns: undefined }
      marcar_tokens_exportados: {
        Args: { p_tarefa_id: string }
        Returns: undefined
      }
      obter_bloqueio_validador_fase9: { Args: never; Returns: Json }
      obter_dados_admin_fase9: { Args: never; Returns: Json }
      obter_ou_criar_carteira: {
        Args: never
        Returns: {
          codigo_indicacao: string
          criado_em: string
          id: string
          usuario_id: string
        }
        SetofOptions: {
          from: "*"
          to: "carteiras"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      obter_pacote_validacao_minimo: { Args: never; Returns: number }
      obter_resultado_validacao: {
        Args: { p_rodada_id: string }
        Returns: {
          diagnostico: string
          disponivel: boolean
          motivos_mais_citados: Json
          nota_divulgacao: number
          nota_geral: number
          nota_preco: number
          nota_produto: number
          percentual_aprovacao: number
          percentual_compraria: number
          total_avaliacoes: number
        }[]
      }
      obter_saque_minimo: { Args: never; Returns: number }
      obter_status_liberacao_fase9: {
        Args: never
        Returns: {
          canal: string
          creditos_disponiveis: number
          mensagem: string
          proxima_liberacao_em: string
          tarefas_concluidas: number
        }[]
      }
      obter_tarefa_validacao: {
        Args: { p_habilitacao_id: string }
        Returns: {
          categoria_nome: string
          expira_em: string
          habilitacao_id: string
          imagem_url: string
          legenda: string
          oferta: string
          preco: number
          publicacao_id: string
          rodada_id: string
          tarefa_id: string
        }[]
      }
      pagar_tarefa: {
        Args: {
          p_anunciante_id: string
          p_referencia_id: string
          p_validador_id: string
          p_valor_validador: number
        }
        Returns: number
      }
      processar_bloqueios_diarios: { Args: never; Returns: number }
      processar_bloqueios_habilitacoes_expiradas: {
        Args: never
        Returns: number
      }
      processar_chamados_token_expirados: { Args: never; Returns: number }
      processar_habilitacoes_expiradas: { Args: never; Returns: number }
      registrar_indicacao: { Args: { p_codigo: string }; Returns: string }
      reservar_pacote: {
        Args: { p_referencia_id?: string; p_valor: number }
        Returns: string
      }
      resolver_chamado_token: {
        Args: { p_chamado_id: string; p_decisao: string; p_observacao: string }
        Returns: undefined
      }
      responder_chamado_token: {
        Args: { p_chamado_id: string; p_resposta: string }
        Returns: undefined
      }
      salvar_regra_liberacao: {
        Args: {
          p_ativo: boolean
          p_ciclica: boolean
          p_id: string
          p_quantidade_liberada: number
          p_quantidade_requisito: number
          p_tipo_destino_id: string
          p_tipo_origem_id: string
        }
        Returns: string
      }
      solicitar_saque: { Args: { p_valor: number }; Returns: string }
      validar_token_tarefa: {
        Args: { p_codigo: string; p_habilitacao_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "validador" | "anunciante" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["validador", "anunciante", "admin"],
    },
  },
} as const
