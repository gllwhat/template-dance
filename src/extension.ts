import * as vscode from 'vscode';
import {Template, TemplateDanceTreeDataProvider} from "./templateClass"

export function activate(context: vscode.ExtensionContext) {
   
  const templateDanceTreeDataProvider = new TemplateDanceTreeDataProvider(context);
  const templateDanceTreeView = vscode.window.createTreeView('templateDanceTreeView', {
    treeDataProvider: templateDanceTreeDataProvider,
    showCollapseAll: true,
    canSelectMany: true
  });


  // 添加
  context.subscriptions.push(
    vscode.commands.registerCommand('template-dance.addTemplate', async () => {
      const parent = await vscode.window.showInputBox({ prompt: '请输入父节点名称' });
      if(parent && templateDanceTreeDataProvider.validateId(parent)) {
        vscode.window.showErrorMessage(`添加失败，不存在'${parent}'节点`)
        return
      }
      const name = await vscode.window.showInputBox({ prompt: '请输入模板名称' });
      if (!name) {
        return;
      }
      if(!templateDanceTreeDataProvider.validateId(name)) {
        vscode.window.showErrorMessage("添加失败，模板重名")
        return
      }
      const content = await vscode.window.showInputBox({ prompt: '请输入模板内容' });
      if (!content) {
        return;
      }
      const template = new Template(name, name, content, parent);
      console.log('template =====>', template)
      templateDanceTreeDataProvider.add(template);
    })
  );
  
  // 编辑
  context.subscriptions.push(vscode.commands.registerCommand("template-dance.editTemplate", async () => {
    let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
    console.log('templateDanceTreeDataProvider ====>', templateDanceTreeDataProvider)
   return
    // let name = await vscode.window.showInputBox({ value: template.name });
    //   if (!template.name) {
    //     return;
    //   }
    //   let content = await vscode.window.showInputBox({ value: template.content });
    //   if (!template.content) {
    //     return;
    //   }
    //   templateDanceTreeDataProvider.edit(template.id, name, content);
  }))

  context.subscriptions.push(vscode.commands.registerCommand("template-dance.hello", () => {
    vscode.window.showInformationMessage("Hello")
  }))
  
  // 选中
  templateDanceTreeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<Template>) => {
    if (e.selection.length > 0) {
      const template = e.selection[0];
      templateDanceTreeDataProvider.selectId = template.id
      vscode.commands.executeCommand('setContext', 'templateItemContext', true);
    } else {
      vscode.commands.executeCommand('setContext', 'templateItemContext', false);
    }
  });
  
  // 查看
  context.subscriptions.push(vscode.commands.registerCommand("template-dance.viewTemplate", () => {
    let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
    const panel = vscode.window.createWebviewPanel("view", `view: ${template.name}`,  vscode.ViewColumn.One,{
      enableScripts: true, // 允许运行脚本
      retainContextWhenHidden: false, // 隐藏时保留内容状态
    })
    panel.webview.html = `<html><body><div>${template.content}</div></body></html>`;
  }))
  
  // 删除
  context.subscriptions.push(vscode.commands.registerCommand("template-dance.deleteTemplate", async () => {
    let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
    console.log('template =====>', template)
    templateDanceTreeDataProvider.delete(template);
  }))
  
  // 使用
  context.subscriptions.push(vscode.commands.registerCommand("template-dance.useTemplate", async () => {
    let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
    console.log('template =====>', template)
    // 获取当前激活的编辑器
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      // 获取光标所在位置
      const position = editor.selection.active;
      // 创建编辑器修改对象
      const edit = new vscode.WorkspaceEdit();
      // 在光标所在位置插入文本
      edit.insert(editor.document.uri, position, template.content);
      // 应用修改
      await vscode.workspace.applyEdit(edit);
      const selection = new vscode.Selection(position, editor.selection.active);
      await vscode.commands.executeCommand('editor.action.formatSelection', selection);
    }
  }))

  // search
  context.subscriptions.push(
    vscode.commands.registerCommand('template-dance.searchTemplate', async () => {
      const name = await vscode.window.showInputBox({ prompt: '请输入模板名称关键字' });
      templateDanceTreeDataProvider.search(name);
    })
  );

  // refresh
  context.subscriptions.push(vscode.commands.registerCommand("template-dance.refreshTemplate", async () => {
    templateDanceTreeDataProvider.refresh();
  }))
}
