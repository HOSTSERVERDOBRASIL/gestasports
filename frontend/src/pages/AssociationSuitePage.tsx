import { useQuery } from "@tanstack/react-query";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  BookOpenText,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  HandCoins,
  IdCard,
  Landmark,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  Vote,
  Wrench
} from "lucide-react";
import type { ReactNode } from "react";
import { apiRequest } from "../services/api";
import type { DashboardSummary } from "../types/domain";

type PeriodContext = { month: number; year: number };

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function money(cents?: number) {
  return currency.format((cents ?? 0) / 100);
}

type AssociationBlock = {
  slug: string;
  title: string;
  description: string;
  icon: ReactNode;
  status: "Pronto" | "Integrado" | "Operacional";
  viewPath: string;
  createPath: string;
  managePath: string;
  feeds: string[];
  fields: string[];
  steps: string[];
  imagePolicy: string;
  solves: string[];
  currentIntegration: string[];
  improvements: string[];
};

const blocks: AssociationBlock[] = [
  {
    slug: "portal-associado",
    title: "Portal do associado",
    description: "Central individual para dados, financeiro, participacao, comunicados e historico.",
    icon: <Users size={22} />,
    status: "Operacional",
    viewPath: "/minha-conta",
    createPath: "/associados?edit=new",
    managePath: "/associados",
    feeds: ["Associados", "Financeiro", "Eventos", "Auditoria"],
    fields: ["Dados pessoais", "Status", "Mensalidade", "Vinculos", "Historico"],
    steps: ["Cadastrar associado", "Definir categoria/status", "Gerar financeiro", "Liberar acesso ao portal", "Acompanhar historico"],
    imagePolicy: "Foto do associado deve ser carregada no cadastro de pessoa/associado quando o perfil exigir identificacao visual.",
    solves: ["Autonomia do associado", "Consulta de pagamentos", "Dados sempre atualizados"],
    currentIntegration: ["Minha conta", "Associados", "Financeiro"],
    improvements: ["Carteirinha com QR Code", "Upload de foto no perfil", "Historico de comunicados"]
  },
  {
    slug: "carteirinha-digital",
    title: "Carteirinha digital",
    description: "Identificacao do associado com status, categoria, numero e validacao operacional.",
    icon: <IdCard size={22} />,
    status: "Integrado",
    viewPath: "/minha-conta",
    createPath: "/associados?edit=new",
    managePath: "/associados",
    feeds: ["Associados", "Financeiro", "Permissoes"],
    fields: ["Numero", "Categoria", "Validade", "Status financeiro", "QR Code"],
    steps: ["Manter associado ativo", "Conferir numero/categoria", "Validar financeiro", "Exibir carteirinha no portal", "Usar QR/status na portaria"],
    imagePolicy: "Usa a foto do associado e a identidade visual do clube; o escudo vem da configuracao do clube.",
    solves: ["Identificacao rapida", "Controle de acesso", "Status de adimplencia"],
    currentIntegration: ["Minha conta", "Associados", "Financeiro"],
    improvements: ["QR Code validavel", "Layout imprimivel", "Validade automatica"]
  },
  {
    slug: "categorias-membros",
    title: "Categorias de membros",
    description: "Separacao entre associado, atleta, dependente, diretor, fundador e patrocinador.",
    icon: <BadgeCheck size={22} />,
    status: "Pronto",
    viewPath: "/clubes?view=categorias",
    createPath: "/clubes?view=categorias",
    managePath: "/configuracoes?aba=club",
    feeds: ["Associados", "Atletas", "Financeiro", "Relatorios"],
    fields: ["Tipo", "Valor", "Permissoes", "Regras", "Elegibilidade"],
    steps: ["Criar categoria", "Definir regra financeira", "Aplicar no associado/atleta", "Validar permissao", "Medir em relatorios"],
    imagePolicy: "Categorias normalmente nao exigem imagem; use icone padronizado e cores do sistema.",
    solves: ["Separacao de membros", "Regras financeiras", "Relatorios por perfil"],
    currentIntegration: ["Clubes e equipes", "Associados", "Configuracoes"],
    improvements: ["Tabela de precos por categoria", "Beneficios por categoria", "Regras de elegibilidade"]
  },
  {
    slug: "assembleias-votacoes",
    title: "Assembleias e votacoes",
    description: "Convocacao, pauta, presenca, votacao, ata e documento historico vinculado.",
    icon: <Vote size={22} />,
    status: "Operacional",
    viewPath: "/eventos?view=lista",
    createPath: "/eventos/novo",
    managePath: "/memorial/documentos/novo",
    feeds: ["Eventos", "Documentos", "Acervo", "Auditoria"],
    fields: ["Pauta", "Data", "Inscritos", "Presenca", "Ata", "Resultado"],
    steps: ["Criar evento de assembleia", "Abrir inscricoes/presenca", "Registrar pauta", "Anexar ata/documento", "Arquivar no acervo"],
    imagePolicy: "Anexe ata em PDF e fotos da assembleia na galeria ou no documento historico.",
    solves: ["Governanca", "Registro de decisoes", "Presenca em reunioes"],
    currentIntegration: ["Eventos", "Inscricoes", "Documentos historicos"],
    improvements: ["Votacao nominal", "Quorum automatico", "Ata gerada por modelo"]
  },
  {
    slug: "documentos-oficiais",
    title: "Documentos oficiais",
    description: "Estatuto, atas, contratos, certidoes, CNPJ, alvaras e vencimentos.",
    icon: <FileCheck2 size={22} />,
    status: "Pronto",
    viewPath: "/memorial/documentos",
    createPath: "/memorial/documentos/novo",
    managePath: "/memorial/documentos",
    feeds: ["Acervo", "Auditoria", "Diretoria"],
    fields: ["Tipo", "Codigo", "Responsavel", "Arquivo", "Validade", "Status"],
    steps: ["Cadastrar documento", "Informar tipo/codigo", "Anexar arquivo", "Vincular responsavel", "Revisar no acervo"],
    imagePolicy: "Documento pode ter capa escaneada como imagem e arquivo principal em PDF/anexo.",
    solves: ["Organizacao documental", "Consulta rapida", "Preservacao institucional"],
    currentIntegration: ["Documentos historicos", "Acervo", "Upload/anexo"],
    improvements: ["Alertas de vencimento", "OCR/pesquisa interna", "Fluxo de aprovacao"]
  },
  {
    slug: "comunicacao-interna",
    title: "Comunicacao interna",
    description: "Avisos para diretoria, associados, atletas, comissao e financeiro.",
    icon: <Megaphone size={22} />,
    status: "Integrado",
    viewPath: "/convites",
    createPath: "/eventos/novo",
    managePath: "/pessoas",
    feeds: ["Pessoas", "Eventos", "Auditoria"],
    fields: ["Publico", "Mensagem", "Canal", "Data", "Confirmacao", "Historico"],
    steps: ["Escolher publico", "Criar evento/aviso", "Enviar comunicacao", "Registrar confirmacao", "Auditar historico"],
    imagePolicy: "Use imagem apenas quando for convite, campanha, evento social ou comunicado institucional importante.",
    solves: ["Avisos por publico", "Convocacoes", "Historico de mensagens"],
    currentIntegration: ["Convites", "Eventos", "Pessoas"],
    improvements: ["Central de comunicados", "Envio por grupos", "Comprovante de leitura"]
  },
  {
    slug: "patrimonio-manutencao",
    title: "Patrimonio e manutencao",
    description: "Sede, campo, equipamentos, materiais, fotos, documentos e manutencoes.",
    icon: <Wrench size={22} />,
    status: "Pronto",
    viewPath: "/memorial/patrimonio",
    createPath: "/memorial/patrimonio/novo",
    managePath: "/memorial/patrimonio",
    feeds: ["Acervo", "Documentos", "Financeiro"],
    fields: ["Bem", "Local", "Estado", "Responsavel", "Imagem", "Anexos"],
    steps: ["Cadastrar bem", "Carregar foto", "Definir estado", "Anexar documento", "Registrar manutencao/custo"],
    imagePolicy: "Todo patrimonio relevante deve ter foto atual e anexos como nota, contrato, escritura ou laudo.",
    solves: ["Controle de bens", "Manutencao", "Documentos de patrimonio"],
    currentIntegration: ["Patrimonio do clube", "Documentos", "Financeiro"],
    improvements: ["Plano de manutencao", "Responsavel por bem", "Historico de intervenções"]
  },
  {
    slug: "patrocinadores-parceiros",
    title: "Patrocinadores e parceiros",
    description: "Contratos, contrapartidas, receitas, uniformes, posts e vencimentos.",
    icon: <HandCoins size={22} />,
    status: "Operacional",
    viewPath: "/financeiro?area=RECEITAS",
    createPath: "/financeiro?view=OPERACAO&tab=NOVO",
    managePath: "/memorial/documentos/novo",
    feeds: ["Financeiro", "Documentos", "Uniformes", "Acervo"],
    fields: ["Empresa", "Valor", "Contrato", "Vencimento", "Contrapartida", "Status"],
    steps: ["Cadastrar receita/contrato", "Anexar documento", "Vincular contrapartida", "Acompanhar vencimento", "Registrar entrega"],
    imagePolicy: "Logo do patrocinador deve ser salvo como imagem/anexo e usado em uniformes, posts ou documentos relacionados.",
    solves: ["Receitas comerciais", "Contratos", "Contrapartidas"],
    currentIntegration: ["Financeiro", "Documentos", "Uniformes"],
    improvements: ["Cadastro de patrocinador", "Agenda de entregas", "Alertas de renovacao"]
  },
  {
    slug: "eventos-sociais",
    title: "Eventos sociais",
    description: "Festas, rifas, churrascos, reunioes, inscricoes, presenca e arrecadacao.",
    icon: <CalendarDays size={22} />,
    status: "Pronto",
    viewPath: "/eventos",
    createPath: "/eventos/novo",
    managePath: "/eventos/inscricoes",
    feeds: ["Agenda", "Financeiro", "Eventos", "Acervo"],
    fields: ["Tipo", "Inscricao", "Valor", "Check-in", "Receita", "Fotos"],
    steps: ["Criar evento", "Abrir inscricoes", "Controlar check-in", "Registrar receita/despesa", "Enviar fotos ao acervo"],
    imagePolicy: "Fotos do evento devem ir para galeria e podem ser vinculadas ao evento/documento historico.",
    solves: ["Agenda social", "Inscricoes", "Arrecadacao"],
    currentIntegration: ["Eventos", "Inscricoes", "Financeiro"],
    improvements: ["Pacotes/ingressos", "Check-in por QR", "Galeria vinculada ao evento"]
  },
  {
    slug: "prestacao-contas",
    title: "Prestacao de contas",
    description: "Receitas, despesas, relatorios, anexos, parecer e aprovacao.",
    icon: <ClipboardCheck size={22} />,
    status: "Integrado",
    viewPath: "/relatorios",
    createPath: "/financeiro?view=OPERACAO&tab=NOVO",
    managePath: "/financeiro?area=DASHBOARD",
    feeds: ["Financeiro", "Relatorios", "Documentos"],
    fields: ["Periodo", "Receitas", "Despesas", "Anexos", "Parecer", "Aprovacao"],
    steps: ["Fechar periodo", "Conferir receitas/despesas", "Anexar comprovantes", "Gerar relatorio", "Arquivar parecer"],
    imagePolicy: "Use anexos PDF/imagens para comprovantes e documentos oficiais de aprovacao.",
    solves: ["Transparencia", "Fechamento financeiro", "Auditoria"],
    currentIntegration: ["Financeiro", "Relatorios", "Documentos"],
    improvements: ["Parecer do conselho fiscal", "Aprovacao por diretoria", "Exportacao PDF oficial"]
  },
  {
    slug: "permissoes-cargos",
    title: "Permissoes e cargos",
    description: "Presidente, tesoureiro, secretario, diretor, financeiro e leitura.",
    icon: <ShieldCheck size={22} />,
    status: "Pronto",
    viewPath: "/configuracoes?aba=profiles",
    createPath: "/configuracoes?aba=board",
    managePath: "/diretoria",
    feeds: ["Associados", "Diretoria", "Auditoria", "Acessos"],
    fields: ["Cargo", "Perfil", "Modulo", "Acesso", "Responsavel", "Mandato"],
    steps: ["Criar cargo", "Definir acessos", "Vincular associado", "Registrar mandato", "Auditar permissoes"],
    imagePolicy: "Usa foto do associado/presidente; cargos nao precisam de imagem propria.",
    solves: ["Controle de acesso", "Responsabilidades", "Diretoria atual"],
    currentIntegration: ["Diretoria", "Associados", "Permissoes"],
    improvements: ["Permissoes por cargo", "Periodo de mandato por diretor", "Trilha de auditoria por funcao"]
  },
  {
    slug: "acervo-inteligente",
    title: "Acervo inteligente",
    description: "Tudo que vira historia pode ser salvo, aberto, editado e relacionado.",
    icon: <BookOpenText size={22} />,
    status: "Pronto",
    viewPath: "/memorial",
    createPath: "/memorial/linha-do-tempo/novo",
    managePath: "/galeria/novo",
    feeds: ["Jogos", "Sumulas", "Fotos", "Titulos", "Diretoria"],
    fields: ["Tipo", "Ano", "Imagem", "Anexo", "Vinculo", "Descricao"],
    steps: ["Escolher tipo de registro", "Cadastrar dados historicos", "Carregar imagem/anexo", "Vincular entidade", "Publicar no acervo"],
    imagePolicy: "Registros historicos devem aceitar URL, upload de imagem e anexo principal quando houver documento.",
    solves: ["Memoria do clube", "Organizacao historica", "Consulta e edicao de registros"],
    currentIntegration: ["Acervo", "Galeria", "Documentos", "Jogos"],
    improvements: ["Relacionamentos entre registros", "Campos especificos por tipo", "Revisao/publicacao do acervo"]
  }
];

const readiness = [
  ["Cadastro", "Todo bloco tem caminho de inserir ou reaproveita um cadastro operacional existente."],
  ["Consulta", "Todo bloco tem pagina de visualizacao para consultar e acompanhar."],
  ["Edicao", "Os blocos operacionais apontam para a tela de gerenciamento ou edicao."],
  ["Acervo", "Documentos, fotos, mandatos, patrimonio e historia alimentam o memorial."],
  ["Imagem", "Itens historicos e mandatos aceitam upload ou URL de imagem."]
];

function StatusBadge({ status }: { status: AssociationBlock["status"] }) {
  const tone = status === "Pronto" ? "bg-emerald-50 text-emerald-700" : status === "Integrado" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

function BlockActionGrid({ block }: { block: AssociationBlock }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Link to={block.viewPath} className="rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-black text-slate-700 hover:border-red-200">Ver</Link>
      <Link to={block.createPath} className="rounded-lg bg-red-600 px-2 py-2 text-center text-xs font-black text-white">Inserir</Link>
      <Link to={block.managePath} className="rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-black text-slate-700 hover:border-red-200">Editar</Link>
    </div>
  );
}

function InstitutionalStat({ label, value, helper, icon, tone = "blue" }: { label: string; value: string | number; helper: string; icon: ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700"
  }[tone];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{helper}</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneClass}`}>{icon}</span>
      </div>
    </article>
  );
}

function InstitutionalAction({ to, title, description, icon, primary = false }: { to: string; title: string; description: string; icon: ReactNode; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
        primary ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-white text-slate-950"
      }`}
    >
      <span className={`grid size-10 place-items-center rounded-lg ${primary ? "bg-white/15 text-white" : "bg-slate-50 text-red-600"}`}>{icon}</span>
      <h3 className="mt-3 font-black">{title}</h3>
      <p className={`mt-1 text-sm font-semibold leading-5 ${primary ? "text-red-50" : "text-slate-500"}`}>{description}</p>
    </Link>
  );
}

function InstitutionalDashboard() {
  const { month, year } = useOutletContext<PeriodContext>();
  const query = useQuery({
    queryKey: ["association-institutional-dashboard", month, year],
    queryFn: () => apiRequest<DashboardSummary>(`/dashboard/summary?month=${month}&year=${year}`)
  });
  const data = query.data;
  const pendingAmount = data?.monthlyFeeAlert?.amountCents ?? 0;
  const balance = (data?.monthRevenueCents ?? 0) - (data?.monthExpenseCents ?? 0);

  return (
    <section className="space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
              <Landmark size={24} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Gestao institucional</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">Painel executivo do clube</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                Visao administrativa para acompanhar associados, financeiro, governanca, documentos, acervo, patrimonio e pendencias.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/associados?edit=new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white">
              <Users size={16} />
              Novo associado
            </Link>
            <Link to="/financeiro?area=MENSALIDADES" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
              <CircleDollarSign size={16} />
              Mensalidades
            </Link>
          </div>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InstitutionalStat label="Associados ativos" value={data?.associatesActive ?? "—"} helper="quadro associativo atual" icon={<Users size={20} />} tone="blue" />
        <InstitutionalStat label="Inadimplentes" value={data?.lateAssociates ?? "—"} helper={`${money(pendingAmount)} em mensalidades pendentes`} icon={<AlertTriangle size={20} />} tone="red" />
        <InstitutionalStat label="Receita do mes" value={data ? money(data.monthRevenueCents) : "—"} helper="entradas registradas no periodo" icon={<CircleDollarSign size={20} />} tone="green" />
        <InstitutionalStat label="Saldo operacional" value={data ? money(balance) : "—"} helper="receitas menos despesas do mes" icon={<Landmark size={20} />} tone={balance >= 0 ? "green" : "amber"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Saude administrativa</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">O que o gestor precisa resolver primeiro.</p>
            </div>
            <Link to="/relatorios" className="text-sm font-black text-red-600">Abrir relatorios</Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Associados</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{data?.recentAssociates?.length ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">cadastros recentes para conferir</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Financeiro</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{data?.monthlyFeeAlert?.pendingCount ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">vencimentos em aberto no mes</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">Alertas</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{data?.alerts?.length ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">pontos de atencao administrativos</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(data?.alerts?.length ? data.alerts : [
              { title: "Conferir mensalidades", subtitle: "Acompanhe vencimentos e inadimplencia do mes." },
              { title: "Revisar cadastros", subtitle: "Mantenha dados de associados, diretoria e contatos completos." },
              { title: "Atualizar documentos", subtitle: "Digitalize atas, estatuto, contratos e registros importantes." }
            ]).slice(0, 6).map((alert) => (
              <div key={`${alert.title}-${alert.subtitle}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm font-black text-amber-950">{alert.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">{alert.subtitle}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Proximas acoes</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Atalhos para manter a associacao em dia.</p>
          <div className="mt-4 space-y-2">
            {[
              ["Validar associados", "/associados"],
              ["Gerar ou revisar cobrancas", "/financeiro?area=MENSALIDADES"],
              ["Atualizar diretoria", "/diretoria"],
              ["Cadastrar ata/documento", "/memorial/documentos/novo"],
              ["Registrar patrimonio", "/memorial/patrimonio/novo"],
              ["Publicar item no acervo", "/memorial/linha-do-tempo/novo"]
            ].map(([label, path]) => (
              <Link key={label} to={path} className="flex min-h-10 items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-red-200 hover:text-red-700">
                <span>{label}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InstitutionalAction to="/associados" title="Associados" description="Cadastros, situacao, categorias, contatos e vinculos." icon={<Users size={20} />} primary />
        <InstitutionalAction to="/financeiro?area=DASHBOARD" title="Financeiro" description="Mensalidades, receitas, despesas, cobrancas e prestacao de contas." icon={<CircleDollarSign size={20} />} />
        <InstitutionalAction to="/diretoria" title="Governanca" description="Diretoria, cargos, mandatos, responsabilidades e permissoes." icon={<ShieldCheck size={20} />} />
        <InstitutionalAction to="/memorial/documentos" title="Documentos" description="Estatuto, atas, contratos, comprovantes e documentos oficiais." icon={<FileText size={20} />} />
        <InstitutionalAction to="/memorial/patrimonio" title="Patrimonio" description="Bens, sede, campo, equipamentos, fotos e manutencoes." icon={<Wrench size={20} />} />
        <InstitutionalAction to="/memorial" title="Acervo do clube" description="Historia, titulos, camisas, trofeus, fotos e memoria institucional." icon={<Archive size={20} />} />
        <InstitutionalAction to="/eventos" title="Eventos sociais" description="Assembleias, reunioes, festas, rifas, inscricoes e presencas." icon={<CalendarDays size={20} />} />
        <InstitutionalAction to="/configuracoes/visao-geral" title="Configuracoes" description="Identidade, usuarios, perfis, Pix, auditoria e regras do clube." icon={<Settings size={20} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Novos associados</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {(data?.recentAssociates ?? []).slice(0, 5).map((associate) => (
              <div key={associate.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{associate.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{associate.status}</p>
                </div>
                <Link to="/associados" className="text-xs font-black text-red-600">Ver</Link>
              </div>
            ))}
            {!data?.recentAssociates?.length ? <p className="py-4 text-sm font-semibold text-slate-500">Sem cadastros recentes para exibir.</p> : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Movimentacoes financeiras recentes</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {(data?.recentFinancialEntries ?? []).slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{entry.description}</p>
                  <p className="text-xs font-semibold text-slate-500">{entry.category} · {entry.status}</p>
                </div>
                <p className="text-sm font-black text-slate-950">{money(entry.amountCents)}</p>
              </div>
            ))}
            {!data?.recentFinancialEntries?.length ? <p className="py-4 text-sm font-semibold text-slate-500">Sem movimentacoes recentes para exibir.</p> : null}
          </div>
        </article>
      </div>

      {query.isError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          Nao foi possivel carregar os indicadores agora. Os atalhos administrativos continuam disponiveis.
        </p>
      ) : null}
    </section>
  );
}

export function AssociationSuitePage() {
  return (
    <section className="space-y-4">
      <InstitutionalDashboard />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {readiness.map(([label, description]) => (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="grid size-10 place-items-center rounded-lg bg-slate-50 text-red-600">
              <ClipboardList size={20} />
            </span>
            <h2 className="mt-3 font-black text-slate-950">{label}</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{description}</p>
          </article>
        ))}
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
          <h2 className="text-xl font-black text-slate-950">12 blocos integrados ao que ja existe</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Cada bloco mostra problema resolvido, tela existente e melhoria recomendada.</p>
          </div>
          <Link to="/configuracoes/visao-geral" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700">
            <Settings size={16} />
            Configurar ambiente
          </Link>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {blocks.map((block) => (
            <article key={block.title} className="flex min-h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">{block.icon}</span>
                <StatusBadge status={block.status} />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950">{block.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{block.description}</p>

              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Resolve</p>
                <div className="mt-2 space-y-1">
                  {block.solves.map((item) => (
                    <p key={item} className="text-sm font-semibold text-slate-600">- {item}</p>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Ja integrado em</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {block.currentIntegration.map((item) => (
                    <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{item}</span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Campos essenciais</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {block.fields.map((field) => (
                    <span key={field} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">{field}</span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Pode melhorar com</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {block.improvements.map((item) => (
                    <span key={item} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">{item}</span>
                  ))}
                </div>
              </div>

              <div className="mt-auto space-y-2 pt-4">
                <Link to={`/associacao/${block.slug}`} className="block rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs font-black text-red-700">
                  Abrir plano completo
                </Link>
                <BlockActionGrid block={block} />
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

export function AssociationBlockDetailPage() {
  const { slug } = useParams();
  const block = blocks.find((item) => item.slug === slug) ?? blocks[0];

  return (
    <section className="space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">{block.icon}</span>
            <div>
              <Link to="/associacao" className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Diagnostico operacional</Link>
              <h1 className="mt-1 text-3xl font-black text-slate-950">{block.title}</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">{block.description}</p>
            </div>
          </div>
          <StatusBadge status={block.status} />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Fluxo operacional</h2>
          <div className="mt-4 space-y-3">
            {block.steps.map((step, index) => (
              <div key={step} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 p-3">
                <span className="grid size-9 place-items-center rounded-lg bg-red-50 text-sm font-black text-red-700">{index + 1}</span>
                <div>
                  <p className="font-black text-slate-950">{step}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Etapa necessaria para manter o modulo consultavel, editavel e rastreavel.</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">Acoes principais</h2>
            <div className="mt-3">
              <BlockActionGrid block={block} />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">O que resolve</h2>
            <div className="mt-3 space-y-2">
              {block.solves.map((item) => (
                <p key={item} className="text-sm font-semibold text-slate-600">- {item}</p>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">Campos essenciais</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {block.fields.map((field) => (
                <span key={field} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">{field}</span>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">Imagens e anexos</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{block.imagePolicy}</p>
          </article>

          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="font-black text-slate-950">Ja integrado em</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {block.currentIntegration.map((item) => (
                <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700">{item}</span>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-red-100 bg-red-50 p-4">
            <h2 className="font-black text-slate-950">Melhorias recomendadas</h2>
            <div className="mt-3 space-y-2">
              {block.improvements.map((item) => (
                <p key={item} className="text-sm font-semibold text-slate-600">- {item}</p>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
