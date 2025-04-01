import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import tseslint from "typescript-eslint";

const commonRules = {
  "react/prop-types": "off",
  "react/react-in-jsx-scope": "off",
  "@typescript-eslint/ban-ts-comment": "off",
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      "argsIgnorePattern": "^_[^_].*$|^_$",
      "varsIgnorePattern": "^_[^_].*$|^_$",
      "caughtErrorsIgnorePattern": "^_[^_].*$|^_$"
    }
  ]
};

const common = {rules: commonRules};

export default [
  ...tseslint.config({
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    extends: [
      pluginReact.configs.flat.recommended,
      ...compat.extends("plugin:react-hooks/recommended"),
      pluginJs.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      common
    ],
    settings: {
      react: { version: "detect" }
    },
    languageOptions: {
      globals: {...globals.browser, ...globals.node},
      parserOptions: { projectService: true },
    }
  }, {
    ignores: ["dist", "public", "generated"]
  })
];