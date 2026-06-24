import { MarkdownRenderChild, Plugin, WorkspaceLeaf } from 'obsidian';
import { ApeTypeView, VIEW_TYPE_APE_TYPE } from './ApeTypeView';
import { ApeTypeWidget, ApeTypeWidgetOptions } from './ApeTypeWidget';
import { ApeTypeSettingTab } from './SettingsTab';
import { emptyPluginData } from './StatsManager';
import type { ApeTypeSettings, PluginData, TestMode, QuoteLength } from './types';
import { DEFAULT_SETTINGS } from './types';

export default class ApeTypePlugin extends Plugin {
  settings: ApeTypeSettings = { ...DEFAULT_SETTINGS };
  pluginData: PluginData = emptyPluginData();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_APE_TYPE, (leaf) => new ApeTypeView(leaf, this));

    this.addRibbonIcon('keyboard', 'Ape Type', () => this.activateView());

    this.addCommand({
      id: 'open-ape-type',
      name: 'Open typing test',
      callback: () => this.activateView(),
    });

    this.addSettingTab(new ApeTypeSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor('ape-type', (source, el, ctx) => {
      const child = new ApeTypeEmbedChild(el, this, source);
      ctx.addChild(child);
    });
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_APE_TYPE);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_APE_TYPE);
    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_APE_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    const raw = await this.loadData();
    if (raw) {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, raw.settings ?? {});
      this.pluginData = {
        history: raw.history ?? [],
        personalBests: raw.personalBests ?? {},
      };
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData({
      settings: this.settings,
      history: this.pluginData.history,
      personalBests: this.pluginData.personalBests,
    });
  }
}

class ApeTypeEmbedChild extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private plugin: ApeTypePlugin,
    private source: string
  ) {
    super(containerEl);
  }

  onload(): void {
    const opts = parseEmbedOptions(this.source);
    const widget = new ApeTypeWidget(this.containerEl, this.plugin, { embedded: true, ...opts });
    this.addChild(widget);
  }
}

function parseEmbedOptions(source: string): Partial<ApeTypeWidgetOptions> {
  const opts: Partial<ApeTypeWidgetOptions> = {};
  for (const line of source.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const k = line.slice(0, colon).trim();
    const v = line.slice(colon + 1).trim();
    if (k === 'mode' && (v === 'time' || v === 'words' || v === 'quote')) {
      opts.initialMode = v as TestMode;
    } else if (k === 'time') {
      const n = parseInt(v, 10);
      if (!isNaN(n)) opts.initialTime = n;
    } else if (k === 'words') {
      const n = parseInt(v, 10);
      if (!isNaN(n)) opts.initialWords = n;
    } else if (k === 'length' && (v === 'short' || v === 'medium' || v === 'long' || v === 'thicc')) {
      opts.initialQuoteLength = v as QuoteLength;
    }
  }
  return opts;
}
