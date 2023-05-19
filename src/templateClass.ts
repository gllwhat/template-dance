import * as vscode from 'vscode';

interface TemplateData {
  id: string;
  name: string;
  content: string;
  parent?: string;
}

export class Template {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly content: string,
    public readonly parent?: string,
  ) { }

  public toData(): TemplateData {
    return {
      id: this.id,
      name: this.name,
      content: this.content,
      parent: this.parent,
    };
  }

  public static fromData(data: TemplateData): Template {
    return new Template(data.id, data.name, data.content, data.parent);
  }
}

export class TemplateDanceTreeDataProvider implements vscode.TreeDataProvider<Template> {

  private templates: Template[] = [];
  private selectId: any = ""
  
  private _onDidChangeTreeData: vscode.EventEmitter<Template | undefined | null> = new vscode.EventEmitter<Template | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<Template | undefined | null> = this._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    //如果出现了诡异的问题出现重复id会报错，所以在这里先进行一次查重
    // const savedTemplates = this.context.globalState.get<TemplateData[]>('templates', []);
    // let temObj = {}
    // let arr = []
    // savedTemplates.forEach(item => {
    //   if(!temObj[item.id]) {
    //     arr.push(item)
    //     temObj[item.id] = true
    //   } 
    // })
    // this.context.globalState.update('templates', arr);

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

  getItem(id: string): Template {
    return this.templates.find(item => item.id === id);
  }

  getParent(template: Template): Template | null {
    if (!template.parent) {
      return null;
    }
    return this.getItem(template.parent);
  }

  getChildren(template?: Template): Thenable<Template[]> {
    if (!template) {
      // 如果没有传入模板，返回一级模板
      return Promise.resolve(this.templates.filter(item => !item.parent));
    } else {
      // 返回下一级模板
      return Promise.resolve(this.templates.filter(item => item.parent === template.id));
    }
  }

  getTreeItem(element: Template): vscode.TreeItem {
    return {
      id: element.id,
      label: element.name,
      collapsibleState: !element.hasChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
      command: {
        command: 'templateDance.insertTemplate',
        title: '',
        arguments: [element],
      },
      iconPath: vscode.Uri.file(this.context.asAbsolutePath('icon-code2.svg'))
    };
  }

  refresh(): void {
    console.log('refresh templates', this.templates)
    this.loadTemplates()
    this._onDidChangeTreeData.fire();
  }

  dataHandler(template) {
    if(!template) {
      let t = [template]
    }
    
    if(template.parent) {
      this.templates = this.templates.map(item => {
        if(item.id === template.parent) {
          item.hasChild = true
        }
        return item
      })
    }
  }

  add(template: Template): void {
    
    this.templates.push(template);
    this.saveTemplates();
    this.refresh();
  }

  edit(id: string, name:string, content: string): void {
    this.templates.forEach(item => {
      if (item.id === id) {
        item.content = content
      }
    })
    this.saveTemplates();
    this.refresh();
  }

  delete(template: Template): void {
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

  validateId(id: string): boolean {
    return this.context.globalState.get<TemplateData[]>('templates', []).findIndex(item => item.id === id) === -1
  }

}