/**
=========================================================
* Material Dashboard 2 PRO React TS - v1.0.2
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-2-pro-react-ts
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

/**
 * D1 "Tema Köprüsü" (docs/UI_D1_REPORT.md): bu dosya artık hiçbir hex/rgba
 * literal İÇERMİYOR — tüm değerler `assets/theme/tokens.ts`'ten (single
 * source of truth) okunur. Görsel çıktı D1 öncesi ile BİREBİR AYNIDIR.
 */

// Design tokens (single source of truth)
import { paletteLight } from "assets/theme/tokens";

// types
interface ColorsTypes {
  main: string;
  focus: string;
}

interface GradientsTypes {
  main: string;
  state: string;
}

interface SocialMediaColorsTypes {
  main: string;
  dark: string;
}

interface BadgeColorsTypes {
  background: string;
  text: string;
}

interface Types {
  background:
    | {
        default: string;
        sidenav?: string;
        card?: string;
      }
    | any;
  white:
    | {
        main: string;
        focus: string;
      }
    | any;
  text:
    | {
        main: string;
        focus: string;
        primary?: string;
        secondary?: string;
        disabled?: string;
      }
    | any;
  transparent:
    | {
        main: string;
      }
    | any;
  black:
    | {
        light: string;
        main: string;
        focus: string;
      }
    | any;
  primary: ColorsTypes | any;
  secondary: ColorsTypes | any;
  info: ColorsTypes | any;
  success: ColorsTypes | any;
  warning: ColorsTypes | any;
  error: ColorsTypes | any;
  light: ColorsTypes | any;
  dark: ColorsTypes | any;
  grey:
    | {
        [key: string | number]: string;
      }
    | any;
  gradients:
    | {
        primary: GradientsTypes;
        secondary: GradientsTypes;
        info: GradientsTypes;
        success: GradientsTypes;
        warning: GradientsTypes;
        error: GradientsTypes;
        light: GradientsTypes;
        dark: GradientsTypes;
      }
    | any;
  socialMediaColors:
    | {
        facebook: SocialMediaColorsTypes;
        twitter: SocialMediaColorsTypes;
        instagram: SocialMediaColorsTypes;
        linkedin: SocialMediaColorsTypes;
        pinterest: SocialMediaColorsTypes;
        youtube: SocialMediaColorsTypes;
        vimeo: SocialMediaColorsTypes;
        slack: SocialMediaColorsTypes;
        dribbble: SocialMediaColorsTypes;
        github: SocialMediaColorsTypes;
        reddit: SocialMediaColorsTypes;
        tumblr: SocialMediaColorsTypes;
      }
    | any;
  badgeColors:
    | {
        primary: BadgeColorsTypes;
        secondary: BadgeColorsTypes;
        info: BadgeColorsTypes;
        success: BadgeColorsTypes;
        warning: BadgeColorsTypes;
        error: BadgeColorsTypes;
        light: BadgeColorsTypes;
        dark: BadgeColorsTypes;
      }
    | any;
  coloredShadows:
    | {
        [key: string]: string;
      }
    | any;
  inputBorderColor: string;
  tabs:
    | {
        indicator:
          | {
              boxShadow: string;
            }
          | any;
      }
    | any;
}

const colors: Types = {
  background: {
    default: paletteLight.backgroundDefault,
  },

  text: {
    main: paletteLight.textMain,
    focus: paletteLight.textFocus,
  },

  transparent: {
    main: "transparent",
  },

  white: {
    main: paletteLight.white,
    focus: paletteLight.white,
  },

  black: {
    light: paletteLight.black,
    main: paletteLight.black,
    focus: paletteLight.black,
  },

  primary: {
    main: paletteLight.primaryMain,
    focus: paletteLight.primaryFocus,
  },

  secondary: {
    main: paletteLight.secondaryMain,
    focus: paletteLight.secondaryFocus,
  },

  info: {
    main: paletteLight.infoMain,
    focus: paletteLight.infoFocus,
  },

  success: {
    main: paletteLight.successMain,
    focus: paletteLight.successFocus,
  },

  warning: {
    main: paletteLight.warningMain,
    focus: paletteLight.warningFocus,
  },

  error: {
    main: paletteLight.errorMain,
    focus: paletteLight.errorFocus,
  },

  light: {
    main: paletteLight.lightMain,
    focus: paletteLight.lightFocus,
  },

  dark: {
    main: paletteLight.darkMain,
    focus: paletteLight.darkFocus,
  },

  grey: { ...paletteLight.grey },

  gradients: { ...paletteLight.gradients },

  socialMediaColors: { ...paletteLight.socialMediaColors },

  badgeColors: { ...paletteLight.badgeColors },

  coloredShadows: { ...paletteLight.coloredShadows },

  inputBorderColor: paletteLight.inputBorderColor,

  tabs: {
    indicator: { boxShadow: paletteLight.tabsIndicatorShadow },
  },
};

export default colors;
