import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ApeTypePlugin from './main';
import { ApeTypeWidget } from './ApeTypeWidget';

export const VIEW_TYPE_APE_TYPE = 'ape-type';

export class ApeTypeView extends ItemView {
  private plugin: ApeTypePlugin;
  widget!: ApeTypeWidget;

  constructor(leaf: WorkspaceLeaf, plugin: ApeTypePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_APE_TYPE; }
  getDisplayText(): string { return 'Ape Type'; }
  getIcon(): string { return 'keyboard'; }

  async onOpen(): Promise<void> {
    this.widget = new ApeTypeWidget(this.contentEl, this.plugin);
    this.addChild(this.widget);
    // Auto-focus for the dedicated tab view (not used for embeds)
    setTimeout(() => this.widget.focusInput(), 50);
  }

  async onClose(): Promise<void> {
    // Lifecycle (including engine teardown) handled by addChild
  }
}
