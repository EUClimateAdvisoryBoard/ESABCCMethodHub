const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // References
  loadReferences: () => ipcRenderer.invoke('load-references'),

  // Annotations
  getAnnotations: (refId) => ipcRenderer.invoke('get-annotations', refId),
  saveAnnotation: (data) => ipcRenderer.invoke('save-annotation', data),
  updateAnnotation: (data) => ipcRenderer.invoke('update-annotation', data),
  deleteAnnotation: (id) => ipcRenderer.invoke('delete-annotation', id),
  getAllAnnotationsCount: () => ipcRenderer.invoke('get-all-annotations-count'),

  // Tags
  getTags: (refId) => ipcRenderer.invoke('get-tags', refId),
  addTag: (data) => ipcRenderer.invoke('add-tag', data),
  deleteTag: (id) => ipcRenderer.invoke('delete-tag', id),

  // Collections
  getCollections: () => ipcRenderer.invoke('get-collections'),
  createCollection: (data) => ipcRenderer.invoke('create-collection', data),
  deleteCollection: (id) => ipcRenderer.invoke('delete-collection', id),
  addToCollection: (data) => ipcRenderer.invoke('add-to-collection', data),
  removeFromCollection: (data) => ipcRenderer.invoke('remove-from-collection', data),
  getCollectionRefs: (collectionId) => ipcRenderer.invoke('get-collection-refs', collectionId),

  // Clipboard
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
});
