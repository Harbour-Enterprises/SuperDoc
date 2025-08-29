export default {
    include: [
        {
            name: "cdn-example",
            command: 'cd ../cdn-example && npm run start', // port 8080
        },
        {
            name: "external-plugin-dynamic-content",
            command: 'cd ../external-plugin-dynamic-content && npm install && npm run dev', // port 5173
        },
        {
            name: "next-js-ssr",
            command: 'cd ../next-js-ssr && npm install && npm run dev', // port 3000
        },
        {
            name: "programmatic-text-selection",
            command: 'cd ../programmatic-text-selection && npm install && npm run dev', // port 5173
        },
        {
            name: "react-example",
            command: 'cd ../react-example && npm install && npm run dev', // port 5173
        },
        {
            name: "typescript-example",
            command: 'cd ../typescript-example && npm install && npm run dev', // port 5173
        },
        {
            name: "vanilla-example",
            command: 'cd ../vanilla-example && npm install && npm run dev', // port 5173
        },
        {
            name: "vue-custom-mark",
            command: 'cd ../vue-custom-mark && npm install && npm run dev', // port 5173
        },
        {
            name: "vue-example",
            command: 'cd ../vue-example && npm install && npm run dev', // port 5173
        },
        {
            name: "vue-fields-example",
            command: 'cd ../vue-fields-example && npm install && npm run dev', // port 5173
        },
        {
            name: "vue-linked-editor-sections",
            command: 'cd ../vue-linked-editor-sections && npm install && npm run dev', // port 5173
        },
    ]
}