/*
The MIT License (MIT)
Copyright (c) 2013 otto.allmendinger@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
This file has been copied from EasyScreenCast/selection.js [1], with minimal
edits, primary deletions. Edits include right-click aborting, force-quitting,
and deletion of SelectionArea/SelectionMonitor.

[1]: https://github.com/EasyScreenCast/EasyScreenCast/blob/master/selection.js
*/

const Lang = imports.lang;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Layout = imports.ui.layout;

const Main = imports.ui.main;

const Gettext = imports.gettext.domain(
    "fq@megh"
);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const UtilNotify = Me.imports.utilnotify;
const display_api = Me.imports.display_module.display_api;

/**
 * @type {Lang.Class}
 */
const Capture = new Lang.Class({
    Name: "ForceQuit.Capture",

    /**
     * @private
     */
    _init: function () {
        Lib.TalkativeLog("-£-capture selection init");

        this._mouseDown = false;

        this.monitor = Main.layoutManager.focusMonitor;

        this._areaSelection = new St.Widget({
            name: "area-selection",
            style_class: "area-selection",
            visible: "true",
            reactive: "true",
            x: -10,
            y: -10,
        });

        Main.uiGroup.add_actor(this._areaSelection);

        this._areaResolution = new St.Label({
            style_class: "area-resolution",
            text: "",
        });
        this._areaResolution.opacity = 255;
        this._areaResolution.set_position(0, 0);

        Main.uiGroup.add_actor(this._areaResolution);

        if (Main.pushModal(this._areaSelection)) {
            this._signalCapturedEvent = global.stage.connect(
                "captured-event",
                this._onCaptureEvent.bind(this)
            );

            this._setCaptureCursor();
        } else {
            Lib.TalkativeLog("-£-Main.pushModal() === false");
        }

        Main.sessionMode.connect("updated", () => this._updateDraw());
    },

    /**
     * @private
     */
    _updateDraw: function () {
        Lib.TalkativeLog("-£-update draw capture");
    },

    /**
     * @private
     */
    _setDefaultCursor: function () {
        display_api.set_cursor(Meta.Cursor.DEFAULT);
    },

    /**
     * @private
     */
    _setCaptureCursor: function () {
        display_api.set_cursor(Meta.Cursor.CROSSHAIR);
    },

    /**
     * @param actor
     * @param event
     * @private
     */
    _onCaptureEvent: function (actor, event) {
        if (event.type() === Clutter.EventType.KEY_PRESS) {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                this._stop();
            }
        }

        this.emit("captured-event", event);
    },

    /**
     * @param {Number} x
     * @param {Number} y
     * @param {Number} w
     * @param {Number} h
     * @param {boolean} showResolution
     */
    drawSelection: function ({ x, y, w, h }, showResolution) {
        this._areaSelection.set_position(x, y);
        this._areaSelection.set_size(w, h);

        if (showResolution && w > 100 && h > 50) {
            this._areaResolution.set_text(w + " X " + h);
            this._areaResolution.set_position(
                x + (w / 2 - this._areaResolution.width / 2),
                y + (h / 2 - this._areaResolution.height / 2)
            );
        } else {
            this._areaResolution.set_position(0, 0);
            this._areaResolution.set_text("");
        }
    },

    /**
     * Clear drawing selection
     */
    clearSelection: function () {
        this.drawSelection(
            {
                x: -10,
                y: -10,
                w: 0,
                h: 0,
            },
            false
        );
    },

    /**
     * @private
     */
    _stop: function () {
        Lib.TalkativeLog("-£-capture selection stop");

        global.stage.disconnect(this._signalCapturedEvent);
        this._setDefaultCursor();
        Main.uiGroup.remove_actor(this._areaSelection);
        Main.popModal(this._areaSelection);
        Main.uiGroup.remove_actor(this._areaResolution);
        this._areaSelection.destroy();
        this.emit("stop");
        this.disconnectAll();
    },
});

Signals.addSignalMethods(Capture.prototype);


var SelectionWindow = new Lang.Class({
    Name: "ForceQuit.SelectionWindow",

    /**
     * @private
     */
    _init: function () {
        Lib.TalkativeLog("-£-window selection init");

        this._windows = global.get_window_actors();
        this._capture = new Capture();
        this._capture.connect("captured-event", this._onEvent.bind(this));
        this._capture.connect("stop", this.emit.bind(this, "stop"));

        let CtrlNotify = new UtilNotify.NotifyManager();
        CtrlNotify.createAlert(
            _("Select a window for killing or press right-click/[ESC] to abort")
        );
    },

    /**
     * @param capture
     * @param event
     * @private
     */
    _onEvent: function (capture, event) {
        let type = event.type();
        let [x, y, mask] = global.get_pointer();

        this._selectedWindow = selectWindow(this._windows, x, y);

        if (this._selectedWindow) {
            this._highlightWindow(this._selectedWindow);
        } else {
            this._clearHighlight();
        }

        if (type === Clutter.EventType.BUTTON_PRESS) {
            if (event.get_button() === Clutter.BUTTON_SECONDARY) {
                this._capture._stop();
            } else if (this._selectedWindow) {
                this._capture._stop();

                this._selectedWindow.get_meta_window().kill()
            }
        }
    },

    /**
     * @param win
     * @private
     */
    _highlightWindow: function (win) {
        let rect = getWindowRectangle(win);
        Lib.TalkativeLog(
            "-£-window highlight on, pos/meas: x:" +
                rect.x +
                " y:" +
                rect.y +
                " w:" +
                rect.w +
                " h:" +
                rect.h
        );
        this._capture.drawSelection(rect, false);
    },

    /**
     * @private
     */
    _clearHighlight: function () {
        Lib.TalkativeLog("-£-window highlight off");
        this._capture.clearSelection();
    },
});

Signals.addSignalMethods(SelectionWindow.prototype);


/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @return {{x: number, y: number, w: number, h: number}}
 */
const getRectangle = function (x1, y1, x2, y2) {
    return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x1 - x2),
        h: Math.abs(y1 - y2),
    };
};

/**
 * @param win
 * @return {{x: *, y: *, w: *, h: *}}
 */
const getWindowRectangle = function (win) {
    let [tw, th] = win.get_size();
    let [tx, ty] = win.get_position();

    return {
        x: tx,
        y: ty,
        w: tw,
        h: th,
    };
};

/**
 * @param windows
 * @param {number} x
 * @param {number} y
 * @return {*}
 */
const selectWindow = function (windows, x, y) {
    let filtered = windows.filter(function (win) {
        if (
            win !== undefined &&
            win.visible &&
            typeof win.get_meta_window === "function"
        ) {
            Lib.TalkativeLog("-£-selectWin x:" + x + " y:" + y);

            let [w, h] = win.get_size();
            let [wx, wy] = win.get_position();
            Lib.TalkativeLog(
                "-£-selectWin w:" + w + " h:" + h + "wx:" + wx + " wy:" + wy
            );

            return wx <= x && wy <= y && wx + w >= x && wy + h >= y;
        } else {
            return false;
        }
    });

    filtered.sort(function (a, b) {
        return (
            a.get_meta_window().get_layer() <= b.get_meta_window().get_layer()
        );
    });

    return filtered[0];
};
