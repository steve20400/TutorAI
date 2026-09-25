import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import next from "@next/eslint-plugin-next"

/**
 * Un linter volontairement court.
 *
 * On ne cherche pas à imposer un style : `tsc` tient déjà les types, et une
 * liste de trois cents règles finit toujours par être ignorée. Ce fichier ne
 * garde que les règles qui attrapent la maladie du projet — l'opération qui
 * échoue sans bruit.
 *
 * La plus importante est `no-floating-promises`. Un `await` oublié devant une
 * action serveur, et l'écran affiche « enregistré » pendant que l'écriture
 * part dans le vide. C'est exactement ce qu'on a passé des semaines à
 * débusquer à la main.
 *
 * Elle exige de connaître les types, d'où `projectService` : le linter lit le
 * tsconfig et sait ce qui est une promesse. Il est donc plus lent qu'un
 * linter de style, et c'est le prix de ce qu'il trouve.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "supabase/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],

  {
    plugins: { "@next/next": next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Le cœur du sujet : une promesse qu'on laisse filer.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // Éteinte, et il vaut mieux savoir pourquoi. React la propose depuis
      // peu contre les rendus en cascade. Nos sept cas sont tous le même :
      // lire l'attribut posé sur <html> au montage pour connaître le thème
      // choisi. C'est justement ce qu'il faut faire pour ne pas afficher le
      // mauvais thème pendant une fraction de seconde, et l'alternative —
      // un script en ligne avant l'hydratation — est pire.
      //
      // Une règle qui crie sept fois à chaque passage finit par ne plus être
      // lue du tout. Si un jour une boucle de rendu apparaît, la rallumer
      // est la première chose à faire.
      "react-hooks/set-state-in-effect": "off",

      // Un `_` en tête dit « je sais, et c'est voulu ».
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Les fichiers de configuration ne sont pas dans le tsconfig : les passer au
  // parseur typé ne donne pas une règle violée, mais une erreur d'analyse.
  {
    files: ["**/*.mjs", "**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },

  // Les fichiers de test appellent volontiers sans attendre.
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: { "@typescript-eslint/no-floating-promises": "off" },
  },
)
