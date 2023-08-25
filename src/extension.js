const vscode = require("vscode");
const { Template, TemplateDanceTreeDataProvider } = require("./templateClass");

function activate(context) {
  const templateDanceTreeDataProvider = new TemplateDanceTreeDataProvider(
    context
  );
  const templateDanceTreeView = vscode.window.createTreeView(
    "templateDanceTreeView",
    {
      treeDataProvider: templateDanceTreeDataProvider,
      showCollapseAll: true,
      canSelectMany: true,
    }
  );

  // 添加
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "template-dance.addTemplate",
      async (item) => {
        let parent;
        if (templateDanceTreeDataProvider.getSelectId() || item) {
          let template = item
            ? item
            : templateDanceTreeDataProvider.getItem(
              templateDanceTreeDataProvider.getSelectId()
            );
          parent = await vscode.window.showInputBox({ value: template.name, prompt: "请输入父节点名称", });
        } else {
          parent = await vscode.window.showInputBox({
            prompt: "请输入父节点名称",
          });
        }
        let id;
        console.log("add", parent);
        if (parent) {
          let res = templateDanceTreeDataProvider.initChildId(parent);
          console.log("add ====> ", res, typeof res === "object");
          if (typeof res === "object") {
            id = res.childId;
            parent = res.parentId;
          } else {
            vscode.window.showErrorMessage(`添加失败，不存在'${parent}'节点`);
            return;
          }
        } else {
          id = templateDanceTreeDataProvider.initId();
        }
        const name = await vscode.window.showInputBox({
          prompt: "请输入模板名称",
        });
        if (!name) {
          return;
        }
        if (!templateDanceTreeDataProvider.validateName(name)) {
          vscode.window.showErrorMessage("添加失败，模板重名");
          return;
        }
        let content = await vscode.window.showInputBox({
          prompt: "请输入模板内容",
          ignoreFocusOut: true,
        });
        if (!content) {
          return;
        }
        // content = content === undefined ? "" : content.replace(/ /g, '&nbsp;').replace(/\n/g, '<br>');
        const template = new Template(id, name, content, parent);
        console.log("template =====>", template);
        templateDanceTreeDataProvider.add(template);
      }
    )
  );

  // 编辑
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "template-dance.editTemplate",
      async (item) => {
        // let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
        let name = await vscode.window.showInputBox({ value: item.name, prompt: "请输入模板名称", });
        name = name === undefined ? "" : name
        if (!item.name) {
          return;
        }
        let content = await vscode.window.showInputBox({
          value: item.content, prompt: "请输入模板内容", ignoreFocusOut: true,
        });
        // content = content === undefined ? "" : content.replace(/ /g, '&nbsp;');
        console.log('edit content', content)
        templateDanceTreeDataProvider.edit(item.id, name, content);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("template-dance.hello", () => {
      vscode.window.showInformationMessage("Hello");
    })
  );

  // 选中
  const changeSelectionFun = (
    e
  ) => {
    console.log("11 onDidChangeSelection e ", e);
    if (e.selection.length > 0) {
      const template = e.selection[0];
      templateDanceTreeDataProvider.setSelectId(template.id);
      vscode.commands.executeCommand("setContext", "templateItemContext", true);
    } else {
      vscode.commands.executeCommand(
        "setContext",
        "templateItemContext",
        false
      );
    }
  };
  templateDanceTreeView.onDidChangeSelection(changeSelectionFun);

  // 查看
  context.subscriptions.push(
    vscode.commands.registerCommand("template-dance.viewTemplate", (item) => {
      // let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
      const panel = vscode.window.createWebviewPanel(
        "view",
        `view: ${item.name}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true, // 允许运行脚本
          retainContextWhenHidden: false, // 隐藏时保留内容状态
        }
      );
      let content = item.content === undefined ? "" : item.content === undefined ? "" : item.content.replace(/ /g, '&nbsp;')
      panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            background-color: #fff;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div id="content">
        <div>
          <p><span style="font-weight: bold;font-size: 18px">name: </span> <span>${item.name}</span></p>
        </div> 
        <div>
          <p style="font-weight: bold;font-size: 18px">content:</p>
          <pre id="view">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/(&nbsp;){2,}/g, "</br>")}</pre>
        </div>
      </div>
      <script>
        let content = document.getElementById("content"),view = document.getElementById("view"),textarea = document.getElementById("textarea")
      </script>
      </body>
    </html>`;
    })
  );

  // 删除
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "template-dance.deleteTemplate",
      async (item) => {
        // let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
        console.log("template =====>", item);
        templateDanceTreeDataProvider.delete(item);
      }
    )
  );

  // 使用
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "template-dance.useTemplate",
      async (item) => {
        // let template = templateDanceTreeDataProvider.getItem(templateDanceTreeDataProvider.selectId)
        console.log("template =====>", item);
        // 获取当前激活的编辑器
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          // 获取光标所在位置
          const position = editor.selection.active;
          // 创建编辑器修改对象
          const edit = new vscode.WorkspaceEdit();
          // 在光标所在位置插入文本
          // let content = item.content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, ' ').replace(/<br>/g, '\n')
          edit.insert(editor.document.uri, position, item.content);
          // 应用修改
          await vscode.workspace.applyEdit(edit);
          const selection = new vscode.Selection(
            position,
            editor.selection.active
          );
          await vscode.commands.executeCommand(
            "editor.action.formatSelection",
            selection
          );
        }
      }
    )
  );

  // search
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "template-dance.searchTemplate",
      async () => {
        let name = await vscode.window.showInputBox({
          prompt: "请输入模板名称关键字",
        });
        name = name === undefined ? "" : name
        templateDanceTreeDataProvider.search(name);
      }
    )
  );

  // refresh
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "template-dance.refreshTemplate",
      async () => {
        templateDanceTreeDataProvider.refresh();
      }
    )
  );

  // import
  context.subscriptions.push(
    vscode.commands.registerCommand("template-dance.import", async () => {
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          "Tree Files": ["json"],
        },
      });
      console.log("import fileUris", fileUris);
      const fileUri = fileUris ? fileUris[0] : undefined;
      if(!fileUri) {
        return
      }
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const treeData = JSON.parse(fileContent.toString());
      console.log("import treeData", treeData);
      console.log(
        "import validateTreeData",
        templateDanceTreeDataProvider.validateTreeData(treeData)
      );
    })
  );

  // revoke
  context.subscriptions.push(
    vscode.commands.registerCommand("template-dance.revoke", async () => {
      let templatesOld = templateDanceTreeDataProvider.getTemplatesOld();
      console.log("revoke templatesOld", templatesOld);
      if (templatesOld.length) {
        templateDanceTreeDataProvider.revoke();
      }
    })
  );

  // export
  context.subscriptions.push(
    vscode.commands.registerCommand("template-dance.export", async () => {
      const fileUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file("templates.json"),
        filters: {
          "JSON Files": ["json"],
        },
      });
      if (!fileUri) {
        return;
      }
      const templates = templateDanceTreeDataProvider.getTemplates();
      const json = JSON.stringify(templates, null, 2);
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(json));
      vscode.window.showInformationMessage("Templates exported successfully!");
    })
  );
}
module.exports = { activate };