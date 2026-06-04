const reactConfig = require("./react.js");

module.exports = {
  ...reactConfig,
  extends: [...reactConfig.extends, "next/core-web-vitals"],
};
