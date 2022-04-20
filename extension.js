const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Meta = ExtensionUtils.getCurrentExtension();

const ButtonName = "ForceQuitButton";

let button;

const Selection = Meta.imports.selection;


let ForceQuitButton = GObject.registerClass(
class ForceQuitButton extends PanelMenu.Button {
    _init() {
        super._init(0.0, ButtonName)

        let icon = new St.Icon({
            // icon_name: 'window-close',
            gicon: this._getCustIcon("force-quit-symbolic"),
            style_class: "system-status-icon",
        });
        this.add_child(icon);

        this.connect("button-press-event", () => {
            new Selection.SelectionWindow();
        });
    }

    _getCustIcon(icon_name) {
        let gicon = Gio.icon_new_for_string(
            Meta.dir.get_child("icons").get_path() + "/" + icon_name + ".svg"
        );
        return gicon;
    }
});

function enable() {
    button = new ForceQuitButton();

    // Uncomment following line to get it to the left panel besides AppMenu
    // Main.panel.addToStatusArea(ButtonName, button, 3, 'left');
    Main.panel.addToStatusArea(ButtonName, button);
}

function disable() {
    button.destroy();
    button = null;
}
