import{_ as s,c as a,o as e,ag as p}from"./chunks/framework.BZemHgQ6.js";const h=JSON.parse('{"title":"Modules","description":"","frontmatter":{"home":false,"prev":false,"next":false},"headers":[],"relativePath":"modules/index.md","filePath":"modules/index.md"}'),l={name:"modules/index.md"};function t(o,n,i,c,d,m){return e(),a("div",null,n[0]||(n[0]=[p(`<h1 id="modules" tabindex="-1">Modules <a class="header-anchor" href="#modules" aria-label="Permalink to &quot;Modules&quot;">​</a></h1><p>SuperDoc can be extended via modules. There are several modules available currently.</p><p>You can add a module by passing in a config for it in the main SuperDoc config:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const config {</span></span>
<span class="line"><span>  ...mySuperDocConfig, // Your config</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // Modules - optional key</span></span>
<span class="line"><span>  modules: {</span></span>
<span class="line"><span>    // Add module config here</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="comments" tabindex="-1">Comments <a class="header-anchor" href="#comments" aria-label="Permalink to &quot;Comments&quot;">​</a></h2><p>The comments module can be added by adding the comments config to the modules.</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>const comments = {</span></span>
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
<span class="line"><span>};</span></span></code></pre></div>`,15)]))}const u=s(l,[["render",t]]);export{h as __pageData,u as default};
