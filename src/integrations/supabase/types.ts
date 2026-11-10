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
          vagas: number
          vagas_ocupadas: number
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
          vagas: number
          vagas_ocupadas?: number
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
          vagas?: number
          vagas_ocupadas?: number
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
      creditar_bonus_indicacao: {
        Args: {
          p_base_calculo: number
          p_indicado_id: string
          p_referencia_id: string
        }
        Returns: number
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
      habilitar_tarefa: { Args: { p_tarefa_id: string }; Returns: string }
      iniciar_rodada_validacao: {
        Args: { p_publicacao_id: string }
        Returns: {
          quantidade_estimada: number
          rodada_id: string
          valor_reservado: number
        }[]
      }
      marcar_saque_pago: { Args: { p_saque_id: string }; Returns: undefined }
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
      processar_habilitacoes_expiradas: { Args: never; Returns: number }
      registrar_indicacao: { Args: { p_codigo: string }; Returns: string }
      reservar_pacote: {
        Args: { p_referencia_id?: string; p_valor: number }
        Returns: string
      }
      solicitar_saque: { Args: { p_valor: number }; Returns: string }
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
