---
{ 'home': True, 'prev': False, 'next': False }
---

# Accessibility

SuperDoc is built with accessibility in mind, providing comprehensive support for screen readers and keyboard navigation.

### High contrast mode

You can enable/disable high contrast mode at any point after the editor is ready by calling the `setHighContrastMode()` function on the `superdoc` instance.

```js
const config = {
  // ...
  onReady: (event) => {
    // Initialize high contrast mode
    event.superdoc.setHighContrastMode(true);
  },
  // ...
};

const editor = new SuperDoc(config);
// Or at any point later (if the editor is ready)
editor.setHighContrastMode(true);
```

### ARIA Attributes
In order to give screen readers the contextual information about elements we use [ARIA](https://www.w3.org/TR/wai-aria/) attributes for Toolbar and Editor components.

- **role=application** - Main app container.
- **role=presentation** - Editor wrapper.
- **role=document** - Prosemirror editor.
- **role=textarea** - Use it for header/footer editors.
- **role=group** - Grouped item's wrapper.
- **role=toolbar** - Super Toolbar component.

We use role=button for toolbar item on desktop and role=menuitem for overflow items. Meanwhile, we use role=menu for dropdown items (including overflow button).

- **role=separator** - Toolbar separator
- **aria-label** - used to provide information about the current focused item.
- **aria-description** - used to provide additional information about the current selected item.

We use semantic markup for elements like tables which are accessible by default.

### Keyboard navigation

We allow users to navigate in SuperDoc using the keyboard, benefiting users with motor disabilities, those who prefer keyboard navigation, and others relying on assistive technologies. Once you open the page, you can `Tab` through until you reach the toolbar. The toolbar is separated in 3 groups and you can navigate between them by using `Tab` as well. 

- When you're focused on a group, you can navigate using arrow keys.
- To select a toolbar item, press `Enter`. Depending on the item, it will either toggle it or open the dropdown in case there's an extra required action. For example, if you hit `Enter` on the "Bold" item, it will simply toggle it. But if it's a color picker, it will open the dropdown so you can select the color.
- If the selected item has a dropdown, you can navigate inside the dropdown also using arrow keys.
- To get back to the editor, you can simply tab through until the end of the toolbar and the next item will be the editor.
- To navigate back to the toolbar, you can use the following shortcut:
  - Windows: `Ctrl` + `Shift` + `Alt` + `M`
  - MacOS: `Cmd` + `Shift` + `Option` + `M`
