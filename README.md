force-quit
==========

Gnome Shell Extension to add Force Quit Button

About
=====

Adds a force quit button.

Click the toolbar button, then choose the window you want to force quit.

On accidental click, right click anywhere or press <kbd>Esc</kbd> to abort the kill.


Installation
============

Install it from the [extensions site](https://extensions.gnome.org/extension/770/force-quit/)


Developing
==========

Lint with

```shell
npm install
npm run lint
```

Pack into `fq@megh.shell-extension.zip` with

```shell
make pack
```

It wraps `gnome-extensions pack` from gnome-shell, so that and gettext need to
be installed; it builds the bundle exactly the way the extension site expects.
The CI workflow runs the same target before shexli.
