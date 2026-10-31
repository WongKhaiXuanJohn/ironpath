// Preserve the rendered cloud baseline while the page edits its working state.
export function editableState(view){return JSON.parse(JSON.stringify(view.state));}
