'use strict';

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import * as Selection from './selection.js';

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

        // Uncomment following line to get it to the left panel besides AppMenu
        // Main.panel.addToStatusArea(ButtonName, this._button, 3, 'left');
        Main.panel.addToStatusArea(ButtonName, this._button);
    }

    disable() {
        if (this._button !== null) {
            this._button.destroy();
            this._button = null;
        }
    }
}

