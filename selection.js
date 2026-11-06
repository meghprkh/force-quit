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
of classes. Also removed classes SelectionArea, SelectionDesktop &
AreaRecording, and _getRectangle(), which only the area selection used.

[1]: https://github.com/EasyScreenCast/EasyScreenCast/blob/b4de2a8/selection.js
*/

'use strict';

import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Signals from 'resource:///org/gnome/shell/misc/signals.js';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Lib from './convenience.js';
import * as UtilNotify from './utilnotify.js';

/**
 * @type {Capture}
 */
class Capture extends Signals.EventEmitter {
    constructor() {
        super();
        Lib.TalkativeLog('-£-capture selection init');

        this._mouseDown = false;
        this._destroyed = false;

        this._areaSelection = new St.Widget({
            name: 'area-selection',
            style_class: 'area-selection',
            visible: 'true',
            reactive: 'true',
            x: -10,
            y: -10,
        });

        Main.uiGroup.add_child(this._areaSelection);

        this._areaResolution = new St.Label({
            style_class: 'area-resolution',
            text: '',
        });
        this._areaResolution.opacity = 255;
        this._areaResolution.set_position(0, 0);

        Main.uiGroup.add_child(this._areaResolution);

        this._grab = Main.pushModal(this._areaSelection);

        if (this._grab) {
            this._signalCapturedEvent = this._areaSelection.connect(
                'captured-event',
                this._onCaptureEvent.bind(this)
            );

            this._setCaptureCursor();
        } else {
            Lib.TalkativeLog('-£-Main.pushModal() === false');
        }
    }

    /**
     * @private
     */
    _setDefaultCursor() {
        this._areaSelection.set_cursor_type(Clutter.CursorType.DEFAULT);
    }

    /**
     * @private
     */
    _setCaptureCursor() {
        this._areaSelection.set_cursor_type(Clutter.CursorType.CROSSHAIR);
    }

    /**
     * @param {Clutter.Actor} actor the actor that received the event
     * @param {Clutter.Event} event a Clutter.Event
     * @private
     */
    _onCaptureEvent(actor, event) {
        if (event.type() === Clutter.EventType.KEY_PRESS) {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                this.destroy();
                return;
            }
        }

        this.emit('captured-event', event);
    }

    /**
     * Draws a on-screen rectangle showing the area that will be captured by screen cast.
     *
     * @param {object} rect rectangle
     * @param {number} rect.x left position in pixels
     * @param {number} rect.y top position in pixels
     * @param {number} rect.w width in pixels
     * @param {number} rect.h height in pixels
     * @param {boolean} showResolution whether to display the size of the selected area
     */
    drawSelection({x, y, w, h}, showResolution) {
        if (this._destroyed)
            return;

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
     * Removes the actors and the modal grab created by this capture.
     *
     * Safe to call more than once: only the first call does the teardown.
     */
    destroy() {
        if (this._destroyed)
            return;

        this._destroyed = true;
        Lib.TalkativeLog('-£-capture selection destroy');

        if (this._signalCapturedEvent) {
            this._areaSelection.disconnect(this._signalCapturedEvent);
            this._signalCapturedEvent = null;
        }

        this._setDefaultCursor();
        Main.uiGroup.remove_child(this._areaSelection);
        this._areaSelection.destroy();
        this._areaSelection = null;

        if (this._grab) {
            Main.popModal(this._grab);
            this._grab = null;
        }

        Main.uiGroup.remove_child(this._areaResolution);
        this._areaResolution.destroy();
        this._areaResolution = null;

        this.emit('stop');
        this.disconnectAll();
    }
}

/**
 * Lifecycle shared by the selections: the Capture (highlight rectangle, modal
 * grab and captured-event signal) and the alert label telling the user what to
 * do.
 *
 * The subclasses only pass their log tag and gettext alert message here, and
 * keep the fields and the event handling that differ between them.
 *
 * The subclasses initialise the fields they own in _initFields(), which runs
 * before the capture is created, and release them in _releaseFields(), which
 * runs once from destroy().
 */
class SelectionBase extends Signals.EventEmitter {
    /**
     * @param {string} kind short tag used in the debug log
     * @param {string} alert message shown to the user while selecting
     */
    constructor(kind, alert) {
        super();
        Lib.TalkativeLog(`-£-${kind} selection init`);

        this._destroyed = false;
        this._kind = kind;
        this._initFields();
        this._capture = new Capture();
        this._signalCaptureEvent = this._capture.connect(
            'captured-event',
            this._onEvent.bind(this)
        );
        this._signalCaptureStop = this._capture.connect('stop', () => this.destroy());

        this._ctrlNotify = new UtilNotify.NotifyManager();
        this._ctrlNotify.createAlert(alert);
    }

    /**
     * Tears down the selection: disconnects the capture signals, destroys the
     * capture (highlight rectangle, modal grab), removes the alert shown to the
     * user and releases the fields owned by the subclass.
     *
     * Safe to call more than once: only the first call does the teardown.
     */
    destroy() {
        if (this._destroyed)
            return;

        this._destroyed = true;
        Lib.TalkativeLog(`-£-${this._kind} selection destroy`);

        // disconnect before destroying the capture, so that its 'stop' emission
        // cannot re-enter this method
        if (this._signalCaptureEvent) {
            this._capture?.disconnect(this._signalCaptureEvent);
            this._signalCaptureEvent = null;
        }
        if (this._signalCaptureStop) {
            this._capture?.disconnect(this._signalCaptureStop);
            this._signalCaptureStop = null;
        }

        this._capture?.destroy();
        this._capture = null;

        this._ctrlNotify?.resetAlert();
        this._ctrlNotify = null;

        this._releaseFields();

        this.emit('stop');
        this.disconnectAll();
    }

    /**
     * Initialises the fields owned by the subclass; called once from the
     * constructor, before the capture is created.
     *
     * @private
     */
    _initFields() {
        // the base selection owns no other field
    }

    /**
     * Releases the fields owned by the subclass; called once from destroy().
     *
     * @private
     */
    _releaseFields() {
        // the base selection owns no other field
    }
}

class SelectionWindow extends SelectionBase {
    constructor() {
        super('window', _('Select a window to kill or press [ESC] to abort'));
    }

    /**
     * @private
     */
    _initFields() {
        this._selectedWindow = null;
        this._windows = global.get_window_actors();
    }

    /**
     * @private
     */
    _releaseFields() {
        this._selectedWindow = null;
        this._windows = null;
    }

    /**
     * @param {Clutter.Actor} capture the actor the captured the event
     * @param {Clutter.Event} event a Clutter.Event
     * @private
     */
    _onEvent(capture, event) {
        if (this._destroyed)
            return;

        let type = event.type();
        let [x, y] = global.get_pointer();

        this._selectedWindow = _selectWindow(this._windows, x, y);

        if (this._selectedWindow)
            this._highlightWindow(this._selectedWindow);
        else
            this._clearHighlight();


        if (type === Clutter.EventType.BUTTON_PRESS) {
            try {
                // kill before the teardown, which releases _selectedWindow
                if (event.get_button() !== Clutter.BUTTON_SECONDARY && this._selectedWindow)
                    this._selectedWindow.get_meta_window().kill();
            } finally {
                // release the highlight, the alert and the modal grab even if
                // the window was already gone
                this.destroy();
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

export {SelectionWindow};
