import reactConfig from "@aprovan/eslint-config/react";

export default [
  ...reactConfig,
  {
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
];
