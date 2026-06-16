import { OBRAS } from "./obras";

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
  obra_id: string | null;
  remuneracao_base: number | null;
  ajuda_custo: number;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  chave_pix: string | null;
  emergencia_nome: string | null;
  emergencia_parentesco: string | null;
  emergencia_telefone: string | null;
  status: ColaboradorStatus;
  observacoes: string | null;
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
    obra_id: OBRAS[0].id,
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
    obra_id: OBRAS[1].id,
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
    obra_id: null,
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
    obra_id: OBRAS[0].id,
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
    obra_id: OBRAS[1].id,
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
    obra_id: null,
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
    obra_id: OBRAS[0].id,
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
    obra_id: OBRAS[1].id,
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

export type DocumentoTipo =
  | "rg"
  | "cpf"
  | "ctps"
  | "comprovante_residencia"
  | "aso"
  | "contrato"
  | "outro";

export type ColaboradorDocumento = {
  id: string;
  colaborador_id: string;
  tipo: DocumentoTipo;
  nome: string;
  arquivo_url: string | null;
  validade: string | null;
  created_at: string;
};

export const DOCUMENTO_TIPO_LABEL: Record<DocumentoTipo, string> = {
  rg: "RG",
  cpf: "CPF",
  ctps: "CTPS",
  comprovante_residencia: "Comprovante de residência",
  aso: "ASO (atestado ocupacional)",
  contrato: "Contrato de trabalho",
  outro: "Outro",
};

export const COLABORADOR_DOCUMENTOS: ColaboradorDocumento[] = [
  { id: "doc-1", colaborador_id: "col-1", tipo: "contrato", nome: "Contrato de trabalho assinado", arquivo_url: null, validade: null, created_at: "2021-02-01T09:00:00Z" },
  { id: "doc-2", colaborador_id: "col-1", tipo: "aso", nome: "ASO admissional", arquivo_url: null, validade: "2026-02-01", created_at: "2021-02-01T09:10:00Z" },
  { id: "doc-3", colaborador_id: "col-1", tipo: "rg", nome: "RG (frente e verso)", arquivo_url: null, validade: null, created_at: "2021-02-01T09:15:00Z" },
  { id: "doc-4", colaborador_id: "col-2", tipo: "aso", nome: "ASO periódico", arquivo_url: null, validade: "2025-08-15", created_at: "2024-08-15T10:00:00Z" },
  { id: "doc-5", colaborador_id: "col-8", tipo: "contrato", nome: "Contrato de trabalho", arquivo_url: null, validade: null, created_at: "2018-01-15T09:00:00Z" },
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
