import * as vscode from 'vscode';



interface TemplateData {
  id: string;
  name: string;
  content: string;
}

export class Template {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly content: string,
    public readonly parent?: string
  ) { }

  public toData(): TemplateData {
    return {
      id: this.id,
      name: this.name,
      content: this.content,
    };
  }

  public static fromData(data: TemplateData): Template {
    return new Template(data.id, data.name, data.content);
  }
}


export class TemplateDanceTreeDataProvider implements vscode.TreeDataProvider<Template> {

  private templates: Template[] = [];
  private selectId: any = "";
  private _onDidChangeTreeData: vscode.EventEmitter<Template | undefined | null> = new vscode.EventEmitter<Template | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<Template | undefined | null> = this._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    // 加载模板列表数据
    // ...
    this.loadTemplates();
  }

  private loadTemplates(): void {
    const savedTemplates = this.context.globalState.get<TemplateData[]>('templates', []);
    this.templates = savedTemplates.map(Template.fromData);
  }

  private saveTemplates(): void {
    const data = this.templates.map(t => t.toData());
    this.context.globalState.update('templates', data);
  }

  getItem(): Template {
    const id = this.selectId
    return this.templates.find(item => item.id === id);
  }

  getTreeItem(element: Template): vscode.TreeItem {
    return {
      id: element.id,
      label: `${element.name}`,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      command: {
        command: 'templateDance.insertTemplate',
        title: '',
        arguments: [element],
      },
      iconPath: vscode.Uri.file(this.context.asAbsolutePath('icon-code2.svg'))
    };
  }

  getChildren(): Thenable<Template[]> {
    return Promise.resolve(this.templates);
  }

  getParent(): Thenable<Template | null> {
    return Promise.resolve(null);
  }

  refresh(): void {
    // 刷新模板列表
    // ...
    this.loadTemplates()
    this._onDidChangeTreeData.fire();
  }

  add(template: Template): void {
    // 添加新模板
    // ...
    this.loadTemplates()
    this.templates.push(template);
    console.log('add this.templates ====> ', this.templates)
    this.saveTemplates();
    this.refresh();
  }

  edit(id: string, content: string): void {
    // 编辑模板
    // ...
    this.loadTemplates()
    this.templates.forEach(item => {
      if (item.id === id) {
        item.content = content
      }
    })
    this.saveTemplates();
    this.refresh();
  }

  delete(template: Template): void {
    // 删除模板
    // ...
    this.loadTemplates()
    this.templates = this.templates.filter(t => t.id !== template.id);
    this.saveTemplates();
    this.refresh();
  }

  search(keyword: string): void {

    if (!keyword) {
      // 如果没有关键词，则显示所有模板
      this.loadTemplates();
    } else {
      let data = this.context.globalState.get<TemplateData[]>('templates', [])
      // 根据关键词筛选模板
      this.templates = data.filter(template => template.name.toLowerCase().includes(keyword.toLowerCase()));
    }
    this._onDidChangeTreeData.fire();
  }



}