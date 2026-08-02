import { FinanceiroPage as FinanceiroPageReal } from "./FinanceiroPage";
import { HistoricoPage as HistoricoPageReal } from "./HistoricoPage";
import { RelatoriosPage as RelatoriosPageReal } from "./RelatoriosPage";
import { AssociationBlockDetailPage as AssociationBlockDetailPageReal, AssociationSuitePage as AssociationSuitePageReal } from "./AssociationSuitePage";
import { AthletePortalPage as AthletePortalPageReal } from "./AthletePortalPage";
import { EventRegistrationFormPage, EventRegistrationsListPage } from "./EventRegistrationsPage";
import { ModuleHubPage } from "./ModuleHubPage";
import { ElencoPageReal, EscalacoesPageReal } from "./AthletesPage";
import { ParticipacaoPageReal } from "./GameParticipationPage";
import { ArtilhariaPageReal, ConfrontosPageReal, DisciplinaPageReal } from "./SportsStatsPage";
import { AssociadosPageReal, AuditoriaPageReal, ConfiguracoesPageReal, ConvitesPageReal, GoleirosPageReal, JogosPageReal } from "./OperationsPages";
import { ClubesPageReal, CompeticoesPageReal, ConvocacoesPageReal, EquipesPageReal } from "./ClubStructurePage";
import {
  AdversariosPage as AdversariosPageReal,
  AssistenciasPage as AssistenciasPageReal,
  CamposPage as CamposPageReal,
  ComissaoTecnicaPage as ComissaoTecnicaPageReal,
  DiretoriaMandatoFormPage as DiretoriaMandatoFormPageReal,
  DiretoriaPage as DiretoriaPageReal,
  EventoFormPage as EventoFormPageReal,
  EventosPage as EventosPageReal,
  ParticipacoesStatsPage as ParticipacoesStatsPageReal,
  RankingsPage as RankingsPageReal
} from "./ProductAreaPages";
import {
  ArchiveDetailPage,
  ArchiveLaunchPage,
  MemorialAtletasPage as MemorialAtletasPageReal,
  MemorialDashboardPage as MemorialDashboardPageReal,
  MemorialJogosPage as MemorialJogosPageReal
} from "./ArchivePages";
import {
  MemorialPresidentesPage as MemorialPresidentesPageRich,
  MemorialTitulosPage2 as MemorialTitulosPageRich,
  MemorialSumulasPage2 as MemorialSumulasPageRich,
  MemorialLinhaTempoPage2 as MemorialLinhaTempoPageRich,
  MemorialCamisasPage2 as MemorialCamisasPageRich,
  MemorialGaleriaPage2 as MemorialGaleriaPageRich,
  MemorialDocumentosPage2 as MemorialDocumentosPageRich,
  MemorialTrofeusPage2 as MemorialTrofeusPageRich,
  MemorialPatrimonioPage2 as MemorialPatrimonioPageRich,
  MemorialHallPage2 as MemorialHallPageRich
} from "./MemorialPages";

export function AssociadosPage() {
  return <AssociadosPageReal />;
}

export function AssociacaoPage() {
  return <AssociationSuitePageReal />;
}

export function AssociacaoDetailPage() {
  return <AssociationBlockDetailPageReal />;
}

export function ConvitesPage() {
  return <ConvitesPageReal />;
}

export function AuditoriaPage() {
  return <AuditoriaPageReal />;
}

export function ElencoPage() {
  return <ElencoPageReal />;
}

export function GoleirosPage() {
  return <GoleirosPageReal />;
}

export function ClubesPage() {
  return <ClubesPageReal />;
}

export function EquipesPage() {
  return <EquipesPageReal />;
}

export function DiretoriaPage() {
  return <DiretoriaPageReal />;
}

export function DiretoriaMandatoFormPage() {
  return <DiretoriaMandatoFormPageReal />;
}

export function ComissaoTecnicaPage() {
  return <ComissaoTecnicaPageReal />;
}

export function CamposPage() {
  return <CamposPageReal />;
}

export function AdversariosPage() {
  return <AdversariosPageReal />;
}

export function ConvocacoesPage() {
  return <ConvocacoesPageReal />;
}

export function CompeticoesPage() {
  return <CompeticoesPageReal />;
}

export function FinanceiroPage() {
  return <FinanceiroPageReal />;
}

export function HistoricoPage() {
  return <HistoricoPageReal />;
}

export function JogosPage() {
  return <JogosPageReal />;
}

export function EscalacoesPage() {
  return <EscalacoesPageReal />;
}

export function ParticipacaoPage() {
  return <ParticipacaoPageReal />;
}

export function ArtilhariaPage() {
  return <ArtilhariaPageReal />;
}

export function DisciplinaPage() {
  return <DisciplinaPageReal />;
}

export function ConfrontosPage() {
  return <ConfrontosPageReal />;
}

export function AssistenciasPage() {
  return <AssistenciasPageReal />;
}

export function ParticipacoesStatsPage() {
  return <ParticipacoesStatsPageReal />;
}

export function RankingsPage() {
  return <RankingsPageReal />;
}

export function EventosPage() {
  return <EventosPageReal />;
}

export function EventoFormPage() {
  return <EventoFormPageReal />;
}

export function InscricoesPage() {
  return <EventRegistrationsListPage />;
}

export function InscricaoFormPage() {
  return <EventRegistrationFormPage />;
}

export function GaleriaPage() {
  return <MemorialGaleriaPageRich />;
}

export function GaleriaDetailPage() {
  return <ArchiveDetailPage kind="gallery" />;
}

export function GaleriaFormPage() {
  return <ArchiveLaunchPage kind="gallery" />;
}

export function RelatoriosPage() {
  return <RelatoriosPageReal />;
}

export function ConfiguracoesPage() {
  return <ConfiguracoesPageReal />;
}

export function UniformesPage() {
  return <ConfiguracoesPageReal initialSection="uniforms" standaloneUniforms />;
}

export function MemorialJogosPage() {
  return <MemorialJogosPageReal />;
}

export function MemorialAtletasPage() {
  return <MemorialAtletasPageReal />;
}

export function MemorialDiretoriasPage() {
  return <MemorialPresidentesPageRich />;
}

export function MemorialTitulosPage() {
  return <MemorialTitulosPageRich />;
}

export function MemorialSumulasPage() {
  return <MemorialSumulasPageRich />;
}

export function MemorialLinhaTempoPage() {
  return <MemorialLinhaTempoPageRich />;
}

export function MemorialUniformesPage() {
  return <MemorialCamisasPageRich />;
}

export function MemorialDocumentsPage() {
  return <MemorialDocumentosPageRich />;
}

export function MemorialAwardsPage() {
  return <MemorialTrofeusPageRich />;
}

export function MemorialAssetsPage() {
  return <MemorialPatrimonioPageRich />;
}

export function MemorialHallPage() {
  return <MemorialHallPageRich />;
}

export function MemorialTitleFormPage() {
  return <ArchiveLaunchPage kind="titles" />;
}

export function MemorialTitleDetailPage() {
  return <ArchiveDetailPage kind="titles" />;
}

export function MemorialGameFormPage() {
  return <ArchiveLaunchPage kind="games" />;
}

export function MemorialGameDetailPage() {
  return <ArchiveDetailPage kind="games" />;
}

export function MemorialAthleteFormPage() {
  return <ArchiveLaunchPage kind="athletes" />;
}

export function MemorialAthleteDetailPage() {
  return <ArchiveDetailPage kind="athletes" />;
}

export function MemorialReportFormPage() {
  return <ArchiveLaunchPage kind="reports" />;
}

export function MemorialReportDetailPage() {
  return <ArchiveDetailPage kind="reports" />;
}

export function MemorialUniformFormPage() {
  return <ArchiveLaunchPage kind="shirts" />;
}

export function MemorialUniformDetailPage() {
  return <ArchiveDetailPage kind="shirts" />;
}

export function MemorialDocumentFormPage() {
  return <ArchiveLaunchPage kind="documents" />;
}

export function MemorialDocumentDetailPage() {
  return <ArchiveDetailPage kind="documents" />;
}

export function MemorialAwardFormPage() {
  return <ArchiveLaunchPage kind="awards" />;
}

export function MemorialAwardDetailPage() {
  return <ArchiveDetailPage kind="awards" />;
}

export function MemorialAssetFormPage() {
  return <ArchiveLaunchPage kind="assets" />;
}

export function MemorialAssetDetailPage() {
  return <ArchiveDetailPage kind="assets" />;
}

export function MemorialHallFormPage() {
  return <ArchiveLaunchPage kind="hall" />;
}

export function MemorialHallDetailPage() {
  return <ArchiveDetailPage kind="hall" />;
}

export function MemorialTimelineFormPage() {
  return <ArchiveLaunchPage kind="timeline" />;
}

export function MemorialTimelineDetailPage() {
  return <ArchiveDetailPage kind="timeline" />;
}

export function MinhaContaPage() {
  return <AthletePortalPageReal />;
}

export function PessoasPage() {
  return <ModuleHubPage module="pessoas" />;
}

export function AgendaPage() {
  return <ModuleHubPage module="agenda" />;
}

export function FutebolPage() {
  return <ModuleHubPage module="futebol" />;
}

export function EstatisticasPage() {
  return <ModuleHubPage module="estatisticas" />;
}

export function MemorialPage() {
  return <MemorialDashboardPageReal />;
}

export function ConfiguracoesHubPage() {
  return <ModuleHubPage module="configuracoes" />;
}
