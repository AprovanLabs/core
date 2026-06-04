const baseConfig = require("./base.js");

module.exports = {
  ...baseConfig,
  env: {
    ...baseConfig.env,
    browser: true,
  },
  extends: [
    ...baseConfig.extends,
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: [...baseConfig.plugins, "react", "react-hooks", "react-refresh"],
  rules: {
    ...baseConfig.rules,
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  settings: {
    ...baseConfig.settings,
    react: {
      version: "detect",
    },
  },
};
