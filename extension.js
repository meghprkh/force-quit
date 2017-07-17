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
    let icon = new St.Icon({
                    // icon_name: 'window-close',
                    icon_name: 'force-quit-symbolic',
                    style_class: 'system-status-icon' });

    button.set_child(icon);
    button.connect('button-release-event', function () {
        GLib.spawn_command_line_async('xkill');
    });
}

function enable() {
    // The default location was changed to right panel instead of left,
    // Uncomment the following lines and comment the last line to switch back
    // to the old behaviour
    // let appMenu=Main.panel.statusArea.appMenu.actor.get_parent();
    // Main.panel._leftBox.insert_child_above(button, appMenu);
    // change this to below if you want to add it before the appmenu button
    Main.panel._rightBox.insert_child_at_index(button, 1);
}

function disable() {
    // The default location was changed to right panel instead of left,
    // Uncomment the following lines and comment the last line to switch back
    // to the old behaviour
    // Main.panel._leftBox.remove_child(button);
    Main.panel._rightBox.remove_child(button);
}
