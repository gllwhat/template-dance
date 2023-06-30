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
    if (data.hasChild) {
      return new Template(data.id, data.name, data.content, data.parent, data.children, data.hasChild);
    } else {
      return new Template(data.id, data.name, data.content, data.parent);
    }
  }
}


export class TemplateDanceTreeDataProvider implements vscode.TreeDataProvider<Template> {

  private templates: Template[] = [];
  private templatesOld: Template[] = [];
  private selectId: any = ""
  private importTemMap = new Map()

  private _onDidChangeTreeData: vscode.EventEmitter<Template | undefined | null> = new vscode.EventEmitter<Template | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<Template | undefined | null> = this._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    //如果出现了诡异的问题出现重复id会报错，所以在这里先进行一次查重
    const savedTemplates = this.context.globalState.get<TemplateData[]>('templates', []);
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
      if (node.id === id) {
        return node
      }
      if (node.hasChild) {
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
    let tooltip = element.content.length > 20 ? `${element.content.slice(0, 20)}...` : element.content
    return {
      id: element.id,
      label: element.name,
      tooltip: tooltip,
      children: element.children || null,
      collapsibleState: !element.hasChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
      iconPath: vscode.Uri.file(this.context.asAbsolutePath('./src/icon/icon-code2.svg')),
      // 添加 mouseover 事件处理函数
      onmouseover: (event) => {
        this.hoverId = item.id;
        console.log('hover on node:', item);
      };
    };
  }

  // 校验数据的字段、类型
  checkType(obj, typeData: Array) {
    let res = ""
    let keyArr = Object.keys(obj)
    for (let i = 0; i < keyArr.length; i++) {
      let idx = typeData.findIndex(item => {
        let result = false
        if (item.key === keyArr[i]) {
          if (item.type === "array") {
            result = obj[keyArr[i]] instanceof Array
          } else {
            result = typeof obj[keyArr[i]] === item.type
          }
        } else {
          result = false
        }
        return result
      })
      if (idx === -1) {
        res = `${res}1`
      } else {
        res = `${res}0`
      }
    }
    console.log('checkType res', res)

    if (res.length !== typeData.length || res.includes("1")) {
      return false
    } else {
      return true
    }
  }

  // 校验数据是否合法
  // 包括parent、hasChild、children
  checkData(data, msg = ""): boolean {
    console.log("checkData data", data)
    let res = msg
    if (this.importTemMap.has(data.id) || this.importTemMap.has(data.name)) {
      res = `${res}${res ? "。" : ""} ${data.id}或${data.name}重复。`
    } else {
      this.importTemMap.set(data.id, 1)
      this.importTemMap.set(data.name, 1)
    }
    if (data.hasChild && data.children.length === 0) {
      res = `${res} ${res ? "。" : ""} ${JSON.stringify({ id: data.id, name: data.name })}`
    }
    if (data.hasChild) {
      for (let i = 0; i < data.children.length; i++) {
        if (data.children[i].parent && data.children[i].parent !== data.id) {
          res = `${res} ${res ? "。" : ""} ${JSON.stringify({ id: data.children[i].id, name: data.children[i].name })}`
        }
        this.checkData(data.children[i], res)
      }
    }
    console.log("checkData res", res)
    return res
  }

  formatTreeData(treeData) {
    if (!treeData) {
      return
    }
    for (let i = 0; i < treeData.length; i++) {
      treeData[i] = new Template(treeData[i].id, treeData[i].name, treeData[i].content, treeData[i].parent, treeData[i].children, treeData[i].hasChild)
      if (treeData[i].hasChild) {
        this.formatTreeData(treeData[i].children)
      }
    }
    return treeData
  }

  validateTreeData(treeData: unknown): boolean {
    let typeData = [
      { key: 'id', type: 'string' },
      { key: 'name', type: 'string' },
      { key: 'content', type: 'string' },
      { key: 'parent', type: 'string' },
      { key: 'children', type: 'array' },
      { key: 'hasChild', type: 'boolean' },
    ]
    let errorMsg = "", errorMsg2 = ""
    if (!(treeData instanceof Array)) {
      vscode.window.showErrorMessage(`添加失败，传入数据类型有误`)
      return
    }
    // 校验数据
    for (let i = 0; i < treeData.length; i++) {
      let res = this.checkType(treeData[i], typeData)
      console.log('check result ', res)
      if (!res) {
        errorMsg = `${errorMsg}${errorMsg ? "。" : ""} ${JSON.stringify(treeData[i])}`

      }
      let res2 = this.checkData(treeData[i])
      if (res2) {
        errorMsg2 = `${errorMsg2}${errorMsg2 ? "。" : ""} ${res2}`
      }
    }
    if (errorMsg) {
      vscode.window.showErrorMessage(`添加失败，以下数据字段或数据类型有误：${errorMsg}`)
      return
    }
    if (errorMsg2) {
      vscode.window.showErrorMessage(`添加失败，以下数据hasChild/children/parent字段有误：${errorMsg2}`)
      return
    }

    // 获取全部的name和id，平摊成一层，进行比对
    const stack = [...this.templates]
    let errorMsg3 = ""
    while (stack.length) {
      const node = stack.pop()
      if (this.importTemMap.has(node.id) || this.importTemMap.has(node.name)) {
        errorMsg3 = `${errorMsg3}${errorMsg3 ? "。" : ""} ${node.id}或${node.name}已存在`
      }
      if (node.children && node.children.length > 0) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i])
        }
      }
    }
    if (errorMsg3) {
      vscode.window.showErrorMessage(`添加失败，以下数据与原数据冲突：${errorMsg3}`)
      return
    }
    let _treeData = this.formatTreeData(treeData)
    console.log('import _treeData', _treeData)
    this.importTree(_treeData)
  }

  importTree(treeData: TemplateData[]): void {
    this.templatesOld = this.templates
    this.templates = [...this.templates, ...treeData]
    console.log('import this.templates', this.templates)
    this.saveTemplates();
    this.refresh();
  }

  revoke(): void {
    this.templates = [...this.templatesOld]
    this.templatesOld = []
    this.saveTemplates();
    this.refresh();
  }

  validateName(name): boolean {
    console.log("validateName name", name)
    const stack = [...this.templates]
    console.log("validateName stack", this.templates, stack)
    let res = true
    while (stack.length) {
      const node = stack.pop()
      console.log("validateName node", node,)
      if (node.name === name) {
        return false
      }
      if (node.children && node.children.length > 0) {
        for (let i = node.children.length - 1; i >= 0; i--) {
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
      if (node.name === parentName) {
        parentNode.push(node)
        break
      }
      console.log("initChildId node", node)
      console.log("initChildId node.hasChild ", node.hasChild)
      console.log("initChildId node.children.length ", node.children?.length)

      if (node.hasChild && node.children.length > 0) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i])
        }
      }
      console.log("initChildId stack", stack)
    }
    console.log("initChildId parentNode", parentNode)

    if (parentNode.length === 1) {
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
    if (template.parent) {
      const stack = [...this.templates]
      while (stack.length) {
        const node = stack.pop()
        console.log('add node', node)
        if (node.id === template.parent) {
          node.hasChild = true
          if (node.children) {
            node.children.push(template)
          } else {
            node.children = [template]
          }
          break
        }
        if (node.children && node.children.length > 0) {
          for (let i = node.children.length - 1; i >= 0; i--) {
            stack.push(node.children[i])
          }
        }
      }
    } else {
      this.templates.push(template);
    }
    console.log('add this.templates', this.templates)
    this.saveTemplates();
    this.refresh();
  }

  editFun(templates, id, content) {
    for (let i = 0; i < templates.length; i++) {
      if (templates[i].id === id) {
        templates[i].content = content
        this.saveTemplates();
        this.refresh();
        return
      }
      if (templates[i].hasChild) {
        this.editFun(templates[i].children, id, content)
      }
    }

  }

  edit(id: string, name: string, content: string): void {
    // this.templates.forEach(item => {
    //   if (item.id === id) {
    //     item.content = content
    //   }
    // })
    this.editFun(this.templates, id, content)

  }

  deleteFun(element: Template, _templates, parentNode): void {
    if (!element) {
      return;
    }
    let templates = _templates;
    let index = templates.findIndex(template => template.id === element.id);
    console.log('delete index', index)
    console.log('delete _templates', _templates)
    if (index === -1) {
      for (let i = 0; i < templates.length; i++) {
        if (templates[i].children) {
          this.deleteFun(element, templates[i].children, templates[i]);
        }
      }

    } else {
      _templates.splice(index, 1)
      if (_templates.length === 0) {
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
      let stack = [...data]
      let res = []
      while (stack.length) {
        let node = stack.shift()
        if (node.name.toLowerCase().includes(keyword.toLowerCase())) {
          res.push(node)
        }
        if (node.hasChild) {
          stack = [...stack, ...node?.children]
        }
      }
      console.log('search res', res)
      this.templates = res
      // 根据关键词筛选模板
      // this.templates = data.filter(template => template.name.toLowerCase().includes(keyword.toLowerCase()));
    }
    this._onDidChangeTreeData.fire();
  }

  getTemplatesHandle(datas) {
    let res = [...datas]
    console.log('getTemplatesHandle res1', res)
    for (let i = 0; i < res.length; i++) {
      let hasChild = res[i].hasChild, children = res[i].children
      if (!res[i].children || (res[i].children instanceof Array && res[i].children.length === 0)) {
        hasChild = false
        children = []
      } else {
        children = this.getTemplatesHandle(res[i].children)
      }
      res[i] = {
        ...res[i],
        hasChild,
        children
      }
    }
    console.log('getTemplatesHandle res2', res)
    return res
  }

  getTemplates() {
    // console.log('getTemplates =====>', this.getTemplatesHandle(this.templates))
    if(this.templates.length) {
      return this.getTemplatesHandle(this.templates)
    } else {
      return [
        {
          "id": "0",
          "name": "demo1",
          "content": "",
          "parent": "",
          "children": [
            {
              "id": "0-0",
              "name": "demo1-child1",
              "content": "child content 111",
              "parent": "0",
              "hasChild": false,
              "children": []
            },
            {
              "id": "0-1",
              "name": "demo1-child2",
              "content": "child content 222",
              "parent": "0",
              "hasChild": true,
              "children": [
                {
                  "id": "0-1-0",
                  "name": "demo1-child2-child1",
                  "content": "demo content",
                  "parent": "0-1",
                  "hasChild": false,
                  "children": []
                }
              ]
            }
          ],
          "hasChild": true
        }
      ]
    }
  }

}