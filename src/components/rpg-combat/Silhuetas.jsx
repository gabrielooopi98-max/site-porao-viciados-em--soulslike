// Placeholders vetoriais elegantes. Para usar arte propria, preencha
// build.imagemCombate / arma.imagem / chefe.imagem com a URL da imagem:
// PlayerCharacter e Boss trocam o SVG pela <img> automaticamente.

function Arma({ forma }) {
    switch (forma) {
        case 'katana':
            return (
                <g className="rpg-arma-forma">
                    <path d="M84 88 Q102 52 121 16 Q108 54 88 91Z" fill="url(#rpgLamina)" />
                    <path d="M80 92 l10 -6" stroke="#969696" strokeWidth="3" strokeLinecap="round" />
                </g>
            );
        case 'martelo':
            return (
                <g className="rpg-arma-forma">
                    <path d="M76 104 L106 22" stroke="#4b3a2a" strokeWidth="4" strokeLinecap="round" />
                    <rect x="92" y="8" width="30" height="20" rx="2" fill="url(#rpgFerro)" stroke="#6d6d74" transform="rotate(20 107 18)" />
                </g>
            );
        case 'cajado':
            return (
                <g className="rpg-arma-forma">
                    <path d="M76 112 L102 18" stroke="#3a2f26" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M98 22 q4 -10 8 -2 q-2 6 -8 2Z" fill="#969696" />
                    <circle className="rpg-orbe" cx="103" cy="15" r="5.5" fill="#9cc0ef" />
                </g>
            );
        case 'laminaRubra':
            return (
                <g className="rpg-arma-forma">
                    <path d="M84 88 Q120 66 118 22 Q108 60 87 92Z" fill="url(#rpgLaminaRubra)" />
                    <path d="M80 92 l10 -6" stroke="#969696" strokeWidth="3" strokeLinecap="round" />
                </g>
            );
        case 'escudo':
            return (
                <g className="rpg-arma-forma">
                    <path d="M78 98 L100 40" stroke="#4b3a2a" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="101" cy="37" r="8" fill="url(#rpgFerro)" stroke="#6d6d74" />
                </g>
            );
        default:
            return (
                <g className="rpg-arma-forma">
                    <path d="M84 88 L113 26 L117 28 L88 90Z" fill="url(#rpgLamina)" />
                    <path d="M78 86 l14 8" stroke="#969696" strokeWidth="3" strokeLinecap="round" />
                </g>
            );
    }
}

export function SilhuetaJogador({ forma }) {
    return (
        <svg className="rpg-svg rpg-svg-jogador" viewBox="0 0 130 180" aria-hidden="true">
            <defs>
                <linearGradient id="rpgArmadura" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#4a4a50" />
                    <stop offset="1" stopColor="#151517" />
                </linearGradient>
                <linearGradient id="rpgCapa" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#262222" />
                    <stop offset="1" stopColor="#070606" />
                </linearGradient>
                <linearGradient id="rpgLamina" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#8a8a90" />
                    <stop offset="1" stopColor="#f2f0ea" />
                </linearGradient>
                <linearGradient id="rpgLaminaRubra" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#4a0f14" />
                    <stop offset="1" stopColor="#c23a3f" />
                </linearGradient>
                <linearGradient id="rpgFerro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6a6a70" />
                    <stop offset="1" stopColor="#232326" />
                </linearGradient>
            </defs>
            <path className="rpg-capa" d="M46 52 C30 82 22 124 14 170 L58 172 L66 58Z" fill="url(#rpgCapa)" />
            <path d="M52 112 L45 172 L56 172 L62 120Z" fill="#121214" />
            <path d="M64 112 L72 172 L83 172 L74 112Z" fill="#18181b" />
            <path d="M46 56 Q61 47 75 56 L79 110 Q61 118 43 110Z" fill="url(#rpgArmadura)" stroke="#6b6b70" strokeWidth="0.8" />
            <path d="M45 100 Q61 106 78 100" stroke="#969696" strokeWidth="2" fill="none" opacity="0.75" />
            <path d="M48 31 Q59 9 75 24 L77 52 L67 45 L56 52Z" fill="url(#rpgCapa)" stroke="#3a3a3f" strokeWidth="0.8" />
            <path d="M58 33 Q65 28 73 33 L73 44 Q65 48 58 44Z" fill="#0b0b0c" />
            <path className="rpg-visor" d="M62 37 h9" stroke="#f0f0f0" strokeWidth="1.4" opacity="0.7" />
            {forma === 'escudo' && (
                <g className="rpg-escudo">
                    <path d="M74 60 L102 64 L100 116 Q88 132 74 122Z" fill="url(#rpgFerro)" stroke="#8a8a90" strokeWidth="1.2" />
                    <path d="M80 72 L95 74 M87 66 L86 120" stroke="#969696" strokeWidth="1.6" opacity="0.7" />
                </g>
            )}
            <g className="rpg-braco">
                <path d="M63 58 L86 84 L81 90 L58 66Z" fill="url(#rpgArmadura)" stroke="#5a5a60" strokeWidth="0.6" />
                <Arma forma={forma} />
                <circle cx="84" cy="88" r="4.5" fill="#2a2a2e" />
            </g>
        </svg>
    );
}

export function SilhuetaChefe({ fase }) {
    return (
        <svg className="rpg-svg rpg-svg-chefe" viewBox="0 0 220 320" aria-hidden="true">
            <defs>
                <linearGradient id="rpgCabelo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8c3f22" />
                    <stop offset="1" stopColor="#2a0f08" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="rpgArmaduraChefe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#57524a" />
                    <stop offset="1" stopColor="#17150f" />
                </linearGradient>
                <linearGradient id="rpgOuro" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f0f0f0" />
                    <stop offset="1" stopColor="#7a5f32" />
                </linearGradient>
                <linearGradient id="rpgLaminaChefe" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#9b9ba0" />
                    <stop offset="1" stopColor="#f6f3ea" />
                </linearGradient>
                <radialGradient id="rpgFlor" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor="#e0773f" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#7a1d14" stopOpacity="0" />
                </radialGradient>
            </defs>
            {fase === 2 && (
                <g className="rpg-flor-podridao">
                    {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((angulo) => (
                        <ellipse key={angulo} cx="120" cy="58" rx="16" ry="58" fill="url(#rpgFlor)" transform={`rotate(${angulo} 120 110)`} />
                    ))}
                </g>
            )}
            <path className="rpg-cabelo" d="M118 54 C150 70 160 120 176 150 C190 178 170 206 196 236 C170 222 160 196 150 176 C140 150 128 120 112 74Z" fill="url(#rpgCabelo)" />
            <path className="rpg-capa-chefe" d="M112 84 C150 120 170 200 204 300 L120 304 L104 120Z" fill="#1b1612" opacity="0.92" />
            <path d="M92 182 C86 230 78 270 70 304 L140 304 C132 266 126 226 122 182Z" fill="url(#rpgArmaduraChefe)" stroke="#6d6553" strokeWidth="0.8" />
            <path d="M96 84 Q110 76 124 84 L126 186 Q108 194 90 186Z" fill="url(#rpgArmaduraChefe)" stroke="#7a705c" strokeWidth="0.8" />
            <path d="M93 150 Q108 158 124 150" stroke="#969696" strokeWidth="2" fill="none" opacity="0.8" />
            <path d="M114 88 L134 138 L127 178" stroke="#2a2620" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M114 88 L134 138 L127 178" stroke="url(#rpgOuro)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85" />
            <path d="M108 80 Q128 76 132 94 Q120 98 108 92Z" fill="url(#rpgArmaduraChefe)" stroke="#7a705c" strokeWidth="0.8" />
            <g className="rpg-elmo">
                <path d="M100 52 Q110 38 122 50 L122 72 Q110 80 100 72Z" fill="url(#rpgOuro)" stroke="#5a4626" strokeWidth="0.8" />
                <path d="M120 52 C138 30 150 22 168 18 C150 32 140 44 124 60Z" fill="url(#rpgOuro)" opacity="0.9" />
                <path d="M118 46 C126 22 136 10 150 2 C140 20 134 34 122 54Z" fill="url(#rpgOuro)" opacity="0.75" />
                <path className="rpg-olho-chefe" d="M102 60 h7" stroke="#fff3d6" strokeWidth="1.6" opacity="0.8" />
            </g>
            <g className="rpg-braco-chefe">
                <path d="M98 86 Q88 82 86 94 Q94 100 104 96Z" fill="url(#rpgArmaduraChefe)" stroke="#7a705c" strokeWidth="0.8" />
                <path d="M102 90 L72 124 L81 133 L109 103Z" fill="url(#rpgOuro)" stroke="#5a4626" strokeWidth="0.8" />
                <path d="M88 108 l8 7" stroke="#5a4626" strokeWidth="1.2" />
                <path className="rpg-lamina-chefe" d="M78 128 Q40 150 2 196 Q44 156 82 134Z" fill="url(#rpgLaminaChefe)" />
                <path d="M72 124 l14 12" stroke="#969696" strokeWidth="3.5" strokeLinecap="round" />
            </g>
        </svg>
    );
}

export function CenarioArena() {
    return (
        <svg className="rpg-ruinas" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <defs>
                <linearGradient id="rpgRuina" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#141414" />
                    <stop offset="1" stopColor="#070707" />
                </linearGradient>
            </defs>
            <g fill="url(#rpgRuina)" opacity="0.95">
                <path d="M40 400 V160 Q40 110 90 96 Q140 110 140 160 V400 H118 V170 Q118 128 90 120 Q62 128 62 170 V400Z" />
                <path d="M210 400 V220 h26 V400Z M200 214 h46 v10 h-46Z" />
                <path d="M720 400 V140 Q720 80 790 64 Q860 80 860 140 V400 H832 V150 Q832 102 790 92 Q748 102 748 150 V400Z" />
                <path d="M920 400 V240 h24 V400Z M912 232 h40 v10 h-40Z" />
                <path d="M420 400 V300 L470 270 L520 300 V400Z" opacity="0.6" />
            </g>
        </svg>
    );
}
