import api from './api';

function toFormData(payload, fileField = 'file') {
  const form = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === fileField) return;
    if (typeof value === 'boolean') {
      form.append(key, value ? 'true' : 'false');
    } else {
      form.append(key, value);
    }
  });
  if (payload?.[fileField]) {
    form.append(fileField, payload[fileField]);
  }
  return form;
}

function createResource(basePath, { multipart = false } = {}) {
  return {
    list(params = {}) {
      return api.get(basePath, { params }).then((r) => r.data);
    },
    get(id) {
      return api.get(`${basePath}/${id}`).then((r) => r.data);
    },
    create(payload) {
      if (multipart) {
        return api.post(basePath, toFormData(payload), {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).then((r) => r.data);
      }
      return api.post(basePath, payload).then((r) => r.data);
    },
    update(id, payload) {
      if (multipart) {
        return api.put(`${basePath}/${id}`, toFormData(payload), {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).then((r) => r.data);
      }
      return api.put(`${basePath}/${id}`, payload).then((r) => r.data);
    },
    remove(id) {
      return api.delete(`${basePath}/${id}`).then((r) => r.data);
    },
  };
}

export const departments = {
  ...createResource('/departments'),
  options() {
    return api.get('/departments/options').then((r) => r.data);
  },
};

export const banners = createResource('/banners', { multipart: true });
export const notices = createResource('/notices', { multipart: true });
export const newsEvents = createResource('/news-events', { multipart: true });
export const faculty = createResource('/faculty', { multipart: true });
export const pages = createResource('/pages');
export const galleries = {
  ...createResource('/galleries', { multipart: true }),
  listImages(params = {}) {
    return api.get('/galleries/images', { params }).then((r) => r.data);
  },
  getImage(imageId) {
    return api.get(`/galleries/images/${imageId}`).then((r) => r.data);
  },
  updateImage(imageId, payload) {
    return api
      .put(`/galleries/images/${imageId}`, toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  addImage(id, payload) {
    const form = toFormData(payload);
    return api
      .post(`/galleries/${id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  removeImage(imageId) {
    return api.delete(`/galleries/images/${imageId}`).then((r) => r.data);
  },
};

/** Alias — albums are stored in dbo.Galleries */
export const albums = galleries;
export const documents = createResource('/documents', { multipart: true });

export const cms = {
  list(moduleKey, params = {}) {
    return api.get(`/cms/${moduleKey}`, { params }).then((r) => r.data);
  },
  get(moduleKey, id) {
    return api.get(`/cms/${moduleKey}/${id}`).then((r) => r.data);
  },
  create(moduleKey, payload) {
    return api
      .post(`/cms/${moduleKey}`, toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  update(moduleKey, id, payload) {
    return api
      .put(`/cms/${moduleKey}/${id}`, toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  remove(moduleKey, id) {
    return api.delete(`/cms/${moduleKey}/${id}`).then((r) => r.data);
  },
};
