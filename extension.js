'use strict';

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import * as Selection from './selection.js';

const DBusInterface = `
<node>
  <interface name="org.gnome.Shell.Extensions.ForceQuit">
    <method name="SelectWindow"/>
  </interface>
</node>`;

const ButtonName = "ForceQuitButton";

let ForceQuitButton = GObject.registerClass(
class ForceQuitButton extends PanelMenu.Button {
    _init(extensionPath) {
        super._init(0.0, ButtonName)

        this._extensionPath = extensionPath;

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
            `${this._extensionPath}/icons/${icon_name}.svg`
        );
        return gicon;
    }
});

export default class ForceQuitExtension extends Extension {
    enable() {
        this._button = new ForceQuitButton(this.path);

        // Apply initial state and listen for settings changes
        this._settings = this.getSettings();
        this._updateButtonVisibility();
        this._settingsChangedId = this._settings.connect('changed::hide-button',
            () => this._updateButtonVisibility()
        );
  
        // Position the button on the top panel
        if (this._settings.get_string('button-position') == 'left')
            Main.panel.addToStatusArea(ButtonName, this._button, 3, 'left');
        else
            Main.panel.addToStatusArea(ButtonName, this._button);

        // Redraw button on position change
        this._settings.connect('changed::button-position', () => {
            this.disable();
            this.enable();
        });

        // Export DBus interface
        this._dbus = Gio.DBusExportedObject.wrapJSObject(DBusInterface, this);
        this._dbus.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/ForceQuit');
    }

    disable() {
        if (this._settingsChangedId) {
             this._settings.disconnect(this._settingsChangedId);
             this._settingsChangedId = null;
        }
        if (this._dbus) {
            this._dbus.unexport();
            this._dbus = null;
        }
        if (this._button !== null) {
            this._button.destroy();
            this._button = null;
        }
    }

    SelectWindow() {
        new Selection.SelectionWindow();
    }

    _updateButtonVisibility() {
        if (this._settings.get_boolean('hide-button'))
            this._button.hide();
        else
            this._button.show();
    }
}

