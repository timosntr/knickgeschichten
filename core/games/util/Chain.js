const _ = require('lodash');

class Chain {
  constructor(numPlayers, length) {
    this.numPlayers = numPlayers;

    // Track how many time players contribute
    this.collaborators = {};

    // Id of the last editor (playerId — resets on rejoin)
    this.lastEditor = '';
    // Member id of the last editor (persists across rejoins within same socket session)
    this.lastEditorMemberId = '';

    // Id of the current editor
    this.editor = '';

    // Marks the chain as finished once a "last link" contribution is written,
    // so completion no longer depends on the variable length of that final line.
    this.closed = false;

    // List of lines in the chain
    this.chain = [];

    // List of editors
    this.editors = [];

    // List of author display names (parallel to editors/chain)
    this.authorNames = [];

    // Players that like this story
    this.likes = {};
  }

  save() {
    return {
      version: 1,
      numPlayers: this.numPlayers,
      collaborators: this.collaborators,
      lastEditor: this.lastEditor,
      lastEditorMemberId: this.lastEditorMemberId,
      editor: this.editor,
      closed: this.closed,
      chain: this.chain,
      type: this.type,
      editors: this.editors,
      authorNames: this.authorNames,
      likes: this.likes,
    };
  }

  restore(blob) {
    if (blob.version !== 1)
      return;

    this.collaborators = blob.collaborators;
    this.lastEditor = blob.lastEditor;
    this.lastEditorMemberId = blob.lastEditorMemberId || '';
    this.editor = blob.editor;
    this.closed = blob.closed || false;
    this.chain = blob.chain;
    this.editors = blob.editors;
    this.authorNames = blob.authorNames || [];
    this.likes = blob.likes;
    this.type = blob.type;
  }

  avgEdits() {
    return _.sum(_.values(this.collaborators)) / this.numPlayers;
  }

  addLink(pid, link, authorName = null, memberId = '') {
    this.lastEditor = this.editor;
    this.lastEditorMemberId = memberId || '';
    if(pid)
      this.collaborators[pid] = (this.collaborators[pid] || 0) + 1;
    this.chain.push(link);
    this.editors.push(pid);
    this.authorNames.push(authorName);
    this.editor = '';
  }
};

// restore a chain from save data
Chain.restore = blob => {
  const c = new Chain(blob.numPlayers);
  c.restore(blob);
  return c;
};

module.exports = Chain;