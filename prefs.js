import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class ForceQuitPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {

        this.settings = this.getSettings();
        
        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);
        
        // Create a preferences group
        const group = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Configure the extension appearance',
        });
        page.add(group);
        
        // Create a switch row to hide the button
        this.switchRow = new Adw.SwitchRow({
            title: 'Hide Status Bar Button',
            subtitle: 'Hide the Force Quit button from the top panel',
        });
        group.add(this.switchRow);
        
        // Bind the switch to the setting
        this.settings.bind(
            'hide-button',
            this.switchRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Create another row with two toggles for the button position
        const toggleRow = new Adw.ActionRow({
            title: 'Button position',
            subtitle: 'Where to place the button on the top panel'
        });
        group.add(toggleRow);
        this.toggleGroup = new Adw.ToggleGroup({ 'can-shrink': true });
        toggleRow.add_suffix(this.toggleGroup);
        const leftToggle = new Adw.Toggle({ name: 'left', label:'Left' });
        this.toggleGroup.add(leftToggle);
        const rightToggle = new Adw.Toggle({ name: 'right', label: 'Right' });
        this.toggleGroup.add(rightToggle);
    
        // Bind the switch to the setting
        this.settings.bind(
            'button-position',
            this.toggleGroup,
            'active_name',
            Gio.SettingsBindFlags.DEFAULT
        );
    
        // Create a label describing script use
        this.description = new Gtk.Label({
            label: `
With the button hidden, the extension can still be launched from scripts via DBus:
<tt>
 gdbus call \\
   --session \\
   --dest org.gnome.Shell \\
   --object-path /org/gnome/Shell/Extensions/ForceQuit \\
   --method org.gnome.Shell.Extensions.ForceQuit.SelectWindow
</tt>`,
            use_markup: true,
            wrap: true,
            xalign: 0.15
        });
        group.add(this.description);

        this._updateVisibility();
        this.settings.connect('changed::hide-button', () => this._updateVisibility());
    }

    // Grey out toggleGroup and show description when button is hidden
    _updateVisibility() {
        this.switchRow.active = this.settings.get_boolean('hide-button');
        this.toggleGroup.sensitive = !this.switchRow.active;
        if (this.switchRow.active)
            this.description.show();
        else
            this.description.hide();
    }
}
