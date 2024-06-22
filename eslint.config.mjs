import react from "eslint-plugin-react";
import _import from "eslint-plugin-import";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import { fixupPluginRules, fixupConfigRules } from "@eslint/compat";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("airbnb/hooks", "prettier"), {
    plugins: {
        react: fixupPluginRules(react),
        import: fixupPluginRules(_import),
        prettier,
        "jsx-a11y": jsxA11Y,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            Atomics: "readonly",
            SharedArrayBuffer: "readonly",
        },

        parser: tsParser,
        ecmaVersion: 2018,
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    settings: {
        react: {
            version: "18.2.0",
        },
    },

    rules: {
        "prettier/prettier": "error",
    },
}, ...fixupConfigRules(compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "airbnb-typescript",
    "prettier",
)).map(config => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
})), {
    files: ["**/*.ts", "**/*.tsx"],

    languageOptions: {
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: "./tsconfig.json",
            tsconfigRootDir: "/home/enterprize1/Code/phishy-mailbox",
        },
    },

    rules: {
        "react/jsx-curly-brace-presence": ["error", {
            props: "never",
            children: "never",
        }],

        "react/jsx-props-no-spreading": "off",
        "react/button-has-type": "off",
        "react/prop-types": "off",

        "react/require-default-props": ["error", {
            forbidDefaultForRequired: false,
            ignoreFunctionalComponents: true,
        }],

        "import/prefer-default-export": "off",
        "import/no-extraneous-dependencies": "off",

        "no-underscore-dangle": ["error", {
            allow: ["__id", "__typename"],
        }],

        "import/extensions": "off",
        "@typescript-eslint/no-namespace": "off",
    },
}];