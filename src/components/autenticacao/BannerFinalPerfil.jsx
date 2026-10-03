const BANNER_CHAMA = '/svg-animado/banner-cavaleiro-chama-1760x575-detalhado.svg';

export default function BannerFinalPerfil({ banner }) {
  const { dados, erro, tentarNovamente, previa } = banner;
  const aplicado = previa || dados?.final_id === 'er_chama';

  return (
    <>
      {aplicado && <div className="perfil-banner-final">
        <img src={BANNER_CHAMA} alt={previa ? 'Prévia do banner da Chama Frenética' : 'Banner conquistado da Chama Frenética'} />
        <strong>{previa ? 'Prévia da Chama Frenética · Não salva' : 'Lorde da Chama Frenética'}</strong>
      </div>}
      {erro && <p className="perfil-erro-amizade" role="alert">
        {erro}{' '}
        {!dados && <button className="btn-filtro" type="button" onClick={tentarNovamente}>Tentar novamente</button>}
      </p>}
    </>
  );
}
