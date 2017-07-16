const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;

const GLib = imports.gi.GLib;

let button;

function init() {
    Gtk.IconTheme.get_default().append_search_path(Meta.dir.get_child('icons').get_path());

    button = new St.Bin({ name: 'force-quit',
                          style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
    let icon = new St.Icon({ icon_name: 'force-quit-symbolic',
                             style_class: 'system-status-icon' });

    button.set_child(icon);
    button.connect('button-release-event',   function () {
	GLib.spawn_command_line_async('xkill');
        });
}

function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 1);
}

function disable() {
    Main.panel._rightBox.remove_child(button);
}
