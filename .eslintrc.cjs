module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
    overrides: [
        {
            env: {
                node: true
            },
            files: [".eslintrc.{js,cjs}"],
            parserOptions: {
                sourceType: "script"
            }
        }
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    plugins: ["@typescript-eslint"],
    rules: {
        "no-constant-condition": "off",
        "no-case-declarations": "off",
        "@typescript-eslint/no-unused-vars": [
            "error", // or "error"
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_"
            }
        ]
    }
};
