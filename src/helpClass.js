/*---------------------------------------------------------------------------------------------
*  Copyright (c) Alessandro Fragnani. All rights reserved.
*  Licensed under the GPLv3 License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

const { l10n } = require("vscode");
const {  HelpAndFeedbackView, StandardLinksProvider, ProvideFeedbackLink  } = require("vscode-ext-help-and-feedback-view");

function registerHelpAndFeedbackView(context) {
  const items = new Array();
  items.push({
    icon: 'github',
    title: 'github',
    url: 'https://github.com/gllwhat/template-dance'
  });
  new HelpAndFeedbackView(context, "help", items);
}

module.exports = { registerHelpAndFeedbackView };
