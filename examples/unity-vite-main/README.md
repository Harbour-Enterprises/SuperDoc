# Unity Vite Project Template

- [What is this?](#what-is-the-unity-vite-project-template)
- [Setup Instructions](#setup-instructions)
- [Why Vite?](#why-vite)

## What is the Unity Vite project template?

> Welcome to Unity's Vite project template.
>
> This template is a fork of the official vite [react-ts](https://vite.new/react-ts) template.
>
> It includes a few common patterns already built for you to get your next application up and running.
>
> - **[Unity](https://main--62cc2d7ddc230761491f3aac.chromatic.com/)**
>
>   - Required assets are already included, following the [Unity Installation Guide](https://main--62cc2d7ddc230761491f3aac.chromatic.com/?path=/docs/getting-started--docs)
>   - Read [Instructions](#instructions) below to learn how to use your PAT to install the Unity package.
>
> - [Unity Tailwind v4 Theme](https://main--62cc2d7ddc230761491f3aac.chromatic.com/?path=/docs/patterns-tailwindcss--docs)
>   - Tailwind is already set up and the Unity theme is included. Note that the default tailwind theme and Preflight are not included due to limitations with current Unity. We are working on supporting the Preflight CSS reset in the future.
>   - You can still use SCSS Modules, they are configured with Vite.
> - **Basic UI using Unity components**
>
>   - Responsive Header / Footer / Content area
>   - Examples of Cards / Pagination / Form elements / Tabs
>   - Future Enhancements
>     - Future 2.x Unity will provide Layout components. This template will be updated to use those.
>     - Let us know what else you'd like to be added!
>
> - **Authentication**
>
>   - Uses Redux and a custom [PrivateRoute](https://github.com/abbvie-internal/unity-vite/blob/89015c6767f748cc8d27e174bc445590806dd80e/src/routes/PrivateRoute.tsx)
>   - Will automatically attempt authentication with `gprd-auth.abbvienet.com` and add `abbvieLoginTokenKey` cookie.
>   - If that fails, fallback to manual [Login Page](https://github.com/abbvie-internal/unity-vite/blob/89015c6767f748cc8d27e174bc445590806dd80e/src/pages/Login/Login.tsx)
>   - [User Attestation](https://github.com/abbvie-internal/unity-vite/blob/89015c6767f748cc8d27e174bc445590806dd80e/src/components/UserAttestationModal/index.tsx#L15) will add `abbvieUserAttestationKey` to local storage
>
> - **[React Router](https://reactrouter.com/en/main)**
>
>   - Check out the use of the custom [PrivateRoute](https://github.com/abbvie-internal/unity-vite/blob/89015c6767f748cc8d27e174bc445590806dd80e/src/routes/PrivateRoute.tsx) component to protect routes. It will attempt automatic log in, or fallback to Login page (if automatic auth fails)
>
> - **and more..** [Vite](https://vitejs.dev/), [clsx](https://www.npmjs.com/package/clsx), [SCSS Modules + Sass](https://vitejs.dev/guide/features#css-modules), Prettier, ESLint v9, etc.

To request bugfixes, enhancements, or feature requests please message us in the [Unity Teams channel](https://teams.microsoft.com/l/channel/19%3add7528a7288c4af884cc22f4499fc7e4%40thread.tacv2/Development?groupId=21566242-64fd-40f2-8f8d-4a899cba19f4&tenantId=6f4d03de-9551-4ba1-a25b-dce6f5ab7ace) or open an issue on the [unity-vite github](https://github.com/abbvie-internal/unity-vite/issues)

## Setup Instructions

> Use the github interface to [Create a Repository from the unity-vite template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template).
>
> ### What you need to do after creating repo from this template
>
> 1.  Change project name (root directory name, package.json, etc) to use the name of your application.
> 2.  Change _auth.service.ts_ key names to be project specific. Remove 'abbvie' and use your projects name so those tokens in localStorage and cookies are always unique. (ie. abbvieLoginTokenKey -> `<project>`LoginTokenKey) The update should be made in the following variables:
>
>     - AUTH_TOKEN_COOKIE_KEY
>     - USER_ATTESTATION_LOCALSTORAGE_KEY
>
> Please reach out to the [Unity Teams channel](https://teams.microsoft.com/l/channel/19%3add7528a7288c4af884cc22f4499fc7e4%40thread.tacv2/Development?groupId=21566242-64fd-40f2-8f8d-4a899cba19f4&tenantId=6f4d03de-9551-4ba1-a25b-dce6f5ab7ace) for support.
>
> 3. It's recommended that you install the [axe Accessibility Linter](https://marketplace.visualstudio.com/items?itemName=deque-systems.vscode-axe-linter) to catch a11y bugs earlier in the development cycle. Also you'll find some recommended VSCode extensions in the .vscode/extensions.json file, and VSCode should notify you about these recommendations.
>
> NOTE: You no longer need to use a Personal Access Token (PAT) to authenticate to the Unity npm registry. It is now set up to use the shareable readonly token.

## Why Vite?

> We decided to use the [Vite](https://vitejs.dev/) build tool because it aims to provide a faster and leaner development experience for modern web projects over alternative solutions. See more on [Why Vite?](https://vitejs.dev/guide/why.html).
>
> 2 major parts of Vite:
>
> - A dev server that provides [rich feature enhancements](https://vitejs.dev/guide/features.html) over native ES modules, for example extremely fast [Hot Module Replacement (HMR)](https://vitejs.dev/guide/features.html#hot-module-replacement).
> - A build command that bundles your code with [Rollup](https://rollupjs.org/), pre-configured to output highly optimized static assets for production.
