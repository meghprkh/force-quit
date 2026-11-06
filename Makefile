# Packs the extension into fq@megh.shell-extension.zip, the archive
# `gnome-extensions install` and extensions.gnome.org consume.
#
# Uses gnome-shell's own `gnome-extensions pack`, so the bundle is built the
# way EGO expects: extension.js, prefs.js, stylesheet.css, metadata.json, the
# schema and the compiled translations are picked up automatically, and only
# the files it does not know about are listed below.

UUID = fq@megh
ZIP = $(UUID).shell-extension.zip

.PHONY: all pack clean

all: pack

pack:
	gnome-extensions pack -f --podir=po \
		--extra-source=icons \
		--extra-source=convenience.js \
		--extra-source=selection.js \
		--extra-source=utilnotify.js \
		.

clean:
	rm -f $(ZIP)
