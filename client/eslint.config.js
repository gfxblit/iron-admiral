import js from "@eslint/js";

export default [
  {
    ignores: ["dist/**", "coverage/**"]
  },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
];