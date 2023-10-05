/*
    Copyright (C) 2016  Borsato Ivano

    The JavaScript code in this page is free software: you can
    redistribute it and/or modify it under the terms of the GNU
    General Public License (GNU GPL) as published by the Free Software
    Foundation, either version 3 of the License, or (at your option)
    any later version.  The code is distributed WITHOUT ANY WARRANTY;
    without even the implied warranty of MERCHANTABILITY or FITNESS
    FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
*/

/*
This file has been copied from EasyScreenCast/utilnotify.js [1], with minimal
edits, primary deletions. Edits include removal of settings.

[1]: https://github.com/EasyScreenCast/EasyScreenCast/blob/d94dfdd/utilnotify.js
*/

'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/messageTray.js
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import * as Lib from './convenience.js';

/**
 * @type {NotifyManager}
 */
export const NotifyManager = GObject.registerClass({
    GTypeName: 'ForceQuit_NotifyManager',
}, class NotifyManager extends GObject.Object {
    /**
     * Create a notify manager
     */
    _init() {
        Lib.TalkativeLog('-°-init notify manager');
    }

    /**
     * create notify
     *
     * @param {string} msg the title
     * @param {Gio.FileIcon} icon the icon
     * @param {boolean} sound whether to play a sound
     * @returns {MessageTray.Notification}
     */
    createNotify(msg, icon, sound) {
        Lib.TalkativeLog(`-°-create notify :${msg}`);
        let source = new MessageTray.SystemNotificationSource();
        let notify = new MessageTray.Notification(source, msg, null, {
            gicon: icon,
        });

        notify.setTransient(false);
        notify.setResident(true);

        Main.messageTray.add(source);
        source.showNotification(notify);

        if (sound) {
            notify.playSound();
        }

        return notify;
    }

    /**
     * update notify
     *
     * @param {MessageTray.Notification} notify the already existing notification to update
     * @param {string} msg the title
     * @param {Gio.FileIcon} icon the icon
     * @param {boolean} sound whether to play a sound
     */
    updateNotify(notify, msg, icon, sound) {
        Lib.TalkativeLog('-°-update notify');

        notify.update(msg, null, {
            gicon: icon,
        });

        if (sound) {
            notify.playSound();
        }
    }

    /**
     * create alert
     *
     * @param {string} msg the message
     */
    createAlert(msg) {
        Lib.TalkativeLog(`-°-show alert tweener : ${msg}`);
        if (true) { // can be changed to a setting in future versions
            let monitor = Main.layoutManager.focusMonitor;

            let text = new St.Label({
                style_class: 'alert-msg',
                text: msg,
            });
            text.opacity = 255;
            Main.uiGroup.add_actor(text);

            text.set_position(
                Math.floor(monitor.width / 2 - text.width / 2),
                Math.floor(monitor.height / 2 - text.height / 2)
            );

            text.ease({
                opacity: 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                duration: 4000,
                onComplete: () => {
                    Main.uiGroup.remove_actor(text);
                    text = null;
                },
            });
        }
    }
});
