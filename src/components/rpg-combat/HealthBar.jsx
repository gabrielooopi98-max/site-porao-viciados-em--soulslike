// Barra de recurso com "rastro" de dano: a parte perdida some com atraso,
// como nos Souls. tipo: hp | stamina | fp | postura | chefe
export default function HealthBar({ valor, max, tipo = 'hp', rotulo, mostrarValor = false, alerta = false, marcadores = [] }) {
    const porcentagem = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
    return (
        <div className={`rpg-barra rpg-barra--${tipo} ${alerta ? 'rpg-barra--alerta' : ''}`}>
            {rotulo && <span className="rpg-barra-rotulo">{rotulo}</span>}
            <div
                className="rpg-barra-trilho"
                role="meter"
                aria-label={rotulo || tipo}
                aria-valuemin={0}
                aria-valuemax={Math.round(max)}
                aria-valuenow={Math.round(valor)}
            >
                <span className="rpg-barra-rastro" style={{ width: `${porcentagem}%` }} />
                <span className="rpg-barra-preenchimento" style={{ width: `${porcentagem}%` }} />
                {marcadores.map((marcador) => (
                    <span key={marcador} className="rpg-barra-marcador" style={{ left: `${marcador * 100}%` }} />
                ))}
            </div>
            {mostrarValor && <span className="rpg-barra-valor">{Math.ceil(valor)} / {Math.round(max)}</span>}
        </div>
    );
}

export function StaminaBar({ valor, max, exausto }) {
    return <HealthBar valor={valor} max={max} tipo="stamina" rotulo="Stamina" alerta={exausto} />;
}
