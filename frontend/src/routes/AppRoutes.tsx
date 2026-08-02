import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { AdministrativeDashboardPage, AssociateDashboardPage, SportsDirectorDashboardPage } from "../pages/RoleDashboardPages";
import { InvitePage } from "../pages/InvitePage";
import { LoginPage } from "../pages/LoginPage";
import { RecoverPasswordPage } from "../pages/RecoverPasswordPage";
import {
  ArtilhariaPage,
  AdversariosPage,
  AgendaPage,
  AssistenciasPage,
  AssociacaoDetailPage,
  AssociacaoPage,
  AssociadosPage,
  AuditoriaPage,
  CamposPage,
  ClubesPage,
  ComissaoTecnicaPage,
  ConfiguracoesPage,
  ConfiguracoesHubPage,
  ConfrontosPage,
  ConvitesPage,
  CompeticoesPage,
  DiretoriaMandatoFormPage,
  DiretoriaPage,
  DisciplinaPage,
  ElencoPage,
  EventoFormPage,
  EventosPage,
  EstatisticasPage,
  FinanceiroPage,
  FutebolPage,
  GaleriaDetailPage,
  GaleriaFormPage,
  GaleriaPage,
  GoleirosPage,
  HistoricoPage,
  InscricoesPage,
  InscricaoFormPage,
  JogosPage,
  MemorialAtletasPage,
  MemorialAssetDetailPage,
  MemorialAssetsPage,
  MemorialAssetFormPage,
  MemorialAthleteDetailPage,
  MemorialAthleteFormPage,
  MemorialAwardDetailPage,
  MemorialAwardsPage,
  MemorialAwardFormPage,
  MemorialDiretoriasPage,
  MemorialDocumentDetailPage,
  MemorialDocumentFormPage,
  MemorialDocumentsPage,
  MemorialGameDetailPage,
  MemorialGameFormPage,
  MemorialHallDetailPage,
  MemorialHallFormPage,
  MemorialHallPage,
  MemorialJogosPage,
  MemorialLinhaTempoPage,
  MemorialReportDetailPage,
  MemorialReportFormPage,
  MemorialTimelineDetailPage,
  MemorialTimelineFormPage,
  MemorialTitleDetailPage,
  MemorialTitleFormPage,
  MemorialPage,
  MemorialSumulasPage,
  MemorialTitulosPage,
  MemorialUniformDetailPage,
  MemorialUniformFormPage,
  MemorialUniformesPage,
  MinhaContaPage,
  ParticipacoesStatsPage,
  PessoasPage,
  RankingsPage,
  RelatoriosPage,
  UniformesPage
} from "../pages/Modules";
import CreateGamePage from "../pages/CreateGamePage";
import { AthleteAccountPage } from "../pages/AthleteAccountPage";
import { DynamicMemorialCategoryPage, PublicMemorialPage } from "../pages/ArchivePages";
import {
  AthletePortalDashboardPage,
  AthletePortalGamesPage,
  AthletePortalPerformancePage,
  AthletePortalFinancePage,
  AthletePortalHealthPage,
  AthletePortalCareerPage,
  AthletePortalProfilePage,
  AthletePortalAchievementsPage
} from "../pages/AthletePortalPages";
import { JogosTeamsFieldPage } from "../pages/TeamsFieldPages";
import { InternalLeaguesPage } from "../pages/InternalLeaguesPage";
import { TrainingSessionsPage } from "../pages/TrainingSessionsPage";
import { SuperadminPage } from "../pages/SuperadminPage";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/domain";
import { ADMIN_ROLES, FINANCE_ROLES, MANAGEMENT_ROLES, SPORTS_ROLES } from "../security/permissions";

function homePathForRole(role: UserRole | null | undefined) {
  if (role === "SUPERADMIN") return "/superadmin";
  if (role === "ATHLETE") return "/atleta";
  if (role === "SPORTS_DIRECTOR") return "/esportes";
  if (role === "ASSOCIATE") return "/associado";
  if (role === "FINANCIAL") return "/financeiro?area=DASHBOARD";
  return "/";
}

function RequireRoles({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user, activeRole } = useAuth();
  const role = activeRole ?? user?.role ?? null;

  if (!role || !roles.includes(role)) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return children;
}

const adminRoles: UserRole[] = ADMIN_ROLES;
const financeRoles: UserRole[] = FINANCE_ROLES;
const managementRoles: UserRole[] = MANAGEMENT_ROLES;
const sportsRoles: UserRole[] = SPORTS_ROLES;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/convite" element={<InvitePage />} />
      <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
      <Route path="/acervo" element={<PublicMemorialPage />} />
      <Route path="/acervo/categorias/:slug" element={<DynamicMemorialCategoryPage publicView />} />
      <Route path="/acervo/categorias/:slug/:id" element={<DynamicMemorialCategoryPage publicView />} />
      <Route path="/acervo/:category" element={<PublicMemorialPage />} />
      <Route path="/acervo/:category/:id" element={<PublicMemorialPage />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<RequireRoles roles={adminRoles}><AdministrativeDashboardPage /></RequireRoles>} />
        <Route path="esportes" element={<RequireRoles roles={["SPORTS_DIRECTOR"]}><SportsDirectorDashboardPage /></RequireRoles>} />
        <Route path="associado" element={<RequireRoles roles={["ASSOCIATE"]}><AssociateDashboardPage /></RequireRoles>} />
        <Route path="associacao" element={<RequireRoles roles={managementRoles}><AssociacaoPage /></RequireRoles>} />
        <Route path="associacao/:slug" element={<RequireRoles roles={managementRoles}><AssociacaoDetailPage /></RequireRoles>} />
        <Route path="pessoas" element={<RequireRoles roles={managementRoles}><PessoasPage /></RequireRoles>} />
        <Route path="associados" element={<RequireRoles roles={managementRoles}><AssociadosPage /></RequireRoles>} />
        <Route path="convites" element={<RequireRoles roles={managementRoles}><ConvitesPage /></RequireRoles>} />
        <Route path="auditoria" element={<RequireRoles roles={managementRoles}><AuditoriaPage /></RequireRoles>} />
        <Route path="diretoria" element={<RequireRoles roles={managementRoles}><DiretoriaPage /></RequireRoles>} />
        <Route path="diretoria/mandatos/novo" element={<RequireRoles roles={adminRoles}><DiretoriaMandatoFormPage /></RequireRoles>} />
        <Route path="diretoria/mandatos/:id/editar" element={<RequireRoles roles={adminRoles}><DiretoriaMandatoFormPage /></RequireRoles>} />
        <Route path="comissao-tecnica" element={<RequireRoles roles={sportsRoles}><ComissaoTecnicaPage /></RequireRoles>} />
        <Route path="atletas" element={<RequireRoles roles={sportsRoles}><ElencoPage /></RequireRoles>} />
        <Route path="elenco" element={<Navigate to="/atletas" replace />} />
        <Route path="atletas/:id/perfil" element={<RequireRoles roles={sportsRoles}><AthleteAccountPage /></RequireRoles>} />
        <Route path="atletas/:id/conta" element={<Navigate to="../perfil" replace />} />
        <Route path="goleiros" element={<RequireRoles roles={sportsRoles}><GoleirosPage /></RequireRoles>} />
        <Route path="clubes" element={<RequireRoles roles={sportsRoles}><ClubesPage /></RequireRoles>} />
        <Route path="equipes" element={<Navigate to="/clubes?view=equipes" replace />} />
        <Route path="campos" element={<RequireRoles roles={sportsRoles}><CamposPage /></RequireRoles>} />
        <Route path="adversarios" element={<RequireRoles roles={sportsRoles}><AdversariosPage /></RequireRoles>} />
        <Route path="agenda" element={<RequireRoles roles={managementRoles}><AgendaPage /></RequireRoles>} />
        <Route path="treinos" element={<RequireRoles roles={managementRoles}><TrainingSessionsPage /></RequireRoles>} />
        <Route path="agenda/calendario" element={<Navigate to="/eventos?view=calendario" replace />} />
        <Route path="agenda/lista" element={<Navigate to="/eventos?view=lista" replace />} />
        <Route path="agenda/jogos" element={<Navigate to="/jogos" replace />} />
        <Route path="agenda/campos" element={<Navigate to="/campos" replace />} />
        <Route path="agenda/equipes" element={<Navigate to="/clubes?view=equipes" replace />} />
        <Route path="agenda/adversarios" element={<Navigate to="/adversarios" replace />} />
        <Route path="financeiro" element={<RequireRoles roles={financeRoles}><FinanceiroPage /></RequireRoles>} />
        <Route path="historico" element={<RequireRoles roles={managementRoles}><HistoricoPage /></RequireRoles>} />
        <Route path="eventos" element={<RequireRoles roles={managementRoles}><EventosPage /></RequireRoles>} />
        <Route path="eventos/novo" element={<RequireRoles roles={adminRoles}><EventoFormPage /></RequireRoles>} />
        <Route path="eventos/:id/editar" element={<RequireRoles roles={adminRoles}><EventoFormPage /></RequireRoles>} />
        <Route path="eventos/inscricoes" element={<RequireRoles roles={managementRoles}><InscricoesPage /></RequireRoles>} />
        <Route path="eventos/inscricoes/nova" element={<RequireRoles roles={adminRoles}><InscricaoFormPage /></RequireRoles>} />
        <Route path="eventos/inscricoes/:registrationId/editar" element={<RequireRoles roles={adminRoles}><InscricaoFormPage /></RequireRoles>} />
        <Route path="futebol" element={<RequireRoles roles={sportsRoles}><FutebolPage /></RequireRoles>} />
        <Route path="jogos" element={<RequireRoles roles={sportsRoles}><JogosPage /></RequireRoles>} />
        <Route path="minha-conta" element={<MinhaContaPage />} />
        <Route path="cadastrar-jogo" element={<Navigate to="/jogos?view=OPERACAO&subView=CADASTRO" replace />} />
        <Route path="agenda-jogos" element={<Navigate to="/jogos?view=OPERACAO&subView=AGENDA" replace />} />
        <Route path="escalacoes" element={<Navigate to="/jogos?view=OPERACAO&subView=ESCALACAO" replace />} />
        <Route path="participacao" element={<Navigate to="/jogos?view=OPERACAO&subView=EVENTOS" replace />} />
        <Route path="estatisticas" element={<RequireRoles roles={sportsRoles}><EstatisticasPage /></RequireRoles>} />
        <Route path="artilharia" element={<RequireRoles roles={sportsRoles}><ArtilhariaPage /></RequireRoles>} />
        <Route path="assistencias" element={<RequireRoles roles={sportsRoles}><AssistenciasPage /></RequireRoles>} />
        <Route path="participacoes" element={<RequireRoles roles={sportsRoles}><ParticipacoesStatsPage /></RequireRoles>} />
        <Route path="disciplina" element={<RequireRoles roles={sportsRoles}><DisciplinaPage /></RequireRoles>} />
        <Route path="confrontos" element={<RequireRoles roles={sportsRoles}><ConfrontosPage /></RequireRoles>} />
        <Route path="estatisticas/goleiros" element={<Navigate to="/goleiros" replace />} />
        <Route path="rankings" element={<RequireRoles roles={sportsRoles}><RankingsPage /></RequireRoles>} />
        <Route path="convocacoes" element={<Navigate to="/jogos?view=OPERACAO&subView=CONFIRMACOES" replace />} />
        <Route path="competicoes" element={<RequireRoles roles={sportsRoles}><CompeticoesPage /></RequireRoles>} />
        <Route path="ligas-internas" element={<RequireRoles roles={sportsRoles}><InternalLeaguesPage /></RequireRoles>} />
        <Route path="galeria" element={<RequireRoles roles={managementRoles}><GaleriaPage /></RequireRoles>} />
        <Route path="galeria/novo" element={<RequireRoles roles={adminRoles}><GaleriaFormPage /></RequireRoles>} />
        <Route path="galeria/:id" element={<RequireRoles roles={managementRoles}><GaleriaDetailPage /></RequireRoles>} />
        <Route path="galeria/:id/editar" element={<RequireRoles roles={adminRoles}><GaleriaFormPage /></RequireRoles>} />
        <Route path="relatorios" element={<RequireRoles roles={managementRoles}><RelatoriosPage /></RequireRoles>} />
        <Route path="configuracoes" element={<RequireRoles roles={adminRoles}><ConfiguracoesPage /></RequireRoles>} />
        <Route path="configuracoes/visao-geral" element={<RequireRoles roles={adminRoles}><ConfiguracoesHubPage /></RequireRoles>} />
        <Route path="uniformes" element={<RequireRoles roles={adminRoles}><UniformesPage /></RequireRoles>} />
        <Route path="memorial" element={<RequireRoles roles={managementRoles}><MemorialPage /></RequireRoles>} />
        <Route path="memorial/categorias/:slug" element={<RequireRoles roles={managementRoles}><DynamicMemorialCategoryPage /></RequireRoles>} />
        <Route path="memorial/jogos" element={<RequireRoles roles={managementRoles}><MemorialJogosPage /></RequireRoles>} />
        <Route path="memorial/jogos/novo" element={<RequireRoles roles={adminRoles}><MemorialGameFormPage /></RequireRoles>} />
        <Route path="memorial/jogos/:id" element={<RequireRoles roles={managementRoles}><MemorialGameDetailPage /></RequireRoles>} />
        <Route path="memorial/jogos/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialGameFormPage /></RequireRoles>} />
        <Route path="memorial/atletas" element={<RequireRoles roles={managementRoles}><MemorialAtletasPage /></RequireRoles>} />
        <Route path="memorial/atletas/novo" element={<RequireRoles roles={adminRoles}><MemorialAthleteFormPage /></RequireRoles>} />
        <Route path="memorial/atletas/:id" element={<RequireRoles roles={managementRoles}><MemorialAthleteDetailPage /></RequireRoles>} />
        <Route path="memorial/atletas/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialAthleteFormPage /></RequireRoles>} />
        <Route path="memorial/diretorias" element={<RequireRoles roles={managementRoles}><MemorialDiretoriasPage /></RequireRoles>} />
        <Route path="memorial/titulos" element={<RequireRoles roles={managementRoles}><MemorialTitulosPage /></RequireRoles>} />
        <Route path="memorial/titulos/novo" element={<RequireRoles roles={adminRoles}><MemorialTitleFormPage /></RequireRoles>} />
        <Route path="memorial/titulos/:id" element={<RequireRoles roles={managementRoles}><MemorialTitleDetailPage /></RequireRoles>} />
        <Route path="memorial/titulos/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialTitleFormPage /></RequireRoles>} />
        <Route path="memorial/sumulas" element={<RequireRoles roles={managementRoles}><MemorialSumulasPage /></RequireRoles>} />
        <Route path="memorial/sumulas/novo" element={<RequireRoles roles={adminRoles}><MemorialReportFormPage /></RequireRoles>} />
        <Route path="memorial/sumulas/:id" element={<RequireRoles roles={managementRoles}><MemorialReportDetailPage /></RequireRoles>} />
        <Route path="memorial/sumulas/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialReportFormPage /></RequireRoles>} />
        <Route path="memorial/uniformes" element={<RequireRoles roles={managementRoles}><MemorialUniformesPage /></RequireRoles>} />
        <Route path="memorial/uniformes/novo" element={<RequireRoles roles={adminRoles}><MemorialUniformFormPage /></RequireRoles>} />
        <Route path="memorial/uniformes/:id" element={<RequireRoles roles={managementRoles}><MemorialUniformDetailPage /></RequireRoles>} />
        <Route path="memorial/uniformes/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialUniformFormPage /></RequireRoles>} />
        <Route path="memorial/linha-do-tempo" element={<RequireRoles roles={managementRoles}><MemorialLinhaTempoPage /></RequireRoles>} />
        <Route path="memorial/linha-do-tempo/novo" element={<RequireRoles roles={adminRoles}><MemorialTimelineFormPage /></RequireRoles>} />
        <Route path="memorial/linha-do-tempo/:id" element={<RequireRoles roles={managementRoles}><MemorialTimelineDetailPage /></RequireRoles>} />
        <Route path="memorial/linha-do-tempo/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialTimelineFormPage /></RequireRoles>} />
        <Route path="memorial/documentos" element={<RequireRoles roles={managementRoles}><MemorialDocumentsPage /></RequireRoles>} />
        <Route path="memorial/documentos/novo" element={<RequireRoles roles={adminRoles}><MemorialDocumentFormPage /></RequireRoles>} />
        <Route path="memorial/documentos/:id" element={<RequireRoles roles={managementRoles}><MemorialDocumentDetailPage /></RequireRoles>} />
        <Route path="memorial/documentos/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialDocumentFormPage /></RequireRoles>} />
        <Route path="memorial/trofeus" element={<RequireRoles roles={managementRoles}><MemorialAwardsPage /></RequireRoles>} />
        <Route path="memorial/trofeus/novo" element={<RequireRoles roles={adminRoles}><MemorialAwardFormPage /></RequireRoles>} />
        <Route path="memorial/trofeus/:id" element={<RequireRoles roles={managementRoles}><MemorialAwardDetailPage /></RequireRoles>} />
        <Route path="memorial/trofeus/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialAwardFormPage /></RequireRoles>} />
        <Route path="memorial/patrimonio" element={<RequireRoles roles={managementRoles}><MemorialAssetsPage /></RequireRoles>} />
        <Route path="memorial/patrimonio/novo" element={<RequireRoles roles={adminRoles}><MemorialAssetFormPage /></RequireRoles>} />
        <Route path="memorial/patrimonio/:id" element={<RequireRoles roles={managementRoles}><MemorialAssetDetailPage /></RequireRoles>} />
        <Route path="memorial/patrimonio/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialAssetFormPage /></RequireRoles>} />
        <Route path="memorial/hall-da-fama" element={<RequireRoles roles={managementRoles}><MemorialHallPage /></RequireRoles>} />
        <Route path="memorial/hall-da-fama/novo" element={<RequireRoles roles={adminRoles}><MemorialHallFormPage /></RequireRoles>} />
        <Route path="memorial/hall-da-fama/:id" element={<RequireRoles roles={managementRoles}><MemorialHallDetailPage /></RequireRoles>} />
        <Route path="memorial/hall-da-fama/:id/editar" element={<RequireRoles roles={adminRoles}><MemorialHallFormPage /></RequireRoles>} />
        <Route path="superadmin" element={<RequireRoles roles={["SUPERADMIN"]}><SuperadminPage /></RequireRoles>} />
        <Route path="dashboard/campo-times" element={<Navigate to="/jogos/campo-times" replace />} />
        <Route path="jogos/campo-times" element={<RequireRoles roles={sportsRoles}><JogosTeamsFieldPage /></RequireRoles>} />
        <Route path="create-game" element={<RequireRoles roles={sportsRoles}><CreateGamePage /></RequireRoles>} />
      </Route>

      <Route path="atleta" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalDashboardPage /></RequireRoles>} />
      <Route path="atleta/jogos" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalGamesPage /></RequireRoles>} />
      <Route path="atleta/desempenho" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalPerformancePage /></RequireRoles>} />
      <Route path="atleta/financeiro" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalFinancePage /></RequireRoles>} />
      <Route path="atleta/saude" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalHealthPage /></RequireRoles>} />
      <Route path="atleta/carreira" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalCareerPage /></RequireRoles>} />
      <Route path="atleta/conquistas" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalAchievementsPage /></RequireRoles>} />
      <Route path="atleta/perfil" element={<RequireRoles roles={["ATHLETE"]}><AthletePortalProfilePage /></RequireRoles>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
