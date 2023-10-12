const vscode = require('vscode');


class Template {
  constructor(id, name, content, parent, children, hasChild) {
    this.id = id;
    this.name = name;
    this.content = content;
    this.parent = parent;
    this.children = children;
    this.hasChild = hasChild;
  }

  toData() {
    return {
      id: this.id,
      name: this.name,
      content: this.content,
      parent: this.parent,
      children: this.children,
      hasChild: this.children && this.children.length > 0
    };
  }

  static fromData(data) {
    if (data.hasChild) {
      return new Template(data.id, data.name, data.content, data.parent, data.children, data.hasChild);
    } else {
      return new Template(data.id, data.name, data.content, data.parent);
    }
  }
}

class TemplateDanceTreeDataProvider {
  constructor(context) {
    this.context = context;
    this.templates = [];
    this.templatesOld = [];
    this.selectId = "";
    this.importTemMap = new Map();
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.loadTemplates();
  }

  loadTemplates() {
    const savedTemplates = this.context.globalState.get('templates', []);
    console.log("loadTemplates savedTemplates", savedTemplates);
    this.templates = savedTemplates.map(Template.fromData);
    console.log("loadTemplates this.templates", this.templates);
  }

  saveTemplates() {
    // 存储本地
    const data = this.templates.map(t => t.toData());
    this.context.globalState.update('templates', data);
    console.log("saveTemplates this.templates", this.templates);
  }

  async addTemplate(template) {
    this.templates.push(template);
    this.saveTemplates();
    this.refresh();
  }

  async updateTemplate(template) {
    const index = this.templates.findIndex(t => t.id === template.id);
    if (index !== -1) {
      this.templates[index] = template;
      this.saveTemplates();
      this.refresh();
    }
  }

  async deleteTemplate(template) {
    const index = this.templates.findIndex(t => t.id === template.id);
    if (index !== -1) {
      this.templates.splice(index, 1);
      this.saveTemplates();
      this.refresh();
    }
  }

  getItem(id) {
    let stack = [...this.templates];
    while (stack.length) {
      let node = stack.shift();
      if (!node) {
        continue;
      }
      if (node.id === id) {
        return node;
      }
      if (node.hasChild && node.children instanceof Array) {
        const stackTemplates = stack.filter(item => item instanceof Template).map(item => item);
        const childTemplates = (node.children || []).filter(item => item instanceof Template).map(item => item);
        stack = [...stackTemplates, ...childTemplates];
      }
    }
  }

  getParent(template) {
    if (!template.parent) {
      return null;
    }
    return this.getItem(template.parent);
  }

  async getChildren(template) {
    console.log("getChildren template", template);
    if (template) {
      return Promise.resolve((template.children || []).map(child => {
        return child instanceof Template ? child : Template.fromData(child);
      }));
    } else {
      return Promise.resolve(this.templates);
    }
  }

  getTreeItem(element) {
    console.log('getTreeItem element', element);
    let tooltip = element.content && element.content.length > 20 ? `${element.content.slice(0, 20)}...` : element.content;
    return {
      id: element.id,
      label: element.name,
      tooltip: tooltip,
      children: element.children || null,
      collapsibleState: !element.hasChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
      iconPath: vscode.Uri.file(this.context.asAbsolutePath('./src/icon/icon-light-code2.svg')),
    };
  }

  // 校验数据的字段、类型
  checkType(obj, typeData) {
    let res = "";
    let keyArr = Object.keys(obj);
    for (let i = 0; i < keyArr.length; i++) {
      let idx = typeData.findIndex(item => {
        let result = false;
        if (item.key === keyArr[i]) {
          if (item.type === "array") {
            result = obj[keyArr[i]] instanceof Array;
          } else {
            result = typeof obj[keyArr[i]] === item.type;
          }
        } else {
          result = false;
        }
        return result;
      });
      if (idx === -1) {
        res = `${res}1`;
      } else {
        res = `${res}0`;
      }
    }
    console.log('checkType res', res);

    if (res.length !== typeData.length || res.includes("1")) {
      return false;
    } else {
      return true;
    } 
  }

  // 校验数据是否合法
  // 包括parent、hasChild、children
  checkData(data, msg = "") {
    console.log("checkData data", data);
    let res = msg;
    if (this.importTemMap.has(data.id) || this.importTemMap.has(data.name)) {
      res = `${res}${res ? "。" : ""} ${data.id}或${data.name}重复。`;
    } else {
      this.importTemMap.set(data.id, 1);
      this.importTemMap.set(data.name, 1);
    }
    if (data.hasChild && data.children.length === 0) {
      res = `${res} ${res ? "。" : ""} ${JSON.stringify({ id: data.id, name: data.name })}`;
    }
    if (data.hasChild) {
      for (let i = 0; i < data.children.length; i++) {
        if (data.children[i].parent && data.children[i].parent !== data.id) {
          res = `${res} ${res ? "。" : ""} ${JSON.stringify({ id: data.children[i].id, name: data.children[i].name })}`;
        }
        this.checkData(data.children[i], res);
      }
    }
    console.log("checkData res", res);
    return res;
  }

  formatTreeData(treeData) {
    if (!treeData) {
      return;
    }
    for (let i = 0; i < treeData.length; i++) {
      treeData[i] = new Template(treeData[i].id, treeData[i].name, treeData[i].content, treeData[i].parent, treeData[i].children, treeData[i].hasChild);
      if (treeData[i].hasChild) {
        this.formatTreeData(treeData[i].children);
      }
    }
    return treeData;
  }

  validateTreeData(treeData) {
    let typeData = [
      { key: 'id', type: 'string' },
      { key: 'name', type: 'string' },
      { key: 'content', type: 'string' },
      { key: 'parent', type: 'string' },
      { key: 'children', type: 'array' },
      { key: 'hasChild', type: 'boolean' },
    ];
    let errorMsg = "", errorMsg2 = "";
    if (!(treeData instanceof Array)) {
      vscode.window.showErrorMessage(`添加失败，传入数据类型有误`);
      return;
    }
    // 校验数据
    for (let i = 0; i < treeData.length; i++) {
      let res = this.checkType(treeData[i], typeData);
      console.log('check result ', res);
      if (!res) {
        errorMsg = `${errorMsg}${errorMsg ? "。" : ""} ${JSON.stringify(treeData[i])}`;

      }
      let res2 = this.checkData(treeData[i]);
      if (res2) {
        errorMsg2 = `${errorMsg2}${errorMsg2 ? "。" : ""} ${res2}`;
      }
    }
    if (errorMsg) {
      vscode.window.showErrorMessage(`添加失败，以下数据字段或数据类型有误：${errorMsg}`);
      return;
    }
    if (errorMsg2) {
      vscode.window.showErrorMessage(`添加失败，以下数据hasChild/children/parent字段有误：${errorMsg2}`);
      return;
    }
  }

  importTree(treeData) {
    this.templatesOld = this.templates;
    this.templates = [...this.templates, ...treeData];
    console.log('import this.templates', this.templates);
    this.saveTemplates();
    this.refresh();
  }

  revoke() {
    this.templates = [...this.templatesOld];
    this.templatesOld = [];
    this.saveTemplates();
    this.refresh();
  }

  validateName(name) {
    console.log("validateName name", name);
    const stack = [...this.templates];
    console.log("validateName stack", this.templates, stack);
    let res = true;
    while (stack.length) {
      const node = stack.pop();
      console.log("validateName node", node);
      if (node.name === name) {
        return false;
      }
      if (node.children && node.children.length > 0) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i]);
        }
      }
    }
    console.log("validateName res", res);
    return res;
  }

  initId() {
    return (this.templates.length + 1) + "";
  }

  initChildId(parentName) {
    let childId = null;
    const stack = [...this.templates];
    const parentNode = [];
    console.log("initChildId stack", stack);
    while (stack.length) {
      const node = stack.pop();
      if (node.name === parentName) {
        parentNode.push(node);
        break;
      }
      console.log("initChildId node", node);
      console.log("initChildId node.hasChild ", node.hasChild);
      console.log("initChildId node.children.length ", node.children?.length);

      if (node.hasChild && node.children.length > 0) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i]);
        }
      }
      console.log("initChildId stack", stack);
    }
    console.log("initChildId parentNode", parentNode);

    if (parentNode.length === 1) {
      childId = parentNode[0].children ? parentNode[0].children.length : 0;
      return {
        childId: `${parentNode[0].id}-${childId}`,
        parentId: parentNode[0].id
      };
    } else {
      return false;
    }
  }

  refresh() {
    console.log('refresh templates', this.templates);
    this.loadTemplates();
    this._onDidChangeTreeData.fire();
  }

  add(template) {
    console.log('add template', template);
    if (template.parent) {
      const stack = [...this.templates];
      while (stack.length) {
        const node = stack.pop();
        console.log('add node', node);
        if (node.id === template.parent) {
          node.hasChild = true;
          if (node.children) {
            node.children.push(template);
          } else {
            node.children = [template];
          }
          break;
        }
        if (node.children && node.children.length > 0) {
          for (let i = node.children.length - 1; i >= 0; i--) {
            stack.push(node.children[i]);
          }
        }
      }
    } else {
      this.templates.push(template);
    }
    console.log('add this.templates', this.templates);
    this.saveTemplates();
    this.refresh();
  }

  editFun(templates, id, content) {
    for (let i = 0; i < templates.length; i++) {
      if (templates[i].id === id) {
        templates[i].content = content;
        this.saveTemplates();
        this.refresh();
        return;
      }
      if (templates[i].hasChild) {
        this.editFun(templates[i].children, id, content);
      }
    }
  }

  edit(id, name, content) {
    this.editFun(this.templates, id, content);
  }

  deleteFun(element, _templates, parentNode) {
    if (!element) {
      return;
    }
    let templates = _templates;
    let index = templates.findIndex(template => template.id === element.id);
    console.log('delete index', index);
    console.log('delete _templates', _templates);
    if (index === -1) {
      for (let i = 0; i < templates.length; i++) {
        if (templates[i].children) {
          this.deleteFun(element, templates[i].children, templates[i]);
        }
      }
    } else {
      _templates.splice(index, 1);
      if (_templates.length === 0) {
        parentNode.hasChild = false;
      }
    }
  }

  delete(template) {
    this.deleteFun(template, this.templates);
    this.saveTemplates();
    this.refresh();
  }

  search(keyword) {
    if (!keyword) {
      // 如果没有关键词，则显示所有模板
      this.loadTemplates();
    } else {
      let data = this.context.globalState.get('templates', []);
      let stack = [...data];
      let res = [];
      while (stack.length) {
        let node = stack.shift();
        if (node.name.toLowerCase().includes(keyword.toLowerCase())) {
          res.push(node);
        }
        if (node.hasChild) {
          stack = [...stack, ...node?.children];
        }
      }
      console.log('search res', res);
      this.templates = res;
    }
    this._onDidChangeTreeData.fire();
  }

  getTemplatesHandle(datas) {
    let res = [...datas];
    console.log('getTemplatesHandle res1', res);
    for (let i = 0; i < res.length; i++) {
      let hasChild = res[i].hasChild, children = res[i].children;
      if (!res[i].children || (res[i].children instanceof Array && res[i].children.length === 0)) {
        hasChild = false;
        children = [];
      } else {
        children = this.getTemplatesHandle(res[i].children);
      }
      res[i] = {
        ...res[i],
        hasChild,
        children
      };
    }
    console.log('getTemplatesHandle res2', res);
    return res;
  }

  getTemplates() {
    if (this.templates.length) {
      return this.getTemplatesHandle(this.templates);
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
      ];
    }
  }

  getSelectId() {
    return this.selectId;
  }

  setSelectId(id) {
    this.selectId = id;
  }

  getTemplatesOld() {
    return this.templatesOld;
  }
}

module.exports = { Template, TemplateDanceTreeDataProvider };
