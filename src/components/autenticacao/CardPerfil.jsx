import BannerFinalPerfil from './BannerFinalPerfil';
import { BANNERS_FINAIS, finalBannerAtivo } from '../../services/bannersFinais';

export default function CardPerfil({ banner, tituloId, cabecalho, children }) {
  const temBanner = Boolean(BANNERS_FINAIS[finalBannerAtivo(banner)]);
  return (
    <section className={`perfil-painel perfil-card${temBanner ? ' perfil-card--com-banner' : ''}`} aria-labelledby={tituloId}>
      <BannerFinalPerfil banner={banner}>{cabecalho}</BannerFinalPerfil>
      <div className="perfil-card-conteudo">{children}</div>
    </section>
  );
}
