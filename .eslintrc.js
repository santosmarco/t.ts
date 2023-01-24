module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: ["xo", "xo-typescript", "prettier"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/member-ordering": "off",
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-redeclare": "off",
    complexity: "off",
    "@typescript-eslint/padding-line-between-statements": "off",
    "@typescript-eslint/consistent-type-assertions": "off",
  },
  overrides: [
    {
      files: ["./tests/**/*.ts"],
      parserOptions: {
        project: "./tsconfig.test.json",
      },
    },
  ],
};
