import * as vscode from 'vscode';

interface TemplateData {
  id: string;
  name: string;
  content: string;
  parent?: string;
  children?: TemplateData[] | null;
  hasChild?: boolean;
}

export class Template {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly content: string,
    public readonly parent?: string,
    public readonly children?: TemplateData[] | null,
    public readonly hasChild?: boolean,
  ) { }

  public toData(): TemplateData {
    return {
      id: this.id,
      name: this.name,
      content: this.content,
      parent: this.parent,
      children: this.children,
      hasChild: this.children && this.children.length > 0
    };
  }

  public static fromData(data: TemplateData): Template {
    if(data.hasChild) {
      return new Template(data.id, data.name, data.content, data.parent, data.children, data.hasChild);
    } else {
      return new Template(data.id, data.name, data.content, data.parent);
    }
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
    // this.context.globalState.update('templates', []);

    this.loadTemplates();
  }

  private loadTemplates(): void {
    const savedTemplates = this.context.globalState.get<TemplateData[]>('templates', []);
    console.log("loadTemplates savedTemplates", savedTemplates)
    this.templates = savedTemplates.map(Template.fromData);
    console.log("loadTemplates this.templates", this.templates)
  }

  private saveTemplates(): void {
    const data = this.templates.map(t => t.toData());
    this.context.globalState.update('templates', data);
    console.log("saveTemplates this.templates", this.templates)
  }

  getItem(id: string): Template {
    let stack = [...this.templates]
    while (stack.length) {
      let node = stack.shift()
      if(node.id === id) {
        return node
      }
      if(node.hasChild) {
        stack = [...stack, ...node?.children]
      }
    }
  }

  getParent(template: Template): Template | null {
    if (!template.parent) {
      return null;
    }
    return this.getItem(template.parent);
  }

  getChildren(template?: Template): Thenable<Template[]> {
    // if (!template) {
    //   // 如果没有传入模板，返回一级模板
    //   return Promise.resolve(this.templates.filter(item => !item.parent));
    // } else {
    //   // 返回下一级模板
    //   return Promise.resolve(this.templates.filter(item => item.parent === template.id));
    // }
    console.log("getChildren template", template)
    return Promise.resolve(template ? template.children || [] : this.templates);
  }

  getTreeItem(element: Template): vscode.TreeItem {
    console.log('getTreeItem element', element)
    let tooltip = element.content.length > 20 ? `${element.content.slice(0,20)}...` : element.content
    return {
      id: element.id,
      label: element.name,
      tooltip: tooltip,
      children: element.children || null,
      collapsibleState: !element.hasChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
      iconPath: vscode.Uri.file(this.context.asAbsolutePath('icon-code2.svg')),
      // 添加 mouseover 事件处理函数
      onmouseover:  (event) => {
        this.hoverId = item.id;
        console.log('hover on node:', item);
      };
    };
  }
  
  validateName(name): boolean {
    console.log("validateName name", name)
    const stack = [...this.templates]
    console.log("validateName stack", this.templates, stack)
    let res = true
    while (stack.length) {
      const node = stack.pop()
      console.log("validateName node", node, )
      if(node.name === name) {
        return false
      }
      if(node.children && node.children.length > 0) {
        for(let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i])
        }
      }
    }
    console.log("validateName res", res)
    return res
   
  }

  initId(): string {
    return this.templates.length + ""
  }

  initChildId(parentName): object | false {
    let childId = null
    const stack = [...this.templates]
    const parentNode = []
    console.log("initChildId stack", stack)
    while (stack.length) {
      const node = stack.pop()
      if(node.name === parentName) {
        parentNode.push(node)
        break
      }
    console.log("initChildId node", node)
    console.log("initChildId node.hasChild ", node.hasChild )
    console.log("initChildId node.children.length ", node.children?.length)

      if(node.hasChild && node.children.length > 0) {
        for(let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i])
        }
      }
    console.log("initChildId stack", stack)
  }
    console.log("initChildId parentNode", parentNode)

    if(parentNode.length === 1) {
      childId = parentNode[0].children ? parentNode[0].children.length : 0
      return {
        childId: `${parentNode[0].id}-${childId}`,
        parentId: parentNode[0].id
      }
    } else {
      return false
    }
  }

  refresh(): void {
    console.log('refresh templates', this.templates)
    this.loadTemplates()
    this._onDidChangeTreeData.fire();
  }

  add(template: Template): void {
    console.log('add template', template)
    if(template.parent) {
      const stack = [...this.templates]
      while (stack.length) {
        const node = stack.pop()
    console.log('add node', node)
    if(node.id === template.parent) {
          node.hasChild = true
          if(node.children) {
            node.children.push(template)
          } else {
            node.children = [template]
          }
          break
        }
        if(node.children && node.children.length > 0) {
          for(let i = node.children.length - 1; i >= 0; i--) {
            stack.push(node.children[i])
          }
        }
      }
    } else{
      this.templates.push(template);
    }
    console.log('add this.templates', this.templates)
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

  deleteFun(element: Template, _templates, parentNode): void {
    if (!element) {
      return;
    }
    let templates = _templates;
    let index = templates.findIndex(template => template.id === element.id);
    console.log('delete index',index)
    console.log('delete _templates',_templates)
    if (index === -1) {
      for(let i = 0; i < templates.length; i++) {
        if (templates[i].children) {
          this.deleteFun(element, templates[i].children, templates[i]);
        }
      }
      
    } else {
      _templates.splice(index, 1)
      if(_templates.length === 0) {
        parentNode.hasChild = false
      }
    }
  }

  delete(template: Template): void {
    this.deleteFun(template, this.templates)
    // this.templates = this.templates.filter(t => t.id !== template.id);
    
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