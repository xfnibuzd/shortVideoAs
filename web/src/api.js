const BASE = '/api';

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export const fileUrl = (relPath) => (relPath ? `/files/${relPath}` : '');

export const api = {
  // projects
  listProjects: () => req('GET', '/projects'),
  createProject: (name) => req('POST', '/projects', { name }),
  renameProject: (id, name) => req('PATCH', `/projects/${id}`, { name }),
  deleteProject: (id) => req('DELETE', `/projects/${id}`),

  // chapters / shots
  getChapters: (projectId) => req('GET', `/projects/${projectId}/chapters`),
  createChapter: (projectId, title) => req('POST', `/projects/${projectId}/chapters`, { title }),
  renameChapter: (id, title) => req('PATCH', `/chapters/${id}`, { title }),
  deleteChapter: (id) => req('DELETE', `/chapters/${id}`),
  createShot: (chapterId, title) => req('POST', `/chapters/${chapterId}/shots`, { title }),
  getShot: (id) => req('GET', `/shots/${id}`),
  saveShot: (id, payload) => req('PUT', `/shots/${id}`, payload),
  deleteShot: (id) => req('DELETE', `/shots/${id}`),

  // assets
  listAssets: (projectId, type) =>
    req('GET', `/projects/${projectId}/assets${type ? `?type=${type}` : ''}`),
  createAsset: (projectId, formData) =>
    fetch(`/api/projects/${projectId}/assets`, { method: 'POST', body: formData }).then((r) => r.json()),
  createAssetAI: (projectId, payload) => req('POST', `/projects/${projectId}/assets/ai`, payload),
  deleteAsset: (id) => req('DELETE', `/assets/${id}`),

  // templates
  listTemplates: (projectId) => req('GET', `/projects/${projectId}/prompt-templates`),
  createTemplate: (projectId, name, content) =>
    req('POST', `/projects/${projectId}/prompt-templates`, { name, content }),
  deleteTemplate: (id) => req('DELETE', `/prompt-templates/${id}`),

  // generations
  listGenerations: (shotId) => req('GET', `/shots/${shotId}/generations`),
  createGeneration: (shotId, assetIds, templateId) =>
    req('POST', `/shots/${shotId}/generations`, { assetIds, templateId }),
  getGeneration: (id) => req('GET', `/generations/${id}`),
  retryGeneration: (id) => req('POST', `/generations/${id}/retry`),
  activeGeneration: () => req('GET', '/generations/active'),
};
