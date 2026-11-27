// Extends app.json. Embeds the Thmanyah font only in store builds.
//
// The Thmanyah font license allows embedding in a packaged app, but forbids
// uploading or hosting the font files anywhere. So the files are never
// committed and never sent with Expo Go updates: they are added only when
// building for the App Store / Google Play. See docs/ROADMAP.md (launch
// checklist) and the "Thmanyah font" section in CLAUDE.md.
const fs = require('fs');
const path = require('path');

const FONT_DIR = 'assets/fonts/thmanyah';
const WEIGHTS = ['Light', 'Regular', 'Medium', 'Bold', 'Black'];
const files = WEIGHTS.map((w) => `./${FONT_DIR}/thmanyahsans-${w}.otf`);

module.exports = ({ config }) => {
  const wanted = process.env.SHILLA_EMBED_FONTS === '1';
  const present = files.every((f) => fs.existsSync(path.join(__dirname, f)));
  if (wanted && !present) {
    throw new Error(`SHILLA_EMBED_FONTS=1 but the Thmanyah font files are missing from ${FONT_DIR}`);
  }
  const embed = wanted && present;
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ...(embed ? [['expo-font', { fonts: files }]] : [])],
    extra: { ...config.extra, thmanyahFont: embed },
  };
};
