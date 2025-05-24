import{_ as s,c as n,o as e,ag as p}from"./chunks/framework.BZemHgQ6.js";const u=JSON.parse('{"title":"Modules","description":"","frontmatter":{"home":false,"prev":false,"next":false},"headers":[],"relativePath":"modules/index.md","filePath":"modules/index.md"}'),t={name:"modules/index.md"};function i(l,a,o,c,d,r){return e(),n("div",null,a[0]||(a[0]=[p(`<h1 id="modules" tabindex="-1">Modules <a class="header-anchor" href="#modules" aria-label="Permalink to &quot;Modules&quot;">​</a></h1><p>SuperDoc can be extended via modules. There are several modules available currently.</p><p>You can add a module by passing in a config for it in the main SuperDoc config:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const config {</span></span>
<span class="line"><span>  ...mySuperDocConfig, // Your config</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // Modules - optional key</span></span>
<span class="line"><span>  modules: {</span></span>
<span class="line"><span>    // Add module config here</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h1 id="search" tabindex="-1">Search <a class="header-anchor" href="#search" aria-label="Permalink to &quot;Search&quot;">​</a></h1><p>SuperDoc 0.11 adds a new .docx search feature.</p><h3 id="usage" tabindex="-1">Usage <a class="header-anchor" href="#usage" aria-label="Permalink to &quot;Usage&quot;">​</a></h3><p>Search works the same if you&#39;re using SuperDoc or the Editor instance directly.</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const superdoc = new SuperDoc({ ...myConfig });</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// Text search</span></span>
<span class="line"><span>const results = superdoc.search(&#39;My text search&#39;); // An array of results</span></span>
<span class="line"><span>// Or editor.commands.search(&#39;My text search&#39;);</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// results = [</span></span>
<span class="line"><span>//      { from: 12, to: 24, text: &#39;My text search&#39; },</span></span>
<span class="line"><span>//      …</span></span>
<span class="line"><span>//   ]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// Regex</span></span>
<span class="line"><span>const regexResults = superdoc.search(/\\b\\w+ng\\b/gi);</span></span>
<span class="line"><span>// Or editor.commands.search(&#39;My text search&#39;);</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// results = [</span></span>
<span class="line"><span>//      { from:  5, to: 13, text: &#39;painting&#39; },</span></span>
<span class="line"><span>//      { from: 18, to: 28, text: &#39;preparing&#39; },</span></span>
<span class="line"><span>//      …</span></span>
<span class="line"><span>//   ]</span></span></code></pre></div><h3 id="commands" tabindex="-1">Commands <a class="header-anchor" href="#commands" aria-label="Permalink to &quot;Commands&quot;">​</a></h3><p>superdoc.search(...) // Or editor.commands.search(...)</p><p>superdoc.goToSearchResult(match); // Pass in a match from the result of search() // Or editor.commands.goToSearchResult(match);</p><h3 id="customization" tabindex="-1">Customization <a class="header-anchor" href="#customization" aria-label="Permalink to &quot;Customization&quot;">​</a></h3><p>You can customize the color of the highlights from these styles:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>.ProseMirror-search-match</span></span>
<span class="line"><span>.ProseMirror-active-search-match</span></span></code></pre></div><h1 id="comments" tabindex="-1">Comments <a class="header-anchor" href="#comments" aria-label="Permalink to &quot;Comments&quot;">​</a></h1><p>The comments module can be added by adding the comments config to the modules.</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const comments = {</span></span>
<span class="line"><span>  </span></span>
<span class="line"><span>  // Defaults to false. Set to true if you only want to show comments</span></span>
<span class="line"><span>  readOnly: false, </span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // Defaults to true. Set to false if you do not want to allow comment resolution.</span></span>
<span class="line"><span>  allowResolve: true,</span></span>
<span class="line"><span></span></span>
<span class="line"><span>};</span></span></code></pre></div><h2 id="comments-example" tabindex="-1">Comments example <a class="header-anchor" href="#comments-example" aria-label="Permalink to &quot;Comments example&quot;">​</a></h2><p>You can run the SuperDoc Dev environment to see a working example of comments. From the main SuperDoc folder:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>npm install &amp;&amp; npm run dev</span></span></code></pre></div><p>This will start a simple SuperDoc dev playground. Try adding some comments by adding text / selecting it / adding comments!</p><h2 id="comments-hooks" tabindex="-1">Comments hooks <a class="header-anchor" href="#comments-hooks" aria-label="Permalink to &quot;Comments hooks&quot;">​</a></h2><h3 id="hook-oncommentsupdate" tabindex="-1">Hook: onCommentsUpdate <a class="header-anchor" href="#hook-oncommentsupdate" aria-label="Permalink to &quot;Hook: onCommentsUpdate&quot;">​</a></h3><p>The onCommentsUpdate is fired whenever there is a change to the list of comments (new, update, edit, delete and so on). You can handle these events by passing in a handler into the main SuperDoc config</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const config = {</span></span>
<span class="line"><span>  ...mySuperDocConfig, // Your config</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // Handle comment updates</span></span>
<span class="line"><span>  onCommentsUpdate: myCommentsUpdateHandler,</span></span>
<span class="line"><span></span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// Your handler</span></span>
<span class="line"><span>const myCommentsUpdateHandler = ({ type, comment meta }) =&gt; {</span></span>
<span class="line"><span>  switch (type) {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // When a user has highlighted text and clicked the add comment button,</span></span>
<span class="line"><span>    // but has not actually created the comment yet</span></span>
<span class="line"><span>    case &#39;pending&#39;:</span></span>
<span class="line"><span>      break;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // On new comment created</span></span>
<span class="line"><span>    case &#39;add&#39;:</span></span>
<span class="line"><span>      break;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // On comment deleted</span></span>
<span class="line"><span>    case &#39;delete&#39;:</span></span>
<span class="line"><span>      break;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // On comment updated (ie: via edit)</span></span>
<span class="line"><span>    case &#39;update&#39;:</span></span>
<span class="line"><span>      break;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // On comment deleted</span></span>
<span class="line"><span>    case &#39;deleted&#39;:</span></span>
<span class="line"><span>      break;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // On comment resolved</span></span>
<span class="line"><span>    case &#39;resolved&#39;:</span></span>
<span class="line"><span>      break;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  };</span></span>
<span class="line"><span>};</span></span></code></pre></div><h2 id="superdoc-toolbar" tabindex="-1">SuperDoc Toolbar <a class="header-anchor" href="#superdoc-toolbar" aria-label="Permalink to &quot;SuperDoc Toolbar {#superdoc-toolbar}&quot;">​</a></h2><p>The <strong>SuperDoc</strong> will render into a DOM element of your choosing, allowing for full control of placement and styling over the toolbar. By default, we render a toolbar with all available buttons. You can customize this further by adding a <code>toolbar</code> object to the <code>modules</code> config in the <strong>SuperDoc configuration</strong> object.</p><h2 id="customization-1" tabindex="-1">Customization <a class="header-anchor" href="#customization-1" aria-label="Permalink to &quot;Customization&quot;">​</a></h2><p>You can customize the toolbar configuration via the <strong>SuperDoc config</strong> object.</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const config = {</span></span>
<span class="line"><span>  // ... your SuperDoc config</span></span>
<span class="line"><span>  modules: {</span></span>
<span class="line"><span>    toolbar: {</span></span>
<span class="line"><span>      selector: &#39;superdoc-toolbar&#39;, // The ID of the DOM element you want to render the toolbar into</span></span>
<span class="line"><span></span></span>
<span class="line"><span>      toolbarGroups: [&#39;left&#39;, &#39;center&#39;, &#39;right&#39;],</span></span>
<span class="line"><span></span></span>
<span class="line"><span>      // Optional: Specify what toolbar buttons to render. Overrides toolbarGroups.</span></span>
<span class="line"><span>      groups: {</span></span>
<span class="line"><span>        center: [&#39;bold&#39;, &#39;italic&#39;],</span></span>
<span class="line"><span>      },</span></span>
<span class="line"><span></span></span>
<span class="line"><span>      // Optional: Instead of specifying all the buttons you want, specify which ones to exclude</span></span>
<span class="line"><span>      excludeItems: [&#39;bold&#39;, italic&#39;], // Will exclude these from the standard toolbar</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="default-toolbar-buttons" tabindex="-1">Default toolbar buttons <a class="header-anchor" href="#default-toolbar-buttons" aria-label="Permalink to &quot;Default toolbar buttons&quot;">​</a></h3><p>See all buttons in defaultItems.js</p><h1 id="fields" tabindex="-1">Fields <a class="header-anchor" href="#fields" aria-label="Permalink to &quot;Fields&quot;">​</a></h1><p>SuperDoc by default has the <strong>fields</strong> extension enabled. You can learn more about the <a href="https://github.com/Harbour-Enterprises/SuperDoc/blob/main/packages/super-editor/src/extensions/field-annotation/field-annotation.js" target="_blank" rel="noreferrer"><strong>Field Annotation</strong> node here</a></p><p>Fields can be used when placeholder / variable content is needed inside the document. They can contain various types of data:</p><ul><li>Plain text</li><li>HTML rich text</li><li>Images</li><li>Links</li><li>Checkboxes</li></ul><h2 id="commands-1" tabindex="-1">Commands <a class="header-anchor" href="#commands-1" aria-label="Permalink to &quot;Commands&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>// Add a field annotation at the specified position</span></span>
<span class="line"><span>// editorFocus = true will re-focus the editor after the command, in cases where it is not in focus (ie: drag and drop)</span></span>
<span class="line"><span>addFieldAnnotation(pos, attrs = {}, editorFocus = false)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// Add a field annotation at the current selection</span></span>
<span class="line"><span>// editorFocus = true will re-focus the editor after the command, in cases where it is not in focus (ie: drag and drop)</span></span>
<span class="line"><span>addFieldAnnotationAtSelection(attrs = {}, editorFocus = false)</span></span></code></pre></div><h2 id="field-schema" tabindex="-1">Field schema <a class="header-anchor" href="#field-schema" aria-label="Permalink to &quot;Field schema&quot;">​</a></h2><p>To create a field, we just pass in a JSON config to the addFieldAnnotationAtSelection command</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const fieldTypes = [&#39;text&#39;, &#39;image&#39;, &#39;signature&#39;, &#39;checkbox&#39;, &#39;html&#39;, &#39;link&#39;]</span></span>
<span class="line"><span>const myField = {</span></span>
<span class="line"><span>  displayLabel: &#39;My placeholder field&#39;,     // Placeholder text</span></span>
<span class="line"><span>  fieldId: MY_FIELD_ID,                     // The ID you&#39;d like for this field</span></span>
<span class="line"><span>  type: &#39;html&#39;,                             // from fieldTypes</span></span>
<span class="line"><span>  fieldColor: &#39;#000099&#39;,                    // Styling</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// Add the field to the editor</span></span>
<span class="line"><span>addFieldAnnotationAtSelection(myField)</span></span></code></pre></div><h2 id="drag-and-drop" tabindex="-1">Drag-and-drop <a class="header-anchor" href="#drag-and-drop" aria-label="Permalink to &quot;Drag-and-drop&quot;">​</a></h2><p>If you create a drag-and-drop system (<a href="https://github.com/Harbour-Enterprises/SuperDoc/tree/main/examples/vue-fields-example" target="_blank" rel="noreferrer">See this example</a>) for fields, you should listen for the Editor event &#39;fieldAnnotationDropped&#39;.</p><p>Example:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span> superdoc.activeEditor.on(&#39;fieldAnnotationDropped&#39;, ({ sourceField }) =&gt; {</span></span>
<span class="line"><span>    superdoc.activeEditor.commands.addFieldAnnotationAtSelection(sourceField);</span></span>
<span class="line"><span>  });</span></span></code></pre></div><h2 id="fields-docx-export" tabindex="-1">Fields docx export <a class="header-anchor" href="#fields-docx-export" aria-label="Permalink to &quot;Fields docx export&quot;">​</a></h2><p>SuperDoc supports full export and re-import of fields. By default, SuperDoc will not re-import document fields and will convert them to mustache style templates only.</p><p>To enable fields import simply add the below to your config when instantiating <code>new SuperDoc</code></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>annotations: true</span></span></code></pre></div><h1 id="annotate" tabindex="-1">Annotate <a class="header-anchor" href="#annotate" aria-label="Permalink to &quot;Annotate&quot;">​</a></h1><p><strong>available in SuperDoc &gt; 0.11.35</strong></p><p>SuperDoc&#39;s editor instance (<code>superdoc.activeEditor</code>) exposes the <code>annotate()</code> function, allowing you to insert values into the Field nodes, either for preview or final document export.</p><p>This command is fully undo/redo friendly.</p><h3 id="usage-1" tabindex="-1">Usage <a class="header-anchor" href="#usage-1" aria-label="Permalink to &quot;Usage&quot;">​</a></h3><div class="language-ts vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">type</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> FieldValue</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  input_id</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> string</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">                // The ID of the input field being annotated</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  input_value</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> string</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             // The value to insert into that field</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">editor</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">annotate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  fieldValues</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> FieldValue</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[],      </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// Array of field annotations to insert or update</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  hiddenFieldIds</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">?:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[],      </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// Optional array of field IDs to hide from the annotated view</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> void</span></span></code></pre></div><h2 id="example-use" tabindex="-1">Example use <a class="header-anchor" href="#example-use" aria-label="Permalink to &quot;Example use&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>editor.annotate(</span></span>
<span class="line"><span>  [</span></span>
<span class="line"><span>    {</span></span>
<span class="line"><span>      input_id: &quot;name-123&quot;,</span></span>
<span class="line"><span>      input_value: &quot;Alice Smith&quot;</span></span>
<span class="line"><span>    },</span></span>
<span class="line"><span>    {</span></span>
<span class="line"><span>      input_id: &quot;image-field-456&quot;,</span></span>
<span class="line"><span>      input_value: &quot;http://some-image-url.jpg&quot; // Images should be Object URLs (URL.createObjectURL) or base64</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  ],</span></span>
<span class="line"><span>  [&quot;obsolete-field-id&quot;]</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// If you want to undo the annotation</span></span>
<span class="line"><span>editor.commands.undo()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// You can also redo it</span></span>
<span class="line"><span>editor.commands.redo()</span></span></code></pre></div><h2 id="exporting-after-annotate" tabindex="-1">Exporting after annotate() <a class="header-anchor" href="#exporting-after-annotate" aria-label="Permalink to &quot;Exporting after annotate()&quot;">​</a></h2><p>If using annotate() to do field value replacement, and then exporting the <code>.docx</code> document via <code>superdoc.export()</code> the <code>.docx</code> file will be exported with the fields still in the document (rather than replacing the fields with their expected values, ie: for final document export).</p><p>You can pass in the <code>isFinalDoc</code> flag to export() in order to actually replace fields with their values, creating a seamless final document that contains no field objects.</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Example:</span></span>
<span class="line"><span>superdoc.export({ isFinalDoc: true })</span></span></code></pre></div>`,62)]))}const m=s(t,[["render",i]]);export{u as __pageData,m as default};
