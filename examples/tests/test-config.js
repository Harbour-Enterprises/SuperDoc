export default {
    include: [
        // Getting Started
        {
            name: "cdn",
            command: 'cd ../getting-started/cdn && npm run start',
        },
        {
            name: "react",
            command: 'cd ../getting-started/react && npm install && npm run dev',
        },
        {
            name: "typescript",
            command: 'cd ../getting-started/typescript && npm install && npm run dev',
        },
        {
            name: "vanilla",
            command: 'cd ../getting-started/vanilla && npm install && npm run dev',
        },
        {
            name: "vue",
            command: 'cd ../getting-started/vue && npm install && npm run dev',
        },
        // Customization
        {
            name: "custom-mark",
            command: 'cd ../customization/custom-mark && npm install && npm run dev',
        },
        {
            name: "dynamic-content",
            command: 'cd ../customization/dynamic-content && npm install && npm run dev',
        },
        // Integrations
        {
            name: "nextjs-ssr",
            command: 'cd ../integrations/nextjs-ssr && npm install && npm run dev',
        },
        // Advanced
        {
            name: "docx-from-html",
            command: 'cd ../advanced/docx-from-html && npm install && npm run dev',
        },
        {
            name: "fields",
            command: 'cd ../advanced/fields && npm install && npm run dev',
        },
        {
            name: "linked-sections",
            command: 'cd ../advanced/linked-sections && npm install && npm run dev',
        },
        {
            name: "text-selection",
            command: 'cd ../advanced/text-selection && npm install && npm run dev',
        },
    ]
}