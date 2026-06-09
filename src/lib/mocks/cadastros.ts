export type Unidade = {
  id: string;
  nome: string;
  responsavel: string | null;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
  ativo: boolean;
};

export type Cliente = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  tipo_pessoa: "juridica" | "fisica" | "publico";
  cidade: string | null;
  estado: string | null;
  responsavel: string | null;
  telefone: string | null;
  ativo: boolean;
};

export type Fornecedor = {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
};

export type Material = {
  id: string;
  codigo: string;
  descricao: string;
  categoria:
    | "tinta"
    | "esfera_vidro"
    | "placa"
    | "coluna"
    | "tacha"
    | "semaforo"
    | "pelicula"
    | "diluente"
    | "fixador"
    | "outro";
  unidade_medida: string;
  valor_referencia: number;
  estoque_minimo: number;
  ativo: boolean;
};

export type Equipamento = {
  id: string;
  codigo: string;
  descricao: string;
  tipo: "veiculo" | "maquina_pintura" | "equipamento_auxiliar" | "ferramenta" | "outro";
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  status: "disponivel" | "em_uso" | "manutencao" | "inativo";
  ativo: boolean;
};

export const UNIDADES: Unidade[] = [
  {
    id: "u-1",
    nome: "Sinaltran Matriz",
    responsavel: "Ricardo Campos",
    cidade: "Caxias do Sul",
    estado: "RS",
    cnpj: "12345678000190",
    ativo: true,
  },
  {
    id: "u-2",
    nome: "Sinaltran Filial Porto Alegre",
    responsavel: "Marcos Lima",
    cidade: "Porto Alegre",
    estado: "RS",
    cnpj: "12345678000271",
    ativo: true,
  },
  {
    id: "u-3",
    nome: "Sinaltran Filial Santa Maria",
    responsavel: "Patrícia Almeida",
    cidade: "Santa Maria",
    estado: "RS",
    cnpj: null,
    ativo: false,
  },
];

export const CLIENTES: Cliente[] = [
  {
    id: "c-1",
    razao_social: "Prefeitura Municipal de Caxias do Sul",
    nome_fantasia: "Prefeitura de Caxias",
    cnpj_cpf: "88888888000111",
    tipo_pessoa: "publico",
    cidade: "Caxias do Sul",
    estado: "RS",
    responsavel: "Sec. de Mobilidade",
    telefone: "5432185000",
    ativo: true,
  },
  {
    id: "c-2",
    razao_social: "DNIT - Superintendência RS",
    nome_fantasia: null,
    cnpj_cpf: "04892707000100",
    tipo_pessoa: "publico",
    cidade: "Porto Alegre",
    estado: "RS",
    responsavel: "Eng. Carlos Mendes",
    telefone: "5132266000",
    ativo: true,
  },
  {
    id: "c-3",
    razao_social: "CCR ViaSul S.A.",
    nome_fantasia: "CCR ViaSul",
    cnpj_cpf: "27843555000113",
    tipo_pessoa: "juridica",
    cidade: "Porto Alegre",
    estado: "RS",
    responsavel: "Operações de Rodovia",
    telefone: "5132211200",
    ativo: true,
  },
  {
    id: "c-4",
    razao_social: "Construtora Triunfo Ltda.",
    nome_fantasia: "Triunfo Engenharia",
    cnpj_cpf: "33445566000177",
    tipo_pessoa: "juridica",
    cidade: "Caxias do Sul",
    estado: "RS",
    responsavel: "Eng. Helena Costa",
    telefone: "5432128400",
    ativo: true,
  },
  {
    id: "c-5",
    razao_social: "Prefeitura Municipal de Bento Gonçalves",
    nome_fantasia: null,
    cnpj_cpf: "88112233000144",
    tipo_pessoa: "publico",
    cidade: "Bento Gonçalves",
    estado: "RS",
    responsavel: "Secretaria de Trânsito",
    telefone: "5434551000",
    ativo: false,
  },
];

export const FORNECEDORES: Fornecedor[] = [
  {
    id: "f-1",
    nome: "Tintas Resincolor S.A.",
    nome_fantasia: "Resincolor",
    cnpj_cpf: "11222333000144",
    cidade: "Joinville",
    estado: "SC",
    telefone: "4732122500",
    email: "comercial@resincolor.com.br",
    ativo: true,
  },
  {
    id: "f-2",
    nome: "Placas Brasil Ltda.",
    nome_fantasia: "Placas Brasil",
    cnpj_cpf: "44555666000177",
    cidade: "Curitiba",
    estado: "PR",
    telefone: "4133011200",
    email: "vendas@placasbrasil.com.br",
    ativo: true,
  },
  {
    id: "f-3",
    nome: "Tachas & Sinais Indústria",
    nome_fantasia: "Tachas Sinais",
    cnpj_cpf: "77888999000122",
    cidade: "Caxias do Sul",
    estado: "RS",
    telefone: "5432229900",
    email: "contato@tachassinais.com.br",
    ativo: true,
  },
  {
    id: "f-4",
    nome: "Semáforos do Sul Tecnologia",
    nome_fantasia: "SemSul",
    cnpj_cpf: "55667788000133",
    cidade: "Porto Alegre",
    estado: "RS",
    telefone: "5133225500",
    email: "vendas@semsul.com.br",
    ativo: true,
  },
];

export const MATERIAIS: Material[] = [
  {
    id: "m-1",
    codigo: "TIN-AC-BCO",
    descricao: "Tinta acrílica branca para sinalização viária",
    categoria: "tinta",
    unidade_medida: "kg",
    valor_referencia: 18.5,
    estoque_minimo: 100,
    ativo: true,
  },
  {
    id: "m-2",
    codigo: "TIN-AC-AMR",
    descricao: "Tinta acrílica amarela para sinalização viária",
    categoria: "tinta",
    unidade_medida: "kg",
    valor_referencia: 19.2,
    estoque_minimo: 80,
    ativo: true,
  },
  {
    id: "m-3",
    codigo: "ESF-DROP",
    descricao: "Esferas de vidro tipo Drop-on para retrorrefletorização",
    categoria: "esfera_vidro",
    unidade_medida: "kg",
    valor_referencia: 6.8,
    estoque_minimo: 200,
    ativo: true,
  },
  {
    id: "m-4",
    codigo: "PLC-R1",
    descricao: "Placa de regulamentação R-1 (Parada obrigatória) 100cm",
    categoria: "placa",
    unidade_medida: "UN",
    valor_referencia: 285,
    estoque_minimo: 10,
    ativo: true,
  },
  {
    id: "m-5",
    codigo: "PLC-R2",
    descricao: "Placa de regulamentação R-2 (Dê preferência) 100cm",
    categoria: "placa",
    unidade_medida: "UN",
    valor_referencia: 265,
    estoque_minimo: 8,
    ativo: true,
  },
  {
    id: "m-6",
    codigo: "COL-GLV-3M",
    descricao: "Coluna galvanizada 3m para placa de sinalização",
    categoria: "coluna",
    unidade_medida: "UN",
    valor_referencia: 145,
    estoque_minimo: 20,
    ativo: true,
  },
  {
    id: "m-7",
    codigo: "TCH-MO-BCO",
    descricao: "Tacha monodirecional refletiva branca",
    categoria: "tacha",
    unidade_medida: "UN",
    valor_referencia: 8.5,
    estoque_minimo: 500,
    ativo: true,
  },
  {
    id: "m-8",
    codigo: "SEM-LED-3F",
    descricao: "Semáforo de LED 3 focos (200mm) com controlador",
    categoria: "semaforo",
    unidade_medida: "UN",
    valor_referencia: 4800,
    estoque_minimo: 2,
    ativo: true,
  },
  {
    id: "m-9",
    codigo: "DLT-PU",
    descricao: "Diluente para tinta acrílica",
    categoria: "diluente",
    unidade_medida: "L",
    valor_referencia: 12.4,
    estoque_minimo: 50,
    ativo: true,
  },
];

export const EQUIPAMENTOS: Equipamento[] = [
  {
    id: "e-1",
    codigo: "VCL-001",
    descricao: "Caminhão pintor (LE)",
    tipo: "maquina_pintura",
    placa: "ABC1D23",
    marca: "Volkswagen",
    modelo: "Worker 9.150",
    ano: 2019,
    status: "em_uso",
    ativo: true,
  },
  {
    id: "e-2",
    codigo: "VCL-002",
    descricao: "Caminhonete de apoio",
    tipo: "veiculo",
    placa: "EFG4H56",
    marca: "Ford",
    modelo: "Ranger XL",
    ano: 2021,
    status: "disponivel",
    ativo: true,
  },
  {
    id: "e-3",
    codigo: "MAQ-CMP-01",
    descricao: "Compressor de ar 20pcm",
    tipo: "equipamento_auxiliar",
    placa: null,
    marca: "Schulz",
    modelo: "MSV 20/200",
    ano: 2020,
    status: "disponivel",
    ativo: true,
  },
  {
    id: "e-4",
    codigo: "MAQ-PNT-01",
    descricao: "Máquina manual de pintura termoplástica",
    tipo: "maquina_pintura",
    placa: null,
    marca: "Ciber",
    modelo: "CTM-180",
    ano: 2018,
    status: "manutencao",
    ativo: true,
  },
  {
    id: "e-5",
    codigo: "FRR-PRF-01",
    descricao: "Perfuratriz para fixação de tachas",
    tipo: "ferramenta",
    placa: null,
    marca: "Bosch",
    modelo: "GSH 11 VC",
    ano: 2022,
    status: "disponivel",
    ativo: true,
  },
];
