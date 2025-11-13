import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class ForceQuitPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);
        
        // Create a preferences group
        const group = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Configure the extension appearance',
        });
        page.add(group);
        
        // Create the switch row
        const row = new Adw.SwitchRow({
            title: 'Hide Status Bar Button',
            subtitle: 'Hide the Force Quit button from the top panel',
        });
        group.add(row);
        
        // Bind the switch to the setting
        settings.bind(
            'hide-button',
            row,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
    }
}
