import { App, PluginSettingTab, Setting } from 'obsidian';
import type ApeTypePlugin from './main';
import { ApeTypeView, VIEW_TYPE_APE_TYPE } from './ApeTypeView';
import type { Theme } from './types';

export class ApeTypeSettingTab extends PluginSettingTab {
  plugin: ApeTypePlugin;

  constructor(app: App, plugin: ApeTypePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Ape Type Settings' });

    new Setting(containerEl)
      .setName('Default mode')
      .setDesc('Mode selected when opening Ape Type')
      .addDropdown((d) =>
        d
          .addOption('time', 'Time')
          .addOption('words', 'Words')
          .addOption('quote', 'Quote')
          .setValue(this.plugin.settings.defaultMode)
          .onChange(async (v) => {
            this.plugin.settings.defaultMode = v as 'time' | 'words' | 'quote';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default time')
      .setDesc('Default duration for time mode (seconds)')
      .addDropdown((d) =>
        d
          .addOption('15', '15s')
          .addOption('30', '30s')
          .addOption('60', '60s')
          .addOption('120', '120s')
          .setValue(String(this.plugin.settings.defaultTime))
          .onChange(async (v) => {
            this.plugin.settings.defaultTime = Number(v);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default word count')
      .setDesc('Default number of words for word mode')
      .addDropdown((d) =>
        d
          .addOption('10', '10')
          .addOption('25', '25')
          .addOption('50', '50')
          .addOption('100', '100')
          .setValue(String(this.plugin.settings.defaultWords))
          .onChange(async (v) => {
            this.plugin.settings.defaultWords = Number(v);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default quote length')
      .setDesc('Default quote difficulty tier')
      .addDropdown((d) =>
        d
          .addOption('short', 'Short')
          .addOption('medium', 'Medium')
          .addOption('long', 'Long')
          .addOption('thicc', 'Thicc')
          .setValue(this.plugin.settings.defaultQuoteLength)
          .onChange(async (v) => {
            this.plugin.settings.defaultQuoteLength = v as 'short' | 'medium' | 'long' | 'thicc';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Smooth caret')
      .setDesc('Animate the caret as it moves')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.smoothCaret).onChange(async (v) => {
          this.plugin.settings.smoothCaret = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Theme')
      .setDesc('Colour scheme for Ape Type')
      .addDropdown((d) =>
        d
          .addOption('dark',         'Dark (default)')
          .addOption('light',        'Light')
          .addOption('nord',         'Nord')
          .addOption('dracula',      'Dracula')
          .addOption('gruvbox-dark', 'Gruvbox Dark')
          .addOption('gruvbox-light','Gruvbox Light')
          .setValue(this.plugin.settings.theme)
          .onChange(async (v) => {
            this.plugin.settings.theme = v as Theme;
            await this.plugin.saveSettings();
            // Apply immediately to any open tab views
            for (const leaf of this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_APE_TYPE)) {
              (leaf.view as ApeTypeView).widget?.applyTheme(v);
            }
          })
      );
  }
}
