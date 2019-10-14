/* globals content, pageMetadata */

this.intents.notes = (function() {
  let writingTabId;

  const SCRIPT = "/intents/notes/contentScript.js";

  async function checkHasTab() {
    if (!writingTabId) {
      const e = new Error("No writing tab");
      e.displayMessage = 'You must use "Write notes here"';
      throw e;
    }
    const available = await content.hasScript(writingTabId, SCRIPT);
    if (!available) {
      const e = new Error("Writing tab no longer active");
      e.displayMessage =
        'The writing tab has changed, use "show notes" and "write notes here"';
      throw e;
    }
  }

  this.intentRunner.registerIntent({
    name: "note.setPlace",
    examples: ["Write notes here"],
    match: `
    (write | add | make) (notes |) (here | this page | this tab)
    `,
    async run(context) {
      const activeTab = (await browser.tabs.query({ active: true }))[0];
      const tabId = activeTab.id;
      await content.lazyInject(tabId, SCRIPT);
      const failureMessage = await browser.tabs.sendMessage(tabId, {
        type: "setPlace",
      });
      if (failureMessage) {
        const e = new Error("Failed to find place to write");
        e.displayMessage = failureMessage;
        throw e;
      }
      writingTabId = tabId;
    },
  });

  this.intentRunner.registerIntent({
    name: "notes.addLink",
    examples: ["Make note of this page"],
    match: `
    (make | add | write |) note (of | about |) (this |) (page | tab | link)
    `,
    async run(context) {
      await checkHasTab();
      const activeTab = (await browser.tabs.query({ active: true }))[0];
      const metadata = await pageMetadata.getMetadata(activeTab.id);
      const success = await browser.tabs.sendMessage(writingTabId, {
        type: "addLink",
        metadata,
      });
      if (!success) {
        const e = new Error("Could not add link");
        e.displayMessage = "Could not add link";
        throw e;
      }
    },
  });

  this.intentRunner.registerIntent({
    name: "notes.add",
    examples: ["Add note stuff to remember"],
    match: `
    (make | add | write) note (about |) [text]
    `,
    async run(context) {
      await checkHasTab();
      const success = await browser.tabs.sendMessage(writingTabId, {
        type: "addText",
        text: context.slots.text,
      });
      if (!success) {
        const e = new Error("Could not add text");
        e.displayMessage = "Could not add text";
        throw e;
      }
    },
  });

  this.intentRunner.registerIntent({
    name: "notes.show",
    examples: ["Show notes"],
    match: `
    (show | focus | activate | read) (the |) notes
    `,
    async run(context) {
      if (!writingTabId) {
        const e = new Error("No writing tab");
        e.displayMessage = "You have not set a tab to write";
        throw e;
      }
      await browser.tabs.update(writingTabId, { active: true });
    },
  });
})();
