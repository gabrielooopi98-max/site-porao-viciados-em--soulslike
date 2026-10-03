import { BANNERS_FINAIS, finalBannerAtivo } from '../../services/bannersFinais';

export default function BannerFinalPerfil({ banner, children }) {
  const { dados, erro, tentarNovamente, previa } = banner;
  const arte = BANNERS_FINAIS[finalBannerAtivo(banner)];

  return (
    <>
      <div className="perfil-banner-final">
        {arte && <img className="perfil-banner-arte" src={arte.src} alt={`${previa ? 'Prévia' : 'Banner conquistado'} de ${arte.nome}`} />}
        <div className="perfil-banner-identidade">{children}</div>
      </div>
      {erro && <p className="perfil-erro-amizade" role="alert">
        {erro}{' '}
        {!dados && <button className="btn-filtro" type="button" onClick={tentarNovamente}>Tentar novamente</button>}
      </p>}
    </>
  );
}
