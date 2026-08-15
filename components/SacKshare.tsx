import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Sac de courses Kshare, dessiné en vectoriel.
 *
 * Le volume ne vient pas d'un dégradé mais de l'ordre des plans : anse arrière,
 * intérieur sombre, courses, face avant, logo, anse avant. C'est l'anse avant
 * passant devant les courses qui les ancre dans le sac au lieu de les laisser
 * flotter au-dessus.
 *
 * Une illustration plutôt qu'une photo : nette sur tous les écrans, quelques
 * kilo-octets au lieu de plusieurs centaines, et deux teintes pour le prix
 * d'une.
 */

type Variante = 'achat' | 'don';

interface Teintes {
  clair: string;
  moyen: string;
  fonce: string;
  hemClair: string;
  hemFonce: string;
  anseClair: string;
  anseMoyen: string;
  anseFonce: string;
  anseArriere: string;
  interieur: string;
  ombre: string;
  attache: string;
}

const TEINTES: Record<Variante, Teintes> = {
  achat: {
    clair: '#5061E2',
    moyen: '#3744C8',
    fonce: '#252F9B',
    hemClair: '#6D7EF9',
    hemFonce: '#3B49CE',
    anseClair: '#6376F6',
    anseMoyen: '#4E5EE4',
    anseFonce: '#3E4CD0',
    anseArriere: '#222C93',
    interieur: '#141C60',
    ombre: '#1E2A78',
    attache: '#2A35A8',
  },
  don: {
    clair: '#8168ED',
    moyen: '#6A4FE0',
    fonce: '#4731A9',
    hemClair: '#A78DFB',
    hemFonce: '#7057E4',
    anseClair: '#9B7BF7',
    anseMoyen: '#7A5FEA',
    anseFonce: '#6349DC',
    anseArriere: '#43309F',
    interieur: '#2A1D6E',
    ombre: '#3B2E96',
    attache: '#4A34AE',
  },
};

const LOGO = require('../assets/logo-kshare-blanc.png');

interface Props {
  variante: Variante;
  largeur?: number;
}

export function SacKshare({ variante, largeur = 216 }: Props) {
  const t = TEINTES[variante];
  // Les identifiants de dégradé sont uniques par variante : deux sacs affichés
  // dans la même arborescence partageraient sinon leurs définitions.
  const id = (nom: string) => `sac-${variante}-${nom}`;

  return (
    <Svg width={largeur} height={largeur * (240 / 220)} viewBox="0 0 220 240">
      <Defs>
        <LinearGradient id={id('corps')} x1="0" y1="0" x2="1" y2="0.35">
          <Stop offset="0" stopColor={t.clair} />
          <Stop offset="0.45" stopColor={t.moyen} />
          <Stop offset="1" stopColor={t.fonce} />
        </LinearGradient>
        <LinearGradient id={id('hem')} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={t.hemClair} />
          <Stop offset="1" stopColor={t.hemFonce} />
        </LinearGradient>
        <LinearGradient id={id('anse')} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={t.anseMoyen} />
          <Stop offset="0.5" stopColor={t.anseClair} />
          <Stop offset="1" stopColor={t.anseFonce} />
        </LinearGradient>
        <RadialGradient id={id('ombre')} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={t.ombre} stopOpacity="0.28" />
          <Stop offset="1" stopColor={t.ombre} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Ellipse cx="110" cy="224" rx="82" ry="12" fill={`url(#${id('ombre')})`} />

      {/* Anse arrière : passe derrière les courses */}
      <Path
        d="M68 94 C60 28 160 28 152 94"
        fill="none"
        stroke={t.anseArriere}
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Ouverture du sac */}
      <Ellipse cx="110" cy="88" rx="76" ry="13" fill={t.interieur} />

      {/* Les courses. Mêmes couleurs sur les deux variantes : c'est la teinte du
          sac, et elle seule, qui distingue un achat d'un don. */}
      <Path d="M62 98 q-9-30 1-44 q10 15 9 44z" fill="#5C8C3E" />
      <Path d="M74 100 q-11-42 4-60 q11 18 7 60z" fill="#6FA24B" />
      <Path d="M87 100 q-7-35 11-48 q8 18 1 48z" fill="#8CBF63" />
      {/* `transform` plutôt que `rotation`/`origin` : ces deux props font émettre
          un attribut DOM invalide à react-native-svg sur le web. */}
      <G transform="rotate(9 134 64)">
        <Rect x="123" y="30" width="22" height="70" rx="11" fill="#E0B266" />
        <Path
          d="M129 44 l10-4 M129 56 l10-4 M129 68 l10-4"
          stroke="#C1904A"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </G>
      <Circle cx="105" cy="80" r="18" fill="#DE4C3C" />
      <Circle cx="99" cy="74" r="6" fill="#EE7060" opacity="0.55" />
      <Path d="M105 64 q5-8 12-8 q-3 8-12 9z" fill="#5C8C3E" />
      <Circle cx="149" cy="84" r="16" fill="#EFA13C" />
      <Circle cx="144" cy="79" r="5" fill="#F8BF6B" opacity="0.6" />

      {/* Face avant */}
      <Path
        d="M34 88 A76 13 0 0 1 186 88 L177 204 A13 13 0 0 1 164 216 L56 216 A13 13 0 0 1 43 204 Z"
        fill={`url(#${id('corps')})`}
      />
      <Path
        d="M150 95 L186 88 L177 204 A13 13 0 0 1 164 216 L141 216 Z"
        fill={t.interieur}
        opacity="0.17"
      />
      <Path
        d="M34 88 A76 13 0 0 1 186 88 L185 105 A76 13 0 0 0 35 105 Z"
        fill={`url(#${id('hem')})`}
      />
      <Path
        d="M77 110 C74 150 74 180 73 208"
        stroke={t.interieur}
        strokeWidth="2.4"
        opacity="0.13"
        fill="none"
      />
      <Path
        d="M143 110 C146 150 146 180 147 208"
        stroke="#ffffff"
        strokeWidth="2.4"
        opacity="0.08"
        fill="none"
      />

      <SvgImage
        href={LOGO}
        x="68"
        y="140"
        width="84"
        height="32"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Anse avant : passe devant les courses */}
      <Path
        d="M72 100 C64 36 156 36 148 100"
        fill="none"
        stroke={`url(#${id('anse')})`}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <Rect x="66" y="94" width="12" height="13" rx="4" fill={t.attache} />
      <Rect x="142" y="94" width="12" height="13" rx="4" fill={t.attache} />
    </Svg>
  );
}
