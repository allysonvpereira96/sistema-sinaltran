export type ColaboradorStatus = "ativo" | "afastado" | "ferias" | "desligado";

/**
 * Espelha as colunas de `public.colaboradores` (migration 0003_operacional).
 * Mantém os mesmos nomes para que a futura troca por Supabase seja direta.
 */
export type Colaborador = {
  id: string;
  matricula: string | null;
  nome_completo: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  data_admissao: string;
  data_desligamento: string | null;
  motivo_desligamento?: string | null;
  genero: "masculino" | "feminino" | "outro" | "nao_informado" | null;
  pis: string | null;
  cnh: string | null;
  cnh_validade: string | null;
  email: string | null;
  telefone: string | null;
  foto_url: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  cargo: string;
  setor?: string | null;
  gestor?: string | null;
  empresa_id?: string | null;
  centro_custo_id: string | null;
  remuneracao_base: number | null;
  ajuda_custo: number;
  gratificacoes?: number | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  chave_pix: string | null;
  /** @deprecated migrado para a tabela colaborador_emergencias (vários contatos). */
  emergencia_nome?: string | null;
  /** @deprecated idem — ver colaborador_emergencias. */
  emergencia_parentesco?: string | null;
  /** @deprecated idem — ver colaborador_emergencias. */
  emergencia_telefone?: string | null;
  status: ColaboradorStatus;
  observacoes: string | null;
  termo_uso_imagem?: boolean;
  termo_uso_imagem_data?: string | null;
  manual_conduta?: boolean;
  manual_conduta_data?: string | null;
  // Ficha de registro — filiação / dados civis
  nome_pai?: string | null;
  nome_mae?: string | null;
  estado_civil?: string | null;
  naturalidade?: string | null;
  naturalidade_uf?: string | null;
  nacionalidade?: string | null;
  raca_cor?: string | null;
  grau_instrucao?: string | null;
  // Ficha de registro — documentos trabalhistas
  ctps_numero?: string | null;
  ctps_serie?: string | null;
  titulo_eleitor?: string | null;
  cbo?: string | null;
  matricula_esocial?: string | null;
  // Ficha de registro — contratuais
  insalubridade_pct?: number | null;
  periculosidade_pct?: number | null;
  sindicato?: string | null;
  horario_trabalho?: string | null;
  created_at: string;
};

export const COLABORADOR_STATUS_LABEL: Record<ColaboradorStatus, string> = {
  ativo: "Ativo",
  afastado: "Afastado",
  ferias: "Em férias",
  desligado: "Desligado",
};

export const COLABORADOR_STATUS_TONE: Record<
  ColaboradorStatus,
  { bg: string; text: string; dot: string }
> = {
  ativo: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  ferias: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  afastado: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  desligado: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
};

export const COLABORADORES: Colaborador[] = [
  {
    id: "col-1",
    matricula: "0042",
    nome_completo: "Ricardo Campos da Silva",
    cpf: "01234567890",
    rg: "1234567890",
    data_nascimento: "1982-03-14",
    data_admissao: "2021-02-01",
    data_desligamento: null,
    genero: "masculino",
    pis: "12012345678",
    cnh: "04567890123",
    cnh_validade: "2028-09-30",
    email: "ricardo.campos@sinaltran.com.br",
    telefone: "54999120042",
    foto_url: null,
    endereco: "Rua Os Dezoito do Forte, 1200",
    cidade: "Caxias do Sul",
    estado: "RS",
    cep: "95020000",
    cargo: "Encarregado de obra",
    centro_custo_id: null,
    remuneracao_base: 5200,
    ajuda_custo: 600,
    banco: "Banrisul",
    agencia: "0100",
    conta: "12345-6",
    chave_pix: "ricardo.campos@sinaltran.com.br",
    emergencia_nome: "Helena Campos",
    emergencia_parentesco: "Esposa",
    emergencia_telefone: "54999120099",
    status: "ativo",
    observacoes: "Responsável técnico de campo no Lote 1.",
    created_at: "2021-02-01T08:00:00Z",
  },
  {
    id: "col-2",
    matricula: "0058",
    nome_completo: "Marcos Antônio Lima",
    cpf: "11122233344",
    rg: "2233445566",
    data_nascimento: "1990-07-22",
    data_admissao: "2022-08-15",
    data_desligamento: null,
    genero: "masculino",
    pis: "20987654321",
    cnh: "08901234567",
    cnh_validade: "2027-04-18",
    email: "marcos.lima@sinaltran.com.br",
    telefone: "54998760058",
    foto_url: null,
    endereco: "Av. Júlio de Castilhos, 880",
    cidade: "Caxias do Sul",
    estado: "RS",
    cep: "95010005",
    cargo: "Operador de máquina demarcadora",
    centro_custo_id: null,
    remuneracao_base: 3800,
    ajuda_custo: 450,
    banco: "Caixa",
    agencia: "0455",
    conta: "98765-4",
    chave_pix: "11122233344",
    emergencia_nome: "Sandra Lima",
    emergencia_parentesco: "Mãe",
    emergencia_telefone: "54998760010",
    status: "ativo",
    observacoes: null,
    created_at: "2022-08-15T08:00:00Z",
  },
  {
    id: "col-3",
    matricula: "0061",
    nome_completo: "Juliana Pereira dos Santos",
    cpf: "55566677788",
    rg: "3344556677",
    data_nascimento: "1995-11-03",
    data_admissao: "2023-01-09",
    data_desligamento: null,
    genero: "feminino",
    pis: "13123456789",
    cnh: null,
    cnh_validade: null,
    email: "juliana.santos@sinaltran.com.br",
    telefone: "54997650061",
    foto_url: null,
    endereco: "Rua Sinimbu, 1750",
    cidade: "Caxias do Sul",
    estado: "RS",
    cep: "95020002",
    cargo: "Auxiliar administrativo",
    centro_custo_id: null,
    remuneracao_base: 2650,
    ajuda_custo: 0,
    banco: "Banrisul",
    agencia: "0100",
    conta: "22334-5",
    chave_pix: "juliana.santos@sinaltran.com.br",
    emergencia_nome: "Paulo Santos",
    emergencia_parentesco: "Pai",
    emergencia_telefone: "54997650001",
    status: "ferias",
    observacoes: "Férias de 02/06 a 01/07.",
    created_at: "2023-01-09T08:00:00Z",
  },
  {
    id: "col-4",
    matricula: "0070",
    nome_completo: "Anderson Rocha",
    cpf: "99988877766",
    rg: "4455667788",
    data_nascimento: "1988-05-19",
    data_admissao: "2020-06-22",
    data_desligamento: null,
    genero: "masculino",
    pis: "14234567890",
    cnh: "01234567890",
    cnh_validade: "2026-12-01",
    email: "anderson.rocha@sinaltran.com.br",
    telefone: "54996540070",
    foto_url: null,
    endereco: "Rua Marquês do Herval, 320",
    cidade: "Farroupilha",
    estado: "RS",
    cep: "95180000",
    cargo: "Motorista",
    centro_custo_id: null,
    remuneracao_base: 3200,
    ajuda_custo: 450,
    banco: "Itaú",
    agencia: "1820",
    conta: "33445-6",
    chave_pix: "99988877766",
    emergencia_nome: "Cláudia Rocha",
    emergencia_parentesco: "Esposa",
    emergencia_telefone: "54996540001",
    status: "afastado",
    observacoes: "Afastado pelo INSS desde 20/05 (acidente de trajeto).",
    created_at: "2020-06-22T08:00:00Z",
  },
  {
    id: "col-5",
    matricula: "0073",
    nome_completo: "Fernando Goularte",
    cpf: "22233344455",
    rg: "5566778899",
    data_nascimento: "1993-09-28",
    data_admissao: "2023-09-04",
    data_desligamento: null,
    genero: "masculino",
    pis: "15345678901",
    cnh: null,
    cnh_validade: null,
    email: "fernando.goularte@sinaltran.com.br",
    telefone: "54995430073",
    foto_url: null,
    endereco: "Rua Pinheiro Machado, 90",
    cidade: "Caxias do Sul",
    estado: "RS",
    cep: "95020010",
    cargo: "Pintor viário",
    centro_custo_id: null,
    remuneracao_base: 2900,
    ajuda_custo: 450,
    banco: "Caixa",
    agencia: "0455",
    conta: "44556-7",
    chave_pix: "22233344455",
    emergencia_nome: "Rita Goularte",
    emergencia_parentesco: "Mãe",
    emergencia_telefone: "54995430001",
    status: "ativo",
    observacoes: null,
    created_at: "2023-09-04T08:00:00Z",
  },
  {
    id: "col-6",
    matricula: "0029",
    nome_completo: "Patrícia Menezes",
    cpf: "66677788899",
    rg: "6677889900",
    data_nascimento: "1985-12-10",
    data_admissao: "2019-03-18",
    data_desligamento: "2026-04-30",
    genero: "feminino",
    pis: "16456789012",
    cnh: null,
    cnh_validade: null,
    email: "patricia.menezes@email.com",
    telefone: "54994320029",
    foto_url: null,
    endereco: "Rua Garibaldi, 540",
    cidade: "Bento Gonçalves",
    estado: "RS",
    cep: "95700000",
    cargo: "Técnica em segurança do trabalho",
    centro_custo_id: null,
    remuneracao_base: 4100,
    ajuda_custo: 0,
    banco: "Banrisul",
    agencia: "0100",
    conta: "55667-8",
    chave_pix: "66677788899",
    emergencia_nome: "André Menezes",
    emergencia_parentesco: "Irmão",
    emergencia_telefone: "54994320001",
    status: "desligado",
    observacoes: "Desligamento a pedido em 30/04/2026.",
    created_at: "2019-03-18T08:00:00Z",
  },
  {
    id: "col-7",
    matricula: "0081",
    nome_completo: "Diego Vasconcelos",
    cpf: "33344455566",
    rg: "7788990011",
    data_nascimento: "1997-02-25",
    data_admissao: "2024-05-02",
    data_desligamento: null,
    genero: "masculino",
    pis: "17567890123",
    cnh: "05678901234",
    cnh_validade: "2029-02-25",
    email: "diego.vasconcelos@sinaltran.com.br",
    telefone: "54993210081",
    foto_url: null,
    endereco: "Rua Bento Gonçalves, 215",
    cidade: "Caxias do Sul",
    estado: "RS",
    cep: "95020020",
    cargo: "Ajudante de sinalização",
    centro_custo_id: null,
    remuneracao_base: 2300,
    ajuda_custo: 450,
    banco: "Nubank",
    agencia: "0001",
    conta: "66778-9",
    chave_pix: "diego.vasconcelos@sinaltran.com.br",
    emergencia_nome: "Marta Vasconcelos",
    emergencia_parentesco: "Mãe",
    emergencia_telefone: "54993210001",
    status: "ativo",
    observacoes: null,
    created_at: "2024-05-02T08:00:00Z",
  },
  {
    id: "col-8",
    matricula: "0015",
    nome_completo: "Luiz Eduardo Tonet",
    cpf: "77788899900",
    rg: "8899001122",
    data_nascimento: "1979-08-08",
    data_admissao: "2018-01-15",
    data_desligamento: null,
    genero: "masculino",
    pis: "18678901234",
    cnh: "06789012345",
    cnh_validade: "2027-08-08",
    email: "luiz.tonet@sinaltran.com.br",
    telefone: "54992100015",
    foto_url: null,
    endereco: "Av. São Leopoldo, 2200",
    cidade: "Caxias do Sul",
    estado: "RS",
    cep: "95032000",
    cargo: "Engenheiro civil",
    centro_custo_id: null,
    remuneracao_base: 9800,
    ajuda_custo: 800,
    banco: "Banrisul",
    agencia: "0100",
    conta: "77889-0",
    chave_pix: "77788899900",
    emergencia_nome: "Beatriz Tonet",
    emergencia_parentesco: "Esposa",
    emergencia_telefone: "54992100001",
    status: "ativo",
    observacoes: "Responsável técnico (CREA-RS).",
    created_at: "2018-01-15T08:00:00Z",
  },
];

// ── Tabelas-filhas (espelham as tabelas do módulo RH original) ───────────────

/** Tipos de documento (texto livre no banco; valores conhecidos têm label). */
export type DocumentoTipo = string;

/** Espelha public.colaborador_documentos. */
export type ColaboradorDocumento = {
  id: string;
  colaborador_id: string;
  tipo: string;
  descricao: string | null;
  arquivo_url: string;
  dias_atestado: number | null;
  uploaded_by: string | null;
  data_upload: string;
};

export const TIPOS_DOCUMENTO: { value: string; label: string; grupo: string }[] = [
  // Pessoais
  { value: "rg", label: "RG", grupo: "Pessoais" },
  { value: "cpf", label: "CPF", grupo: "Pessoais" },
  { value: "ctps", label: "CTPS", grupo: "Pessoais" },
  { value: "cnh", label: "CNH", grupo: "Pessoais" },
  { value: "titulo_eleitor", label: "Título de eleitor", grupo: "Pessoais" },
  { value: "certificado_reservista", label: "Certificado de reservista", grupo: "Pessoais" },
  { value: "comprovante_residencia", label: "Comprovante de residência", grupo: "Pessoais" },
  { value: "comprovante_escolaridade", label: "Comprovante de escolaridade", grupo: "Pessoais" },
  { value: "certidao_nascimento_filhos", label: "Certidão de nasc. (filhos)", grupo: "Pessoais" },
  { value: "foto_3x4", label: "Foto 3x4", grupo: "Pessoais" },
  // Admissão / contrato
  { value: "contrato_trabalho", label: "Contrato de trabalho", grupo: "Admissão e contrato" },
  { value: "ficha_registro", label: "Ficha de registro", grupo: "Admissão e contrato" },
  // Saúde ocupacional
  { value: "aso_admissional", label: "ASO admissional", grupo: "Saúde ocupacional" },
  { value: "aso_periodico", label: "ASO periódico", grupo: "Saúde ocupacional" },
  { value: "aso_demissional", label: "ASO demissional", grupo: "Saúde ocupacional" },
  { value: "atestado", label: "Atestado médico", grupo: "Saúde ocupacional" },
  // Folha
  { value: "contra_cheque", label: "Contracheque", grupo: "Folha de pagamento" },
  { value: "recibo_ferias", label: "Recibo de férias", grupo: "Folha de pagamento" },
  // Disciplinar
  { value: "advertencia", label: "Advertência", grupo: "Disciplinar" },
  { value: "suspensao", label: "Suspensão", grupo: "Disciplinar" },
  // Termos
  { value: "termo_uso_imagem", label: "Termo de uso de imagem", grupo: "Termos" },
  { value: "manual_conduta", label: "Manual de conduta", grupo: "Termos" },
  // Desligamento / outros
  { value: "oficio_pensao", label: "Ofício de pensão", grupo: "Outros" },
  { value: "desligamento", label: "Desligamento", grupo: "Outros" },
  { value: "outros", label: "Outros", grupo: "Outros" },
];

/** Ordem dos grupos para o select agrupado (optgroup). */
export const TIPOS_DOCUMENTO_GRUPOS: string[] = [
  "Pessoais",
  "Admissão e contrato",
  "Saúde ocupacional",
  "Folha de pagamento",
  "Disciplinar",
  "Termos",
  "Outros",
];

// Rótulos legados (categorias antigas) — mantém exibição correta de docs já gravados.
const _DOC_LABEL_LEGADO: Record<string, string> = {
  doc_admissionais: "Doc. admissionais",
  doc_pessoais: "Doc. pessoais",
  doc_demissionais: "Doc. demissionais",
  contratos: "Contratos",
  aso: "ASO",
  ferias: "Férias",
};

const _DOC_LABEL: Record<string, string> = {
  ..._DOC_LABEL_LEGADO,
  ...Object.fromEntries(TIPOS_DOCUMENTO.map((t) => [t.value, t.label])),
};
export function documentoTipoLabel(tipo: string): string {
  return _DOC_LABEL[tipo] ?? tipo;
}

export const COLABORADOR_DOCUMENTOS: ColaboradorDocumento[] = [
  { id: "doc-1", colaborador_id: "col-1", tipo: "contratos", descricao: "Contrato de trabalho assinado", arquivo_url: "col-1/contratos/contrato.pdf", dias_atestado: null, uploaded_by: null, data_upload: "2021-02-01T09:00:00Z" },
  { id: "doc-2", colaborador_id: "col-1", tipo: "aso", descricao: "ASO admissional", arquivo_url: "col-1/aso/aso.pdf", dias_atestado: null, uploaded_by: null, data_upload: "2021-02-01T09:10:00Z" },
  { id: "doc-3", colaborador_id: "col-1", tipo: "doc_pessoais", descricao: "RG (frente e verso)", arquivo_url: "col-1/doc_pessoais/rg.pdf", dias_atestado: null, uploaded_by: null, data_upload: "2021-02-01T09:15:00Z" },
  { id: "doc-4", colaborador_id: "col-2", tipo: "aso", descricao: "ASO periódico", arquivo_url: "col-2/aso/aso.pdf", dias_atestado: null, uploaded_by: null, data_upload: "2024-08-15T10:00:00Z" },
  { id: "doc-5", colaborador_id: "col-8", tipo: "contratos", descricao: "Contrato de trabalho", arquivo_url: "col-8/contratos/contrato.pdf", dias_atestado: null, uploaded_by: null, data_upload: "2018-01-15T09:00:00Z" },
];

export type ColaboradorDependente = {
  id: string;
  colaborador_id: string;
  nome: string;
  parentesco: string;
  data_nascimento: string | null;
  cpf: string | null;
};

export const COLABORADOR_DEPENDENTES: ColaboradorDependente[] = [
  { id: "dep-1", colaborador_id: "col-1", nome: "Lucas Campos", parentesco: "Filho", data_nascimento: "2012-05-20", cpf: null },
  { id: "dep-2", colaborador_id: "col-1", nome: "Manuela Campos", parentesco: "Filha", data_nascimento: "2015-09-02", cpf: null },
  { id: "dep-3", colaborador_id: "col-4", nome: "Sofia Rocha", parentesco: "Filha", data_nascimento: "2018-11-11", cpf: null },
  { id: "dep-4", colaborador_id: "col-8", nome: "Pedro Tonet", parentesco: "Filho", data_nascimento: "2009-03-30", cpf: null },
];

/** Espelha public.colaborador_emergencias — vários contatos por colaborador. */
export type ColaboradorEmergencia = {
  id: string;
  colaborador_id: string;
  nome: string;
  parentesco: string | null;
  telefone: string | null;
  created_at: string;
};

/** Mock derivado dos contatos de emergência legados (1 por colaborador). */
export const COLABORADOR_EMERGENCIAS: ColaboradorEmergencia[] = COLABORADORES.filter(
  (c) => c.emergencia_nome,
).map((c, i) => ({
  id: `eme-${i + 1}`,
  colaborador_id: c.id,
  nome: c.emergencia_nome as string,
  parentesco: c.emergencia_parentesco ?? null,
  telefone: c.emergencia_telefone ?? null,
  created_at: c.created_at,
}));

export type FeriasStatus = "agendada" | "em_gozo" | "concluida";

export type ColaboradorFerias = {
  id: string;
  colaborador_id: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  status: FeriasStatus;
};

export const FERIAS_STATUS_LABEL: Record<FeriasStatus, string> = {
  agendada: "Agendada",
  em_gozo: "Em gozo",
  concluida: "Concluída",
};

export const COLABORADOR_FERIAS: ColaboradorFerias[] = [
  { id: "fer-1", colaborador_id: "col-3", periodo_aquisitivo_inicio: "2024-01-09", periodo_aquisitivo_fim: "2025-01-08", data_inicio: "2026-06-02", data_fim: "2026-07-01", dias: 30, status: "em_gozo" },
  { id: "fer-2", colaborador_id: "col-1", periodo_aquisitivo_inicio: "2023-02-01", periodo_aquisitivo_fim: "2024-01-31", data_inicio: "2024-07-15", data_fim: "2024-08-13", dias: 30, status: "concluida" },
  { id: "fer-3", colaborador_id: "col-2", periodo_aquisitivo_inicio: "2024-08-15", periodo_aquisitivo_fim: "2025-08-14", data_inicio: "2026-09-01", data_fim: "2026-09-30", dias: 30, status: "agendada" },
];

export type HistoricoTipo = "admissao" | "promocao" | "alteracao_salarial" | "transferencia" | "afastamento" | "desligamento";

export type ColaboradorHistorico = {
  id: string;
  colaborador_id: string;
  tipo: HistoricoTipo;
  descricao: string;
  data: string;
};

export const HISTORICO_TIPO_LABEL: Record<HistoricoTipo, string> = {
  admissao: "Admissão",
  promocao: "Promoção",
  alteracao_salarial: "Alteração salarial",
  transferencia: "Transferência",
  afastamento: "Afastamento",
  desligamento: "Desligamento",
};

export const COLABORADOR_HISTORICO: ColaboradorHistorico[] = [
  { id: "his-1", colaborador_id: "col-1", tipo: "admissao", descricao: "Admitido como Pintor viário", data: "2021-02-01" },
  { id: "his-2", colaborador_id: "col-1", tipo: "promocao", descricao: "Promovido a Encarregado de obra", data: "2023-03-01" },
  { id: "his-3", colaborador_id: "col-1", tipo: "alteracao_salarial", descricao: "Reajuste para R$ 5.200,00", data: "2025-05-01" },
  { id: "his-4", colaborador_id: "col-4", tipo: "afastamento", descricao: "Afastamento INSS (acidente de trajeto)", data: "2026-05-20" },
  { id: "his-5", colaborador_id: "col-6", tipo: "desligamento", descricao: "Desligamento a pedido", data: "2026-04-30" },
];

// ── Comentários ──────────────────────────────────────────────────────────────
export type ColaboradorComentario = {
  id: string;
  colaborador_id: string;
  comentario: string;
  created_by: string | null;
  created_at: string;
};

export const COLABORADOR_COMENTARIOS: ColaboradorComentario[] = [
  { id: "com-1", colaborador_id: "col-1", comentario: "Excelente liderança de equipe na obra do Lote 1.", created_by: null, created_at: "2025-05-10T14:00:00Z" },
  { id: "com-2", colaborador_id: "col-4", comentario: "Acompanhar retorno do afastamento junto ao RH.", created_by: null, created_at: "2026-05-22T09:30:00Z" },
];

// ── Ocorrências (caderno virtual) ────────────────────────────────────────────
export type OcorrenciaTipo =
  | "falta"
  | "atraso"
  | "atestado"
  | "advertencia"
  | "suspensao"
  | "elogio"
  | "observacao"
  | "outro"
  | "aumento_salario"
  | "troca_funcao"
  | "banco_horas"
  | "viagem";

export type ColaboradorOcorrencia = {
  id: string;
  colaborador_id: string;
  tipo: OcorrenciaTipo;
  descricao: string;
  observacoes: string | null;
  data: string;
  /** Para atestado/suspensão: nº de dias de afastamento (1 = só o dia da data). */
  dias_atestado?: number | null;
  /** Último dia do período (data + dias_atestado - 1). */
  data_fim?: string | null;
  /** Path do arquivo no bucket `colaborador-documentos`. */
  anexo_url?: string | null;
  /** Nome original do arquivo enviado. */
  anexo_nome?: string | null;
  // Movimentações: valores preservados para consulta
  valor_anterior?: number | null;
  valor_novo?: number | null;
  funcao_anterior?: string | null;
  funcao_nova?: string | null;
  /** Banco de horas: minutos com sinal (+ crédito / − débito). */
  horas_minutos?: number | null;
  created_by: string | null;
  created_at: string;
};

/** Tipos onde faz sentido informar período (intervalo de dias). */
export function tipoTemPeriodo(tipo: OcorrenciaTipo): boolean {
  return tipo === "atestado" || tipo === "suspensao" || tipo === "viagem";
}

/** Viagem a trabalho: registra intervalo (saída → volta), base p/ descontos
 * de mobilidade e alimentação. Entrada por duas datas; reaproveita
 * `dias_atestado`/`data_fim`. */
export function tipoEhViagem(tipo: OcorrenciaTipo): boolean {
  return tipo === "viagem";
}

/** Tipos onde anexar documento é fortemente recomendado. */
export function tipoRecomendaAnexo(tipo: OcorrenciaTipo): boolean {
  return tipo === "atestado" || tipo === "advertencia" || tipo === "suspensao";
}

export const OCORRENCIA_TIPO_LABEL: Record<OcorrenciaTipo, string> = {
  falta: "Falta",
  atraso: "Atraso",
  atestado: "Atestado",
  advertencia: "Advertência",
  suspensao: "Suspensão",
  elogio: "Elogio",
  observacao: "Observação",
  outro: "Outro",
  aumento_salario: "Aumento de salário",
  troca_funcao: "Troca de função",
  banco_horas: "Banco de horas",
  viagem: "Viagem",
};

/** Tipo de movimentação que registra crédito/débito de horas. */
export function tipoEhBancoHoras(tipo: OcorrenciaTipo): boolean {
  return tipo === "banco_horas";
}

/** Minutos com sinal → "+02:00" / "−01:30". */
export function formatHorasMinutos(minutos: number | null | undefined): string {
  if (minutos == null || minutos === 0) return "00:00";
  const sinal = minutos < 0 ? "−" : "+";
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const OCORRENCIA_TIPO_TONE: Record<OcorrenciaTipo, { bg: string; text: string }> = {
  falta: { bg: "bg-rose-50", text: "text-rose-700" },
  atraso: { bg: "bg-amber-50", text: "text-amber-700" },
  atestado: { bg: "bg-sky-50", text: "text-sky-700" },
  advertencia: { bg: "bg-orange-50", text: "text-orange-700" },
  suspensao: { bg: "bg-rose-50", text: "text-rose-700" },
  elogio: { bg: "bg-emerald-50", text: "text-emerald-700" },
  observacao: { bg: "bg-slate-50", text: "text-slate-700" },
  outro: { bg: "bg-slate-50", text: "text-slate-700" },
  aumento_salario: { bg: "bg-emerald-50", text: "text-emerald-700" },
  troca_funcao: { bg: "bg-violet-50", text: "text-violet-700" },
  banco_horas: { bg: "bg-indigo-50", text: "text-indigo-700" },
  viagem: { bg: "bg-teal-50", text: "text-teal-700" },
};

export const COLABORADOR_OCORRENCIAS: ColaboradorOcorrencia[] = [
  { id: "oco-1", colaborador_id: "col-2", tipo: "elogio", descricao: "Reconhecimento por produtividade acima da meta.", data: "2026-03-12", observacoes: null, created_by: null, created_at: "2026-03-12T10:00:00Z" },
  { id: "oco-2", colaborador_id: "col-5", tipo: "atraso", descricao: "Atraso de 40 min sem justificativa.", data: "2026-05-04", observacoes: null, created_by: null, created_at: "2026-05-04T08:40:00Z" },
];

// ── Avaliações de desempenho ─────────────────────────────────────────────────
export type ColaboradorAvaliacao = {
  id: string;
  colaborador_id: string;
  data: string;
  periodo: string | null;
  nota: number | null;
  avaliador: string | null;
  pontos_fortes: string | null;
  pontos_melhorar: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
};

export const COLABORADOR_AVALIACOES: ColaboradorAvaliacao[] = [
  { id: "ava-1", colaborador_id: "col-1", data: "2025-12-15", periodo: "2025", nota: 9.2, avaliador: "Luiz Eduardo Tonet", pontos_fortes: "Liderança, organização de campo.", pontos_melhorar: "Delegar mais tarefas.", observacoes: null, created_by: null, created_at: "2025-12-15T16:00:00Z" },
  { id: "ava-2", colaborador_id: "col-2", data: "2025-12-15", periodo: "2025", nota: 8.0, avaliador: "Ricardo Campos da Silva", pontos_fortes: "Domínio da máquina demarcadora.", pontos_melhorar: "Pontualidade.", observacoes: null, created_by: null, created_at: "2025-12-15T16:10:00Z" },
];
