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
edits. Edits include right-click aborting, force-quitting, and renaming
of classes. Also removed classes SelectionArea, SelectionDesktop & AreaRecording

[1]: https://github.com/EasyScreenCast/EasyScreenCast/blob/2b26b6d/selection.js
*/

/* exported SelectionWindow */
'use strict';

const GObject = imports.gi.GObject;
const Signals = imports.signals;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Layout = imports.ui.layout;

const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Domain.gettext;

const Lib = Me.imports.convenience;
// const Ext = Me.imports.extension;
const UtilNotify = Me.imports.utilnotify;
const DisplayApi = Me.imports.display_module.DisplayApi;

const Config = imports.misc.config;
const shellVersion = Number.parseInt(Config.PACKAGE_VERSION.split('.')[0]);

/**
 * @type {Lang.Class}
 */
const Capture = GObject.registerClass({
    GTypeName: 'ForceQuit_Capture',
}, class Capture extends GObject.Object {
    /**
     * @private
     */
    _init() {
        Lib.TalkativeLog('-£-capture selection init');

        this._mouseDown = false;

        this.monitor = Main.layoutManager.focusMonitor;

        this._areaSelection = new St.Widget({
            name: 'area-selection',
            style_class: 'area-selection',
            visible: 'true',
            reactive: 'true',
            x: -10,
            y: -10,
        });

        Main.uiGroup.add_actor(this._areaSelection);

        this._areaResolution = new St.Label({
            style_class: 'area-resolution',
            text: '',
        });
        this._areaResolution.opacity = 255;
        this._areaResolution.set_position(0, 0);

        Main.uiGroup.add_actor(this._areaResolution);

        this._grab = Main.pushModal(this._areaSelection);

        if (this._grab) {
            if (shellVersion >= 42) {
                this._signalCapturedEvent = this._areaSelection.connect(
                    'captured-event',
                    this._onCaptureEvent.bind(this)
                );
            } else {
                this._grab = this._areaSelection;
                this._signalCapturedEvent = global.stage.connect(
                    'captured-event',
                    this._onCaptureEvent.bind(this)
                );
            }



            this._setCaptureCursor();
        } else {
            Lib.TalkativeLog('-£-Main.pushModal() === false');
        }
    }

    /**
     * @private
     */
    _setDefaultCursor() {
        DisplayApi.set_cursor(Meta.Cursor.DEFAULT);
    }

    /**
     * @private
     */
    _setCaptureCursor() {
        DisplayApi.set_cursor(Meta.Cursor.CROSSHAIR);
    }

    /**
     * @param {Clutter.Actor} actor the actor that received the event
     * @param {Clutter.Event} event a Clutter.Event
     * @private
     */
    _onCaptureEvent(actor, event) {
        if (event.type() === Clutter.EventType.KEY_PRESS) {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                this._stop();
            }
        }

        this.emit('captured-event', event);
    }

    /**
     * Draws a on-screen rectangle showing the area that will be captured by screen cast.
     *
     * @param {Object} rect rectangle
     * @param {number} rect.x left position in pixels
     * @param {number} rect.y top position in pixels
     * @param {number} rect.w width in pixels
     * @param {number} rect.h height in pixels
     * @param {boolean} showResolution whether to display the size of the selected area
     */
    drawSelection({ x, y, w, h }, showResolution) {
        this._areaSelection.set_position(x, y);
        this._areaSelection.set_size(w, h);

        if (showResolution && w > 100 && h > 50) {
            this._areaResolution.set_text(`${w} X ${h}`);
            this._areaResolution.set_position(
                x + (w / 2 - this._areaResolution.width / 2),
                y + (h / 2 - this._areaResolution.height / 2)
            );
        } else {
            this._areaResolution.set_position(0, 0);
            this._areaResolution.set_text('');
        }
    }

    /**
     * Clear drawing selection
     */
    clearSelection() {
        this.drawSelection(
            {
                x: -10,
                y: -10,
                w: 0,
                h: 0,
            },
            false
        );
    }

    /**
     * @private
     */
    _stop() {
        Lib.TalkativeLog('-£-capture selection stop');

        global.stage.disconnect(this._signalCapturedEvent);
        this._setDefaultCursor();
        Main.uiGroup.remove_actor(this._areaSelection);
        Main.popModal(this._grab);
        Main.uiGroup.remove_actor(this._areaResolution);
        this._areaSelection.destroy();
        this.emit('stop');
        this.disconnectAll();
    }

    _saveRect(x, y, h, w) {
        Lib.TalkativeLog(`-£-selection x:${x} y:${y} height:${h} width:${w}`);

        // Ext.Indicator.saveSelectedRect(x, y, h, w);
        // Ext.Indicator._doDelayAction();
    }

    toString() {
        return this.GTypeName;
    }
});

Signals.addSignalMethods(Capture.prototype);

var SelectionWindow = GObject.registerClass({
    GTypeName: 'ForceQuit_SelectionWindow',
}, class SelectionWindow extends GObject.Object {
    /**
     * @private
     */
    _init() {
        Lib.TalkativeLog('-£-window selection init');

        this._windows = global.get_window_actors();
        this._capture = new Capture();
        this._capture.connect('captured-event', this._onEvent.bind(this));
        this._capture.connect('stop', this.emit.bind(this, 'stop'));

        let CtrlNotify = new UtilNotify.NotifyManager();
        CtrlNotify.createAlert(
            _('Select a window to kill or press [ESC] to abort')
        );
    }

    /**
     * @param {Clutter.Actor} capture the actor the captured the event
     * @param {Clutter.Event} event a Clutter.Event
     * @private
     */
    _onEvent(capture, event) {
        let type = event.type();
        let [x, y] = global.get_pointer();

        this._selectedWindow = _selectWindow(this._windows, x, y);

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
    }

    /**
     * @param {Clutter.Actor} win the window to highlight
     * @private
     */
    _highlightWindow(win) {
        let rect = _getWindowRectangle(win);
        Lib.TalkativeLog(`-£-window highlight on, pos/meas: x:${rect.x} y:${rect.y} w:${rect.w} h:${rect.h}`);
        this._capture.drawSelection(rect, false);
    }

    /**
     * @private
     */
    _clearHighlight() {
        Lib.TalkativeLog('-£-window highlight off');
        this._capture.clearSelection();
    }

    toString() {
        return this.GTypeName;
    }
});

Signals.addSignalMethods(SelectionWindow.prototype);


/**
 * @param {number} x1 left position
 * @param {number} y1 top position
 * @param {number} x2 right position
 * @param {number} y2 bottom position
 * @returns {{x: number, y: number, w: number, h: number}}
 */
function _getRectangle(x1, y1, x2, y2) {
    return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x1 - x2),
        h: Math.abs(y1 - y2),
    };
}

/**
 * @param {Clutter.Actor} win a Clutter.Actor
 * @returns {{x: number, y: number, w: number, h: number}}
 */
function _getWindowRectangle(win) {
    let [tw, th] = win.get_size();
    let [tx, ty] = win.get_position();

    return {
        x: tx,
        y: ty,
        w: tw,
        h: th,
    };
}

/**
 * @param {Array(Clutter.Actor)} windows all windows on the display
 * @param {number} x left position
 * @param {number} y top position
 * @returns {Clutter.Actor}
 */
function _selectWindow(windows, x, y) {
    let filtered = windows.filter(win => {
        if (
            win !== undefined &&
            win.visible &&
            typeof win.get_meta_window === 'function'
        ) {
            Lib.TalkativeLog(`-£-selectWin x:${x} y:${y}`);

            let [w, h] = win.get_size();
            let [wx, wy] = win.get_position();
            Lib.TalkativeLog(`-£-selectWin w:${w} h:${h} wx:${wx} wy:${wy}`);

            return wx <= x && wy <= y && wx + w >= x && wy + h >= y;
        } else {
            return false;
        }
    });

    filtered.sort((a, b) => {
        return (
            a.get_meta_window().get_layer() <= b.get_meta_window().get_layer()
        );
    });

    return filtered[0];
}
